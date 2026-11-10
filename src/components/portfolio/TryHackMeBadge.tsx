"use client";

import { useEffect, useRef, useState } from "react";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { createThmBadgeDocument, THM_BADGE_MESSAGE } from "@/lib/thm-badge";

const DOCUMENT = createThmBadgeDocument(
  PROFILE_CONFIG.commsAndTelemetry.thmTelemetry.badgeScriptUrl,
);
const DEFAULT_SIZE = { width: 400, height: 120 };

export function TryHackMeBadge({ active = true }: { active?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [activated, setActivated] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(DEFAULT_SIZE.width);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [status, setStatus] = useState<"loading" | "embedded" | "unavailable">(
    "loading",
  );

  useEffect(() => {
    // Keep iframe loading, measurements and React updates out of drawer movement.
    if (!active) return;
    const container = host.current;
    if (!container) return;
    const intersection = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivated(true);
          intersection.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    intersection.observe(container);
    const resize = new ResizeObserver(([entry]) =>
      setAvailableWidth(entry.contentRect.width),
    );
    resize.observe(container);
    return () => {
      intersection.disconnect();
      resize.disconnect();
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    function receive(event: MessageEvent) {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== THM_BADGE_MESSAGE
      )
        return;
      if (event.data.status === "unavailable") {
        setStatus("unavailable");
        return;
      }
      const { width, height } = event.data;
      if (
        !["embedded", "sizing"].includes(event.data.status) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 180 ||
        width > 800 ||
        height < 40 ||
        height > 360
      )
        return;
      setSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
      if (event.data.status === "embedded") setStatus("embedded");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [active]);

  const scale = Math.min(1, availableWidth / size.width);
  return (
    <div
      ref={host}
      className="thm-badge-host"
      data-badge-status={status}
      style={{ height: size.height * scale }}
    >
      {activated && (
        <iframe
          ref={frame}
          title={`TryHackMe live badge for ${PROFILE_CONFIG.commsAndTelemetry.thmTelemetry.handle}`}
          srcDoc={DOCUMENT}
          referrerPolicy="no-referrer"
          scrolling="no"
          tabIndex={-1}
          className="thm-live-badge"
          style={{
            width: size.width,
            height: size.height,
            transform: `translateX(-50%) scale(${scale})`,
            visibility: status === "unavailable" ? "hidden" : "visible",
          }}
        />
      )}
      {status !== "embedded" && (
        <p className="thm-badge-status" role="status">
          {status === "unavailable"
            ? "Live badge unavailable. Use the profile link below to verify."
            : "Connecting to TryHackMe…"}
        </p>
      )}
    </div>
  );
}
