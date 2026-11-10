"use client";

import {
  ArrowUpRight,
  GitFork,
  Network,
  Mail,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { CopyEmailButton } from "./CopyEmailButton";
import { TryHackMeBadge } from "./TryHackMeBadge";
import "./comms-uplink.css";

export function CommsUplink({
  prefix,
  telemetryActive = true,
}: {
  prefix: string;
  telemetryActive?: boolean;
}) {
  const { directChannels, thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
  return (
    <section
      className="comms-uplink"
      data-dossier-anchor="comms"
      aria-labelledby={`${prefix}-comms`}
    >
      <h3 className="dossier-label" id={`${prefix}-comms`}>
        <Radio size={16} aria-hidden="true" /> COMMS UPLINK & APPSEC
        VERIFICATION
      </h3>
      <div className="comms-direct-grid">
        {[
          { channel: directChannels.github, Icon: GitFork },
          { channel: directChannels.linkedin, Icon: Network },
        ].map(({ channel, Icon }) => (
          <a
            key={channel.href}
            className="comms-channel-card"
            href={channel.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="comms-channel-label">
              <Icon size={16} aria-hidden="true" /> {channel.label}
              <ArrowUpRight size={14} aria-hidden="true" />
            </span>
            <span className="comms-channel-handle">{channel.handle}</span>
          </a>
        ))}
        <div className="comms-channel-card comms-email-card">
          <a href={directChannels.email.href}>
            <span className="comms-channel-label">
              <Mail size={16} aria-hidden="true" /> DIRECT EMAIL{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </span>
            <span className="comms-channel-handle">
              {directChannels.email.address}
            </span>
          </a>
          <CopyEmailButton />
        </div>
      </div>
      <article className="thm-telemetry-card">
        <header className="thm-telemetry-heading">
          <h4>
            <ShieldCheck size={17} aria-hidden="true" /> TRYHACKME {"//"} LIVE
            TELEMETRY
          </h4>
          <span className="thm-league">{thmTelemetry.league}</span>
        </header>
        <div className="thm-telemetry-body">
          <div className="thm-badge-column">
            <TryHackMeBadge active={telemetryActive} />
          </div>
          <a
            className="thm-profile-link"
            href={thmTelemetry.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            OPEN FULL PROFILE ({thmTelemetry.handle}){" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </article>
    </section>
  );
}
