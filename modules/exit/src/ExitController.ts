/**
 * ExitController.ts
 *
 * Owns exactly the exit state machine described in the module brief:
 *
 *   IDLE -> CLOSE_INTENT -> GOODBYE -> EXITING -> EXIT_READY
 *
 * It does NOT own or import:
 *   - the real board (it only accepts close-hover / close-selected calls)
 *   - the real Teddy (it only emits a typed TeddyReaction)
 *   - the portal / routing (it only calls onAdventureExitReady when done)
 *
 * Wiring for the final integrator:
 *   BOARD_CLOSE_HOVER    -> controller.onCloseHover()
 *   BOARD_CLOSE_UNHOVER  -> controller.onCloseUnhover()   (optional)
 *   BOARD_CLOSE_SELECTED -> controller.onCloseSelected()
 *   controller.onTeddyReaction        -> feed into real Teddy
 *   controller.onExitSequenceStarted  -> board may start hiding itself
 *   controller.onAdventureExitReady   -> portal module takes over
 */

import type { ExitControllerConfig, ExitState, TeddyReaction } from "./types";
import { defaultDialogue } from "./dialogue";

const DEFAULT_LONG_SESSION_THRESHOLD_SECONDS = 600; // ~10 minutes
const DEFAULT_EXIT_TRANSITION_MS = 900;
const REDUCED_MOTION_MAX_MS = 150;

export class ExitController {
  private state: ExitState = "IDLE";
  private exitTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private readonly getElapsedSeconds: () => number;
  private readonly longSessionThresholdSeconds: number;
  private readonly exitTransitionDurationMs: number;
  private readonly dialogue: typeof defaultDialogue;

  private readonly onTeddyReaction?: (reaction: TeddyReaction) => void;
  private readonly onExitSequenceStarted?: () => void;
  private readonly onAdventureExitReady?: () => void;
  private readonly onStateChange?: (state: ExitState, previous: ExitState) => void;

  constructor(config: ExitControllerConfig) {
    this.getElapsedSeconds = config.getElapsedSeconds;
    this.longSessionThresholdSeconds =
      config.longSessionThresholdSeconds ?? DEFAULT_LONG_SESSION_THRESHOLD_SECONDS;

    const requestedMs = config.exitTransitionDurationMs ?? DEFAULT_EXIT_TRANSITION_MS;
    this.exitTransitionDurationMs = config.reducedMotion
      ? Math.min(requestedMs, REDUCED_MOTION_MAX_MS)
      : requestedMs;

    this.dialogue = { ...defaultDialogue, ...config.dialogue };

    this.onTeddyReaction = config.onTeddyReaction;
    this.onExitSequenceStarted = config.onExitSequenceStarted;
    this.onAdventureExitReady = config.onAdventureExitReady;
    this.onStateChange = config.onStateChange;
  }

  getState(): ExitState {
    return this.state;
  }

  // -- Board callback surface (BOARD_CLOSE_HOVER / _UNHOVER / _SELECTED) ----

  /** Call when the user hovers or keyboard-focuses the board's close control. */
  onCloseHover(): void {
    if (this.state !== "IDLE") return;
    this.setState("CLOSE_INTENT");

    const elapsed = this.getElapsedSeconds();
    this.emitTeddyReaction({
      expression: "sad",
      action: "talk",
      dialogue: this.dialogue.closeIntent(elapsed),
    });
  }

  /** Call when hover/focus leaves the close control without selecting it. */
  onCloseUnhover(): void {
    if (this.state !== "CLOSE_INTENT") return;
    this.setState("IDLE");
    this.emitTeddyReaction({ expression: "neutral", action: "idle" });
  }

  /** Call when the user confirms exit (click / Enter / Space on the close control). */
  onCloseSelected(): void {
    if (this.state === "EXITING" || this.state === "EXIT_READY") return;

    const elapsed = this.getElapsedSeconds();

    this.setState("GOODBYE");
    this.emitTeddyReaction({
      expression: elapsed >= this.longSessionThresholdSeconds ? "happy" : "sad",
      action: "wave",
      dialogue: this.dialogue.goodbye(elapsed, this.longSessionThresholdSeconds),
    });

    this.beginExit();
  }

  // -- Exit sequence ----------------------------------------------------

  private beginExit(): void {
    this.setState("EXITING");
    this.onExitSequenceStarted?.();

    this.exitTimeoutId = setTimeout(() => {
      this.exitTimeoutId = null;
      this.setState("EXIT_READY");
      this.onAdventureExitReady?.();
    }, this.exitTransitionDurationMs);
  }

  /** Clears any pending exit timer. Call on unmount. */
  destroy(): void {
    if (this.exitTimeoutId !== null) {
      clearTimeout(this.exitTimeoutId);
      this.exitTimeoutId = null;
    }
  }

  /** Resets the controller back to IDLE for a fresh adventure session. */
  restart(): void {
    this.destroy();
    this.setState("IDLE");
  }

  private setState(next: ExitState): void {
    const previous = this.state;
    this.state = next;
    this.onStateChange?.(next, previous);
  }

  private emitTeddyReaction(reaction: TeddyReaction): void {
    this.onTeddyReaction?.(reaction);
  }
}
