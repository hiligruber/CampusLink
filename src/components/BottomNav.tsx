import { Home, PlusCircle, User, Search, Inbox } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePendingBookingsCount } from "@/hooks/use-pending-bookings";

const navItems = [
  { path: "/", icon: Home, label: "Rides" },
  { path: "/search", icon: Search, label: "Search" },
  { path: "/post", icon: PlusCircle, label: "Post" },
  { path: "/bookings", icon: Inbox, label: "Inbox", showBadge: true },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pendingCount = 0 } = usePendingBookingsCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label, showBadge }) => {
          const active = location.pathname === path;
          const badge = showBadge && pendingCount > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                {badge && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 inline-flex items-center justify-center text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
