"use client";

import { useReducedMotion } from "framer-motion";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const snapshot = () => window.matchMedia(QUERY).matches;
const serverSnapshot = () => null;

export function useMotionPreference() {
  const initial = useReducedMotion();
  // Motion retains its initial preference; also honor changes while the page is open.
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return current ?? initial ?? true;
}
