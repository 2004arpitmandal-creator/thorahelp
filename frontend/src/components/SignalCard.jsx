import { useNavigate } from "react-router-dom";
import { Heart, Car, MessageSquare, Users, Clock, MapPin } from "lucide-react";

const TYPE_META = {
  medical: { label: "Medical", color: "bg-red-100 text-red-700 border-red-200", Icon: Heart },
  roadside: { label: "Roadside", color: "bg-amber-100 text-amber-700 border-amber-200", Icon: Car },
  general: { label: "General", color: "bg-blue-100 text-blue-700 border-blue-200", Icon: MessageSquare },
};

function timeAgo(iso) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.max(1, Math.floor(d))}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

export default function SignalCard({ signal, onClick }) {
  const navigate = useNavigate();
  const meta = TYPE_META[signal.type] || TYPE_META.general;
  const { Icon } = meta;
  const distance = signal.distance_m != null
    ? signal.distance_m < 1000
      ? `${Math.round(signal.distance_m)}m`
      : `${(signal.distance_m / 1000).toFixed(1)}km`
    : "";

  const handleClick = () => {
    if (onClick) onClick(signal);
    else navigate(`/app/signal/${signal.signal_id}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid={`signal-card-${signal.signal_id}`}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center border ${meta.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-slate-900 truncate">{signal.title}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 line-clamp-2 font-body">
            {signal.description || `from ${signal.user_name || "a neighbor"}`}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 font-body">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{distance}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5"/>{timeAgo(signal.created_at)}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5"/>{(signal.responders || []).length} helping</span>
          </div>
        </div>
      </div>
    </button>
  );
}
