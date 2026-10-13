import { useEffect, useState } from "react";

/**
 * Resolves effective reduced-motion state: an explicit `override` prop wins;
 * otherwise this tracks `(prefers-reduced-motion: reduce)` live.
 */
export function useResolvedReducedMotion(override?: boolean): boolean {
  const [systemPrefers, setSystemPrefers] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefers(e.matches);
    // Safari <14 fallback
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, []);

  return override ?? systemPrefers;
}
