import { Home, PlusCircle, User, Search, Inbox } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePendingBookingsCount } from "@/hooks/use-pending-bookings";
import { motion } from "framer-motion";

const navItems = [
  { path: "/", icon: Home, label: "בית" },
  { path: "/search", icon: Search, label: "חיפוש" },
  { path: "/post", icon: PlusCircle, label: "פרסום", primary: true },
  { path: "/bookings", icon: Inbox, label: "תיבה", showBadge: true },
  { path: "/profile", icon: User, label: "פרופיל" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pendingCount = 0 } = usePendingBookingsCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-area-pb pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="relative flex items-center justify-around h-16 rounded-3xl glass-card shadow-float px-2">
          {navItems.map(({ path, icon: Icon, label, showBadge, primary }) => {
            const active = location.pathname === path;
            const badge = showBadge && pendingCount > 0;

            if (primary) {
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative -mt-8 tap-scale"
                  aria-label={label}
                >
                  <div className="w-14 h-14 rounded-2xl gradient-fun shadow-fun flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
                    <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                </button>
              );
            }

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl tap-scale flex-1",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-1 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <div className="relative z-10">
                  <Icon className={cn("w-5 h-5 transition-transform", active && "scale-110")} strokeWidth={active ? 2.5 : 2} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center text-[9px] font-bold rounded-full gradient-fun text-white shadow-fun animate-pop-in">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold relative z-10">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
