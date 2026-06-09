import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "light" | "dark" | "system";

interface Ctx {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<Ctx>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const resolve = (t: Theme): "light" | "dark" => {
  if (t === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
    return "light";
  }
  return t;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem("cl_theme") as Theme) || "system"
  );
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolve(theme));

  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(r);
    localStorage.setItem("cl_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(resolve("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState(resolved === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
