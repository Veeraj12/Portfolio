"use client";

import { useEffect, useRef } from "react";
import { ambientState, blendStops } from "@/lib/ambient";

/**
 * Reusable project-card illumination logic.
 *
 * Attach the returned ref to a card element. On pointer move the hook writes
 * the cursor's position *within the card* to `--card-x` / `--card-y` and a
 * locally-shifted variant of the shared ambient colour to
 * `--card-glow-color`. `--card-strength` is flipped on enter/leave so CSS can
 * ease the glow in and back out to its resting state.
 *
 * It reads `ambientState` (a plain module object updated by `CursorAmbience`)
 * instead of React state, so a cursor sweep never re-renders the cards, and
 * updates are coalesced through a single `requestAnimationFrame` per card —
 * and only the one card under the pointer is ever active.
 *
 * Disabled entirely for touch input and `prefers-reduced-motion`, where the
 * CSS resting/hover styles still provide a static (non-following) highlight.
 */
export function useCardGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!finePointer || reducedMotion) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const localX = (pointerX - rect.left) / rect.width;
      const localY = (pointerY - rect.top) / rect.height;

      el.style.setProperty("--card-x", `${pointerX - rect.left}px`);
      el.style.setProperty("--card-y", `${pointerY - rect.top}px`);

      // Inherit the shared ambient hue, nudged by where the cursor sits in the
      // card so the local glow drifts subtly rather than matching exactly.
      const progress =
        ambientState.t + (localX - 0.5) * 0.2 + (localY - 0.5) * 0.06;
      const [r, g, b] = blendStops(progress);
      el.style.setProperty("--card-glow-color", `${r} ${g} ${b}`);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onEnter = () => {
      el.style.setProperty("--card-strength", "1");
    };

    const onLeave = () => {
      el.style.setProperty("--card-strength", "0");
    };

    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      el.style.removeProperty("--card-strength");
    };
  }, []);

  return ref;
}
