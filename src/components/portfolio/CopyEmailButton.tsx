"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PROFILE_CONFIG } from "@/data/profile.config";

export function CopyEmailButton({ compact = false }: { compact?: boolean }) {
  const { address } = PROFILE_CONFIG.commsAndTelemetry.directChannels.email;
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (reset.current) clearTimeout(reset.current);
    },
    [],
  );

  async function copy() {
    if (reset.current) clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(address);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    reset.current = setTimeout(() => setStatus("idle"), 3500);
  }

  return (
    <button
      type="button"
      className={`copy-email-button${compact ? " hero-uplink-pill" : ""}`}
      data-copy-status={status}
      aria-label={`Copy email address ${address}`}
      onClick={() => void copy()}
    >
      {status === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      <span aria-live="polite" aria-atomic="true">
        {status === "copied"
          ? `COPIED: ${address} // OK`
          : status === "error"
            ? "COPY UNAVAILABLE // USE EMAIL LINK"
            : compact
              ? `EMAIL // ${address} (COPY)`
              : "COPY EMAIL"}
      </span>
    </button>
  );
}
