import { useMemo, useState, useEffect } from "react";
import {
  DEFAULT_QUALITY,
  type QualityLevel,
  type WorldQualitySettings,
} from "./types";

function detectDeviceQuality(): QualityLevel {
  if (typeof navigator === "undefined") return "high";
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number })
    .deviceMemory;
  if (cores <= 2 || (mem !== undefined && mem <= 2)) return "low";
  if (cores <= 4 || (mem !== undefined && mem <= 4)) return "medium";
  return "high";
}

function detectPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Resolves final quality settings from (in priority order):
 * explicit overrides passed by the parent > OS-level reduced-motion
 * preference > detected device quality > library defaults.
 */
export function useQualitySettings(
  overrides?: Partial<WorldQualitySettings>,
): WorldQualitySettings {
  const [osReducedMotion, setOsReducedMotion] = useState(
    detectPrefersReducedMotion(),
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setOsReducedMotion(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return useMemo(() => {
    const deviceQuality = overrides?.deviceQuality ?? detectDeviceQuality();
    const base: WorldQualitySettings = {
      ...DEFAULT_QUALITY,
      deviceQuality,
      cameraQuality: deviceQuality,
      lightingQuality: deviceQuality,
      particleDensity:
        deviceQuality === "low" ? 0.3 : deviceQuality === "medium" ? 0.6 : 1,
      reducedMotion: osReducedMotion,
    };
    return { ...base, ...overrides };
  }, [overrides, osReducedMotion]);
}
