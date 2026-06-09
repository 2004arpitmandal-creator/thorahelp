import { Siren } from "lucide-react";

export default function SOSButton({ onTrigger, disabled = false, size = "lg" }) {
  const sizes = {
    lg: { btn: "h-44 w-44 sm:h-52 sm:w-52", icon: 56, text: "text-2xl" },
    md: { btn: "h-32 w-32", icon: 42, text: "text-lg" },
  };
  const s = sizes[size] || sizes.lg;

  return (
    <div className="relative inline-flex items-center justify-center">
      <span className={`th-pulse-ring ${s.btn}`} aria-hidden="true" />
      <span
        className={`th-pulse-ring ${s.btn}`}
        style={{ animationDelay: "0.9s" }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={onTrigger}
        disabled={disabled}
        data-testid="sos-button"
        aria-label="Send emergency SOS signal"
        className={`relative ${s.btn} rounded-full font-display font-black ${s.text} text-white shadow-2xl
          transition-transform active:scale-95
          flex flex-col items-center justify-center gap-1
          disabled:opacity-60 disabled:cursor-not-allowed`}
        style={{
          background: "radial-gradient(circle at 30% 30%, #FCA5A5 0%, #DC2626 45%, #991B1B 100%)",
          boxShadow: "0 12px 40px rgba(220,38,38,0.45), inset 0 -8px 20px rgba(0,0,0,0.2), inset 0 4px 12px rgba(255,255,255,0.25)",
        }}
      >
        <Siren size={s.icon === 56 ? 56 : 42} strokeWidth={2.2} />
        <span>SOS</span>
        <span className="text-[10px] font-body font-medium tracking-widest opacity-90">TAP TO ALERT</span>
      </button>
    </div>
  );
}
