"use client";

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { PortalTransition } from "./PortalTransition";
import type { AdventureExitHandle, AdventureExitProps, PortalTransitionHandle } from "./types";

/**
 * Exit half of the transition contract.
 *
 * Conceptually mirrors AdventureEntry, but exposed as an imperative handle
 * (`startExit()`) because exit is triggered by an external event — Module
 * 05 emitting "exit ready" — rather than by mounting this component.
 *
 * Flow:
 *   startExit()
 *     → onPortalReaction("exit-transition-start")
 *     → plays portal/transition
 *     → onPortalReaction("exit-transition-complete")
 *     → onExitTransitionComplete()
 *
 * This module never performs the actual navigation back to "/" — the
 * final integrator does that inside onExitTransitionComplete or onNavigate.
 */
export const AdventureExit = forwardRef<AdventureExitHandle, AdventureExitProps>(
  function AdventureExit(
    { onPortalReaction, onNavigate, destination = "/", onExitTransitionComplete, className = "" },
    ref
  ) {
    const transitionRef = useRef<PortalTransitionHandle>(null);

    useImperativeHandle(
      ref,
      () => ({
        startExit: () => {
          onPortalReaction?.({ kind: "exit-transition-start", timestamp: Date.now() });
          transitionRef.current?.playExit().then(() => {
            onPortalReaction?.({
              kind: "exit-transition-complete",
              timestamp: Date.now(),
            });
            onNavigate?.(destination);
            onExitTransitionComplete?.();
          });
        },
      }),
      [onPortalReaction, onNavigate, destination, onExitTransitionComplete]
    );

    return (
      <div className={className}>
        <PortalTransition ref={transitionRef} />
      </div>
    );
  }
);
