"use client";

import {
  motion,
  useAnimationFrame,
  useIsPresent,
  useMotionValue,
  useTransform,
  useMotionTemplate,
} from "framer-motion";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useTheme } from "@/context/ThemeContext";
import { useMotionPreference } from "@/hooks/useMotionPreference";
import { hideModalBackground } from "@/lib/modal-background";
import { getHudDrawerTransition } from "@/lib/hud-motion";
import {
  getCubeFrontFace,
  CUBE_DRAG_SENSITIVITY,
  CUBE_DRAG_THRESHOLD,
  CUBE_FACE_ROTATIONS,
  INITIAL_INSPECTOR_ROTATION,
  CUBE_KEY_NUDGE,
  getCubeArrowDirection,
  stepCubeKeyboard,
  stepCubeInertia,
  type CubeRotation,
} from "@/lib/cube-inspector-math";
import type { CubeCoreSlot, CubeFaceSlot } from "@/data/cube-config";
import "./cube-inspector.css";

interface DragSession {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  rotation: CubeRotation;
  moved: boolean;
  slot?: string;
}

export function SpatialCubeModal({
  faces,
  core,
  onClose,
}: {
  faces: readonly CubeFaceSlot[];
  core: CubeCoreSlot;
  onClose: () => void;
}) {
  const { isLight } = useTheme();
  const reducedMotion = useMotionPreference();
  const isPresent = useIsPresent();
  const dialog = useRef<HTMLDialogElement>(null);
  const cage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<DragSession | null>(null);
  const velocity = useRef<CubeRotation>({ x: 0, y: 0 });
  const heldKeys = useRef(new Set<string>());
  const keyboardTarget = useRef<CubeRotation | null>(null);
  const idleResumeAt = useRef(0);
  const suppressClickUntil = useRef(0);
  const backdropDown = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selection, setSelection] = useState("Six faces. One inner core.");
  const x = useMotionValue(INITIAL_INSPECTOR_ROTATION.x);
  const y = useMotionValue(INITIAL_INSPECTOR_ROTATION.y);
  const inverseX = useTransform(x, (value) => -value);
  const inverseY = useTransform(y, (value) => -value);
  const coreTransform = useMotionTemplate`rotateY(${inverseY}deg) rotateX(${inverseX}deg)`;

  function clearKeyboard() {
    heldKeys.current.clear();
    keyboardTarget.current = null;
    if (cage.current) cage.current.dataset.keyboardMotion = "idle";
  }

  useEffect(() => {
    const releaseKeys = (event: Event) => {
      heldKeys.current.clear();
      keyboardTarget.current = null;
      velocity.current = { x: 0, y: 0 };
      idleResumeAt.current = event.timeStamp + 1000;
      if (cage.current) cage.current.dataset.keyboardMotion = "idle";
    };
    window.addEventListener("blur", releaseKeys);
    document.addEventListener("visibilitychange", releaseKeys);
    return () => {
      window.removeEventListener("blur", releaseKeys);
      document.removeEventListener("visibilitychange", releaseKeys);
    };
  }, []);

  useLayoutEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const restore = hideModalBackground(panel);
    return () => {
      restore();
      if (panel.open) panel.close();
      document.body.style.overflow = overflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, []);

  function orient(rotation: CubeRotation) {
    x.set(rotation.x);
    y.set(rotation.y);
    if (cage.current) {
      cage.current.dataset.rotateX = rotation.x.toFixed(3);
      cage.current.dataset.rotateY = rotation.y.toFixed(3);
      // Rich content is keyboard-accessible only on the face nearest the viewer.
      const nearest = getCubeFrontFace(rotation);
      for (const content of cage.current.querySelectorAll<HTMLElement>(
        "[data-face-content]",
      )) {
        content.inert = content.dataset.faceContent !== nearest;
        content.setAttribute("aria-hidden", String(content.inert));
      }
    }
  }

  useAnimationFrame((_, delta) => {
    if (reducedMotion || drag.current || !isPresent || document.hidden) return;
    if (keyboardTarget.current) {
      const step = stepCubeKeyboard(
        { x: x.get(), y: y.get() },
        keyboardTarget.current,
        heldKeys.current,
        delta / 1000,
      );
      keyboardTarget.current = step.settled ? null : step.target;
      orient(step.rotation);
      if (step.settled && cage.current)
        cage.current.dataset.keyboardMotion = "idle";
      return;
    }
    const step = stepCubeInertia(
      { x: x.get(), y: y.get() },
      velocity.current,
      delta / 1000,
      autoRotate && performance.now() >= idleResumeAt.current,
    );
    velocity.current = step.velocity;
    if (autoRotate || Math.hypot(step.velocity.x, step.velocity.y) > 0.01)
      orient(step.rotation);
  });

  function activate(id: string) {
    if (id === "core") {
      setSelection(`${core.label} selected`);
      core.onActivate?.();
    } else {
      const face = faces.find((slot) => slot.id === id);
      if (face) {
        setSelection(`${face.label} face selected`);
        face.onActivate?.();
      }
    }
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    const target = event.target as HTMLElement;
    if (target.closest(".cube-slot-content")) {
      suppressClickUntil.current = 0;
      return;
    }
    clearKeyboard();
    velocity.current = { x: 0, y: 0 };
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      rotation: { x: x.get(), y: y.get() },
      moved: false,
      slot:
        target.closest<HTMLElement>("[data-cube-slot]")?.dataset.cubeSlot ??
        (target.closest(".inspector-cube")
          ? getCubeFrontFace({ x: x.get(), y: y.get() })
          : undefined),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const session = drag.current;
    if (!session || event.pointerId !== session.pointerId) return;
    const dx = event.clientX - session.startX,
      dy = event.clientY - session.startY;
    session.moved ||= Math.hypot(dx, dy) >= CUBE_DRAG_THRESHOLD;
    if (!session.moved) return;
    const now = event.timeStamp,
      seconds = Math.max(now - session.lastTime, 8) / 1000;
    const clamp = (value: number) => Math.max(-720, Math.min(720, value));
    velocity.current = {
      x: clamp(
        (-(event.clientY - session.lastY) * CUBE_DRAG_SENSITIVITY) / seconds,
      ),
      y: clamp(
        ((event.clientX - session.lastX) * CUBE_DRAG_SENSITIVITY) / seconds,
      ),
    };
    orient({
      x: session.rotation.x - dy * CUBE_DRAG_SENSITIVITY,
      y: session.rotation.y + dx * CUBE_DRAG_SENSITIVITY,
    });
    session.lastX = event.clientX;
    session.lastY = event.clientY;
    session.lastTime = now;
  }

  function release(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    suppressClickUntil.current = event.timeStamp + 600;
    if (
      cancelled ||
      reducedMotion ||
      !session.moved ||
      event.timeStamp - session.lastTime > 100
    )
      velocity.current = { x: 0, y: 0 };
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancelled && !session.moved && session.slot) activate(session.slot);
  }

  function snap(rotation: CubeRotation) {
    clearKeyboard();
    setAutoRotate(false);
    velocity.current = { x: 0, y: 0 };
    orient(rotation);
  }

  return (
    <motion.dialog
      ref={dialog}
      id="spatial-cube-modal"
      className="spatial-cube-modal"
      data-theme={isLight ? "light" : "dark"}
      data-motion={reducedMotion ? "reduced" : "full"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cube-inspector-heading"
      aria-describedby="cube-inspector-help"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={getHudDrawerTransition(reducedMotion)}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        const editable = (event.target as HTMLElement).closest(
          'input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"]),.cube-slot-content',
        );
        if (!editable && !event.altKey && !event.ctrlKey && !event.metaKey) {
          const direction = getCubeArrowDirection(event.key);
          if (direction) {
            event.preventDefault();
            idleResumeAt.current = event.timeStamp + 1000;
            velocity.current = { x: 0, y: 0 };
            if (reducedMotion) {
              clearKeyboard();
              orient({
                x: x.get() + direction.x * CUBE_KEY_NUDGE,
                y: y.get() + direction.y * CUBE_KEY_NUDGE,
              });
            } else if (!event.repeat && !heldKeys.current.has(event.key)) {
              heldKeys.current.add(event.key);
              const target = keyboardTarget.current ?? {
                x: x.get(),
                y: y.get(),
              };
              keyboardTarget.current = {
                x: target.x + direction.x * CUBE_KEY_NUDGE,
                y: target.y + direction.y * CUBE_KEY_NUDGE,
              };
              if (cage.current) cage.current.dataset.keyboardMotion = "held";
            }
          }
        }
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]",
          ),
        ].filter(
          (el) =>
            el.tabIndex >= 0 &&
            !el.closest("[inert]") &&
            el.getClientRects().length > 0,
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
      onKeyUp={(event) => {
        event.stopPropagation();
        if (heldKeys.current.delete(event.key)) {
          idleResumeAt.current = event.timeStamp + 1000;
          if (cage.current)
            cage.current.dataset.keyboardMotion = heldKeys.current.size
              ? "held"
              : "settling";
        }
      }}
      onFocusCapture={(event) => {
        if (
          (event.target as HTMLElement).closest(
            'input,textarea,select,[role="textbox"],[contenteditable]:not([contenteditable="false"]),.cube-slot-content',
          )
        ) {
          clearKeyboard();
          velocity.current = { x: 0, y: 0 };
        }
      }}
      onPointerDown={(event) => {
        backdropDown.current =
          event.target === event.currentTarget ||
          (event.target as HTMLElement).classList.contains(
            "cube-modal-backdrop",
          );
      }}
      onClick={(event) => {
        if (
          backdropDown.current &&
          (event.target === event.currentTarget ||
            (event.target as HTMLElement).classList.contains(
              "cube-modal-backdrop",
            ))
        )
          onClose();
        backdropDown.current = false;
      }}
    >
      <div className="cube-modal-backdrop" aria-hidden="true" />
      <motion.div
        className="cube-modal-panel"
        initial={{ scale: reducedMotion ? 1 : 0.88, y: reducedMotion ? 0 : 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: reducedMotion ? 1 : 0.96, y: reducedMotion ? 0 : 8 }}
        transition={getHudDrawerTransition(reducedMotion)}
      >
        <header className="cube-modal-heading">
          <div>
            <span className="cube-eyebrow">SPATIAL LAB // 6 + 1</span>
            <h2 id="cube-inspector-heading">Spatial Cube Inspector</h2>
          </div>
          <span className="cube-session-label">
            {reducedMotion ? "MANUAL MOTION" : "INTERACTIVE GEOMETRY"}
          </span>
        </header>
        <p id="cube-inspector-help" className="cube-help">
          Drag or hold arrow keys to rotate. Select a face or the inner core.
        </p>
        <div
          className="cube-stage"
          data-dragging={dragging}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={(event) => release(event)}
          onPointerCancel={(event) => release(event, true)}
          onLostPointerCapture={(event) => release(event, true)}
          onFocusCapture={(event) => {
            if ((event.target as HTMLElement).closest(".cube-slot-content")) {
              setAutoRotate(false);
              velocity.current = { x: 0, y: 0 };
            }
          }}
          onClickCapture={(event) => {
            if (
              event.detail > 0 &&
              event.timeStamp < suppressClickUntil.current
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <div className="cube-stage-grid" aria-hidden="true" />
          <motion.div
            ref={cage}
            className="inspector-cube"
            data-rotate-x={INITIAL_INSPECTOR_ROTATION.x}
            data-rotate-y={INITIAL_INSPECTOR_ROTATION.y}
            data-keyboard-motion="idle"
            style={{ rotateX: x, rotateY: y }}
          >
            {faces.map((face) => (
              <div
                key={face.id}
                className={`cube-face cube-face-${face.id}`}
                data-face={face.id}
              >
                <div className="cube-face-glass" aria-hidden="true" />
                <button
                  type="button"
                  tabIndex={-1}
                  className="cube-face-label"
                  data-cube-slot={face.id}
                  aria-label={`Activate ${face.label} face`}
                  onClick={(event) => {
                    if (event.detail === 0) activate(face.id);
                  }}
                >
                  {face.eyebrow ?? face.label}
                </button>
                <div className="cube-face-wireframe" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                {face.content && (
                  <div
                    className="cube-slot-content"
                    data-face-content={face.id}
                    inert={face.id !== "front"}
                    aria-hidden={face.id !== "front"}
                  >
                    {face.content}
                  </div>
                )}
              </div>
            ))}
            <div
              className="cube-inner-core"
              style={{ transform: "translateZ(0px)" }}
            >
              <motion.div
                className="cube-core-billboard"
                style={{ transform: coreTransform }}
              >
                <button
                  type="button"
                  className="cube-core-button"
                  data-cube-slot="core"
                  onClick={(event) => {
                    if (event.detail === 0) activate("core");
                  }}
                  aria-label={`Activate ${core.label}`}
                >
                  <span className="cube-core-glyph" aria-hidden="true">
                    ◇
                  </span>
                  <span>{core.label}</span>
                  <span className="cube-core-index" aria-hidden="true">
                    00 // CORE
                  </span>
                </button>
                {core.content && (
                  <div className="cube-slot-content">{core.content}</div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>
        <nav className="cube-face-nav" aria-label="Cube faces">
          {faces.map((face) => (
            <button
              key={face.id}
              type="button"
              onClick={() => {
                snap(CUBE_FACE_ROTATIONS[face.id]);
                activate(face.id);
              }}
              aria-label={`Inspect ${face.label} face`}
            >
              {face.label}
            </button>
          ))}
        </nav>
        <p className="cube-selection" role="status" aria-live="polite">
          {selection}
        </p>
        <footer className="cube-control-bar">
          <button
            type="button"
            aria-pressed={autoRotate && !reducedMotion}
            disabled={reducedMotion}
            onClick={() => {
              clearKeyboard();
              idleResumeAt.current = 0;
              velocity.current = { x: 0, y: 0 };
              setAutoRotate((value) => !value);
            }}
          >
            AUTO ROTATE {autoRotate && !reducedMotion ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => {
              snap(INITIAL_INSPECTOR_ROTATION);
              setSelection("Orientation reset");
            }}
          >
            [ RESET ORIENTATION ]
          </button>
          <button ref={closeButton} type="button" onClick={onClose}>
            [ CLOSE // ESC ]
          </button>
        </footer>
      </motion.div>
    </motion.dialog>
  );
}
