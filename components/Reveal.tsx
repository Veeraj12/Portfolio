"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before this element animates in (for stagger). */
  delay?: number;
  /** How far (px) the element rises as it fades in. */
  y?: number;
  /** How far (px) the element slides in horizontally as it fades in.
   *  Positive = from the right (slides left into place). */
  x?: number;
  /** Add a tumbling 3D flip to the slide (rotate + rotateY). */
  tumble?: boolean;
  /**
   * Animate only on first entry. Defaults to false so the reveal REVERSES as
   * the element leaves the viewport (slowly hides on scroll-down, then plays
   * again on the way back).
   */
  once?: boolean;
}

/**
 * Shared scroll-reveal used across the portfolio. One implementation means
 * every section fades/slides with the same easing and the same reduced-motion
 * behavior (fade only, no translate) instead of each section re-inventing it.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  x = 0,
  tumble = false,
  once = false,
}: RevealProps) {
  const reducedMotion = useReducedMotion();

  const hidden = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x, y, ...(tumble ? { rotate: -6, rotateY: 24 } : null) };
  const shown = { opacity: 1, x: 0, y: 0, rotate: 0, rotateY: 0 };

  return (
    <motion.div
      className={className}
      style={tumble && !reducedMotion ? { transformPerspective: 1100 } : undefined}
      initial={hidden}
      whileInView={shown}
      viewport={{ once, margin: "-70px" }}
      transition={{
        duration: reducedMotion ? 0.2 : 0.85,
        delay: reducedMotion ? 0 : delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
