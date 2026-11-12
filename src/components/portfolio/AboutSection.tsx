import "./about-section.css";
import { PROFILE_CONFIG } from "@/data/profile.config";

export function AboutSection() {
  return (
    <section
      id="operator-profile"
      className="about-section"
      aria-labelledby="operator-profile-heading"
    >
      <header className="about-heading">
        <span className="about-index" aria-hidden="true">
          02 /
        </span>
        <h2 id="operator-profile-heading">OPERATOR PROFILE</h2>
      </header>
      <div className="about-layout">
        <div className="about-summary">
          <p className="about-intro">
            <strong>
              I build full-stack and AI-powered software with a focus on
              real-world utility, clean architecture, and defensive security.
            </strong>
          </p>
          <ul
            className="about-credentials"
            aria-label="Credentials at a glance"
          >
            <li>Columbia PAISE</li>
            <li>Next Chapter</li>
            <li>TryHackMe Gold League Top 7%</li>
          </ul>
          <dl
            className="about-skills-index"
            aria-label="Skills and credentials"
          >
            {PROFILE_CONFIG.skillsIndex.map(({ label, values }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{values.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="about-story">
          <p>
            My path into software engineering started with a{" "}
            <em>Summa Cum Laude</em> Business degree (3.98 GPA) from Holy Cross
            College—where my senior capstone explored the economics of quantum
            computing—before transitioning full-time into engineering through
            Columbia University’s Applied AI Solutions Engineering (PAISE)
            program and the Next Chapter apprenticeship. That business
            foundation shapes how I write code: I care as much about latency,
            deployment reliability, and end-user clarity as I do about the
            underlying stack.
          </p>
          <p>
            Today, I work as a contract AI Technical Specialist evaluating LLM
            reasoning and RLHF code workflows, while shipping full-stack
            applications from database schema to DNS cutover. Whether I’m
            architecting a hybrid quantum-classical workload simulator, building
            vector-search recommendation engines, or deploying a zero-downtime
            production site for a licensed counseling practice, I build with an
            AppSec-first mindset backed by Top 7% (Gold League) standing on
            TryHackMe.
          </p>
        </div>
      </div>
      <p className="about-availability">
        <span className="about-status-marker" aria-hidden="true" />
        <strong>
          Currently seeking full-time Software Engineer, Full-Stack Developer,
          or Applied AI Engineer roles.
        </strong>
      </p>
    </section>
  );
}
