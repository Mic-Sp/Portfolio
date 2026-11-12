"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CUBE_CORE,
  CUBE_FACES,
  type CubeCoreSlot,
  type CubeFaceSlot,
} from "@/data/cube-config";
import { OrbitalTelemetryCore } from "@/components/portfolio/OrbitalTelemetryCore";
import { SpatialCubeModal } from "./SpatialCubeModal";

export interface CubeInspectorProps {
  faces?: readonly CubeFaceSlot[];
  core?: CubeCoreSlot;
}

/** Slot content and actions are independent of the modal's rotation mechanics. */
export function CubeInspector({
  faces = CUBE_FACES,
  core = CUBE_CORE,
}: CubeInspectorProps) {
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  return (
    <>
      <OrbitalTelemetryCore
        isInspectorOpen={open}
        onInspect={() => {
          setHasOpened(true);
          setOpen(true);
        }}
      />
      {hasOpened &&
        createPortal(
          <AnimatePresence>
            {open && (
              <SpatialCubeModal
                faces={faces}
                core={core}
                onClose={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
