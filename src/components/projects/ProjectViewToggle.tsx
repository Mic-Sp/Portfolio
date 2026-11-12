"use client";

import { Box, Grid2X2 } from "lucide-react";
import { useHud } from "@/context/HudContext";

export function ProjectViewToggle() {
  const { viewMode, setViewMode } = useHud();
  const spatial = viewMode === "spatial";
  return (
    <button
      type="button"
      className="showcase-view-toggle"
      aria-label={spatial ? "Switch to Grid View" : "Switch to 3D View"}
      aria-pressed={!spatial}
      aria-controls="project-registry"
      onClick={() => setViewMode(spatial ? "grid" : "spatial")}
    >
      {spatial ? (
        <Grid2X2 size={12} aria-hidden="true" />
      ) : (
        <Box size={12} aria-hidden="true" />
      )}
      {spatial ? "Grid View" : "3D View"}
    </button>
  );
}
