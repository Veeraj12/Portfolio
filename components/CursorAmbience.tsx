"use client";

import { useEffect, useRef } from "react";
import {
  ambientState,
  blendStops,
  progressForPosition,
  rgbTriplet,
} from "@/lib/ambient";

/**
 * Time constants (ms) for the exponential smoothing. Lower = snappier. They
 * are applied against the actual frame delta, so the trailing feels the same
 * on a 60Hz and a 120Hz display (a fixed per-frame factor would lag on one and
 * snap on the other). The halo keeps a whisper of trail; the hue changes
 * slowly enough to stay fluid without flashing.
 */
const POSITION_TAU = 65;
const COLOR_TAU = 120;

/**
 * A single, page-level ambient light that trails the cursor like a soft
 * spotlight under dark glass. It is `position: fixed` and `pointer-events:
 * none`, so it never competes with links or card interactions, and it only
 * becomes visible while the pointer is inside a `[data-ambient-zone]` element
 * (the hero and the project explorer) — giving the light one continuous
 * backdrop rather than a separate effect per card.
 *
 * All motion runs in one self-stopping `requestAnimationFrame` loop driven by
 * a passive `pointermove` listener. Position and colour are written to CSS
 * custom properties (`--cursor-x`, `--cursor-y`, `--glow-color`), so React
 * never re-renders while the cursor moves.
 *
 * Touch devices and `prefers-reduced-motion` get no trailing light at all.
 */
export function CursorAmbience() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const root = document.documentElement;
    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!finePointer || reducedMotion) {
      layer.dataset.active = "false";
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.4;
    let currentX = targetX;
    let currentY = targetY;
    let currentR = ambientState.rgb[0];
    let currentG = ambientState.rgb[1];
    let currentB = ambientState.rgb[2];
    let frame = 0;
    let running = false;
    let last = 0;

    const tick = (now: number) => {
      const dt = last ? Math.min(now - last, 64) : 16.7;
      last = now;
      const positionAlpha = 1 - Math.exp(-dt / POSITION_TAU);
      const colorAlpha = 1 - Math.exp(-dt / COLOR_TAU);

      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * positionAlpha;
      currentY += dy * positionAlpha;

      const progress = progressForPosition(
        Math.min(Math.max(targetX / window.innerWidth, 0), 1),
        Math.min(Math.max(targetY / window.innerHeight, 0), 1),
      );
      const target = blendStops(progress);
      currentR += (target[0] - currentR) * colorAlpha;
      currentG += (target[1] - currentG) * colorAlpha;
      currentB += (target[2] - currentB) * colorAlpha;

      const r = Math.round(currentR);
      const g = Math.round(currentG);
      const b = Math.round(currentB);

      layer.style.setProperty("--cursor-x", `${currentX}px`);
      layer.style.setProperty("--cursor-y", `${currentY}px`);
      root.style.setProperty("--glow-color", rgbTriplet([r, g, b]));

      ambientState.t = progress;
      ambientState.rgb = [r, g, b];

      const settled =
        Math.abs(dx) < 0.5 &&
        Math.abs(dy) < 0.5 &&
        Math.abs(target[0] - currentR) < 0.5 &&
        Math.abs(target[1] - currentG) < 0.5 &&
        Math.abs(target[2] - currentB) < 0.5;

      if (settled) {
        frame = 0;
        running = false;
        last = 0;
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      frame = window.requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      targetX = event.clientX;
      targetY = event.clientY;
      start();
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const inZone = Boolean(target?.closest?.("[data-ambient-zone]"));
      layer.dataset.active = inZone ? "true" : "false";
    };

    const onPointerOut = () => {
      layer.dataset.active = "false";
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    // Leaving the window (to browser chrome, another app) should dim the light.
    document.addEventListener("mouseleave", onPointerOut);
    window.addEventListener("blur", onPointerOut);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("mouseleave", onPointerOut);
      window.removeEventListener("blur", onPointerOut);
      if (frame) window.cancelAnimationFrame(frame);
      root.style.removeProperty("--glow-color");
    };
  }, []);

  return (
    <div ref={layerRef} aria-hidden data-active="false" className="cursor-ambient">
      <div className="cursor-ambient-blob" />
      <div className="cursor-ambient-core" />
    </div>
  );
}
