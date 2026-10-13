"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
import type { AdventureLoaderProps } from "./types";

/**
 * Lightweight, dependency-free loading experience.
 *
 * - If `progress` is provided, the dragon's position and the status text
 *   reflect it (determinate mode).
 * - If omitted, the dragon loops indefinitely (indeterminate mode) and the
 *   parent is responsible for unmounting the loader when ready.
 * - `onLoaded` fires once, the first time progress reaches >= 1, but only
 *   after `minDurationMs` has elapsed, so a fast load doesn't flash.
 */
export function AdventureLoader({
  progress,
  onLoaded,
  minDurationMs = 500,
  className = "",
}: AdventureLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const mountedAt = useRef(Date.now());
  const firedRef = useRef(false);
  const [visualProgress, setVisualProgress] = useState(0);

  const indeterminate = !progress || progress.indeterminate;
  const value = progress ? Math.min(Math.max(progress.value, 0), 1) : 0;

  // Smooth the numeric progress a touch so the dragon doesn't teleport.
  useEffect(() => {
    setVisualProgress(value);
  }, [value]);

  useEffect(() => {
    if (indeterminate || value < 1 || firedRef.current || !onLoaded) return;
    const elapsed = Date.now() - mountedAt.current;
    const remaining = Math.max(minDurationMs - elapsed, 0);
    const t = window.setTimeout(() => {
      firedRef.current = true;
      onLoaded();
    }, remaining);
    return () => window.clearTimeout(t);
  }, [indeterminate, value, minDurationMs, onLoaded]);

  const statusText =
    progress?.statusText ??
    (indeterminate
      ? "Loading Veeraj's World…"
      : `Loading Veeraj's World… ${Math.round(visualProgress * 100)}%`);

  // Angle for determinate mode maps progress to a point on the circle;
  // indeterminate mode just spins continuously via CSS/Framer animation.
  const angleDeg = 360 * visualProgress;

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-4 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg viewBox="0 0 140 140" width={140} height={140} aria-hidden="true">
          {/* track */}
          <circle
            cx="70"
            cy="70"
            r="56"
            fill="none"
            stroke="rgba(246,178,107,0.2)"
            strokeWidth="2"
          />
          {/* determinate progress arc (hidden visually if indeterminate, but
              harmless to render at 0) */}
          {!indeterminate && (
            <circle
              cx="70"
              cy="70"
              r="56"
              fill="none"
              stroke="#f6b26b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 56}
              strokeDashoffset={2 * Math.PI * 56 * (1 - visualProgress)}
              transform="rotate(-90 70 70)"
              opacity={0.6}
            />
          )}
        </svg>

        {/* dragon, orbiting the ring */}
        {reducedMotion ? (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `rotate(${indeterminate ? 0 : angleDeg}deg) translate(56px) rotate(${
                indeterminate ? 0 : -angleDeg
              }deg) translate(-14px, -14px)`,
            }}
          >
            <Dragon />
          </div>
        ) : (
          <motion.div
            className="absolute left-1/2 top-1/2"
            style={{ marginLeft: -14, marginTop: -14 }}
            animate={
              indeterminate
                ? { rotate: 360 }
                : { rotate: angleDeg }
            }
            transition={
              indeterminate
                ? { duration: 3.2, repeat: Infinity, ease: "linear" }
                : { duration: 0.4, ease: "easeOut" }
            }
          >
            <div style={{ transform: "translate(56px, 0px)" }}>
              <motion.div
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  transform: `rotate(${indeterminate ? 0 : -angleDeg}deg)`,
                }}
              >
                <Dragon />
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Accessible, always-present status text (visually shown too). */}
      <p className="text-sm text-amber-100/80 tracking-wide">{statusText}</p>
    </div>
  );
}

/** Small vector dragon. Belongs visually to the same warm/dark world as Teddy. */
function Dragon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <ellipse cx="14" cy="16" rx="8" ry="6" fill="#e08a3c" />
      <circle cx="20" cy="11" r="5" fill="#f0a457" />
      <path d="M17 8 L18 4 L20 7 Z" fill="#c96a2b" />
      <path d="M21 8 L23 4 L23 8 Z" fill="#c96a2b" />
      <circle cx="22" cy="10" r="1" fill="#1a0f06" />
      <path d="M6 15 C3 13, 3 19, 6 18 Z" fill="#c96a2b" />
      <path d="M4 20 L2 26 L7 22 Z" fill="#e08a3c" />
    </svg>
  );
}
