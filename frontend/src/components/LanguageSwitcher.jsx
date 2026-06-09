import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.resolvedLanguage) || LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="lang-switcher-trigger"
          className={`flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 transition text-slate-700 ${compact ? "text-xs" : "text-sm"}`}
          aria-label="Change language"
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="font-display font-semibold uppercase text-xs">{current.code}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="font-display text-xs uppercase tracking-wider text-slate-500">Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            data-testid={`lang-option-${l.code}`}
            className={current.code === l.code ? "font-bold text-red-600" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
