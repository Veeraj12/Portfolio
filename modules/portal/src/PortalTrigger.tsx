"use client";

import React, { useCallback, useRef, useState } from "react";
import { Portal } from "./Portal";
import type { PortalReactionEvent, PortalState, PortalTriggerProps } from "./types";

/**
 * Interactive, accessible entry point for the adventure.
 *
 * - Renders as a real <button> so it's keyboard operable and screen-reader
 *   friendly by default (no hover-only interaction).
 * - Hover AND focus both drive the "hover" visual state, so touch/keyboard
 *   users get the same feedback mouse users get.
 * - Calls onPortalReaction with semantic events an integrator can forward
 *   to Teddy; this module never imports Teddy itself.
 */
export function PortalTrigger({
  onEnterAdventure,
  onPortalReaction,
  size = 220,
  label = "Enter Veeraj's World",
  className = "",
  disabled = false,
}: PortalTriggerProps) {
  const [state, setState] = useState<PortalState>("dormant");
  const activatedRef = useRef(false);

  const emit = useCallback(
    (kind: PortalReactionEvent["kind"]) => {
      onPortalReaction?.({ kind, timestamp: Date.now() });
    },
    [onPortalReaction]
  );

  const handleHoverStart = useCallback(() => {
    if (disabled || activatedRef.current) return;
    setState("hover");
    emit("portal-hover-start");
  }, [disabled, emit]);

  const handleHoverEnd = useCallback(() => {
    if (disabled || activatedRef.current) return;
    setState("dormant");
    emit("portal-hover-end");
  }, [disabled, emit]);

  const handleActivate = useCallback(() => {
    if (disabled || activatedRef.current) return;
    activatedRef.current = true;
    setState("active");
    emit("portal-activated");
    // Give the "active" visual a beat to read before handing off to the
    // parent, which typically mounts PortalTransition next.
    window.setTimeout(() => {
      onEnterAdventure();
    }, 220);
  }, [disabled, emit, onEnterAdventure]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleActivate();
      }
    },
    [handleActivate]
  );

  return (
    <button
      type="button"
      className={`group relative inline-flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{ width: size, height: size }}
      aria-label={label}
      disabled={disabled}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onFocus={handleHoverStart}
      onBlur={handleHoverEnd}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <Portal state={state} size={size} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
