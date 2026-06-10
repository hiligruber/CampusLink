import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/contexts/ThemeContext";
import { useLang } from "@/contexts/LanguageContext";
import { Sun, Moon, Globe, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const Settings = () => {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useLang();

  const themes: { id: "light" | "dark"; label: string; icon: any }[] = [
    { id: "light", label: t("theme_light"), icon: Sun },
    { id: "dark", label: t("theme_dark"), icon: Moon },
  ];

  return (
    <div className="min-h-screen pb-24">
      <AppHeader subtitle={t("settings_title")} />
      <main className="max-w-3xl mx-auto px-5 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("settings_title")}</h1>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4" /> {t("appearance")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {themes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl p-4 border-2 transition-all",
                  theme === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 bg-card/60"
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-bold">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> {t("language")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(["EN", "HE"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-2xl p-4 border-2 transition-all text-base font-bold",
                  lang === l
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/40 bg-card/60"
                )}
              >
                {l === "EN" ? t("english") : t("hebrew")}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4" /> Support
          </h2>
          <Link to="/support" className="flex items-center justify-between rounded-2xl border-2 border-border hover:border-primary/40 bg-card/60 p-4 transition-all">
            <div>
              <p className="font-bold text-sm">Contact Support</p>
              <p className="text-xs text-muted-foreground mt-0.5">Submit a request, report an issue, or appeal a block</p>
            </div>
            <LifeBuoy className="w-5 h-5 text-primary" />
          </Link>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Settings;
