/**
 * useAdventureExit.ts
 *
 * React hook wrapper around AdventureTimer + ExitController. This is the
 * one thing most consumers need — it starts the timer once per session,
 * keeps the timestamp stable across renders, ticks a display-friendly
 * elapsed value, and exposes the exit state machine's callback surface.
 *
 * This hook renders nothing and imports nothing from board/world/Teddy —
 * it only returns data and callbacks for the final integrator to wire up.
 *
 * Usage sketch (final integration, illustrative only):
 *
 *   const exit = useAdventureExit({ longSessionThresholdSeconds: 600 });
 *
 *   <CloseButton
 *     onMouseEnter={exit.onCloseHover}
 *     onMouseLeave={exit.onCloseUnhover}
 *     onFocus={exit.onCloseHover}
 *     onBlur={exit.onCloseUnhover}
 *     onClick={exit.onCloseSelected}
 *   />
 *
 *   useEffect(() => {
 *     if (exit.teddyReaction) sendToRealTeddy(exit.teddyReaction);
 *   }, [exit.teddyReaction]);
 *
 *   useEffect(() => {
 *     if (exit.state === "EXIT_READY") handoffToPortal();
 *   }, [exit.state]);
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AdventureTimer } from "./AdventureTimer";
import { ExitController } from "./ExitController";
import type {
  ElapsedDuration,
  ExitControllerConfig,
  ExitState,
  TeddyReaction,
} from "./types";
import { formatElapsedSeconds } from "./AdventureTimer";

export type UseAdventureExitOptions = Omit<
  ExitControllerConfig,
  "getElapsedSeconds" | "onTeddyReaction" | "onStateChange"
> & {
  /** Display tick interval in ms while a close-related state is active. Default 1000. */
  tickIntervalMs?: number;
  /** Start the timer immediately on mount. Default true. */
  autoStart?: boolean;
};

export interface UseAdventureExitResult {
  state: ExitState;
  elapsedSeconds: number;
  elapsedDuration: ElapsedDuration;
  teddyReaction: TeddyReaction | null;
  start: () => void;
  restart: () => void;
  onCloseHover: () => void;
  onCloseUnhover: () => void;
  onCloseSelected: () => void;
}

export function useAdventureExit(
  options: UseAdventureExitOptions = {}
): UseAdventureExitResult {
  const { tickIntervalMs = 1000, autoStart = true, ...controllerOptions } = options;

  // One timer / one controller per mounted adventure session. Refs survive
  // re-renders without re-running any constructor logic.
  const timerRef = useRef<AdventureTimer | null>(null);
  if (timerRef.current === null) {
    timerRef.current = new AdventureTimer();
  }

  const [state, setState] = useState<ExitState>("IDLE");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [teddyReaction, setTeddyReaction] = useState<TeddyReaction | null>(null);

  const controllerRef = useRef<ExitController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new ExitController({
      ...controllerOptions,
      getElapsedSeconds: () => timerRef.current!.getElapsedSeconds(),
      onTeddyReaction: setTeddyReaction,
      onStateChange: (next) => {
        setElapsedSeconds(timerRef.current!.getElapsedSeconds());
        setState(next);
      },
      onExitSequenceStarted: controllerOptions.onExitSequenceStarted,
      onAdventureExitReady: controllerOptions.onAdventureExitReady,
    });
  }

  useEffect(() => {
    if (autoStart) {
      timerRef.current!.start();
    }
    return () => {
      controllerRef.current!.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lightweight display tick so `elapsedSeconds` stays fresh for on-screen
  // dialogue even when no state transition has happened recently.
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(timerRef.current!.getElapsedSeconds());
    }, tickIntervalMs);
    return () => clearInterval(interval);
  }, [tickIntervalMs]);

  const start = useCallback(() => {
    timerRef.current!.start();
    setElapsedSeconds(timerRef.current!.getElapsedSeconds());
  }, []);

  const restart = useCallback(() => {
    controllerRef.current!.restart();
    timerRef.current!.reset();
    timerRef.current!.start();
    setElapsedSeconds(0);
    setTeddyReaction(null);
    setState("IDLE");
  }, []);

  const onCloseHover = useCallback(() => controllerRef.current!.onCloseHover(), []);
  const onCloseUnhover = useCallback(() => controllerRef.current!.onCloseUnhover(), []);
  const onCloseSelected = useCallback(() => controllerRef.current!.onCloseSelected(), []);

  return {
    state,
    elapsedSeconds,
    elapsedDuration: formatElapsedSeconds(elapsedSeconds),
    teddyReaction,
    start,
    restart,
    onCloseHover,
    onCloseUnhover,
    onCloseSelected,
  };
}
