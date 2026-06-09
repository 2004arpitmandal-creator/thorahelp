import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { Loader2, Mail, Lock } from "lucide-react";

function formatError(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const from = location.state?.from?.pathname || "/app";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex relative items-end overflow-hidden">
        <img src="https://images.unsplash.com/photo-1556484687-30636164638b?w=1400" alt="community" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
        <div className="relative z-10 p-12 text-white max-w-md">
          <Logo />
          <h2 className="mt-6 font-display font-black text-4xl tracking-tighter leading-[1.05]">
            Welcome back.<br />Your neighborhood is online.
          </h2>
          <p className="mt-4 text-white/80 font-body">Sign in to send and respond to SOS signals near you.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md p-8 border-slate-200 shadow-none">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="font-display font-black text-3xl text-slate-900 tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500 font-body">Welcome back to thoraHELP.</p>

          <Button
            type="button"
            variant="outline"
            onClick={googleLogin}
            data-testid="login-google-btn"
            className="mt-6 w-full font-display font-semibold h-11 border-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[10px] font-body font-bold uppercase tracking-widest text-slate-400">or with email</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="font-body font-semibold text-slate-700">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email" type="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  className="pl-9 h-11 font-body"
                  placeholder="you@neighborhood.app"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password" className="font-body font-semibold text-slate-700">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password" type="password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                  className="pl-9 h-11 font-body"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div data-testid="login-error" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-body">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full h-11 font-display font-bold bg-slate-900 hover:bg-slate-800 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-slate-500 font-body">
            New here?{" "}
            <Link to="/signup" data-testid="login-to-signup-link" className="text-red-600 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
