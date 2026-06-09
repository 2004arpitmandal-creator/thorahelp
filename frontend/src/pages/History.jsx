import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import SignalCard from "@/components/SignalCard";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { History as HistoryIcon, Loader2 } from "lucide-react";

export default function History() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("any");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get("/signals/history", { params: { role, status } })
      .then(({ data }) => { if (!cancelled) setItems(data); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [role, status]);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-0">
      <Header />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-slate-900 grid place-items-center text-white">
            <HistoryIcon className="h-5 w-5"/>
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight" data-testid="history-title">
              {t("history.title")}
            </h1>
            <p className="text-sm text-slate-500 font-body">{t("history.subtitle")}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <Tabs value={role} onValueChange={setRole} className="flex-1">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="all" data-testid="history-tab-all" className="font-display">{t("history.tab_all")}</TabsTrigger>
              <TabsTrigger value="created" data-testid="history-tab-created" className="font-display">{t("history.tab_created")}</TabsTrigger>
              <TabsTrigger value="responded" data-testid="history-tab-responded" className="font-display">{t("history.tab_responded")}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <span className="text-xs font-body font-semibold text-slate-500 uppercase tracking-wider">{t("history.filter_status")}</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40 h-9 font-body" data-testid="history-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{t("history.status_any")}</SelectItem>
                <SelectItem value="active">{t("history.status_active")}</SelectItem>
                <SelectItem value="responded">{t("history.status_responded")}</SelectItem>
                <SelectItem value="resolved">{t("history.status_resolved")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-slate-300 p-10 text-center" data-testid="history-empty">
            <p className="text-sm text-slate-500 font-body">{t("history.empty")}</p>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="history-list">
            {items.map((s) => <SignalCard key={s.signal_id} signal={s} />)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
