"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Globe,
  Send,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import "./services.css";

const services = [
  {
    icon: Globe,
    title: "Custom Web Applications",
    description:
      "Clean, production-grade applications built with Next.js, TypeScript, and responsive design. From customer booking engines to client dashboards with zero recurring agency retainers.",
    bullets: [
      "Fast load times & mobile-first UI",
      "Integrated scheduling & lead capture",
      "Direct deployment & full code ownership",
    ],
  },
  {
    icon: Cpu,
    title: "Intelligent Automation",
    description:
      "Eliminate repetitive back-office work. Automated parsing pipelines that turn incoming customer emails, purchase receipts, and unstructured PDFs into clean, organized spreadsheets.",
    bullets: [
      "Automated receipt & invoice logging",
      "Custom Zapier / Make / API integrations",
      "Custom AI integration",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Security & Reliability",
    description:
      "Applications built with defensive engineering standards. Strict validation, secure credentials handling, and resilient architectures so you never worry about compromised workflows.",
    bullets: [
      "Zod-guarded API schemas",
      "Zero client-side credential exposure",
      "Robust failure-mode handling",
    ],
  },
];

const engagementSteps = [
  {
    title: "Discovery Audit",
    description:
      "15-minute diagnostic call to isolate the exact workflow bottleneck or product scope.",
  },
  {
    title: "Fixed-Scope Sprint",
    description:
      "Clear specs, flat project pricing, and milestone-based testing with zero surprises.",
  },
  {
    title: "Hand-Off & Hardening",
    description:
      "Full source code access, automated deployment verification, and 14 days of dedicated support.",
  },
];

const fieldClassName = "services-input mt-2 w-full rounded-lg border px-4 py-3";

export default function ServicesPage() {
  const [isLight, setIsLight] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    // Match the dark server render, then restore this page's preference after hydration.
    const frame = requestAnimationFrame(() => {
      try {
        setIsLight(localStorage.getItem("services-theme") === "light");
      } catch {
        // The toggle still works in memory when browser storage is unavailable.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = !isLight;
    setIsLight(next);
    try {
      localStorage.setItem("services-theme", next ? "light" : "dark");
    } catch {
      // Storage restrictions should not prevent a local theme change.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus("");

    try {
      // TODO: Replace this placeholder with a lead capture endpoint.
      // Keep form values in the browser until that integration is ready.
      await Promise.resolve();
      setStatus("This form is a preview. No message has been sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      data-services-theme={isLight ? "light" : "dark"}
      className={`services-page min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"}`}
    >
      <nav
        aria-label="Services navigation"
        className="services-border border-b"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 sm:py-5">
          <Link
            href="/"
            rel="noreferrer"
            className="services-nav-link inline-flex min-h-11 items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="sr-only">← </span>
            Developer Portfolio
          </Link>
          <div className="flex items-center gap-3">
            <span className="services-badge inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium">
              <span
                aria-hidden="true"
                className="services-status-dot h-2 w-2 rounded-full motion-safe:animate-pulse"
              />
              Available for Q4/Q1 Projects
            </span>
            <button
              type="button"
              className="services-theme-toggle inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border"
              onClick={toggleTheme}
              aria-label="Toggle light mode"
              aria-pressed={isLight}
              title={isLight ? "Switch to dark mode" : "Switch to light mode"}
            >
              {isLight ? (
                <Moon size={18} aria-hidden="true" />
              ) : (
                <Sun size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      <main
        id="main-content"
        className="mx-auto max-w-6xl space-y-20 px-6 py-16 sm:py-24"
      >
        {/* Hero */}
        <section
          aria-labelledby="services-heading"
          className="max-w-3xl space-y-6"
        >
          <span className="services-badge inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-widest">
            Full-Stack Engineering &amp; AI Systems
          </span>
          <h1
            id="services-heading"
            className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
          >
            Modern web platforms &amp; AI workflows built for immediate
            leverage.
          </h1>
          <p className="services-body max-w-2xl text-lg leading-relaxed">
            I design, deploy, and harden custom digital infrastructure for
            independent businesses and growing practices—eliminating manual
            admin loops and replacing subscription bloat with software you own.
          </p>
          <a
            href="#project-inquiry"
            rel="noreferrer"
            className="services-accent-link inline-flex min-h-11 items-center gap-2 font-medium"
          >
            Discuss a project <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </section>

        {/* Core service pillars */}
        <section aria-labelledby="core-services-heading" className="space-y-8">
          <h2
            id="core-services-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Core services
          </h2>
          <div className="grid grid-cols-1 items-start md:grid-cols-3 gap-8">
            {services.map(({ icon: Icon, title, description, bullets }) => (
              <article
                key={title}
                className="services-surface flex min-w-0 flex-col rounded-xl border p-6"
              >
                <Icon
                  size={28}
                  className="services-accent"
                  aria-hidden="true"
                />
                <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                <p className="services-body mt-3 text-sm leading-relaxed">
                  {description}
                </p>
                <ul className="services-detail mt-6 space-y-3 text-sm">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <CheckCircle2
                        size={18}
                        className="services-accent mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Engagement process strip */}
        <section
          aria-labelledby="engagement-heading"
          className="services-border space-y-8 border-y py-10"
        >
          <h2
            id="engagement-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            How we work together
          </h2>
          <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {engagementSteps.map((step, index) => (
              <li key={step.title} className="min-w-0">
                <div>
                  <h3 className="font-medium">
                    <span className="services-accent">
                      {String(index + 1).padStart(2, "0")}.
                    </span>{" "}
                    {step.title}
                  </h3>
                  <p className="services-body mt-2 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Lead capture scaffold: intentionally has no backend yet. */}
        <section
          id="project-inquiry"
          aria-labelledby="inquiry-heading"
          className="services-surface mx-auto max-w-2xl scroll-mt-8 rounded-xl border p-6 sm:p-10"
        >
          <h2
            id="inquiry-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Let&apos;s discuss your project
          </h2>
          <p
            id="inquiry-description"
            className="services-body mt-3 text-sm leading-relaxed"
          >
            Drop a high-level summary below. I respond within 24 business hours.
          </p>
          <p id="inquiry-preview" className="services-body mt-2 text-xs">
            This form is a preview; submissions are not sent yet.
          </p>
          <form
            onSubmit={handleSubmit}
            aria-describedby="inquiry-description inquiry-preview"
            aria-busy={isSubmitting}
            className="mt-8 space-y-6"
          >
            <div>
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={120}
                placeholder="Jane Doe"
                className={fieldClassName}
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="jane@example.com"
                className={fieldClassName}
              />
            </div>
            <div>
              <label htmlFor="details" className="text-sm font-medium">
                Project Overview
              </label>
              <textarea
                id="details"
                name="details"
                rows={5}
                required
                maxLength={5000}
                placeholder="Tell me what you need built or which manual process you want automated..."
                className={`${fieldClassName} resize-y`}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="services-submit inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? (
                <Loader2
                  size={18}
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              ) : (
                <Send size={18} aria-hidden="true" />
              )}
              {isSubmitting ? "Submitting…" : "Send Project Inquiry"}
            </button>
            <p
              role="status"
              aria-live="polite"
              className="services-accent min-h-6 text-sm"
            >
              {status}
            </p>
          </form>
        </section>
      </main>
    </div>
  );
}
