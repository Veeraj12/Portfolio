"use client";

import React, { useEffect, useRef, useState } from "react";
import { PortalTransition } from "./PortalTransition";
import { AdventureLoader } from "./AdventureLoader";
import type {
  AdventureEntryProps,
  LoaderProgress,
  PortalTransitionHandle,
} from "./types";

type Stage = "transitioning" | "loading" | "done";

/**
 * Composes PortalTransition + AdventureLoader into the full
 * "portfolio → adventure" entry sequence:
 *
 *   1. plays the portal transition
 *   2. shows the loader (determinate if `progress` is supplied, otherwise
 *      auto-simulated so the module is fully demoable standalone)
 *   3. calls onEntryComplete once both have finished
 *
 * Mount this after PortalTrigger's onEnterAdventure fires. The parent
 * still owns what actually happens at onEntryComplete (e.g. mounting
 * Module 02's world, or navigating via onNavigate).
 */
export function AdventureEntry({
  progress,
  destination,
  onPortalReaction,
  onNavigate,
  onEntryComplete,
  className = "",
}: AdventureEntryProps) {
  const transitionRef = useRef<PortalTransitionHandle>(null);
  const [stage, setStage] = useState<Stage>("transitioning");
  const [simulated, setSimulated] = useState<LoaderProgress>({ value: 0 });

  // Kick off the entry transition on mount.
  useEffect(() => {
    onPortalReaction?.({ kind: "entry-transition-start", timestamp: Date.now() });
    transitionRef.current?.playEntry().then(() => {
      onPortalReaction?.({ kind: "entry-transition-complete", timestamp: Date.now() });
      setStage("loading");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the caller didn't provide real progress, simulate it so this module
  // is independently demoable and unblocked by whatever actually loads the
  // adventure (fonts, 3D assets owned by other modules, etc).
  useEffect(() => {
    if (stage !== "loading" || progress) return;
    let raf: number;
    let value = 0;
    const tick = () => {
      value = Math.min(value + 0.02, 1);
      setSimulated({ value });
      if (value < 1) {
        raf = window.setTimeout(tick, 40) as unknown as number;
      }
    };
    tick();
    return () => window.clearTimeout(raf);
  }, [stage, progress]);

  const activeProgress = progress ?? simulated;

  const handleLoaded = () => {
    if (stage !== "loading") return;
    setStage("done");
    if (destination) onNavigate?.(destination);
    onEntryComplete?.();
  };

  return (
    <div className={className}>
      <PortalTransition ref={transitionRef} />
      {stage === "loading" && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black">
          <AdventureLoader progress={activeProgress} onLoaded={handleLoaded} />
        </div>
      )}
    </div>
  );
}
