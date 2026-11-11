"use client";

import {
  AnimatePresence,
  motion,
  MotionConfig,
  useIsPresent,
} from "framer-motion";
import {
  Cpu,
  Fingerprint,
  GraduationCap,
  Layers3,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useHud } from "@/context/HudContext";
import { useTheme } from "@/context/ThemeContext";
import { PROFILE_CONFIG } from "@/data/profile.config";
import { getHudDrawerTransition } from "@/lib/hud-motion";
import { activateDossierSection } from "@/lib/dossier-navigation";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { CommsUplink } from "./CommsUplink";
import "./operator-dossier.css";
import "./operator-dossier-light.css";

const MATRIX_ICONS = [Cpu, Layers3, ShieldCheck];
const REST_TRANSFORM = "translate3d(0%, 0, 0)";
const OFFSCREEN_TRANSFORM = "translate3d(100%, 0, 0)";

/** The complete profile lives exclusively inside the operator sidebar. */
function DossierContent({
  prefix,
  telemetryActive,
}: {
  prefix: string;
  telemetryActive: boolean;
}) {
  return (
    <div className="dossier-content">
      <div className="dossier-positioning" data-dossier-anchor="overview">
        <span className="dossier-label">
          <Fingerprint size={15} aria-hidden="true" /> EXECUTIVE POSITIONING
        </span>
        <p>{PROFILE_CONFIG.executiveBio}</p>
        <span className="dossier-location">
          {PROFILE_CONFIG.location} <span aria-hidden="true">{"//"}</span>{" "}
          {PROFILE_CONFIG.systemStatus}
        </span>
      </div>

      <section
        className="dossier-credentials"
        data-dossier-anchor="credentials"
        aria-labelledby={`${prefix}-credentials`}
      >
        <h3 id={`${prefix}-credentials`} className="dossier-label">
          <GraduationCap size={16} aria-hidden="true" /> ACADEMIC & ENGINEERING
          CREDENTIALS
        </h3>
        <div className="dossier-education-grid">
          {PROFILE_CONFIG.education.map((item) => (
            <article className="dossier-education-card" key={item.id}>
              <div>
                <h4>{item.institution}</h4>
                <p className="dossier-institution-location">{item.subheader}</p>
                <p className="dossier-qualification">{item.qualification}</p>
                <ul>
                  {item.highlights.map((highlight) => (
                    <li key={highlight}>
                      <span
                        className="dossier-detail-marker"
                        aria-hidden="true"
                      >
                        ▹
                      </span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <footer className="dossier-capstone">
                <span>{item.callout.label}</span>
                <em>“{item.callout.text}”</em>
              </footer>
            </article>
          ))}
        </div>
        <h4 className="dossier-label dossier-specializations-label">
          CERTIFICATIONS & SPECIALIZATIONS
        </h4>
        <ul className="dossier-specializations">
          {PROFILE_CONFIG.specializations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section
        className="dossier-capabilities"
        data-dossier-anchor="stack"
        aria-labelledby={`${prefix}-stack`}
      >
        <h3 id={`${prefix}-stack`} className="dossier-label">
          <Cpu size={16} aria-hidden="true" /> ENGINEERING CAPABILITIES MATRIX
        </h3>
        <div className="dossier-matrix">
          {Object.entries(PROFILE_CONFIG.engineeringMatrix).map(
            ([category, technologies], index) => {
              const Icon = MATRIX_ICONS[index % MATRIX_ICONS.length];
              return (
                <article className="dossier-matrix-column" key={category}>
                  <Icon
                    className="dossier-matrix-icon"
                    size={20}
                    aria-hidden="true"
                  />
                  <h4>{category}</h4>
                  <ul>
                    {technologies.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>
                </article>
              );
            },
          )}
        </div>
      </section>
      <CommsUplink prefix={prefix} telemetryActive={telemetryActive} />
    </div>
  );
}

export function OperatorDossierDrawer() {
  const { isDossierOpen } = useHud();
  return (
    <MotionConfig reducedMotion="never">
      <AnimatePresence initial={false}>
        {isDossierOpen && <DossierPanel key="operator-dossier" />}
      </AnimatePresence>
    </MotionConfig>
  );
}

function DossierPanel() {
  const { isLight } = useTheme();
  const { dossierSection, dossierRequestId, closeDossier, isTerminalOpen } =
    useHud();
  const reducedMotion = useMotionPreference();
  const isPresent = useIsPresent();
  const [isSettled, setIsSettled] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropDown = useRef(false);
  const handoff = useRef({ terminal: false });

  useLayoutEffect(() => {
    handoff.current.terminal = isTerminalOpen;
  }, [isTerminalOpen]);

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    const pendingFocus = handoff.current;
    document.body.style.overflow = "hidden";
    panel.showModal();
    closeButton.current?.focus({ preventScroll: true });
    // AnimatePresence keeps this modal and its scroll lock alive until both exits finish.
    return () => {
      document.body.style.overflow = previousOverflow;
      if (panel.open) panel.close();
      const destination = pendingFocus.terminal
        ? document.getElementById("terminal-command")
        : previousFocus?.isConnected
          ? previousFocus
          : document.querySelector<HTMLElement>("[data-dossier-trigger]");
      destination?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const scroll = body.current;
    if (!scroll) return;
    return activateDossierSection(scroll, dossierSection, {
      isSettled,
      isPresent,
      reducedMotion,
    });
  }, [dossierSection, dossierRequestId, isSettled, isPresent, reducedMotion]);

  return (
    <dialog
      ref={dialog}
      id="operator-dossier"
      className="operator-dossier-dialog"
      data-dossier-theme={isLight ? "light" : "dark"}
      aria-labelledby="dossier-drawer-title"
      onKeyDown={(event) => {
        // The native modal remains present during exit, after the HUD open flag clears.
        if (event.key === "ArrowLeft" || event.key === "ArrowRight")
          event.stopPropagation();
        if (event.key !== "Tab") return;
        // Keep Tab at the dialog boundaries rather than handing focus to browser chrome.
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        closeDossier();
      }}
      onClose={() => {
        if (!dialog.current?.open) closeDossier();
      }}
      onPointerDown={(event) => {
        backdropDown.current =
          event.target === event.currentTarget ||
          (event.target instanceof Element &&
            event.target.classList.contains("dossier-backdrop"));
      }}
      onClick={(event) => {
        if (
          backdropDown.current &&
          (event.target === event.currentTarget ||
            (event.target instanceof Element &&
              event.target.classList.contains("dossier-backdrop")))
        )
          closeDossier();
      }}
    >
      <motion.div
        className="dossier-backdrop"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={getHudDrawerTransition()}
      />
      <motion.div
        className="dossier-slide"
        data-motion-state={isPresent && isSettled ? "settled" : "moving"}
        initial={{
          transform: OFFSCREEN_TRANSFORM,
        }}
        animate={{ transform: REST_TRANSFORM }}
        exit={{
          transform: OFFSCREEN_TRANSFORM,
        }}
        transition={getHudDrawerTransition()}
        onAnimationStart={() => setIsSettled(false)}
        onAnimationComplete={(definition) => {
          if (
            isPresent &&
            typeof definition === "object" &&
            "transform" in definition &&
            definition.transform === REST_TRANSFORM
          )
            setIsSettled(true);
        }}
      >
        <div className="dossier-sheet">
          <header className="dossier-drawer-heading">
            <div>
              <p className="dossier-label">
                OPERATOR // {PROFILE_CONFIG.legalName}
              </p>
              <h2 id="dossier-drawer-title">
                Operator Dossier & Capabilities Matrix
              </h2>
            </div>
            <button
              ref={closeButton}
              className="dossier-close"
              type="button"
              onClick={closeDossier}
              aria-label="Close operator dossier"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <div ref={body} className="dossier-scroll">
            <DossierContent
              prefix="drawer"
              telemetryActive={isPresent && isSettled}
            />
          </div>
          <footer className="dossier-rail">
            <span>PROFILE // BIO & STACK</span>
            <span>
              <kbd>ESC</kbd> CLOSE DOSSIER
            </span>
          </footer>
        </div>
      </motion.div>
    </dialog>
  );
}
