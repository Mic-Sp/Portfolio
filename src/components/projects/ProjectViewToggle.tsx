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
      aria-label="Flat grid view"
      aria-pressed={!spatial}
      aria-controls="project-registry"
      onClick={() => setViewMode(spatial ? "grid" : "spatial")}
    >
      {spatial ? (
        <Grid2X2 size={12} aria-hidden="true" />
      ) : (
        <Box size={12} aria-hidden="true" />
      )}
      {spatial ? "FLAT GRID VIEW" : "3D SPATIAL DECK"}
    </button>
  );
}
