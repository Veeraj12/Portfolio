"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { InputSource } from "../events";

/**
 * Tracks whether the most recent pointer was touch or mouse/pen so a brick
 * "hover" can be labelled correctly. Listens in the capture phase so it runs
 * before R3F's own handlers for the same event.
 */
export function usePointerKind(): MutableRefObject<InputSource> {
  const kind = useRef<InputSource>("pointer");
  useEffect(() => {
    const h = (e: PointerEvent) => {
      kind.current = e.pointerType === "touch" ? "touch" : "pointer";
    };
    window.addEventListener("pointerdown", h, { capture: true, passive: true });
    window.addEventListener("pointermove", h, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", h, { capture: true });
      window.removeEventListener("pointermove", h, { capture: true });
    };
  }, []);
  return kind;
}
