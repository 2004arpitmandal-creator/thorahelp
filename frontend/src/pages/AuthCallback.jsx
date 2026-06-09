import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const sessionId = params.get("session_id");
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", {}, {
          headers: { "X-Session-ID": sessionId },
        });
        setToken(data.access_token);
        setUser(data.user);
        navigate("/app", { replace: true });
      } catch (e) {
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-600 font-body">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
        <p>Signing you in…</p>
      </div>
    </div>
  );
}
