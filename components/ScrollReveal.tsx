"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical travel (px) as the card scrolls into place. */
  y?: number;
  /** Optional horizontal travel (px) — positive = slides in from the right. */
  x?: number;
  /**
   * Viewport fractions (0 = top, 1 = bottom) where the reveal starts and ends.
   * The card is hidden when its top edge sits at `start` and fully shown at
   * `end`. Defaults reveal it as it rises from the bottom third to mid-screen.
   */
  start?: number;
  end?: number;
}

/**
 * Scroll-LINKED reveal for cards: opacity + translate driven directly by the
 * scroll position (framer's `useScroll` shares one passive scroll listener and
 * batches updates on rAF). Only `opacity`/`transform` are animated, so it stays
 * cheap. Because it tracks the scroll position rather than a one-shot trigger,
 * it eases back out naturally as the card leaves the viewport.
 *
 * Reduced motion renders the children with no scroll-linked transform.
 */
export function ScrollReveal({
  children,
  className,
  y = 32,
  x = 0,
  start = 0.96,
  end = 0.6,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`start ${start * 100}%`, `start ${end * 100}%`],
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [y, 0]);
  const translateX = useTransform(scrollYProgress, [0, 1], [x, 0]);

  if (reducedMotion) {
    return (
      <div className={className} style={{ position: "relative" }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        opacity,
        y: translateY,
        x: translateX,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </motion.div>
  );
}
