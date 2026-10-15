"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical travel (px) as the card animates into place. */
  y?: number;
  /** Optional horizontal travel (px) — positive = slides in from the right. */
  x?: number;
  /** Seconds to wait before this card animates in (for stagger). */
  delay?: number;
  /**
   * Viewport inset that decides when the card counts as "in view". A negative
   * margin makes the card travel a little further before it triggers.
   */
  margin?: string;
}

/**
 * Scroll-TRIGGERED reveal for cards: entering the viewport starts a smooth
 * timed transition (opacity + translate), and leaving the viewport reverses it.
 * The scroll position only decides WHEN to play — the animation itself is
 * eased over time, not mapped to scroll pixels, so it never feels glued to the
 * wheel.
 *
 * Reduced motion renders a quick fade only, with no scroll-linked transform.
 */
export function ScrollReveal({
  children,
  className,
  y = 32,
  x = 0,
  delay = 0,
  margin = "-12% 0px -12% 0px",
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion();

  const hidden = reducedMotion ? { opacity: 0 } : { opacity: 0, y, x };
  const shown = { opacity: 1, y: 0, x: 0 };

  return (
    <motion.div
      className={className}
      style={{ position: "relative", willChange: "opacity, transform" }}
      initial={hidden}
      whileInView={shown}
      viewport={{ once: false, margin }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.7,
        delay: reducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
