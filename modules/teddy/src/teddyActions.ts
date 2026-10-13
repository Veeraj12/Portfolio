import type { TeddyAction } from "./Teddy.types";

export interface ActionTiming {
  /** Total duration of one cycle, in ms. Held/looping actions repeat this;
   * one-shot actions play it exactly once. */
  durationMs: number;
  /** Whether this action loops indefinitely until changed. */
  loops: boolean;
}

export const ACTION_TIMING: Record<TeddyAction, ActionTiming> = {
  idle: { durationMs: 2600, loops: true },
  blink: { durationMs: 160, loops: false },
  talk: { durationMs: 1800, loops: false },
  walk: { durationMs: 1100, loops: true },
  jump: { durationMs: 620, loops: false },
  wave: { durationMs: 1000, loops: false },
  hide: { durationMs: 500, loops: true },
  cry: { durationMs: 900, loops: true },
};

/** Randomized natural blink interval bounds, in ms, used by the idle
 * auto-blink timer (not the explicit "blink" action). */
export const AUTO_BLINK_MIN_MS = 2200;
export const AUTO_BLINK_MAX_MS = 6200;

export function randomBlinkDelay(): number {
  return (
    AUTO_BLINK_MIN_MS + Math.random() * (AUTO_BLINK_MAX_MS - AUTO_BLINK_MIN_MS)
  );
}
