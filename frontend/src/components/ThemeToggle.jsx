import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "../store/themeStore";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon size={18} className="text-slate-700" />
      ) : (
        <Sun size={18} className="text-amber-400" />
      )}
    </button>
  );
}
