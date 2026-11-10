import { PROFILE_CONFIG } from "@/data/profile.config";
import { Fragment } from "react";

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
        <div className="identity-scope" aria-hidden="true">
          <svg viewBox="0 0 240 240" fill="none">
            <path
              d="M120 0v240M0 120h240"
              stroke="currentColor"
              strokeOpacity=".16"
              strokeDasharray="2 6"
            />
            <circle
              cx="120"
              cy="120"
              r="91"
              stroke="currentColor"
              strokeOpacity=".18"
            />
            <circle
              cx="120"
              cy="120"
              r="70"
              stroke="currentColor"
              strokeOpacity=".4"
              strokeDasharray="1 8"
            />
            <circle
              cx="120"
              cy="120"
              r="48"
              stroke="currentColor"
              strokeOpacity=".17"
            />
            <path
              d="M120 29a91 91 0 0 1 88 68M32 143a91 91 0 0 0 88 68"
              stroke="currentColor"
              strokeOpacity=".8"
              strokeWidth="2"
            />
            <path
              d="m120 78 37 21v42l-37 21-37-21V99l37-21Zm0 0v42m37-21-37 21-37-21m37 21v42"
              stroke="currentColor"
              strokeOpacity=".7"
            />
            <circle cx="120" cy="29" r="3" fill="currentColor" />
            <circle cx="120" cy="211" r="3" fill="currentColor" />
            <path
              d="M10 30V10h20m180 0h20v20M10 210v20h20m180 0h20v-20"
              stroke="currentColor"
              strokeOpacity=".3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
