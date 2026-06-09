import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Map, History as HistoryIcon, User } from "lucide-react";

export default function BottomNav() {
  const { t } = useTranslation();
  const items = [
    { to: "/app", icon: Home, label: t("common.home"), testid: "bottomnav-home", end: true },
    { to: "/app/map", icon: Map, label: t("common.map"), testid: "bottomnav-map" },
    { to: "/app/history", icon: HistoryIcon, label: t("common.history"), testid: "bottomnav-history" },
    { to: "/app/profile", icon: User, label: t("common.profile").split(" ")[0], testid: "bottomnav-profile" },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="grid grid-cols-4 h-16">
        {items.map(({ to, icon: Icon, label, testid, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            data-testid={testid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 font-display text-[11px] font-semibold ${
                isActive ? "text-red-600" : "text-slate-500"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
