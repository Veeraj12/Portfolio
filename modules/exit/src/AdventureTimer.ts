/**
 * AdventureTimer.ts
 *
 * Records a single, in-memory adventure-session entry timestamp and derives
 * elapsed duration from it. No persistence, no personal data — just one
 * number (a client-side performance/Date timestamp) held for the lifetime of
 * the session.
 *
 * Lifecycle:
 *   const timer = new AdventureTimer();
 *   timer.start();                 // records entry time ONCE
 *   timer.start();                 // no-op — already started, timestamp unchanged
 *   timer.getElapsedSeconds();     // safe to call every render/tick
 *   timer.reset();                 // clears the timestamp (e.g. on restart)
 *
 * Because entryTime is stored on the instance (not in React state), it is
 * immune to re-renders. Consumers should create ONE AdventureTimer per
 * adventure session (e.g. via useRef in the React hook below) rather than
 * constructing a new one on every render.
 */

import type { AdventureTimerConfig, ElapsedDuration } from "./types";

export class AdventureTimer {
  private entryTime: number | null = null;
  private readonly now: () => number;

  constructor(config: AdventureTimerConfig = {}) {
    this.now = config.now ?? (() => Date.now());
  }

  /**
   * Records the entry timestamp exactly once. Calling this again while
   * already running is a no-op — it will NOT reset the clock. Call reset()
   * first if a fresh session timestamp is actually intended.
   */
  start(): number {
    if (this.entryTime === null) {
      this.entryTime = this.now();
    }
    return this.entryTime;
  }

  /** Clears the session timestamp. The next start() begins a new session. */
  reset(): void {
    this.entryTime = null;
  }

  isRunning(): boolean {
    return this.entryTime !== null;
  }

  getEntryTime(): number | null {
    return this.entryTime;
  }

  getElapsedSeconds(): number {
    if (this.entryTime === null) return 0;
    return Math.max(0, Math.floor((this.now() - this.entryTime) / 1000));
  }

  getElapsedMinutes(): number {
    return Math.floor(this.getElapsedSeconds() / 60);
  }

  getElapsedDuration(): ElapsedDuration {
    return formatElapsedSeconds(this.getElapsedSeconds());
  }
}

/** Pure helper — also exported standalone for use without a timer instance. */
export function formatElapsedSeconds(totalSeconds: number): ElapsedDuration {
  const safeTotal = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeTotal / 60);
  const seconds = safeTotal % 60;
  return {
    totalSeconds: safeTotal,
    minutes,
    seconds,
    formatted: `${minutes}:${String(seconds).padStart(2, "0")}`,
  };
}
