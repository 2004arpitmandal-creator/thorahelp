import { Link } from "react-router-dom";
import { Heart, Shield, Mail } from "lucide-react";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600 font-body">
            A neighborhood-powered safety net. Tap one button to alert nearby members
            and get help in seconds — for medical emergencies, roadside breakdowns
            and everything in between.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href="#"
              data-testid="footer-app-store"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-white text-sm font-display font-semibold hover:bg-slate-800 transition"
            >
              <Shield className="h-4 w-4" /> App Store
            </a>
            <a
              href="#"
              data-testid="footer-play-store"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-white px-4 py-2 text-slate-900 text-sm font-display font-semibold hover:bg-slate-50 transition"
            >
              <Shield className="h-4 w-4" /> Google Play
            </a>
          </div>
        </div>
        <div>
          <h4 className="font-display font-bold text-slate-900 mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link to="/" className="hover:text-slate-900">How it works</Link></li>
            <li><Link to="/" className="hover:text-slate-900">Safety tips</Link></li>
            <li><Link to="/" className="hover:text-slate-900">For communities</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-bold text-slate-900 mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link to="/" className="hover:text-slate-900">About</Link></li>
            <li><a href="mailto:hello@thorahelp.app" className="hover:text-slate-900 inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/>Contact</a></li>
            <li><Link to="/" className="hover:text-slate-900">Privacy</Link></li>
            <li><Link to="/" className="hover:text-slate-900">Terms</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p className="font-body">© {new Date().getFullYear()} thoraHELP. Built with <Heart className="inline h-3 w-3 text-red-600" /> for safer neighborhoods.</p>
          <p className="font-body">Emergency lines: this app does not replace official emergency services.</p>
        </div>
      </div>
    </footer>
  );
}
