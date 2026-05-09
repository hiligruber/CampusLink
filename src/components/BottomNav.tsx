import { Home, PlusCircle, User, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  const navItems = [
    { path: "/", icon: Home, label: t("nav_home") },
    { path: "/search", icon: Search, label: t("nav_search") },
    { path: "/post", icon: PlusCircle, label: t("nav_post") },
    { path: "/profile", icon: User, label: t("nav_profile") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-4 py-2 transition-colors",
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
