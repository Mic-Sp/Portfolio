"use client";

import type { ReactNode } from "react";
import { useHud, type DossierSection } from "@/context/HudContext";

export function DossierTrigger({
  children,
  className,
  section = "overview",
  label,
}: {
  children: ReactNode;
  className?: string;
  section?: DossierSection;
  label?: string;
}) {
  const { isDossierOpen, openDossier, closeDossier } = useHud();
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-haspopup="dialog"
      aria-controls="operator-dossier"
      aria-expanded={isDossierOpen}
      data-dossier-trigger
      onClick={() => (isDossierOpen ? closeDossier() : openDossier(section))}
    >
      {children}
    </button>
  );
}
