import { GitFork, Network, Mail, Send } from "lucide-react";
import Link from "next/link";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { DossierTrigger } from "./DossierTrigger";

export function ConversionFooter() {
  const { email, linkedin, github } =
    PROFILE_CONFIG.commsAndTelemetry.directChannels;

  return (
    <footer className="conversion-footer" aria-label="Get in touch">
      <DossierTrigger className="hud-button contact-cta" target="transmission">
        <Send size={15} aria-hidden="true" /> Get in Touch
      </DossierTrigger>
      <nav className="conversion-links" aria-label="Direct contact links">
        <a href={email.href}>
          <Mail size={16} aria-hidden="true" /> Email
        </a>
        <a href={linkedin.href} target="_blank" rel="noopener noreferrer">
          <Network size={16} aria-hidden="true" /> LinkedIn
        </a>
        <a href={github.href} target="_blank" rel="noopener noreferrer">
          <GitFork size={16} aria-hidden="true" /> GitHub
        </a>
      </nav>
      <Link href="/services" className="conversion-services">
        Client Services →
      </Link>
    </footer>
  );
}
