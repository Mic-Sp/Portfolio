import { PROFILE_CONFIG } from "@/data/profile.config";
import { Fragment } from "react";
import { OrbitalTelemetryCore } from "./OrbitalTelemetryCore";

export function HeroIdentity() {
  const [primaryRole, ...specialties] = PROFILE_CONFIG.headline.split("//");
  const credentials = PROFILE_CONFIG.subheadline
    .split("•")
    .map((credential) => credential.trim());
  return (
    <section className="hero-identity" aria-labelledby="identity-heading">
      <div className="hero-layout">
        <div className="hero-copy">
          <div className="identity-eyebrow">
            <span className="identity-rule" />
            {" DEVELOPER PORTFOLIO "}
            <span className="text-slate-300">{"//"}</span> MIC-SP
          </div>
          <h1 id="identity-heading">
            {PROFILE_CONFIG.name}
            <span className="name-period">.</span>
          </h1>
          <p className="hero-headline">
            {primaryRole.trim()}
            {specialties.map((specialty, index) => (
              <Fragment key={`${index}-${specialty}`}>
                {" "}
                <span className="hero-role-separator">{"//"}</span>{" "}
                <span className="hero-role-highlight">{specialty.trim()}</span>
              </Fragment>
            ))}
          </p>
          <ul className="hero-credentials" aria-label="Credentials">
            {credentials.map((credential, index) => (
              <li key={credential}>
                {index > 0 && (
                  <span className="credential-separator" aria-hidden="true">
                    •
                  </span>
                )}
                <span className="credential-pill">{credential}</span>
              </li>
            ))}
          </ul>
        </div>
        <OrbitalTelemetryCore />
      </div>
    </section>
  );
}
