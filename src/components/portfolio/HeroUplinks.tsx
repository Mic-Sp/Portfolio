import { ArrowUpRight, Fingerprint, GitFork, Network } from "lucide-react";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { CopyEmailButton } from "./CopyEmailButton";
import { DossierTrigger } from "./DossierTrigger";
import "./comms-uplink.css";

export function HeroUplinks() {
  const { directChannels, thmTelemetry } = PROFILE_CONFIG.commsAndTelemetry;
  return (
    <nav className="hero-uplinks" aria-label="Quick uplinks">
      <DossierTrigger className="hero-uplink-pill" label="Credentials">
        <Fingerprint size={13} aria-hidden="true" /> CREDENTIALS
      </DossierTrigger>
      <a
        className="hero-uplink-pill"
        href={directChannels.github.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <GitFork size={13} aria-hidden="true" /> GITHUB {"//"}{" "}
        {directChannels.github.handle}{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
      <a
        className="hero-uplink-pill"
        href={directChannels.linkedin.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Network size={13} aria-hidden="true" /> LINKEDIN{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
      <CopyEmailButton compact />
      <a
        className="hero-uplink-pill thm-quick-link"
        href={thmTelemetry.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        THM {"//"} {thmTelemetry.league}{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </nav>
  );
}
