import { ArrowDownRight, Crosshair } from "lucide-react";
import { PROFILE_CONFIG } from "@/data/profile.config";

export function HeroIdentity() {
  const nameParts = PROFILE_CONFIG.name.split(" ");
  const surname = nameParts.pop();
  return (
    <section className="hero-identity" aria-labelledby="identity-heading">
      <div className="hero-topline">
        <span>
          <span className="small-cross">+</span> ENGINEERING SYSTEMS. EXPLORING
          FRONTIERS.
        </span>
        <span className="hero-session">PERSONAL SYSTEMS INTERFACE / 01</span>
      </div>
      <div className="hero-layout">
        <div>
          <div className="identity-eyebrow">
            <span className="identity-rule" />
            {" DEVELOPER PORTFOLIO "}
            <span className="text-slate-300">{"//"}</span> MIC-SP
          </div>
          <h1 id="identity-heading">
            {nameParts.join(" ")}
            <br />
            <span>
              {surname}
              <span className="name-period">.</span>
            </span>
          </h1>
          <p className="hero-headline">{PROFILE_CONFIG.headline}</p>
          <p className="hero-credentials">{PROFILE_CONFIG.subheadline}</p>
        </div>
        <div className="identity-scope" aria-hidden="true">
          <div className="scope-coordinate scope-coordinate-top">
            SYSTEMS THINKING
          </div>
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
          <div className="scope-coordinate scope-coordinate-bottom">
            <Crosshair size={11} /> HUMAN-DRIVEN. SYSTEM-LEVEL.
          </div>
        </div>
      </div>
      <div className="hero-baseline">
        <span>FROM QUANTUM WORKLOADS TO PRODUCTION SYSTEMS</span>
        <a href="#project-registry">
          EXPLORE THE REGISTRY <ArrowDownRight size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
