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

const ServicesThemeContext = createContext<{
  isLight: boolean;
  toggleTheme: () => void;
} | null>(null);

/** Shared preference; consumers decide whether their current route should use it. */
export function ServicesThemeProvider({ children }: { children: ReactNode }) {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setIsLight(localStorage.getItem("services-theme") === "light");
      } catch {
        // Keep dark as the default when browser storage is unavailable.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = !isLight;
    setIsLight(next);
    try {
      localStorage.setItem("services-theme", next ? "light" : "dark");
    } catch {
      // Page and HUD still update together without persistent storage.
    }
  }, [isLight]);
  const value = useMemo(
    () => ({ isLight, toggleTheme }),
    [isLight, toggleTheme],
  );
  return (
    <ServicesThemeContext.Provider value={value}>
      {children}
    </ServicesThemeContext.Provider>
  );
}

export function useServicesTheme() {
  const context = useContext(ServicesThemeContext);
  if (!context)
    throw new Error(
      "useServicesTheme must be used within ServicesThemeProvider",
    );
  return context;
}
