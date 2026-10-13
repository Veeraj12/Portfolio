"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PortalTrigger } from "@/modules/portal";
import { WELCOME_CENTER_POINT, projectWorldToScreen } from "../config";

const PORTAL_SIZE = 240;

function computeAnchor(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return projectWorldToScreen(WELCOME_CENTER_POINT, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
}

/**
 * The exit portal. Uses the portal module's real <PortalTrigger> (a genuine
 * <button>, keyboard operable) as the way out of Veeraj's World.
 *
 * The portal is pinned so its CENTRE lands exactly on the centre of the
 * WELCOME word's "C" glyph: we project that world-space anchor through the
 * World's fixed resting camera and place the DOM overlay at the resulting
 * pixel. The caption + "stay" control hang below the portal.
 */
export function ExitPortalLayer({
  visible,
  reducedMotion,
  onEnter,
  onStay,
  onHover,
}: {
  visible: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  onStay: () => void;
  onHover: (hovering: boolean) => void;
}) {
  const [anchor, setAnchor] = useState(computeAnchor);

  useEffect(() => {
    const onResize = () => setAnchor(computeAnchor());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-30 bg-[#060504]/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.7 }}
        >
          <div
            className="absolute flex flex-col items-center gap-4"
            style={{
              left: anchor.x,
              top: anchor.y,
              // Shift up by the portal's half-height so the PORTAL's centre
              // (not the column's) sits on the anchor.
              transform: `translate(-50%, -${PORTAL_SIZE / 2}px)`,
            }}
          >
            <motion.div
              initial={reducedMotion ? false : { scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <PortalTrigger
                size={PORTAL_SIZE}
                label="Leave Veeraj's World and return to the portfolio"
                onEnterAdventure={onEnter}
                onPortalReaction={(e) => {
                  if (e.kind === "portal-hover-start") onHover(true);
                  if (e.kind === "portal-hover-end") onHover(false);
                }}
              />
            </motion.div>
            <p className="font-mono text-xs tracking-wide text-amber-200/70">Step through to return to the portfolio</p>
            <button
              type="button"
              onClick={onStay}
              className="rounded-sm px-2 py-1 font-mono text-xs text-amber-200/60 underline-offset-4 outline-none hover:text-amber-100 hover:underline focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              Stay a little longer
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
