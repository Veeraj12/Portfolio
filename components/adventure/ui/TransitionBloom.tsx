"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Warm bloom that carries the world -> board transition: it swells while
 * Teddy lands on the chosen brick, then recedes as the board opens. Purely
 * decorative (aria-hidden); skipped under reduced motion.
 */
export function TransitionBloom({ active, durationMs }: { active: boolean; durationMs: number }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-20"
          style={{ background: "radial-gradient(circle at 50% 42%, rgba(245,164,92,0.55) 0%, rgba(201,121,58,0.25) 32%, rgba(6,5,4,0) 68%)" }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 1, 0.85], scale: [0.6, 1.1, 1.5] }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          transition={{ duration: durationMs / 1000, ease: "easeInOut" }}
        />
      )}
    </AnimatePresence>
  );
}
