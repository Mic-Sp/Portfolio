"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 639px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getSnapshot = () =>
  window.matchMedia(QUERY).matches ? ("narrow" as const) : ("wide" as const);
const getServerSnapshot = () => "pending" as const;

// A stable first render avoids media-query hydration mismatches. Start flat until hydrated.
export function useDeckViewport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
