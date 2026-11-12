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
import { ContactTransmission } from "./ContactTransmission";
import "./comms-uplink.css";

export function CommsUplink({
  prefix,
  telemetryActive = true,
}: {
  prefix: string;
  telemetryActive?: boolean;
}) {
  const { directChannels, thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
  const channels = [
    {
      ...directChannels.github,
      id: "github",
      Icon: GitFork,
      status: "ONLINE",
      action: "OPEN GITHUB PROFILE",
    },
    {
      ...directChannels.linkedin,
      id: "linkedin",
      Icon: Network,
      status: "VERIFIED",
      action: "CONNECT ON LINKEDIN",
    },
    {
      id: "email",
      label: "DIRECT EMAIL",
      handle: directChannels.email.address,
      href: directChannels.email.href,
      description: directChannels.email.description,
      Icon: Mail,
      status: "ONLINE",
      action: "SEND MAILTO",
    },
  ];
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
        {channels.map(({ Icon, ...channel }) => (
          <article
            key={channel.id}
            className={`comms-channel-card${channel.id === "email" ? " comms-email-card" : ""}`}
            aria-labelledby={`${prefix}-channel-${channel.id}`}
          >
            <div className="comms-channel-main">
              <header className="comms-channel-heading">
                <p
                  className="comms-channel-label"
                  id={`${prefix}-channel-${channel.id}`}
                >
                  <Icon size={16} aria-hidden="true" />{" "}
                  <span>{channel.label}</span>
                </p>
                <span className="comms-channel-status">{channel.status}</span>
              </header>
              <div className="comms-channel-readout">
                <span className="comms-terminal-prefix" aria-hidden="true">
                  &gt;_
                </span>
                <span className="comms-channel-handle">{channel.handle}</span>
                <span className="comms-readout-dot" aria-hidden="true" />
              </div>
              <p className="comms-channel-description">{channel.description}</p>
            </div>
            <footer className="comms-channel-actions">
              {channel.id === "email" && <CopyEmailButton />}
              <a
                className="comms-channel-action"
                href={channel.href}
                target={channel.id === "email" ? undefined : "_blank"}
                rel={channel.id === "email" ? undefined : "noopener noreferrer"}
              >
                {channel.action} <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </footer>
          </article>
        ))}
      </div>
      <ContactTransmission prefix={prefix} />
      <article className="thm-telemetry-card" data-dossier-anchor="thm">
        <header className="thm-telemetry-heading">
          <p className="thm-telemetry-label">
            <ShieldCheck size={17} aria-hidden="true" /> TRYHACKME {"//"} LIVE
            TELEMETRY
          </p>
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
