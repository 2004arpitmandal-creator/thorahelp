import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MapView from "@/components/MapView";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import SignalCard from "@/components/SignalCard";

export default function MapPage() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setLocation([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const fetchSignals = useCallback(async (loc) => {
    if (!loc) return;
    try {
      const { data } = await api.get("/signals", { params: { lat: loc[0], lng: loc[1], max_distance: 5000 } });
      setSignals(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!location) return;
    fetchSignals(location);
    const t = setInterval(() => fetchSignals(location), 5000);
    return () => clearInterval(t);
  }, [location, fetchSignals]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-slate-200 p-0 overflow-hidden">
          <div className="h-[70vh]">
            <MapView
              userLocation={location}
              signals={signals}
              onSignalClick={(s) => navigate(`/app/signal/${s.signal_id}`)}
            />
          </div>
        </Card>
        <aside className="space-y-3">
          <h2 className="font-display font-bold text-lg text-slate-900">Active signals</h2>
          {signals.length === 0 && (
            <Card className="border-dashed border-slate-300 p-6 text-center">
              <p className="text-sm text-slate-500 font-body">No active signals in your area.</p>
            </Card>
          )}
          {signals.map((s) => <SignalCard key={s.signal_id} signal={s} />)}
        </aside>
      </main>
      <BottomNav />
    </div>
  );
}
