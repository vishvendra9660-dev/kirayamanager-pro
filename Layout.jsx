import { useEffect, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { LayoutDashboard, Building2, DoorOpen, Zap, IndianRupee, House, Smartphone, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, id: "nav-dashboard" },
  { to: "/properties", label: "Properties", icon: Building2, id: "nav-properties" },
  { to: "/rooms", label: "Rooms", icon: DoorOpen, id: "nav-rooms" },
  { to: "/bijli", label: "Bijli", icon: Zap, id: "nav-electricity" },
  { to: "/rent", label: "Khata", icon: IndianRupee, id: "nav-payments" },
];

export default function Layout({ children }) {
  const [installEvt, setInstallEvt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallEvt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const doInstall = async () => {
    if (installEvt) {
      installEvt.prompt();
      setInstallEvt(null);
    } else {
      toast.info("Chrome menu (⋮) kholkar 'Add to Home screen' chunein — app jaisa icon ban jayega");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#0F172A] text-white grain-overlay z-40">
        <div className="flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <House className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">Room Hisaab</h1>
            <p className="text-xs text-white/60">Kiraya & Bijli Manager</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.id}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-5 border-t border-white/10 space-y-2">
          <button
            onClick={doInstall}
            data-testid="install-app-btn"
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-300 hover:bg-white/10 transition-colors"
          >
            <Smartphone className="w-4 h-4" /> App download karein
          </button>
          <Link
            to="/tenant"
            data-testid="tenant-portal-link"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" /> Kirayedaar login — apna khata dekhein
          </Link>
          <p className="px-4 text-xs text-white/40 pt-1">Aapke rooms ka poora hisaab — ek jagah</p>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-40 bg-[#0F172A] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
          <House className="w-4 h-4" />
        </div>
        <h1 className="font-display font-bold">Room Hisaab</h1>
      </header>

      <main className="md:pl-64 pb-24 md:pb-10">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t flex">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={item.id}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-emerald-600" : "text-slate-400"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
