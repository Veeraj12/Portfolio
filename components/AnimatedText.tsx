"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  /** Element to render the text as. Defaults to a span. */
  as?: React.ElementType;
  className?: string;
  /** "view" (on scroll into view) or "mount" (immediately, for the hero). */
  trigger?: "view" | "mount";
  /** Extra delay in seconds before the first word. */
  delay?: number;
  /** Seconds between consecutive words. */
  stagger?: number;
  once?: boolean;
  /** Apply the theme's gradient text treatment to each word (persistent). */
  gradient?: boolean;
  /**
   * Cursor spotlight: hovering an individual word shines the theme gradient
   * out from exactly where the pointer is, expanding on enter and retracting
   * on leave — a natural "colour spreading from the cursor" instead of a wipe.
   */
  spotlight?: boolean;
}

/**
 * Word-by-word masked reveal for display headings — the treatment ArtCraft /
 * FilmCraft use on their big type. Each word sits in an overflow-clipped span
 * and rises up out of it (plus a short blur) with a per-word stagger, so a
 * heading assembles itself rather than just fading in.
 *
 * Reduced motion: no rise/blur, a simple quick fade instead.
 */
export function AnimatedText({
  text,
  as = "span",
  className,
  trigger = "view",
  delay = 0,
  stagger = 0.032,
  once = true,
  gradient = false,
  spotlight = false,
}: AnimatedTextProps) {
  const reducedMotion = useReducedMotion();
  const words = React.useMemo(() => text.split(" ").filter(Boolean), [text]);

  const hidden = reducedMotion
    ? { opacity: 0 }
    : { y: "115%", opacity: 0, filter: "blur(6px)" };
  const shown = reducedMotion
    ? { opacity: 1 }
    : { y: "0%", opacity: 1, filter: "blur(0px)" };

  const activation =
    trigger === "mount"
      ? { animate: shown }
      : { whileInView: shown, viewport: { once, margin: "-60px" } };

  // Track the pointer inside the hovered word and hand its position to the
  // `.at-spot` background so the gradient follows the cursor.
  const onSpotMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  const children: React.ReactNode[] = [];
  words.forEach((word, i) => {
    children.push(
      <span
        key={`${word}-${i}`}
        className="inline-block overflow-hidden align-bottom pb-[0.15em] -mb-[0.15em]"
      >
        <motion.span
          className={`inline-block will-change-transform${gradient ? " text-gradient" : ""}${spotlight ? " at-spot" : ""}`}
          initial={hidden}
          transition={{
            duration: reducedMotion ? 0.2 : 0.42,
            delay: reducedMotion ? 0 : delay + i * stagger,
            ease: [0.16, 1, 0.3, 1],
          }}
          onMouseMove={spotlight ? onSpotMove : undefined}
          {...activation}
        >
          {word}
        </motion.span>
      </span>
    );
    if (i < words.length - 1) children.push(" ");
  });

  return React.createElement(as, { className }, children);
}
