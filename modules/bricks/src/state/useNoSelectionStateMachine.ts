import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoSelectionStage, NoSelectionTimingConfig } from "../types";

export const DEFAULT_NO_SELECTION_TIMING: NoSelectionTimingConfig = {
  toConfusedMs: 6_000,
  toSadMs: 12_000,
  toCryingMs: 20_000,
  toHidingMs: 30_000,
};

const STAGE_ORDER: NoSelectionStage[] = ["WAITING", "CONFUSED", "SAD", "CRYING", "HIDING"];

interface UseNoSelectionStateMachineOptions {
  /**
   * Whether the machine should be counting right now. Set this to
   * `false` while a destination is selected, and back to `true` when
   * selection is cleared — the machine resets to WAITING every time
   * `active` transitions from false to true (or on first mount).
   */
  active: boolean;
  timing?: Partial<NoSelectionTimingConfig>;
  onStageChange?: (stage: NoSelectionStage, previous: NoSelectionStage) => void;
}

interface UseNoSelectionStateMachineResult {
  stage: NoSelectionStage;
  /** Manually force the machine back to WAITING and restart the timers (if active). */
  reset: () => void;
}

/**
 * Deterministic, centralized timing for the "Teddy gets sadder the longer
 * nothing is picked" progression:
 *
 *   WAITING -> CONFUSED -> SAD -> CRYING -> HIDING
 *
 * Design notes (see README "No-selection state machine" for the full
 * contract):
 * - All timers are scheduled from ONE effect, relative to the moment the
 *   machine becomes active — never scattered `setTimeout` calls spread
 *   across render logic or child components.
 * - Every timer is tracked and cleared together, so unmounting or
 *   deactivating never leaves a stray timer that fires late.
 * - Selecting a destination (setting `active` to false) and re-entering
 *   the no-selection state (setting `active` back to true) both reset the
 *   machine to WAITING and restart the countdown from zero.
 */
export function useNoSelectionStateMachine({
  active,
  timing,
  onStageChange,
}: UseNoSelectionStateMachineOptions): UseNoSelectionStateMachineResult {
  const [stage, setStage] = useState<NoSelectionStage>("WAITING");
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageRef = useRef<NoSelectionStage>("WAITING");

  const resolvedTiming = useMemo<NoSelectionTimingConfig>(
    () => ({ ...DEFAULT_NO_SELECTION_TIMING, ...timing }),
    // Individual fields are compared so callers can pass a fresh object literal each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      timing?.toConfusedMs,
      timing?.toSadMs,
      timing?.toCryingMs,
      timing?.toHidingMs,
    ]
  );

  const clearAllTimers = useCallback(() => {
    timeoutIdsRef.current.forEach((id) => clearTimeout(id));
    timeoutIdsRef.current = [];
  }, []);

  const setStageInternal = useCallback(
    (next: NoSelectionStage) => {
      const previous = stageRef.current;
      if (previous === next) return;
      stageRef.current = next;
      setStage(next);
      onStageChange?.(next, previous);
    },
    [onStageChange]
  );

  const reset = useCallback(() => {
    clearAllTimers();
    setStageInternal("WAITING");
  }, [clearAllTimers, setStageInternal]);

  useEffect(() => {
    clearAllTimers();

    if (!active) {
      setStageInternal("WAITING");
      return;
    }

    setStageInternal("WAITING");

    const schedule = (stageName: NoSelectionStage, delayMs: number) => {
      const id = setTimeout(() => setStageInternal(stageName), delayMs);
      timeoutIdsRef.current.push(id);
    };

    schedule("CONFUSED", resolvedTiming.toConfusedMs);
    schedule("SAD", resolvedTiming.toSadMs);
    schedule("CRYING", resolvedTiming.toCryingMs);
    schedule("HIDING", resolvedTiming.toHidingMs);

    // Cleanup covers both unmount AND every re-schedule (deactivation, timing change).
    return clearAllTimers;
  }, [active, resolvedTiming, clearAllTimers, setStageInternal]);

  return { stage, reset };
}

export function isStageAtLeast(stage: NoSelectionStage, target: NoSelectionStage): boolean {
  return STAGE_ORDER.indexOf(stage) >= STAGE_ORDER.indexOf(target);
}
