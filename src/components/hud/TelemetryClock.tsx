"use client";

import { useSyncExternalStore } from "react";
import { PROFILE_CONFIG } from "@/data/profile.config";

function subscribe(onTick: () => void) {
  const interval = window.setInterval(onTick, 1000);
  return () => window.clearInterval(interval);
}
const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => null;
const localFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PROFILE_CONFIG.timeZone,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});
const utcFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function TelemetryClock() {
  const seconds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const now = seconds === null ? null : new Date(seconds * 1000);
  return (
    <div className="telemetry-clock" aria-label="Chicago and UTC clocks">
      <span>{now ? localFormatter.format(now) : "--:--:-- CST"}</span>
      <span className="clock-divider">/</span>
      <span className="text-slate-300">
        {now ? utcFormatter.format(now) : "--:--:--"} UTC
      </span>
    </div>
  );
}
