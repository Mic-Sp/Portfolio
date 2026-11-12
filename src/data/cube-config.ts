import type { ReactNode } from "react";

export type CubeFaceId = "front" | "back" | "right" | "left" | "top" | "bottom";

export interface CubeFaceSlot {
  id: CubeFaceId;
  label: string;
  eyebrow?: string;
  content?: ReactNode;
  onActivate?: () => void;
}

export interface CubeCoreSlot {
  label: string;
  content?: ReactNode;
  onActivate?: () => void;
}

export const CUBE_FACES: readonly CubeFaceSlot[] = [
  { id: "front", label: "Front", eyebrow: "01 // FRONT" },
  { id: "back", label: "Back", eyebrow: "02 // BACK" },
  { id: "right", label: "Right", eyebrow: "03 // RIGHT" },
  { id: "left", label: "Left", eyebrow: "04 // LEFT" },
  { id: "top", label: "Top", eyebrow: "05 // TOP" },
  { id: "bottom", label: "Bottom", eyebrow: "06 // BOTTOM" },
];

export const CUBE_CORE: CubeCoreSlot = { label: "Inner Core" };
