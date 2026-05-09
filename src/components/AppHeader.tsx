import { Sparkles } from "lucide-react";

interface AppHeaderProps {
  title?: string;
}

const AppHeader = ({ title = "CampusLink" }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center gap-3 h-16 px-4 max-w-lg mx-auto">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center shadow-pop animate-pop-in">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-fun-pink ring-2 ring-background animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight leading-none">
            <span className="text-gradient-primary">{title}</span>
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-widest">MTA · ride together</p>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
