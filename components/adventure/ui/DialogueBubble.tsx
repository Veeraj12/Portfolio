"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { DialogueLine } from "../controller";

/**
 * Teddy's speech. A caption bubble at a fixed spot (bottom centre) so it never
 * moves under the pointer. aria-live so the line is announced, which also
 * means hover is never the only way to get the information.
 */
export function DialogueBubble({
  line,
  reducedMotion,
  action,
}: {
  line: DialogueLine | null;
  reducedMotion: boolean;
  /** Optional explicit affordance under the line (touch "Go" button). */
  action?: { label: string; onClick: () => void } | null;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 sm:bottom-8" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {line && (
          <motion.div
            key={line.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto max-w-md rounded-md border border-amber-400/25 bg-[#1a120b]/90 px-4 py-2.5 text-center shadow-[0_0_32px_rgba(245,164,92,0.12)]"
          >
            <p className="text-sm leading-snug text-amber-50">
              <span className="mr-2 font-mono text-[11px] uppercase tracking-wide text-amber-300/70">Teddy</span>
              {line.text}
            </p>
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="mt-2 rounded-sm border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-mono text-xs text-amber-100 outline-none hover:bg-amber-400/20 focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                {action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
