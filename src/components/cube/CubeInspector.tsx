"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { useHud } from "@/context/HudContext";
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
  const { openWorldlineTerminal } = useHud();
  const [open, setOpen] = useState(false);
  const launchTerminalAfterExit = useRef(false);
  const handOffWorldline = useCallback(() => {
    launchTerminalAfterExit.current = true;
    setOpen(false);
  }, []);
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
          <AnimatePresence
            onExitComplete={() => {
              if (launchTerminalAfterExit.current) {
                launchTerminalAfterExit.current = false;
                openWorldlineTerminal();
              }
            }}
          >
            {open && (
              <SpatialCubeModal
                faces={faces}
                core={core}
                onClose={() => setOpen(false)}
                onWorldline={handOffWorldline}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
