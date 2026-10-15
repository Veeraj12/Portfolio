"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Curated greetings, in the order they cycle. Latin entries fall through the
 * display font; the non-Latin scripts fall through to the Noto fonts wired up
 * in `app/layout.tsx` via the `.hg-line` font stack.
 */
const GREETINGS = [
  { text: "Hey", lang: "en" },
  { text: "नमस्ते", lang: "hi" },
  { text: "Hola", lang: "es" },
  { text: "Bonjour", lang: "fr" },
  { text: "Ciao", lang: "it" },
  { text: "こんにちは", lang: "ja" },
  { text: "안녕하세요", lang: "ko" },
  { text: "வணக்கம்", lang: "ta" },
] as const;

/** Rows are rendered twice so the odometer can wrap with no visible seam. */
const ROWS = [...GREETINGS, ...GREETINGS];
/** One odometer row, in px. Must match `.hg-line` / `.hg-window` height. */
const LINE_H = 34;
/** Vertical position of the suspension point from the top of the stage. */
const ANCHOR_Y = 6;

/* --- Pendulum + thread-spring tuning (units: px, seconds, radians) --- */
const L_REST = 58; // resting thread length
const L_DROP = 26; // how far above rest the greeting starts before dropping
const G = 1150; // swing gravity constant (g / L sets the period)
const SWING_DAMP = 0.85; // angular damping -> a few visible swings, then rest
const LEN_K = 115; // thread spring stiffness (drop / bounce)
const LEN_DAMP = 4.6; // thread spring damping -> one or two soft bounces
const MAX_ANGLE = 0.6; // ~34deg hard clamp on swing
const MAX_OMEGA = 4.4; // clamp on angular velocity
const TRIGGER_ANGLE = 0.33; // crossing this outward rolls the word
const REARM_ANGLE = 0.08; // must return near rest before another roll
const ROLL_COOLDOWN = 700; // ms between greeting rolls, so words stay readable
const VELOCITY_TO_OMEGA = 0.95; // cursor px/ms -> target angular velocity
const VELOCITY_RESPONSE = 0.35; // how quickly the swing eases toward that target

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Layout effect on the client (runs before paint, so no entrance flash),
 *  plain effect on the server (where layout effects don't apply). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * "The Hanging Hello" — a small kinetic greeting suspended above the name line.
 *
 * One damped pendulum (angle) plus one damped length spring (drop / bounce)
 * share a single requestAnimationFrame loop. The loop only runs while something
 * is moving, then stops and restarts on input, so nothing animates when idle.
 * Every per-frame write goes straight to DOM refs (one transform + one SVG
 * path), so React never re-renders during motion. The only stateful update is
 * the odometer step, which advances at most once per swing.
 */
export function HangingGreeting({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const pivotRef = React.useRef<HTMLDivElement>(null);
  const bobRef = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<SVGPathElement>(null);
  const anchorRef = React.useRef<SVGCircleElement>(null);

  const [step, setStep] = React.useState(0);
  const [instant, setInstant] = React.useState(false);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const pivot = pivotRef.current;
    const bob = bobRef.current;
    const path = pathRef.current;
    const anchor = anchorRef.current;
    if (!root || !pivot || !bob || !path || !anchor) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Anchor x in px, cached and refreshed on resize.
    let anchorX = pivot.offsetLeft;
    const measure = () => {
      anchorX = pivot.offsetLeft;
      anchor.setAttribute("cx", String(anchorX));
      anchor.setAttribute("cy", String(ANCHOR_Y));
    };
    measure();

    // Pendulum / thread state.
    let theta = 0;
    let omega = 0;
    let len = L_REST;
    let lenDot = 0;

    let raf = 0;
    let running = false;
    let last = 0;
    let armed = true; // ready to roll on the next outward swing
    let lastRoll = 0; // timestamp of the last roll, for the cooldown
    let tapDir = 1;

    const render = () => {
      const bx = anchorX + len * Math.sin(theta);
      const by = ANCHOR_Y + len * Math.cos(theta);

      // rotate(-theta) so positive theta swings the word to the right.
      pivot.style.transform = `rotate(${-theta}rad)`;
      bob.style.transform = `translate(-50%, ${len}px)`;
      bob.style.setProperty(
        "--hg-energy",
        clamp(Math.abs(omega) / MAX_OMEGA, 0, 1).toFixed(3),
      );

      // Thread trails slightly behind the swing, so it bends instead of snapping.
      const bend = clamp(-omega * 9, -13, 13);
      const ctrlX = (anchorX + bx) / 2 + Math.cos(theta) * bend;
      const ctrlY = (ANCHOR_Y + by) / 2 - Math.sin(theta) * bend;
      path.setAttribute(
        "d",
        `M ${anchorX} ${ANCHOR_Y} Q ${ctrlX} ${ctrlY} ${bx} ${by}`,
      );
    };

    const settle = () => {
      theta = 0;
      omega = 0;
      len = L_REST;
      lenDot = 0;
      render();
      running = false;
      last = 0;
      raf = 0;
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.032) : 0.016;
      last = now;

      // Thread length: damped spring from the raised start down to rest.
      lenDot += (-LEN_K * (len - L_REST) - LEN_DAMP * lenDot) * dt;
      len += lenDot * dt;

      // Pendulum: gravity restoring torque + damping.
      const angAcc = -(G / len) * Math.sin(theta) - SWING_DAMP * omega;
      omega = clamp(omega + angAcc * dt, -MAX_OMEGA, MAX_OMEGA);
      theta += omega * dt;
      theta = clamp(theta, -MAX_ANGLE, MAX_ANGLE);

      render();

      // Roll the word at most once per outward swing, and never faster than
      // the cooldown, so each greeting stays readable.
      if (
        armed &&
        Math.abs(theta) > TRIGGER_ANGLE &&
        Math.abs(omega) > 0.05 &&
        now - lastRoll > ROLL_COOLDOWN
      ) {
        armed = false;
        lastRoll = now;
        setStep((s) => s + 1);
      } else if (!armed && Math.abs(theta) < REARM_ANGLE) {
        armed = true;
      }

      const atRest =
        Math.abs(theta) < 0.0015 &&
        Math.abs(omega) < 0.004 &&
        Math.abs(len - L_REST) < 0.03 &&
        Math.abs(lenDot) < 0.05;

      if (atRest) {
        settle();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = window.requestAnimationFrame(tick);
    };

    // --- Pointer velocity -> angular impulse -------------------------------
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let hasLast = false;

    const onMove = (e: PointerEvent) => {
      // Only fine pointers drive the swing; touch uses the tap gesture so page
      // scrolling is never converted into a swing.
      if (e.pointerType === "touch") return;

      const now = e.timeStamp;
      if (!hasLast) {
        lastX = e.clientX;
        lastY = e.clientY;
        lastT = now;
        hasLast = true;
        return;
      }
      const dt = Math.max(now - lastT, 1);
      const vx = (e.clientX - lastX) / dt; // px/ms
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      // Scale by proximity to the word so the zone is forgiving but directional.
      const rect = root.getBoundingClientRect();
      const cx = rect.left + anchorX;
      const cy = rect.top + ANCHOR_Y + len * Math.cos(theta);
      const prox = clamp(1 - Math.hypot(e.clientX - cx, e.clientY - cy) / 170, 0.3, 1);

      // Match the swing to the cursor: ease the angular velocity toward a
      // target set by horizontal speed. Slow pointer -> gentle sway, fast ->
      // a strong, direction-correct impulse; repeated motion keeps feeding it
      // within the clamp instead of accumulating without bound.
      const target = clamp(vx * VELOCITY_TO_OMEGA * prox, -MAX_OMEGA, MAX_OMEGA);
      omega = clamp(omega + (target - omega) * VELOCITY_RESPONSE, -MAX_OMEGA, MAX_OMEGA);
      start();
    };

    const onLeave = () => {
      hasLast = false;
    };

    const onDown = (e: PointerEvent) => {
      // Optional gentle tap nudge (mainly for touch), alternating direction.
      e.preventDefault();
      omega = clamp(omega + 1.25 * tapDir, -MAX_OMEGA, MAX_OMEGA);
      tapDir *= -1;
      start();
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    root.addEventListener("pointerdown", onDown);

    const ro = new ResizeObserver(measure);
    ro.observe(root);

    if (prefersReduced) {
      render(); // static hanging greeting, no motion, no triggers
    } else {
      len = L_REST - L_DROP; // start raised, then drop + bounce into place
      render();
      start();
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`hg-root${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <svg className="hg-thread" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hg-thread-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="55%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle ref={anchorRef} className="hg-anchor" cx="50%" cy={ANCHOR_Y} r="2.2" />
        <path ref={pathRef} className="hg-thread-path" d="" />
      </svg>

      <div ref={pivotRef} className="hg-pivot">
        <div ref={bobRef} className="hg-bob">
          <div className="hg-window">
            <motion.div
              className="hg-stack"
              initial={false}
              animate={{ y: -step * LINE_H }}
              transition={
                reduced || instant
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 340, damping: 32, mass: 0.7 }
              }
              onAnimationComplete={() => {
                // Invisible wrap: rows are duplicated, so shifting back by one
                // full set lands on identical glyphs and can be done instantly.
                if (step >= GREETINGS.length) {
                  setInstant(true);
                  setStep((s) => s - GREETINGS.length);
                } else if (instant) {
                  setInstant(false);
                }
              }}
            >
              {ROWS.map((g, i) => (
                <span
                  key={`${g.lang}-${i}`}
                  className="hg-line"
                  lang={g.lang}
                >
                  {g.text}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
