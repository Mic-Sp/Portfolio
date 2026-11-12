export type Theme = "light" | "dark";

const STORAGE_KEY = "portfolio-theme";
const LEGACY_STORAGE_KEY = "services-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

// Only fixed application constants are interpolated into this synchronous script.
// Storage failures must still allow the OS preference to resolve before paint.
export const THEME_INIT_SCRIPT = `(function(){var t;try{t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t!=="light"&&t!=="dark")t=localStorage.getItem(${JSON.stringify(LEGACY_STORAGE_KEY)})}catch(e){}if(t!=="light"&&t!=="dark")t=window.matchMedia(${JSON.stringify(SYSTEM_QUERY)}).matches?"dark":"light";document.documentElement.dataset.theme=t})()`;

let manualOverride: Theme | null | undefined;
const listeners = new Set<() => void>();
const isTheme = (value: string | null | undefined): value is Theme =>
  value === "light" || value === "dark";

function savePreference(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // A manual override still applies for this visit when storage is unavailable.
  }
}

function readPreference(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTheme(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (isTheme(legacy)) {
      savePreference(legacy);
      return legacy;
    }
  } catch {
    // An unavailable store is the same as having no saved manual override.
  }
  return null;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  for (const listener of listeners) listener();
}

export function getThemeSnapshot(): Theme {
  const theme = document.documentElement.dataset.theme;
  return isTheme(theme) ? theme : "dark";
}

// Hydrate the server markup consistently; React then reads the pre-paint snapshot.
export const getServerThemeSnapshot = (): Theme => "dark";

export function subscribeToTheme(onChange: () => void) {
  const media = window.matchMedia(SYSTEM_QUERY);
  if (manualOverride === undefined) manualOverride = readPreference();
  const resolve = () =>
    applyTheme(manualOverride ?? (media.matches ? "dark" : "light"));
  const onSystemChange = () => {
    if (manualOverride === null) resolve();
  };
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === STORAGE_KEY ||
      event.key === LEGACY_STORAGE_KEY
    ) {
      manualOverride = readPreference();
      resolve();
    }
  };

  listeners.add(onChange);
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  // Catch OS/storage changes between the head script and hydration without
  // replacing its resolved theme with the server's dark fallback.
  resolve();
  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleThemePreference() {
  manualOverride = getThemeSnapshot() === "light" ? "dark" : "light";
  savePreference(manualOverride);
  applyTheme(manualOverride);
}
