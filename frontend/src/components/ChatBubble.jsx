import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { API, getToken } from "@/lib/api";

function timeStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function VoiceBubble({ path, mine }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const token = getToken() || "";
  const src = `${API}/voice?path=${encodeURIComponent(path)}&auth=${encodeURIComponent(token)}`;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play();
  };

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-full ${mine ? "bg-blue-600" : "bg-white border border-slate-200"} w-56`}>
      <button onClick={toggle} className={`h-9 w-9 rounded-full grid place-items-center ${mine ? "bg-white/20 text-white" : "bg-blue-600 text-white"}`} data-testid="voice-play-btn">
        {playing ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4" />}
      </button>
      <span className="flex-1 flex items-end gap-0.5 h-6">
        {[8,14,10,18,12,16,10,14,8,12,18,10].map((h,i)=>(
          <span key={`b-${i}-${h}`} className={`w-0.5 ${mine ? "bg-white/80" : "bg-blue-600"} rounded-full`} style={{height:h}} />
        ))}
      </span>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        preload="none"
      />
    </div>
  );
}

export default function ChatBubble({ message, currentUserId }) {
  const mine = message.user_id === currentUserId;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {!mine && (
          <span className="text-[11px] font-semibold text-slate-500 font-body px-2 mb-0.5">
            {message.user_name || "Helper"}
          </span>
        )}
        {message.voice_path ? (
          <VoiceBubble path={message.voice_path} mine={mine} />
        ) : (
          <div
            className={`rounded-2xl px-3.5 py-2 font-body text-sm leading-snug shadow-sm ${
              mine ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
            }`}
          >
            {message.text}
          </div>
        )}
        <span className="text-[10px] text-slate-400 mt-0.5 px-2 font-body">{timeStr(message.created_at)}</span>
      </div>
    </div>
  );
}
