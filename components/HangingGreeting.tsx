"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

/**
 * Curated greetings, in the order they cycle. Latin entries fall through the
 * sans stack; non-Latin scripts fall through to the Noto faces wired up in
 * `app/layout.tsx` via the `.hg-line` font stack.
 */
const GREETINGS = [
  { text: "Hey", lang: "en" },
  { text: "Hola", lang: "es" },
  { text: "Bonjour", lang: "fr" },
  { text: "Ciao", lang: "it" },
  { text: "नमस्ते", lang: "hi" },
  { text: "こんにちは", lang: "ja" },
  { text: "안녕하세요", lang: "ko" },
  { text: "வணக்கம்", lang: "ta" },
] as const;

const N = GREETINGS.length;
/** Two copies, so the odometer can wrap to an identical row with no seam. */
const ROWS = [...GREETINGS, ...GREETINGS];

/** One odometer row, in px. Must match `.hg-line` / `.hg-window` height. */
const LINE_H = 34;
/** Suspension point, measured from the very top of the stage. */
const ANCHOR_Y = 1;

/* --- Pendulum + thread-spring tuning (px, seconds, radians) ---------------
   The threshold must sit *below* the swing amplitude a deliberate cursor
   sweep produces, or the greeting never rolls. With G/L below, a fast sweep
   peaks well past TRIGGER_ANGLE while a lazy drift stays under it. */
const G = 800; // swing gravity constant (g / L sets the period ~1.6s)
const SWING_DAMP = 0.8; // light damping -> a few visible swings, then rest
const MAX_ANGLE = 0.5; // ~29deg hard clamp on the swing
const MAX_OMEGA = 4.5; // clamp on angular velocity
const L_REST = 50; // resting thread length
const L_START = 16; // thread length at the top of the fall
const LEN_K = 120; // thread spring stiffness (fall / bounce)
const LEN_DAMP = 8.8; // thread spring damping -> one or two soft rebounds
const SQUASH_AMOUNT = 0.16; // brief vertical compression on impact
const SQUASH_K = 400; // squash recovery stiffness
const SQUASH_C = 20; // squash recovery damping
const TRIGGER_ANGLE = 0.16; // swing must cross this to roll the word
const REARM_ANGLE = 0.05; // must fall back inside this before re-arming
const ROLL_COOLDOWN = 650; // ms between rolls, so each word stays readable
const ACTIVE_WINDOW = 450; // ms: only freshly-driven swings may roll a word
const VELOCITY_TO_OMEGA = 2.4; // cursor px/ms -> target angular velocity (higher = more sensitive)
const VELOCITY_RESPONSE = 0.55; // how quickly the swing eases toward the target

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

/** Layout effect on the client (so the entrance pose is applied pre-paint,
 *  avoiding a flash); plain effect on the server. */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * "The Hanging Hello" — a kinetic greeting suspended from the navbar.
 *
 * Structure (each element owns exactly one transform, so nothing fights):
 *   .hg-pivot  -> pendulum rotation about the anchor
 *   .hg-bob    -> translate down the thread (the fall + swing radius)
 *   .hg-scale  -> squash / stretch about the word's top-centre
 *   .hg-stack  -> the odometer word-roll (Framer `y`, independent motion value)
 *
 * One requestAnimationFrame loop integrates the pendulum angle and the thread
 * length spring. It only runs while something is moving, then stops and
 * restarts on input. Per-frame writes go straight to DOM refs, so React never
 * re-renders during motion; the only React state is the odometer row.
 */
export function HangingGreeting({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const pivotRef = React.useRef<HTMLDivElement>(null);
  const bobRef = React.useRef<HTMLDivElement>(null);
  const scaleRef = React.useRef<HTMLDivElement>(null);
  const pathRef = React.useRef<SVGPathElement>(null);
  const plateRef = React.useRef<SVGRectElement>(null);

  // Odometer: a motion value driven imperatively so the wrap seam can be
  // snapped instantly without any React state timing assumptions.
  const y = useMotionValue(0);
  const rowRef = React.useRef(0);
  const rollingRef = React.useRef(false);

  const roll = React.useCallback(() => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    rowRef.current += 1;
    const controls = animate(y, -rowRef.current * LINE_H, {
      type: "spring",
      stiffness: 300,
      damping: 24,
      mass: 0.7,
    });
    const finish = () => {
      // Snap back by one full set of rows: the glyphs are identical, so the
      // jump is invisible and the odometer can roll forever.
      if (rowRef.current >= N) {
        rowRef.current -= N;
        y.set(-rowRef.current * LINE_H);
      }
      rollingRef.current = false;
    };
    if (typeof controls.then === "function") controls.then(finish, finish);
    else finish();
  }, [y]);

  const rollRef = React.useRef(roll);
  rollRef.current = roll;

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const pivot = pivotRef.current;
    const bob = bobRef.current;
    const scale = scaleRef.current;
    const path = pathRef.current;
    const plate = plateRef.current;
    if (!root || !pivot || !bob || !scale || !path || !plate) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Anchor x in px, cached and refreshed on resize.
    let anchorX = pivot.offsetLeft;

    // Pendulum / thread state.
    let theta = 0;
    let omega = 0;
    let len = L_REST;
    let lenDot = 0;
    let squash = 0;
    let squashVel = 0;
    let impacted = false;

    let raf = 0;
    let running = false;
    let last = 0;
    let armed = true; // ready to roll on the next outward swing
    let lastRoll = 0; // timestamp of the last roll, for the cooldown
    let lastActive = 0; // timestamp of the last deliberate pointer input

    const render = () => {
      const bx = anchorX + len * Math.sin(theta);
      const by = ANCHOR_Y + len * Math.cos(theta);

      // rotate(-theta) so a positive theta swings the word to the right.
      pivot.style.transform = `rotate(${-theta}rad)`;
      bob.style.transform = `translate(-50%, ${len}px)`;
      scale.style.transform = `scale(${1 - squash * 0.6}, ${1 + squash})`;
      root.style.setProperty(
        "--hg-energy",
        clamp(Math.abs(omega) / MAX_OMEGA, 0, 1).toFixed(3),
      );

      plate.setAttribute("x", String(anchorX - 7));

      // A taut thread that trails slightly behind the swing, so it bends
      // rather than snapping, and the endpoint stays glued to the word.
      const bend = clamp(-omega * 7, -10, 10);
      const ctrlX = (anchorX + bx) / 2 + Math.cos(theta) * bend;
      const ctrlY = (ANCHOR_Y + by) / 2 - Math.sin(theta) * bend;
      path.setAttribute(
        "d",
        `M ${anchorX} ${ANCHOR_Y + 2} Q ${ctrlX} ${ctrlY} ${bx} ${by}`,
      );
    };

    const settle = () => {
      theta = 0;
      omega = 0;
      len = L_REST;
      lenDot = 0;
      squash = 0;
      squashVel = 0;
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
      const prevLen = len;
      len += lenDot * dt;

      // Impact is detected at the actual arrival (first downward crossing of
      // the rest length), not on a timer.
      if (!impacted && prevLen < L_REST && len >= L_REST && lenDot > 0) {
        impacted = true;
        squash = -SQUASH_AMOUNT;
        squashVel = 0;
      }
      squashVel += (-SQUASH_K * squash - SQUASH_C * squashVel) * dt;
      squash += squashVel * dt;

      // Pendulum: gravity restoring torque + damping.
      const angAcc = -(G / len) * Math.sin(theta) - SWING_DAMP * omega;
      omega = clamp(omega + angAcc * dt, -MAX_OMEGA, MAX_OMEGA);
      theta = clamp(theta + omega * dt, -MAX_ANGLE, MAX_ANGLE);

      render();

      // Roll at most once per outward swing, never faster than the cooldown,
      // and only for a swing that was driven by recent pointer input — so a
      // decaying residual swing never rolls extra words.
      if (
        armed &&
        Math.abs(theta) > TRIGGER_ANGLE &&
        Math.abs(omega) > 0.02 &&
        now - lastRoll > ROLL_COOLDOWN &&
        now - lastActive < ACTIVE_WINDOW
      ) {
        armed = false;
        lastRoll = now;
        rollRef.current();
      } else if (
        !armed &&
        (Math.abs(theta) < REARM_ANGLE || now - lastActive < ACTIVE_WINDOW)
      ) {
        // Re-arm once the swing falls back near rest, or while the pointer is
        // still actively driving it (so a sustained sweep keeps rolling at the
        // cooldown rate). A purely decaying swing re-arms but is then blocked
        // by the active-input window above.
        armed = true;
      }

      const atRest =
        Math.abs(theta) < 0.0015 &&
        Math.abs(omega) < 0.004 &&
        Math.abs(len - L_REST) < 0.03 &&
        Math.abs(lenDot) < 0.06 &&
        Math.abs(squash) < 0.002 &&
        Math.abs(squashVel) < 0.02;

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

    // --- Pointer velocity -> angular impulse ------------------------------
    let lastX = 0;
    let lastT = 0;
    let hasLast = false;

    const onMove = (e: PointerEvent) => {
      // Touch uses the tap gesture instead, so page scrolling is never
      // accidentally converted into a swing.
      if (e.pointerType === "touch") return;

      const now = e.timeStamp;
      if (!hasLast) {
        lastX = e.clientX;
        lastT = now;
        hasLast = true;
        return;
      }
      const dt = Math.max(now - lastT, 1);
      const vx = (e.clientX - lastX) / dt; // px/ms
      lastX = e.clientX;
      lastT = now;

      // Weight by proximity so the zone is forgiving but still directional.
      const rect = root.getBoundingClientRect();
      const cx = rect.left + anchorX + len * Math.sin(theta);
      const cy = rect.top + ANCHOR_Y + len * Math.cos(theta) + LINE_H / 2;
      const prox = clamp(
        1 - Math.hypot(e.clientX - cx, e.clientY - cy) / 260,
        0.5,
        1,
      );

      // Match the swing to the cursor: ease angular velocity toward a target
      // set by horizontal speed. Slow -> gentle sway, fast -> strong swing.
      const target = clamp(
        vx * VELOCITY_TO_OMEGA * prox,
        -MAX_OMEGA,
        MAX_OMEGA,
      );
      omega = clamp(
        omega + (target - omega) * VELOCITY_RESPONSE,
        -MAX_OMEGA,
        MAX_OMEGA,
      );
      lastActive = now;
      start();
    };

    const onLeave = () => {
      hasLast = false;
    };

    const onDown = (e: PointerEvent) => {
      // Optional gentle tap nudge (mainly for touch): push whichever way the
      // word is already leaning, reinforcing the swing instead of fighting it.
      e.preventDefault();
      omega = clamp(
        omega + (Math.sin(theta) >= 0 ? 1.4 : -1.4),
        -MAX_OMEGA,
        MAX_OMEGA,
      );
      lastActive = e.timeStamp;
      start();
    };

    const measure = () => {
      anchorX = pivot.offsetLeft;
      plate.setAttribute("x", String(anchorX - 7));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);

    if (prefersReduced) {
      render(); // static hanging greeting, no motion, no triggers
    } else {
      root.addEventListener("pointermove", onMove, { passive: true });
      root.addEventListener("pointerleave", onLeave, { passive: true });
      root.addEventListener("pointerdown", onDown);
      len = L_START; // raised near the anchor, then falls into place
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
            <stop offset="60%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* The mount sits on the seam with the navbar's bottom edge. */}
        <rect ref={plateRef} className="hg-plate" y="0" width="14" height="3" rx="1.5" />
        <path ref={pathRef} className="hg-thread-path" d="" />
      </svg>

      <div ref={pivotRef} className="hg-pivot">
        <div ref={bobRef} className="hg-bob">
          <div ref={scaleRef} className="hg-scale">
            <div className="hg-window">
              <motion.div className="hg-stack" style={{ y }}>
                {ROWS.map((g, i) => (
                  <span key={`${g.lang}-${i}`} className="hg-line" lang={g.lang}>
                    {g.text}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
