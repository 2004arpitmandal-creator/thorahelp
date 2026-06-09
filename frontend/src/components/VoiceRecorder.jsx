import { useRef, useState } from "react";
import { Mic, StopCircle, Trash2, Send } from "lucide-react";
import { api, getToken } from "@/lib/api";

export default function VoiceRecorder({ signalId, onUploaded }) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data && e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((x) => x + 1), 1000);
    } catch (e) {
      alert("Microphone permission denied or unavailable.");
    }
  };

  const stop = () => {
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const cancel = () => {
    setBlob(null);
    setElapsed(0);
  };

  const send = async () => {
    if (!blob) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, `voice-${Date.now()}.webm`);
      const { data } = await api.post(`/signals/${signalId}/voice`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await api.post(`/signals/${signalId}/messages`, { voice_path: data.path });
      cancel();
      onUploaded && onUploaded();
    } catch (e) {
      alert("Failed to send voice message");
    } finally {
      setUploading(false);
    }
  };

  if (blob) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 border border-slate-200">
        <span className="text-xs font-body font-semibold text-slate-700">Ready to send</span>
        <span className="flex items-end gap-0.5 h-5">
          {[6,10,14,18,12,8,16,12,8].map((h,i)=>(
            <span key={`r-${i}-${h}`} className="w-0.5 bg-blue-600 rounded-full" style={{height:h}} />
          ))}
        </span>
        <button onClick={cancel} className="ml-2 p-1.5 rounded-full hover:bg-slate-200" data-testid="voice-cancel-btn" aria-label="Discard">
          <Trash2 className="h-4 w-4 text-slate-600" />
        </button>
        <button onClick={send} disabled={uploading} className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60" data-testid="voice-send-btn" aria-label="Send voice">
          <Send className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-red-50 border border-red-200">
        <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
        <span className="text-xs font-body font-bold text-red-700">REC {String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</span>
        <span className="flex items-end gap-0.5 h-5">
          {[8,14,10,18,12,16,10].map((h,i)=>(
            <span key={`rec-${i}-${h}`} className="th-bar w-0.5 bg-red-600 rounded-full" style={{height:h, animationDelay:`${i*0.1}s`}} />
          ))}
        </span>
        <button onClick={stop} className="ml-2 p-2 rounded-full bg-red-600 hover:bg-red-700" data-testid="voice-stop-btn" aria-label="Stop recording">
          <StopCircle className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      data-testid="voice-record-btn"
      aria-label="Record voice"
      className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
    >
      <Mic className="h-5 w-5 text-slate-700" />
    </button>
  );
}
