import { create } from "zustand";

const getSavedTheme = () => {
  try {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem("theme", theme);
  } catch {
    // The theme still works for this session if storage is unavailable.
  }
};

const initialTheme = getSavedTheme();

// Apply the saved theme as soon as this module loads.
if (typeof document !== "undefined") {
  applyTheme(initialTheme);
}

export const useThemeStore = create((set) => ({
  theme: initialTheme,

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === "light" ? "dark" : "light";
      applyTheme(newTheme);

      return { theme: newTheme };
    }),
}));
