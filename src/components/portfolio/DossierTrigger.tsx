"use client";

import type { ReactNode } from "react";
import {
  useHud,
  type DossierSection,
  type DossierTarget,
} from "@/context/HudContext";

export function DossierTrigger({
  children,
  className,
  section = "overview",
  label,
  target,
}: {
  children: ReactNode;
  className?: string;
  section?: DossierSection;
  label?: string;
  target?: DossierTarget;
}) {
  const { isDossierOpen, openDossier, openDossierToSection, closeDossier } =
    useHud();
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      aria-haspopup="dialog"
      aria-controls="operator-dossier"
      aria-expanded={isDossierOpen}
      data-dossier-trigger
      onClick={() =>
        target
          ? openDossierToSection(target)
          : isDossierOpen
            ? closeDossier()
            : openDossier(section)
      }
    >
      {children}
    </button>
  );
}
