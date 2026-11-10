"use client";

import { Terminal, X } from "lucide-react";
import { useHud } from "@/context/HudContext";

export function TerminalPlaceholder() {
  const { isTerminalOpen, toggleTerminal } = useHud();
  return (
    <div
      id="terminal-placeholder"
      hidden={!isTerminalOpen}
      className="terminal-placeholder"
    >
      {isTerminalOpen && (
        <>
          <Terminal size={16} aria-hidden="true" />
          <p role="status">
            <span className="text-cyan-200">CONSOLE CHANNEL OPEN</span>
            <span className="terminal-detail">
              {" // "}Terminal interface arrives in Phase 3. Press ~ to close.
            </span>
          </p>
          <button
            type="button"
            onClick={toggleTerminal}
            aria-label="Close console placeholder"
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  );
}
