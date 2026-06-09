import { LifeBuoy } from "lucide-react";

export default function Logo({ size = 28, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{
            width: size + 8,
            height: size + 8,
            background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)",
            boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
          }}
        >
          <LifeBuoy color="white" size={size - 4} strokeWidth={2.5} />
        </div>
      </div>
      <span className="font-display font-black tracking-tight text-xl leading-none">
        <span className="text-slate-900">thora</span>
        <span className="text-red-600">HELP</span>
      </span>
    </div>
  );
}
