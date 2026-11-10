import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProjectAccentColor } from "@/types/portfolio";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Full, static Tailwind classes keep every registry accent discoverable at build time.
export const PROJECT_ACCENTS = {
  cyan: {
    text: "text-cyan-300",
    border: "border-cyan-400/50",
    background: "bg-cyan-400/10",
    glow: "shadow-[0_0_32px_-12px_#22d3ee55]",
    dot: "bg-cyan-300",
    scope: "accent-cyan",
  },
  emerald: {
    text: "text-emerald-300",
    border: "border-emerald-400/50",
    background: "bg-emerald-400/10",
    glow: "shadow-[0_0_32px_-12px_#34d39955]",
    dot: "bg-emerald-300",
    scope: "accent-emerald",
  },
  violet: {
    text: "text-violet-300",
    border: "border-violet-400/50",
    background: "bg-violet-400/10",
    glow: "shadow-[0_0_32px_-12px_#a78bfa55]",
    dot: "bg-violet-300",
    scope: "accent-violet",
  },
  amber: {
    text: "text-amber-300",
    border: "border-amber-400/50",
    background: "bg-amber-400/10",
    glow: "shadow-[0_0_32px_-12px_#fbbf2455]",
    dot: "bg-amber-300",
    scope: "accent-amber",
  },
  rose: {
    text: "text-rose-300",
    border: "border-rose-400/50",
    background: "bg-rose-400/10",
    glow: "shadow-[0_0_32px_-12px_#fb718555]",
    dot: "bg-rose-300",
    scope: "accent-rose",
  },
  blue: {
    text: "text-blue-300",
    border: "border-blue-400/50",
    background: "bg-blue-400/10",
    glow: "shadow-[0_0_32px_-12px_#60a5fa55]",
    dot: "bg-blue-300",
    scope: "accent-blue",
  },
} satisfies Record<
  ProjectAccentColor,
  {
    text: string;
    border: string;
    background: string;
    glow: string;
    dot: string;
    scope: string;
  }
>;

export function getProjectAccent(accent: ProjectAccentColor) {
  return PROJECT_ACCENTS[accent];
}
