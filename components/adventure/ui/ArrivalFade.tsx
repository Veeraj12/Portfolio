"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ARRIVAL_FLAG } from "../config";

/**
 * Wraps the professional-portfolio page. If the person just stepped out of
 * Veeraj's World (brief §33: "the user enters the professional portfolio"),
 * the page fades in instead of appearing instantly. Reads and clears a
 * one-shot sessionStorage flag set by AdventureClient on exit.
 */
export function ArrivalFade({ children }: { children: ReactNode }) {
  const [arriving, setArriving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ARRIVAL_FLAG) === "1") {
        sessionStorage.removeItem(ARRIVAL_FLAG);
        setArriving(true);
      }
    } catch {
      // sessionStorage unavailable: just skip the fade, page renders normally.
    }
  }, []);

  if (!arriving) return <>{children}</>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
