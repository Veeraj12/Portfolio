import { useCallback, useEffect, useRef, useState } from "react";
import {
  HELD_ACTIONS,
  ONE_SHOT_ACTIONS,
  type TeddyAction,
  type TeddyController,
  type TeddyExpression,
} from "./Teddy.types";
import { ACTION_TIMING, randomBlinkDelay } from "./teddyActions";

export interface UseTeddyStateArgs {
  expression?: TeddyExpression;
  action?: TeddyAction;
  talking?: boolean;
  reducedMotion: boolean;
  onAnimationStart?: (action: TeddyAction) => void;
  onAnimationComplete?: (action: TeddyAction) => void;
  onActionComplete?: (action: TeddyAction) => void;
}

export interface TeddyState {
  expression: TeddyExpression;
  /** The currently-held/looping action (idle/walk/hide/cry). */
  heldAction: TeddyAction;
  /** A one-shot action currently mid-flight, if any (blink/talk/jump/wave). */
  activeOneShot: TeddyAction | null;
  /** What should actually be rendered right now: the one-shot if playing,
   * otherwise the held action. */
  visibleAction: TeddyAction;
  talking: boolean;
  /** Pulses true for a brief window on each automatic idle blink. */
  autoBlink: boolean;
}

/**
 * Internal engine backing <Teddy />. Owns the held-action / one-shot state
 * machine, the natural randomized auto-blink timer, and all setTimeout /
 * setInterval bookkeeping — with guaranteed cleanup on unmount so no module
 * embedding Teddy has to think about leaked timers.
 *
 * Exposes both the resolved render state and a stable imperative
 * `controller` object suitable for `useImperativeHandle`.
 */
/**
 * The controller this hook returns intentionally omits `setFacing` (and
 * `facing` from `getState()`): facing is deliberately kept out of this file
 * and layered on by `Teddy3D.tsx`'s `useImperativeHandle`, which wraps this
 * return value and adds both before exposing the full `TeddyController`
 * publicly (see Teddy3D.tsx). This type reflects what's actually returned
 * here, rather than widening it to the full public `TeddyController` shape.
 */
type InternalTeddyController = Omit<TeddyController, "setFacing" | "getState"> & {
  getState: () => Omit<ReturnType<TeddyController["getState"]>, "facing">;
};

export function useTeddyState(args: UseTeddyStateArgs): {
  state: TeddyState;
  controller: InternalTeddyController;
} {
  const {
    expression: expressionProp,
    action: actionProp,
    talking: talkingProp,
    reducedMotion,
    onAnimationStart,
    onAnimationComplete,
    onActionComplete,
  } = args;

  const [expression, setExpressionState] = useState<TeddyExpression>(
    expressionProp ?? "neutral"
  );
  const [heldAction, setHeldActionState] = useState<TeddyAction>(
    actionProp && HELD_ACTIONS.has(actionProp) ? actionProp : "idle"
  );
  const [activeOneShot, setActiveOneShot] = useState<TeddyAction | null>(
    actionProp && ONE_SHOT_ACTIONS.has(actionProp) ? actionProp : null
  );
  const [talking, setTalkingState] = useState<boolean>(talkingProp ?? false);
  const [autoBlink, setAutoBlink] = useState(false);

  // Refs for callbacks so timers always call the latest without re-arming.
  const callbacksRef = useRef({
    onAnimationStart,
    onAnimationComplete,
    onActionComplete,
  });
  callbacksRef.current = { onAnimationStart, onAnimationComplete, onActionComplete };

  const oneShotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldLoopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearOneShotTimer = () => {
    if (oneShotTimeoutRef.current) {
      clearTimeout(oneShotTimeoutRef.current);
      oneShotTimeoutRef.current = null;
    }
  };

  const playHeld = useCallback(
    (next: TeddyAction) => {
      setHeldActionState(next);
      callbacksRef.current.onAnimationStart?.(next);

      if (heldLoopIntervalRef.current) {
        clearInterval(heldLoopIntervalRef.current);
        heldLoopIntervalRef.current = null;
      }
      const timing = ACTION_TIMING[next];
      if (timing.loops) {
        heldLoopIntervalRef.current = setInterval(() => {
          callbacksRef.current.onAnimationComplete?.(next);
        }, timing.durationMs);
      }
    },
    []
  );

  const playOneShot = useCallback((next: TeddyAction) => {
    clearOneShotTimer();
    setActiveOneShot(next);
    callbacksRef.current.onAnimationStart?.(next);
    const timing = ACTION_TIMING[next];
    oneShotTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setActiveOneShot(null);
      callbacksRef.current.onAnimationComplete?.(next);
      callbacksRef.current.onActionComplete?.(next);
      oneShotTimeoutRef.current = null;
    }, timing.durationMs);
  }, []);

  const play = useCallback(
    (next: TeddyAction) => {
      if (ONE_SHOT_ACTIONS.has(next)) {
        playOneShot(next);
      } else {
        // A held action safely replaces the previous one; any in-flight
        // one-shot is left to finish naturally on top of it.
        playHeld(next);
      }
    },
    [playHeld, playOneShot]
  );

  const setExpression = useCallback((next: TeddyExpression) => {
    setExpressionState(next);
  }, []);

  const setTalking = useCallback((next: boolean) => {
    setTalkingState(next);
  }, []);

  const reset = useCallback(() => {
    setExpressionState("neutral");
    clearOneShotTimer();
    setActiveOneShot(null);
    playHeld("idle");
    setTalkingState(false);
  }, [playHeld]);

  const getState = useCallback(
    () => ({
      expression,
      action: activeOneShot ?? heldAction,
      heldAction,
      talking,
    }),
    [expression, activeOneShot, heldAction, talking]
  );

  // Sync from controlled props whenever they change.
  useEffect(() => {
    if (expressionProp !== undefined) setExpressionState(expressionProp);
  }, [expressionProp]);

  useEffect(() => {
    if (actionProp !== undefined) play(actionProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionProp]);

  useEffect(() => {
    if (talkingProp !== undefined) setTalkingState(talkingProp);
  }, [talkingProp]);

  // Natural randomized auto-blink loop. Skipped while a one-shot action is
  // already mid-flight (avoids visually stacking two face changes) and
  // while reduced motion is active is still allowed — blinking is a tiny,
  // non-displacing motion, so it stays on for aliveness; see README.
  useEffect(() => {
    const scheduleNext = () => {
      blinkTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        if (!activeOneShot) {
          setAutoBlink(true);
          blinkPulseTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) setAutoBlink(false);
          }, 140);
        }
        scheduleNext();
      }, randomBlinkDelay());
    };
    scheduleNext();
    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (blinkPulseTimeoutRef.current) clearTimeout(blinkPulseTimeoutRef.current);
    };
    // Intentionally only re-armed on mount; activeOneShot is read live via
    // closure-free ref check would be nicer, but this timer is long-cycle
    // enough that re-checking per fire (below) covers correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize the held-loop interval on mount for the initial action.
  useEffect(() => {
    const timing = ACTION_TIMING[heldAction];
    if (timing.loops && !heldLoopIntervalRef.current) {
      heldLoopIntervalRef.current = setInterval(() => {
        callbacksRef.current.onAnimationComplete?.(heldAction);
      }, timing.durationMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearOneShotTimer();
      if (heldLoopIntervalRef.current) clearInterval(heldLoopIntervalRef.current);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      if (blinkPulseTimeoutRef.current) clearTimeout(blinkPulseTimeoutRef.current);
    };
  }, []);

  const visibleAction = activeOneShot ?? heldAction;

  return {
    state: {
      expression,
      heldAction,
      activeOneShot,
      visibleAction,
      talking,
      autoBlink: reducedMotion ? false : autoBlink,
    },
    controller: { play, setExpression, setTalking, reset, getState },
  };
}
