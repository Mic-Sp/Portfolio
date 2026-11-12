"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  subscribeToTheme,
  toggleThemePreference,
} from "@/lib/theme";

const ThemeContext = createContext<{
  isLight: boolean;
  toggleTheme: () => void;
} | null>(null);

/** Share the pre-paint theme, following the OS until an explicit manual choice. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const isLight = theme === "light";
  const value = useMemo(
    () => ({ isLight, toggleTheme: toggleThemePreference }),
    [isLight],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
