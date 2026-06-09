import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Header({ showAuthButtons = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-16">
        <Link to={user ? "/app" : "/"} data-testid="header-logo-link">
          <Logo />
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" data-testid="header-bell-btn" aria-label="Notifications">
              <Bell className="h-5 w-5 text-slate-700" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="header-profile-trigger"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white pl-1 pr-3 py-1 hover:bg-slate-50 transition"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-orange-400 grid place-items-center text-white font-display font-bold text-sm">
                    {(user.name || user.email || "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-slate-700">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-display">{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app/profile")} data-testid="header-menu-profile">
                  <UserIcon className="mr-2 h-4 w-4" /> Profile & Medical
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await logout(); navigate("/login"); }}
                  data-testid="header-menu-logout"
                  className="text-red-600 focus:text-red-700"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : showAuthButtons ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              data-testid="header-login-btn"
              className="font-display"
            >
              Sign in
            </Button>
            <Button
              onClick={() => navigate("/signup")}
              data-testid="header-signup-btn"
              className="font-display bg-slate-900 hover:bg-slate-800 text-white"
            >
              Get started
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
