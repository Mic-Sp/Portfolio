"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, GitBranch, ScanEye, X } from "lucide-react";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { cn, getProjectAccent } from "@/lib/theme-utils";
import { hideModalBackground } from "@/lib/modal-background";
import type { ProjectNode } from "@/types/portfolio";
import "./project-previews.css";

/** One top-layer dialog is shared by grid thumbnails and spatial preview controls. */
export function ProjectLightbox({
  project,
  onClose,
}: {
  project: ProjectNode;
  onClose: () => void;
}) {
  const { isLight } = useTheme();
  const reducedMotion = useMotionPreference();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const backdropDown = useRef(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const actions = [
    { label: "Live System", href: project.links.live, Icon: ArrowUpRight },
    { label: "Source", href: project.links.repo, Icon: GitBranch },
  ].filter((action) => action.href && action.href !== "#");

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const restoreBackground = hideModalBackground(panel);
    // AnimatePresence retains the focus trap and scroll lock throughout exit.
    return () => {
      restoreBackground();
      if (panel.open) panel.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus.getClientRects().length)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <motion.dialog
      ref={dialog}
      id="project-lightbox"
      className={cn("project-lightbox", getProjectAccent(project.accent).scope)}
      data-theme={isLight ? "light" : "dark"}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} UI preview`}
      aria-labelledby="project-lightbox-title"
      aria-describedby="project-lightbox-summary"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        // Inspecting a screenshot must not cycle the deck or open the CLI behind it.
        event.stopPropagation();
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href]",
          ),
        );
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => {
        backdropDown.current =
          event.target === event.currentTarget ||
          (event.target instanceof Element &&
            event.target.classList.contains("project-lightbox-backdrop"));
      }}
      onClick={(event) => {
        if (
          backdropDown.current &&
          (event.target === event.currentTarget ||
            (event.target instanceof Element &&
              event.target.classList.contains("project-lightbox-backdrop")))
        )
          onClose();
      }}
    >
      <div className="project-lightbox-backdrop" aria-hidden="true" />
      <motion.div
        className="project-lightbox-panel"
        initial={{ y: reducedMotion ? 0 : 8, scale: reducedMotion ? 1 : 0.985 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: reducedMotion ? 0 : 8, scale: reducedMotion ? 1 : 0.985 }}
        transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
      >
        <header className="project-lightbox-header">
          <div>
            <p className="project-lightbox-label">
              <ScanEye size={14} aria-hidden="true" /> UI INSPECTION // FULL
              RESOLUTION
            </p>
            <h2 id="project-lightbox-title">{project.title}</h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="project-lightbox-close"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" /> CLOSE // ESC
          </button>
        </header>
        <div className="project-lightbox-media" style={{ aspectRatio }}>
          <Image
            src={project.image}
            alt={project.imageAlt}
            fill
            sizes="100vw"
            unoptimized
            loading="eager"
            className="project-lightbox-image object-contain"
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight)
                setAspectRatio(naturalWidth / naturalHeight);
            }}
          />
        </div>
        <footer className="project-lightbox-footer">
          <p id="project-lightbox-summary">{project.hook}</p>
          <nav aria-label={`${project.title} project links`}>
            {actions.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label} <Icon size={16} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </footer>
      </motion.div>
    </motion.dialog>
  );
}
