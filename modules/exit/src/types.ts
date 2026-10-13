/**
 * types.ts
 *
 * Local type contracts for the Exit + Adventure Timer module.
 *
 * These mirror the *meanings* of the shared contract described in
 * MASTER_CONTEXT.md (TeddyExpression, TeddyAction, BOARD_CLOSE_HOVER,
 * BOARD_CLOSE_SELECTED, EXIT_SEQUENCE_STARTED, ADVENTURE_EXIT, ...) but are
 * defined locally so this module has zero import-time dependency on any
 * other module. The final integrator maps these onto the global contract.
 */

// ---------------------------------------------------------------------------
// Teddy reaction contract (adapter boundary — this module never imports the
// real Teddy implementation, it only describes what Teddy should do)
// ---------------------------------------------------------------------------

export type TeddyExpression =
  | "neutral"
  | "happy"
  | "sad"
  | "angry"
  | "confused"
  | "surprised"
  | "excited"
  | "crying"
  | "sleepy";

export type TeddyAction =
  | "idle"
  | "blink"
  | "talk"
  | "walk"
  | "jump"
  | "wave"
  | "hide"
  | "cry";

export interface TeddyReaction {
  expression: TeddyExpression;
  action: TeddyAction;
  /** Present when Teddy has a line to say for this reaction. */
  dialogue?: string;
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

export interface ElapsedDuration {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  /** "M:SS", e.g. "0:37" or "11:04" */
  formatted: string;
}

export interface AdventureTimerConfig {
  /**
   * Clock source. Defaults to Date.now. Overridable for deterministic
   * testing (e.g. `() => fakeClock.now`) — never required in production use.
   */
  now?: () => number;
}

// ---------------------------------------------------------------------------
// Exit state machine
// ---------------------------------------------------------------------------

export type ExitState =
  | "IDLE"
  | "CLOSE_INTENT"
  | "GOODBYE"
  | "EXITING"
  | "EXIT_READY";

export interface DialogueFns {
  /**
   * Called while the user is hovering/focusing the exit control but has not
   * confirmed. Should return a time-aware, concerned line.
   */
  closeIntent: (elapsedSeconds: number) => string;
  /**
   * Called once the user confirms exit. Should return the long-session line
   * once elapsedSeconds crosses the configured threshold, otherwise a normal
   * goodbye line.
   */
  goodbye: (elapsedSeconds: number, longSessionThresholdSeconds: number) => string;
}

export interface ExitControllerConfig {
  /**
   * Elapsed-time source. Pass `timer.getElapsedSeconds` from an
   * AdventureTimer instance (bound), or any equivalent function. This module
   * does not assume a timer exists — it only asks for a number.
   */
  getElapsedSeconds: () => number;

  /** Elapsed-seconds threshold for the "long session" goodbye. Default 600 (~10 min). */
  longSessionThresholdSeconds?: number;

  /** How long the EXITING phase holds before EXIT_READY fires, in ms. Default 900. */
  exitTransitionDurationMs?: number;

  /**
   * When true, exit transition timing is shortened (never lengthened).
   * Timer correctness, goodbye dialogue, and the exit-ready callback are
   * unaffected — only the wait before EXIT_READY is compressed.
   */
  reducedMotion?: boolean;

  /** Override default dialogue generation. Partial — unset fns fall back to defaults. */
  dialogue?: Partial<DialogueFns>;

  onTeddyReaction?: (reaction: TeddyReaction) => void;
  onExitSequenceStarted?: () => void;
  onAdventureExitReady?: () => void;
  onStateChange?: (state: ExitState, previous: ExitState) => void;
}
