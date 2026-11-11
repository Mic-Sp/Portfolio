"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const ThemeContext = createContext<{
  isLight: boolean;
  toggleTheme: () => void;
} | null>(null);

/** Start dark on the server and during hydration; restore the saved global preference after mount. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("portfolio-theme");
        const legacy =
          saved === null ? localStorage.getItem("services-theme") : null;
        const preference = saved ?? legacy;
        setIsLight(preference === "light");
        if (saved === null && legacy !== null)
          localStorage.setItem("portfolio-theme", legacy);
      } catch {
        // Keep dark as the default when browser storage is unavailable.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isLight ? "light" : "dark";
  }, [isLight]);

  const toggleTheme = useCallback(() => {
    const next = !isLight;
    setIsLight(next);
    try {
      localStorage.setItem("portfolio-theme", next ? "light" : "dark");
    } catch {
      // All routes still update together when persistent storage is unavailable.
    }
  }, [isLight]);
  const value = useMemo(
    () => ({ isLight, toggleTheme }),
    [isLight, toggleTheme],
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
