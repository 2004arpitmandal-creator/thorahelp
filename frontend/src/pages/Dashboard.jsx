import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SOSButton from "@/components/SOSButton";
import MapView from "@/components/MapView";
import SignalCard from "@/components/SignalCard";
import { api, wsUrl } from "@/lib/api";
import { log } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Heart, Car, MessageSquare, Crosshair, Loader2, Radar } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { id: "medical", label: "Medical", Icon: Heart, color: "border-red-200 bg-red-50 text-red-700" },
  { id: "roadside", label: "Roadside / Vehicle", Icon: Car, color: "border-amber-200 bg-amber-50 text-amber-700" },
  { id: "general", label: "General help", Icon: MessageSquare, color: "border-blue-200 bg-blue-50 text-blue-700" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [signals, setSignals] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState("medical");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const wsRef = useRef(null);

  const fetchSignals = useCallback(async (loc) => {
    if (!loc) return;
    try {
      const { data } = await api.get("/signals", { params: { lat: loc[0], lng: loc[1], max_distance: 5000 } });
      setSignals(data);
    } catch (e) {
      // Polling errors are expected (offline, token expired). Log in dev only.
      log.warn("[thoraHELP] fetch signals failed:", e?.message || e);
    }
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setLocation((prev) => {
          // only update if changed meaningfully
          if (!prev || Math.abs(prev[0] - loc[0]) > 1e-5 || Math.abs(prev[1] - loc[1]) > 1e-5) return loc;
          return prev;
        });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Fetch signals periodically
  useEffect(() => {
    if (!location) return;
    fetchSignals(location);
    const t = setInterval(() => fetchSignals(location), 5000);
    return () => clearInterval(t);
  }, [location, fetchSignals]);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    let ws;
    try {
      ws = new WebSocket(wsUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        if (location) ws.send(JSON.stringify({ type: "location", lat: location[0], lng: location[1] }));
      };
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === "new_signal") {
            toast.error(`${data.signal.title}`, { description: `${data.signal.user_name || "Someone"} nearby needs help`, duration: 8000 });
            setSignals((s) => {
              if (s.some((x) => x.signal_id === data.signal.signal_id)) return s;
              return [data.signal, ...s];
            });
          } else if (data.event === "signal_escalated" || data.event === "signal_updated" || data.event === "signal_resolved") {
            setSignals((s) => s.map((x) => x.signal_id === data.signal.signal_id ? { ...x, ...data.signal } : x));
          }
        } catch { /* ignore parse error */ }
      };
      ws.onclose = () => { wsRef.current = null; };
    } catch { /* ignore */ }
    return () => { try { ws && ws.close(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Send location updates over WS
  useEffect(() => {
    if (!wsRef.current || !location) return;
    if (wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: "location", lat: location[0], lng: location[1] }));
    }
  }, [location]);

  const onSOS = () => setDialogOpen(true);

  const sendSignal = async () => {
    if (!location) {
      toast.error("Location unavailable", { description: "Enable location to send an SOS." });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/signals", {
        type, description,
        lat: location[0], lng: location[1],
        title: type === "medical" ? "Medical emergency" : type === "roadside" ? "Roadside help" : "Help needed",
      });
      setDialogOpen(false);
      setDescription("");
      toast.success(t("sos.sent"), { description: t("sos.sent_desc") });
      navigate(`/app/signal/${data.signal_id}`);
    } catch (e) {
      toast.error("Failed to send", { description: e.response?.data?.detail || "Try again" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 grid lg:grid-cols-3 gap-6">
        {/* Left: SOS + Map */}
        <section className="lg:col-span-2 space-y-5">
          <Card className="border-slate-200 p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <span className="text-[10px] font-body font-bold uppercase tracking-[0.25em] text-slate-500">
                {t("dashboard.hold_for_emergency")}
              </span>
              <h1 className="mt-2 font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                {t("dashboard.hi", { name: user?.name?.split(" ")[0] || "there" })}
              </h1>
              <div className="my-7">
                <SOSButton onTrigger={onSOS} disabled={locating} />
              </div>
              <p className="text-sm text-slate-500 font-body">
                {locating ? t("dashboard.locating") : location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Crosshair className="h-3.5 w-3.5 text-emerald-600" />
                    {t(signals.length === 1 ? "dashboard.gps_locked" : "dashboard.gps_locked_plural", { count: signals.length })}
                  </span>
                ) : t("dashboard.no_gps")}
              </p>
            </div>
          </Card>

          <Card className="border-slate-200 p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radar className="h-4 w-4 text-blue-600"/>
                <h2 className="font-display font-bold text-slate-900">{t("dashboard.live_map")}</h2>
              </div>
              <span className="text-[10px] font-body font-bold uppercase tracking-widest text-slate-500">{t("dashboard.radar_5km")}</span>
            </div>
            <div className="h-[420px]">
              <MapView
                userLocation={location}
                signals={signals}
                onSignalClick={(s) => navigate(`/app/signal/${s.signal_id}`)}
              />
            </div>
          </Card>
        </section>

        {/* Right: Feed */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-slate-900 text-lg">{t("dashboard.active_near")}</h2>
            <span className="text-xs font-body text-slate-500">
              {t(signals.length === 1 ? "dashboard.signal_one" : "dashboard.signal_other", { count: signals.length })}
            </span>
          </div>
          {signals.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/60 p-8 text-center" data-testid="empty-feed">
              <p className="text-sm text-slate-600 font-body">{t("dashboard.no_signals")}</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {signals.map((s) => <SignalCard key={s.signal_id} signal={s} />)}
            </div>
          )}
        </aside>
      </main>

      <BottomNav />

      {/* SOS Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="sos-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl">{t("sos.title")}</DialogTitle>
            <DialogDescription className="font-body">
              {t("sos.desc")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 mt-2">
            {TYPES.map(({ id, labelKey, Icon, color }) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                data-testid={`sos-type-${id}`}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition ${
                  type === id ? `${color} ring-2 ring-offset-1` : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-5 w-5"/>
                <span className="text-xs font-display font-bold">{t(labelKey)}</span>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <Label htmlFor="desc" className="font-body font-semibold text-slate-700">{t("sos.note_label")}</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("sos.note_placeholder")}
              data-testid="sos-desc-input"
              className="mt-1.5 font-body"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-testid="sos-cancel-btn"
              className="font-display"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={sendSignal}
              disabled={submitting || !location}
              data-testid="sos-confirm-btn"
              className="font-display font-bold bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sos.send_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
