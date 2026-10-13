"use client";

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "./hooks/usePrefersReducedMotion";
import type { PortalTransitionHandle, PortalTransitionProps } from "./types";

type Phase = "idle" | "entry" | "exit";

/**
 * Full-viewport transition overlay, driven imperatively via ref so the
 * parent's state machine (owned by the final integrator) decides *when*
 * to play it, without this module needing to know about routes, phases,
 * or other modules.
 *
 * Usage:
 *   const ref = useRef<PortalTransitionHandle>(null);
 *   await ref.current?.playEntry();
 *   // mount adventure / navigate
 *
 * Renders nothing (returns null) when idle, so it's cheap to keep mounted
 * at the app root.
 */
export const PortalTransition = forwardRef<PortalTransitionHandle, PortalTransitionProps>(
  function PortalTransition({ onEntryComplete, onExitComplete, className = "" }, ref) {
    const [phase, setPhase] = useState<Phase>("idle");
    const reducedMotion = usePrefersReducedMotion();
    const duration = reducedMotion ? 0.35 : 0.9;

    useImperativeHandle(
      ref,
      () => ({
        playEntry: () =>
          new Promise<void>((resolve) => {
            setPhase("entry");
            window.setTimeout(() => {
              onEntryComplete?.();
              resolve();
            }, duration * 1000);
          }),
        playExit: () =>
          new Promise<void>((resolve) => {
            setPhase("exit");
            window.setTimeout(() => {
              setPhase("idle");
              onExitComplete?.();
              resolve();
            }, duration * 1000);
          }),
      }),
      [duration, onEntryComplete, onExitComplete]
    );

    return (
      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div
            key={phase}
            role="presentation"
            aria-hidden="true"
            className={`fixed inset-0 z-[999] pointer-events-none flex items-center justify-center ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration * 0.4 }}
          >
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration }}
            />
            <motion.div
              className="relative rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,216,160,0.9) 0%, rgba(245,163,92,0.55) 40%, rgba(0,0,0,0) 70%)",
              }}
              initial={
                phase === "entry"
                  ? { width: 40, height: 40, opacity: 0.4 }
                  : {
                      width: reducedMotion ? 800 : 2200,
                      height: reducedMotion ? 800 : 2200,
                      opacity: 0.9,
                    }
              }
              animate={
                phase === "entry"
                  ? {
                      width: reducedMotion ? 800 : 2200,
                      height: reducedMotion ? 800 : 2200,
                      opacity: [0.4, 1, 0.9],
                    }
                  : {
                      width: 40,
                      height: 40,
                      opacity: 0.3,
                    }
              }
              transition={{ duration, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
