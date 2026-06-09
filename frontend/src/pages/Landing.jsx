import { Link, useNavigate } from "react-router-dom";
import { Siren, MapPin, MessageSquare, Mic, Radar, ShieldCheck, Zap, ArrowRight, Heart, Car, Users } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <Header showAuthButtons />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-red-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-display font-bold uppercase tracking-widest">
              <Siren className="h-3.5 w-3.5" /> Hyperlocal SOS
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-display font-black tracking-tighter leading-[1.05] text-slate-900">
              One tap. Your neighbors come running.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl font-body leading-relaxed">
              thoraHELP turns the people within 100 meters of you into a real-time
              safety net. Medical emergency, flat tyre or empty fuel tank — send a
              signal and get help from someone close by, in seconds.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate("/signup")}
                data-testid="hero-cta-signup"
                className="font-display font-bold bg-red-600 hover:bg-red-700 text-white h-12 px-6 text-base"
              >
                Get the app free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                data-testid="hero-cta-login"
                className="font-display font-bold h-12 px-6 text-base border-slate-300"
              >
                Sign in
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-slate-500 font-body">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Privacy-first</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> Real-time alerts</span>
              <span className="flex items-center gap-1.5"><Radar className="h-4 w-4 text-blue-600" /> 100m → 5km radar</span>
            </div>
          </div>

          {/* Mock phone */}
          <div className="relative flex justify-center">
            <div className="relative w-[300px] h-[600px] rounded-[3rem] bg-slate-900 p-3 shadow-2xl">
              <div className="h-full w-full rounded-[2.4rem] bg-slate-50 overflow-hidden relative">
                <div className="h-7 bg-slate-900 flex items-center justify-center">
                  <div className="h-1.5 w-20 bg-slate-700 rounded-full" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-sm"><span className="text-slate-900">thora</span><span className="text-red-600">HELP</span></span>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-orange-400 grid place-items-center text-white text-xs font-display font-bold">A</div>
                  </div>
                  <p className="mt-6 text-[11px] uppercase tracking-widest text-slate-500 font-body font-bold">Hold for emergency</p>
                  <div className="mt-3 flex justify-center">
                    <div className="relative inline-flex items-center justify-center">
                      <span className="th-pulse-ring h-32 w-32" />
                      <span className="th-pulse-ring h-32 w-32" style={{animationDelay:".9s"}} />
                      <div className="relative h-32 w-32 rounded-full grid place-items-center text-white"
                        style={{background:"radial-gradient(circle at 30% 30%, #FCA5A5, #DC2626 50%, #991B1B)",
                          boxShadow:"0 12px 32px rgba(220,38,38,.4), inset 0 -6px 16px rgba(0,0,0,.2)"}}>
                        <Siren className="h-10 w-10" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <MiniCard color="red" Icon={Heart} title="Medical · 80m" sub="Aman needs help nearby" />
                    <MiniCard color="amber" Icon={Car} title="Roadside · 240m" sub="Stuck on Ring Road" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - Bento */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-body font-bold uppercase tracking-[0.2em] text-slate-500">How it works</span>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            A safer city, powered by your neighbors
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard Icon={Siren} title="SOS in 1 tap" body="Big crimson SOS button on every screen. One press alerts everyone within 100m instantly." color="red" />
          <FeatureCard Icon={Radar} title="Smart radius" body="If no one responds in 30s, the alert expands by 100m — every 30 seconds — up to 5km." color="blue" />
          <FeatureCard Icon={MessageSquare} title="Chat & voice" body="WhatsApp-style messaging with voice notes lets you guide responders or describe the situation hands-free." color="amber" />
          <FeatureCard Icon={MapPin} title="Live map" body="See exactly where the signal is and who's responding, on a real map." color="emerald" wide />
          <FeatureCard Icon={Users} title="Neighbors helping neighbors" body="Not just medical. Roadside breakdowns, lost child, flat tyre — neighbors show up for each other." color="violet" />
        </div>
      </section>

      {/* TRUST */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-body font-bold uppercase tracking-[0.2em] text-slate-500">Designed for trust</span>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Help that respects your privacy</h2>
            <ul className="mt-6 space-y-4 text-slate-700 font-body">
              <li className="flex gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5"/> Your precise location is only shared when you send a signal — never in the background.</li>
              <li className="flex gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5"/> Voice notes are end-to-tunneled through encrypted storage.</li>
              <li className="flex gap-3"><ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5"/> Medical profile (blood group, allergies) is only visible to confirmed responders.</li>
            </ul>
          </div>
          <div className="relative h-72 rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
            <img src="https://images.unsplash.com/photo-1476385822777-70eabacbd41f?w=1200" alt="city map" className="absolute inset-0 h-full w-full object-cover"/>
            <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-white/95 backdrop-blur border border-slate-200 shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 grid place-items-center"><Heart className="h-5 w-5 text-red-600"/></div>
                <div>
                  <p className="font-display font-bold text-slate-900">Medical emergency · 80m away</p>
                  <p className="text-xs text-slate-500 font-body">3 neighbors are on their way</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-5xl font-black tracking-tighter text-slate-900">
          The next 100m matters most.
        </h2>
        <p className="mt-4 text-slate-600 font-body max-w-xl mx-auto">Join the neighborhood safety net. It&apos;s free and takes 30 seconds.</p>
        <Button
          onClick={() => navigate("/signup")}
          data-testid="cta-bottom-signup"
          className="mt-7 font-display font-bold bg-red-600 hover:bg-red-700 text-white h-12 px-8 text-base"
        >
          Create your account <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      <Footer />
    </div>
  );
}

function MiniCard({ color, Icon, title, sub }) {
  const colorMap = { red: "bg-red-50 text-red-700 border-red-200", amber: "bg-amber-50 text-amber-700 border-amber-200" };
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white">
      <div className={`h-8 w-8 rounded-lg grid place-items-center border ${colorMap[color]}`}><Icon className="h-4 w-4"/></div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-xs text-slate-900 truncate">{title}</p>
        <p className="text-[10px] text-slate-500 font-body truncate">{sub}</p>
      </div>
    </div>
  );
}

function FeatureCard({ Icon, title, body, color, wide }) {
  const colorMap = {
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <div className={`${wide ? "md:col-span-2" : ""} group rounded-2xl border border-slate-200 bg-white p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}>
      <div className={`h-11 w-11 rounded-xl border grid place-items-center ${colorMap[color]}`}>
        <Icon className="h-5 w-5"/>
      </div>
      <h3 className="mt-4 font-display font-bold text-lg text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 font-body leading-relaxed">{body}</p>
    </div>
  );
}
