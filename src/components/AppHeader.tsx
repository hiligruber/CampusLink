import { Bus } from "lucide-react";

interface AppHeaderProps {
  title?: string;
}

const AppHeader = ({ title = "CampusLink" }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2.5 h-14 px-4 max-w-lg mx-auto">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Bus className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
      </div>
    </header>
  );
};

export default AppHeader;
