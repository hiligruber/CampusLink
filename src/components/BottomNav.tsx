import { Home, PlusCircle, Activity } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  const navItems = [
    { path: "/", icon: Home, label: t("nav_home") },
    { path: "/post", icon: PlusCircle, label: t("nav_post"), primary: true },
    { path: "/active", icon: Activity, label: "פעילות" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-3xl mx-auto px-6">
        {navItems.map(({ path, icon: Icon, label, primary }) => {
          const active = location.pathname === path;
          if (primary) {
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "relative -mt-7 flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl",
                  "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-pop",
                  "transition-transform active:scale-95"
                )}
                aria-label={label}
              >
                <Icon className="w-6 h-6" strokeWidth={2.2} />
                <span className="text-[10px] font-bold tracking-wide">{label}</span>
              </button>
            );
          }
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-5 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 1.8} />
              <span className={cn("text-[10px] tracking-wide", active && "font-semibold")}>
                {label}
              </span>
              {active && (
                <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
