import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, wsUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import MapView from "@/components/MapView";
import ChatBubble from "@/components/ChatBubble";
import VoiceRecorder from "@/components/VoiceRecorder";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Heart, Car, MessageSquare, Send, Users, Radar, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TYPE_META = {
  medical: { label: "Medical", color: "text-red-700 bg-red-50 border-red-200", Icon: Heart },
  roadside: { label: "Roadside", color: "text-amber-700 bg-amber-50 border-amber-200", Icon: Car },
  general: { label: "General", color: "text-blue-700 bg-blue-50 border-blue-200", Icon: MessageSquare },
};

export default function SignalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signal, setSignal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userLoc, setUserLoc] = useState(null);
  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const [{ data: s }, { data: msgs }] = await Promise.all([
        api.get(`/signals/${id}`),
        api.get(`/signals/${id}/messages`),
      ]);
      setSignal(s);
      setMessages(msgs);
    } catch (e) {
      toast.error("Signal not found");
      navigate("/app");
    }
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get user location for the map
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserLoc([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, []);

  // Poll messages + WS for new messages
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(wsUrl());
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === "new_message" && data.signal_id === id) {
            setMessages((m) => m.some((x) => x.message_id === data.message.message_id) ? m : [...m, data.message]);
          }
          if ((data.event === "signal_updated" || data.event === "signal_escalated" || data.event === "signal_resolved") &&
              data.signal?.signal_id === id) {
            setSignal((s) => ({ ...s, ...data.signal }));
          }
        } catch { /* ignore parse */ }
      };
    } catch { /* ignore */ }
    return () => { try { ws && ws.close(); } catch { /* ignore */ } };
  }, [id]);

  // Scroll chat to bottom on new
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  if (!signal) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
      </div>
    );
  }

  const meta = TYPE_META[signal.type] || TYPE_META.general;
  const { Icon } = meta;
  const mine = signal.user_id === user?.user_id;
  const alreadyResponded = (signal.responders || []).some((r) => r.user_id === user?.user_id);

  const sendMessage = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/signals/${id}/messages`, { text: text.trim() });
      setMessages((m) => [...m, data]);
      setText("");
    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const respond = async () => {
    try {
      const { data } = await api.post(`/signals/${id}/respond`);
      setSignal((s) => ({ ...s, ...data }));
      toast.success("You're on the way", { description: "The requester has been notified." });
    } catch {
      toast.error("Could not respond");
    }
  };

  const resolve = async () => {
    try {
      const { data } = await api.post(`/signals/${id}/resolve`);
      setSignal((s) => ({ ...s, ...data }));
      toast.success("Marked resolved", { description: "Thank you for the update." });
    } catch {
      toast.error("Could not resolve");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pt-4 flex-1 grid lg:grid-cols-5 gap-5 pb-6">
        {/* Signal info + map (left, 2 cols) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${meta.color}`}>
              <Icon className="h-3.5 w-3.5"/> {meta.label}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              signal.status === "resolved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
              signal.status === "responded" ? "bg-blue-50 text-blue-700 border border-blue-200" :
              "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {signal.status}
            </span>
          </div>

          <Card className="border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-red-500 to-orange-400 grid place-items-center text-white font-display font-bold">
                {(signal.user_name || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-display font-bold text-slate-900">{signal.user_name || "Anonymous"}</p>
                <p className="text-xs text-slate-500 font-body">{signal.description || signal.title}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Radius" value={`${signal.radius}m`} Icon={Radar} />
              <Stat label="Helpers" value={(signal.responders || []).length} Icon={Users} />
              <Stat label="Blood" value={signal.user_blood_group || "—"} Icon={ShieldCheck} />
            </div>
            <div className="mt-4 flex gap-2">
              {mine ? (
                signal.status !== "resolved" && (
                  <Button onClick={resolve} data-testid="resolve-btn" className="w-full font-display font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                    Mark resolved
                  </Button>
                )
              ) : (
                signal.status !== "resolved" && (
                  <Button
                    onClick={respond}
                    disabled={alreadyResponded}
                    data-testid="respond-btn"
                    className="w-full font-display font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {alreadyResponded ? "You're on the way" : "I'm on my way"}
                  </Button>
                )
              )}
            </div>
          </Card>

          <Card className="border-slate-200 overflow-hidden p-0">
            <div className="h-64">
              <MapView
                userLocation={userLoc}
                signals={[signal]}
                center={[signal.lat, signal.lng]}
              />
            </div>
          </Card>
        </section>

        {/* Chat (right, 3 cols) */}
        <section className="lg:col-span-3 flex flex-col">
          <Card className="border-slate-200 p-0 flex-1 flex flex-col min-h-[60vh]">
            <div className="px-5 py-3 border-b border-slate-200">
              <h3 className="font-display font-bold text-slate-900">Chat with helpers</h3>
              <p className="text-xs text-slate-500 font-body">Send text or a voice note. Everyone helping will see it.</p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-slate-50/60">
              {messages.length === 0 && (
                <div className="text-center text-sm text-slate-500 font-body py-8">No messages yet. Say hi or describe the situation.</div>
              )}
              {messages.map((m) => (
                <ChatBubble key={m.message_id} message={m} currentUserId={user?.user_id} />
              ))}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <VoiceRecorder signalId={id} onUploaded={load} />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && sendMessage()}
                placeholder="Type a message…"
                data-testid="chat-text-input"
                className="font-body h-11"
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                data-testid="chat-send-btn"
                className="h-11 px-4 font-display font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <Icon className="h-4 w-4 mx-auto text-slate-500" />
      <p className="mt-1 font-display font-black text-slate-900">{value}</p>
      <p className="text-[10px] font-body uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
