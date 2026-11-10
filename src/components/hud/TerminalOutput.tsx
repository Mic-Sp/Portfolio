"use client";

import type { CliAction, CliLine } from "@/lib/cli-commands";

export interface TerminalEntry {
  id: number;
  prompt: string;
  lines: CliLine[];
}

export function TerminalOutput({
  entries,
  onAction,
}: {
  entries: TerminalEntry[];
  onAction: (action: CliAction) => void;
}) {
  return entries.map((entry) => (
    <div key={entry.id} className="terminal-entry">
      {entry.prompt && (
        <p className="terminal-echo">
          <span aria-hidden="true">guest@mic-sp:~$ </span>
          {entry.prompt}
        </p>
      )}
      <div className="terminal-result">
        {entry.lines.map((line, index) => (
          <div
            key={index}
            className={`terminal-line terminal-tone-${line.tone ?? "default"}${line.nowrap ? " terminal-nowrap" : ""}`}
          >
            <span>{line.text}</span>
            {line.links?.map((link, linkIndex) =>
              link.href ? (
                <a
                  key={linkIndex}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.label} (opens in a new tab)`}
                >
                  {link.label}
                </a>
              ) : (
                <span key={linkIndex} className="terminal-link-unavailable">
                  {link.label}:—
                </span>
              ),
            )}
            {line.actions?.map((action) => (
              <button
                type="button"
                key={action.kind}
                className="terminal-inline-action"
                onClick={() => onAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  ));
}
