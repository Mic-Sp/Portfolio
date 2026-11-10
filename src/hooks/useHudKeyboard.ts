"use client";

import { useEffect } from "react";

interface HudKeyboardOptions {
  viewMode: "spatial" | "grid";
  isTerminalOpen: boolean;
  toggleTerminal: () => void;
  nextProject: () => void;
  prevProject: () => void;
}

export function useHudKeyboard({
  viewMode,
  isTerminalOpen,
  toggleTerminal,
  nextProject,
  prevProject,
}: HudKeyboardOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const target = event.target;
      const editable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          !!target.closest(
            'input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])',
          ));
      const consoleKey = event.key === "`" || event.key === "~";

      // The console close key remains available while typing in the future terminal.
      if (consoleKey && (!editable || isTerminalOpen)) {
        event.preventDefault();
        toggleTerminal();
        return;
      }
      if (editable || isTerminalOpen || viewMode !== "spatial") return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (event.key === "ArrowLeft") prevProject();
        else nextProject();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, isTerminalOpen, toggleTerminal, nextProject, prevProject]);
}
