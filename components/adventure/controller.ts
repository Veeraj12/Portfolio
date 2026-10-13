/**
 * AdventureController — the integration layer's brain.
 *
 * Plain TypeScript (no React, no three): it owns the adventure state machine,
 * decides WHEN Teddy reacts, coordinates the Exit module's timer/controller,
 * and talks to everything else exclusively through the AdventureEventBus.
 * Modules never call each other; components translate module callbacks into
 * bus events, and read the resulting state via useAdventure().
 *
 * Phases:
 *   loading -> intro -> selection -> destination -> board <-> paper
 *           -> exit -> portal -> complete          (portal -> selection on RESTART)
 *
 * Timers and the clock are injectable so the whole flow is unit-testable.
 */
import type { DestinationDefinition, NoSelectionStage } from "@/modules/bricks/src/types";
import { AdventureTimer } from "@/modules/exit/src/AdventureTimer";
import { ExitController } from "@/modules/exit/src/ExitController";
import type { TeddyReaction } from "@/modules/exit/src/types";
import type { TeddyExpression } from "@/modules/teddy/src/Teddy.types";
import { DIALOGUE, TIMING, dialogueDurationMs, getDestinationMeta } from "./config";
import type { AdventureEventBus, AdventureEventMap, InputSource } from "./events";
import {
  isBurstAction,
  isHeldAction,
  type TeddyBurstAction,
  type TeddyDirective,
  type TeddyHeldAction,
  type TeddyPose,
} from "./teddy";

export type AdventurePhase =
  | "loading"
  | "intro"
  | "selection"
  | "destination"
  | "board"
  | "paper"
  | "exit"
  | "portal"
  | "complete";

export interface DialogueLine {
  id: number;
  text: string;
}

export interface AdventureState {
  phase: AdventurePhase;
  destinationId: string | null;
  hoveredDestinationId: string | null;
  /** Touch two-step: brick that has been previewed and is waiting for a second tap. */
  previewDestinationId: string | null;
  projectId: string | null;
  bricksVisible: boolean;
  /** True once every brick has finished forming (the patience clock starts here). */
  bricksSettled: boolean;
  noSelectionStage: NoSelectionStage;
  /** Increments whenever the patience clock must restart from zero. */
  patienceEpoch: number;
  /** Increments on every restart; used to remount the brick field. */
  restartCount: number;
  teddy: TeddyDirective;
  dialogue: DialogueLine | null;
  talking: boolean;
  lastInput: InputSource;
}

export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

export interface AdventureControllerOptions {
  bus: AdventureEventBus;
  destinations: DestinationDefinition[];
  /** Does this destination have anything to show? (drives Teddy's empty-board line) */
  hasContent?: (destinationId: string) => boolean;
  reducedMotion?: boolean;
  scheduler?: Scheduler;
  now?: () => number;
}

const INITIAL_TEDDY: TeddyDirective = {
  expression: "neutral",
  held: "idle",
  burst: null,
  pose: { kind: "onWelcome" },
};

export function createInitialState(): AdventureState {
  return {
    phase: "loading",
    destinationId: null,
    hoveredDestinationId: null,
    previewDestinationId: null,
    projectId: null,
    bricksVisible: false,
    bricksSettled: false,
    noSelectionStage: "WAITING",
    patienceEpoch: 0,
    restartCount: 0,
    teddy: INITIAL_TEDDY,
    dialogue: null,
    talking: false,
    lastInput: "pointer",
  };
}

/** The "how does Teddy feel while nothing is hovered" mapping for the patience ladder. */
export function expressionForStage(stage: NoSelectionStage): TeddyExpression {
  switch (stage) {
    case "CONFUSED":
      return "confused";
    case "SAD":
      return "sad";
    case "CRYING":
      return "crying";
    case "HIDING":
      return "sad";
    default:
      return "neutral";
  }
}

export class AdventureController {
  private state: AdventureState = createInitialState();
  private readonly listeners = new Set<() => void>();
  private readonly unsubscribers: Array<() => void> = [];
  private readonly timers = new Set<unknown>();
  private readonly byId: Map<string, DestinationDefinition>;

  private readonly bus: AdventureEventBus;
  private readonly hasContent: (id: string) => boolean;
  private readonly reducedMotion: boolean;
  private readonly scheduler: Scheduler;
  private readonly now: () => number;

  private readonly timer: AdventureTimer;
  private readonly exit: ExitController;

  /** True between `start()`/`stop()` — whether bus subscriptions are live. */
  private started = false;

  private dialogueTimer: unknown = null;
  private previewTimer: unknown = null;
  private previewAt = 0;
  private dialogueSeq = 0;
  private burstSeq = 0;
  /** True only while a close-control HOVER reaction is being applied (keeps its line on screen). */
  private holdingCloseLine = false;
  private disposed = false;

  constructor(options: AdventureControllerOptions) {
    this.bus = options.bus;
    this.hasContent = options.hasContent ?? (() => true);
    this.reducedMotion = options.reducedMotion ?? false;
    this.scheduler = options.scheduler ?? {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
    };
    this.now = options.now ?? (() => Date.now());
    this.byId = new Map(options.destinations.map((d): [string, DestinationDefinition] => [d.id, d]));

    // One timer per adventure session. start() is called exactly once, on
    // ADVENTURE_READY, so the entry timestamp is never reset by re-renders.
    this.timer = new AdventureTimer({ now: this.now });

    this.exit = new ExitController({
      getElapsedSeconds: () => this.timer.getElapsedSeconds(),
      exitTransitionDurationMs: TIMING.exitTransitionMs,
      reducedMotion: this.reducedMotion,
      onTeddyReaction: (reaction) => this.applyExitReaction(reaction),
      onExitSequenceStarted: () => this.bus.emit("EXIT_SEQUENCE_STARTED", {}),
      onAdventureExitReady: () => this.bus.emit("PORTAL_READY", {}),
    });

    // Deliberately does NOT wire here: React StrictMode (dev) may construct
    // and discard an instance during double-rendered useMemo; wiring happens
    // in start(), called from the component's effect on the kept instance.
    this.started = false;
  }

  // -- public -------------------------------------------------------------

  /**
   * Re-attach the bus subscriptions after a `stop()`. Safe to call when
   * already started (no-op). This exists because React StrictMode (dev
   * builds) runs every effect as mount -> cleanup -> mount against the
   * SAME memoized controller instance: a plain `dispose()` in cleanup
   * permanently killed the subscriptions on the first simulated unmount,
   * so ADVENTURE_READY/INTRO_COMPLETE fired into a dead controller and the
   * scene hung after the intro with no bricks, no dialogue and no errors.
   * `start()`/`stop()` are the reversible pair used by the component;
   * `dispose()` remains the terminal teardown.
   */
  start(): void {
    // `disposed` is terminal: a disposed controller must never re-subscribe,
    // or the guards in `on()` would leave dead subscriptions attached.
    if (this.started || this.disposed) return;
    this.started = true;
    this.wire();
  }

  /**
   * Unsubscribe from the bus and cancel all pending timers, WITHOUT
   * permanently disabling the controller — a later `start()` re-wires it.
   * Replaces the old effect-cleanup call to `dispose()`.
   */
  stop(): void {
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers.length = 0;
    this.timers.forEach((id) => this.scheduler.clearTimeout(id));
    this.timers.clear();
    this.cancelDialogueTimer();
    this.clearPreview();
    this.exit.destroy();
    this.started = false;
  }

  getState = (): AdventureState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getElapsedSeconds(): number {
    return this.timer.getElapsedSeconds();
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    this.listeners.clear();
  }

  // -- event wiring ---------------------------------------------------------

  private on<K extends keyof AdventureEventMap>(event: K, handler: (payload: AdventureEventMap[K]) => void) {
    this.unsubscribers.push(this.bus.on(event, (p) => {
      if (!this.disposed) handler(p);
    }));
  }

  private wire(): void {
    this.on("ADVENTURE_READY", () => {
      if (this.state.phase !== "loading") return;
      this.timer.start();
      this.set({ phase: "intro" });
      this.bus.emit("INTRO_STARTED", {});
    });

    this.on("WORLD_STATE", ({ state }) => {
      if (this.state.phase !== "intro") return;
      if (state === "teddy-slot-active") {
        this.direct({ expression: "happy", held: "walk", pose: { kind: "onWelcome" } });
      } else if (state === "teddy-gesture") {
        this.direct({ expression: "excited", held: "idle", burst: "wave" });
      }
    });

    this.on("INTRO_COMPLETE", () => {
      if (this.state.phase !== "intro") return;
      this.set({ phase: "selection" });
      this.direct({ expression: "happy", held: "idle", burst: "wave" });
      this.say(DIALOGUE.intro);
      this.bus.emit("TEDDY_READY", {});
      this.after(this.scaled(TIMING.bricksAppearDelayMs), () => {
        if (this.state.phase === "selection") this.set({ bricksVisible: true });
      });
    });

    this.on("BRICKS_SETTLED", () => {
      if (this.state.phase === "selection" && this.state.bricksVisible) this.set({ bricksSettled: true });
    });

    this.on("DESTINATION_HOVER", (p) => this.onHover(p));
    this.on("DESTINATION_UNHOVER", (p) => this.onUnhover(p));
    this.on("NO_SELECTION_TIMEOUT", ({ stage }) => this.onPatience(stage));
    this.on("DESTINATION_SELECTED", (p) => this.onSelect(p));

    this.on("TEDDY_ARRIVED", ({ pose }) => {
      const current = this.state.teddy;
      if (current.pose.kind !== pose) return; // stale: he has already been sent elsewhere
      if (pose === "behindWelcome") this.direct({ held: "hide" });
      else if (current.held === "walk") this.direct({ held: "idle" });
    });

    this.on("BOARD_OPEN", ({ destinationId }) => {
      if (this.state.phase !== "destination") return;
      this.set({ phase: "board" });
      if (this.hasContent(destinationId)) {
        this.direct({ expression: "happy", held: "idle" });
        this.clearDialogue();
      } else {
        this.direct({ expression: "confused", held: "idle" });
        this.say(getDestinationMeta(destinationId).emptyDialogue);
      }
    });

    this.on("PROJECT_SELECTED", ({ projectId }) => {
      if (this.state.phase !== "board") return;
      this.set({ phase: "paper", projectId });
      this.direct({ expression: "excited" });
    });

    this.on("PROJECT_CLOSED", () => {
      if (this.state.phase !== "paper") return;
      this.set({ phase: "board", projectId: null });
      this.direct({ expression: "happy" });
    });

    this.on("BOARD_CLOSE_HOVER", ({ intent }) => {
      // Drives Teddy's time-aware "leaving so soon?" line. Now that the exit
      // control lives on the WELCOME/selection screen, accept it there too
      // (the board no longer has a close control).
      const phase = this.state.phase;
      if (phase !== "board" && phase !== "selection" && phase !== "destination") return;
      this.holdingCloseLine = intent;
      if (intent) this.exit.onCloseHover();
      else this.exit.onCloseUnhover();
      this.holdingCloseLine = false;
    });

    this.on("BOARD_CLOSE_SELECTED", () => {
      // "Leave the adventure" intent. Runs the ExitController's goodbye ->
      // portal sequence, so this is the one path that must go through
      // `exit.onCloseSelected()` (which owns the exit timer that eventually
      // emits PORTAL_READY) — never by emitting EXIT_SEQUENCE_STARTED
      // directly, or nothing would ever open the portal.
      //
      // Accepted from "selection"/"destination" too: the board no longer
      // carries its own close control, so the WELCOME/selection screen's
      // exit control (and the sr-only Skip link) drive the same path.
      if (this.state.phase === "paper") {
        this.set({ phase: "board", projectId: null });
        this.direct({ expression: "happy" });
      }
      const phase = this.state.phase;
      if (phase !== "board" && phase !== "selection" && phase !== "destination") return;
      this.exit.onCloseSelected();
    });

    this.on("EXIT_CONFIRMED", () => {
      // The welcome exit control only confirms after its playful two dodges.
      // Say the "fine, leaving so soon" beat first, then hand off to the real
      // exit sequence so the line is readable instead of instantly replaced.
      const phase = this.state.phase;
      if (phase !== "board" && phase !== "paper" && phase !== "selection" && phase !== "destination") return;
      this.say(DIALOGUE.confirmExit);
      this.after(this.scaled(900), () => {
        if (this.state.phase === "paper") this.set({ phase: "board", projectId: null });
        this.exit.onCloseSelected();
      });
    });

    this.on("BOARD_BACK", () => {
      // Return to the brick-selection scene without leaving the adventure —
      // the board's "Back" control, so the user can inspect other bricks.
      // Accepts "paper" too: Back from an open project paper closes the paper
      // AND the board, landing the user back on the bricks in one step.
      if (this.state.phase !== "board" && this.state.phase !== "paper") return;
      // Hovering the exit control may have armed CLOSE_INTENT; clear it so the
      // separate exit control still works after backing out.
      this.exit.restart();
      this.set({
        phase: "selection",
        destinationId: null,
        projectId: null,
        hoveredDestinationId: null,
        previewDestinationId: null,
        bricksVisible: true,
        bricksSettled: false,
        noSelectionStage: "WAITING",
        patienceEpoch: this.state.patienceEpoch + 1,
      });
      this.direct({ expression: "happy", held: "idle", pose: { kind: "onWelcome" }, burst: "wave" });
      this.say(DIALOGUE.restart);
    });

    this.on("EXIT_SEQUENCE_STARTED", () => {
      // Emitted by ExitController.beginExit() (via exit.onCloseSelected), so
      // by the time it fires the portal timer is already scheduled. Accept it
      // from the selection/destination phases as well, since the exit control
      // now lives on the WELCOME screen.
      if (
        this.state.phase !== "board" &&
        this.state.phase !== "paper" &&
        this.state.phase !== "selection" &&
        this.state.phase !== "destination"
      )
        return;
      this.set({
        phase: "exit",
        bricksVisible: false,
        bricksSettled: false,
        hoveredDestinationId: null,
        previewDestinationId: null,
        projectId: null,
      });
      this.direct({ held: "walk", pose: { kind: "farewell" } });
    });

    this.on("PORTAL_READY", () => {
      if (this.state.phase === "exit") this.set({ phase: "portal" });
    });

    this.on("ADVENTURE_EXIT", () => {
      if (this.state.phase !== "portal") return;
      this.set({ phase: "complete" });
      this.direct({ expression: "happy", burst: "wave" });
    });

    this.on("ADVENTURE_RESTART", () => {
      if (this.state.phase !== "portal" && this.state.phase !== "exit") return;
      this.exit.restart();
      this.timer.reset();
      this.timer.start();
      this.set({
        phase: "selection",
        destinationId: null,
        projectId: null,
        hoveredDestinationId: null,
        previewDestinationId: null,
        bricksVisible: true,
        bricksSettled: false,
        noSelectionStage: "WAITING",
        patienceEpoch: this.state.patienceEpoch + 1,
        restartCount: this.state.restartCount + 1,
      });
      this.direct({ expression: "excited", held: "walk", pose: { kind: "onWelcome" }, burst: "jump" });
      this.say(DIALOGUE.restart);
    });
  }

  // -- selection-phase behaviour ---------------------------------------------

  private canInteractWithBricks(): boolean {
    return this.state.phase === "selection" && this.state.bricksVisible;
  }

  private onHover({ destinationId, source }: AdventureEventMap["DESTINATION_HOVER"]): void {
    if (!this.canInteractWithBricks()) return;
    const dest = this.byId.get(destinationId);
    if (!dest) return;

    const wasHidden = this.state.teddy.pose.kind === "behindWelcome";
    const alreadyPreviewing = source === "touch" && this.state.previewDestinationId === destinationId;
    if (source === "touch" && !alreadyPreviewing) this.armPreview(destinationId);

    const patch: Partial<AdventureState> = { hoveredDestinationId: destinationId, lastInput: source };
    // Coming back to Teddy after he hid counts as engagement: restart the patience ladder.
    if (wasHidden || this.state.noSelectionStage === "HIDING") {
      patch.noSelectionStage = "WAITING";
      patch.patienceEpoch = this.state.patienceEpoch + 1;
    }
    this.set(patch);

    if (alreadyPreviewing) return; // second tap of the touch two-step: no new reaction

    const meta = getDestinationMeta(destinationId);
    this.direct({
      expression: wasHidden ? "surprised" : meta.hover.expression,
      held: wasHidden ? "walk" : "idle",
      pose: { kind: "onWelcome" },
      burst: meta.hover.burst,
    });
    this.say(wasHidden ? DIALOGUE.peekOut : dest.dialogue.hover, { hold: !wasHidden });
  }

  private onUnhover({ destinationId, source }: AdventureEventMap["DESTINATION_UNHOVER"]): void {
    if (this.state.phase !== "selection") return;
    // A touch "hover" ends when the finger lifts; the preview must survive that.
    if (source === "touch") return;
    if (this.state.hoveredDestinationId !== destinationId) return;

    this.set({ hoveredDestinationId: null });
    const stage = this.state.noSelectionStage;
    if (stage === "HIDING") return; // Teddy is tucked away; leave him be
    this.direct({ expression: expressionForStage(stage), held: stage === "CRYING" ? "cry" : "idle" });
    this.softClearDialogue();
  }

  private onPatience(stage: NoSelectionStage): void {
    if (!this.canInteractWithBricks()) return;
    if (stage === "WAITING") return;
    this.set({ noSelectionStage: stage });

    switch (stage) {
      case "CONFUSED":
        this.direct({ expression: "confused", held: "idle" });
        break;
      case "SAD":
        this.direct({ expression: "sad", held: "idle" });
        break;
      case "CRYING":
        this.direct({ expression: "crying", held: "cry" });
        break;
      case "HIDING":
        // Playful, not an error: Teddy walks behind WELCOME and ducks.
        this.direct({ expression: "sad", held: "walk", pose: { kind: "behindWelcome" } });
        break;
    }
    this.say(DIALOGUE.noSelection[stage]);
  }

  private onSelect({ destinationId, confirmed }: AdventureEventMap["DESTINATION_SELECTED"]): void {
    if (!this.canInteractWithBricks()) return;
    const dest = this.byId.get(destinationId);
    if (!dest) return;

    // Touch has no hover, so the first tap previews and the second commits.
    // (The explicit "Go" button passes `confirmed` and skips this.)
    if (!confirmed && this.state.lastInput === "touch") {
      const previewed = this.state.previewDestinationId === destinationId;
      const sameGesture = this.now() - this.previewAt < TIMING.touchSameGestureMs;
      if (!previewed || sameGesture) {
        if (!previewed) this.onHover({ destinationId, source: "touch" });
        return;
      }
    }

    this.clearPreview();
    const meta = getDestinationMeta(destinationId);
    this.set({
      phase: "destination",
      destinationId,
      hoveredDestinationId: null,
      previewDestinationId: null,
      noSelectionStage: "WAITING",
      bricksSettled: false,
    });
    this.direct({
      expression: meta.select.expression,
      held: "idle",
      pose: { kind: "onBrick", destinationId },
      burst: "jump",
    });
    this.say(dest.dialogue.select ?? dest.dialogue.hover);
    this.after(this.scaled(TIMING.destinationTransitionMs), () => {
      if (this.state.phase === "destination") this.bus.emit("BOARD_OPEN", { destinationId });
    });
  }

  // -- exit reactions -----------------------------------------------------

  private applyExitReaction(reaction: TeddyReaction): void {
    this.direct({
      expression: reaction.expression,
      held: isHeldAction(reaction.action) ? reaction.action : "idle",
      burst: isBurstAction(reaction.action) ? reaction.action : undefined,
    });
    if (reaction.dialogue) this.say(reaction.dialogue, { hold: this.holdingCloseLine });
    else this.softClearDialogue();
  }

  // -- Teddy + dialogue helpers -------------------------------------------

  /** Merge a directive patch. `burst` is a one-shot; every call gets a fresh nonce so it replays. */
  private direct(
    patch: Partial<Omit<TeddyDirective, "burst">> & { burst?: TeddyBurstAction }
  ): void {
    const { burst, ...rest } = patch;
    const teddy: TeddyDirective = {
      ...this.state.teddy,
      ...rest,
      burst: burst ? { action: burst, nonce: ++this.burstSeq } : this.state.teddy.burst,
    };
    this.set({ teddy });
  }

  private say(text: string, opts: { hold?: boolean } = {}): void {
    this.cancelDialogueTimer();
    const line = { id: ++this.dialogueSeq, text };
    this.set({ dialogue: line, talking: true });
    const speakMs = Math.min(dialogueDurationMs(text), 2600);
    this.dialogueTimer = this.after(speakMs, () => {
      if (this.state.dialogue?.id === line.id) this.set({ talking: false });
      if (!opts.hold) {
        // stay on screen a beat longer than the mouth moves, then clear
        this.dialogueTimer = this.after(Math.max(0, dialogueDurationMs(text) - speakMs), () => {
          if (this.state.dialogue?.id === line.id) this.set({ dialogue: null });
        });
      }
    });
  }

  private clearDialogue(): void {
    this.cancelDialogueTimer();
    if (this.state.dialogue || this.state.talking) this.set({ dialogue: null, talking: false });
  }

  /** Let a hover/close line linger briefly after the pointer leaves, unless a newer line replaces it. */
  private softClearDialogue(): void {
    const line = this.state.dialogue;
    if (!line) return;
    this.cancelDialogueTimer();
    this.set({ talking: false });
    this.dialogueTimer = this.after(this.scaled(TIMING.hoverLineLingerMs), () => {
      if (this.state.dialogue?.id === line.id) this.set({ dialogue: null });
    });
  }

  private cancelDialogueTimer(): void {
    if (this.dialogueTimer != null) {
      this.scheduler.clearTimeout(this.dialogueTimer);
      this.timers.delete(this.dialogueTimer);
      this.dialogueTimer = null;
    }
  }

  private armPreview(destinationId: string): void {
    this.clearPreview();
    this.previewAt = this.now();
    this.set({ previewDestinationId: destinationId });
    this.previewTimer = this.after(TIMING.touchPreviewMs, () => {
      if (this.state.previewDestinationId === destinationId) this.set({ previewDestinationId: null });
    });
  }

  private clearPreview(): void {
    if (this.previewTimer != null) {
      this.scheduler.clearTimeout(this.previewTimer);
      this.timers.delete(this.previewTimer);
      this.previewTimer = null;
    }
  }

  // -- plumbing -------------------------------------------------------------

  private scaled(ms: number): number {
    return this.reducedMotion ? Math.round(ms * TIMING.reducedMotionScale) : ms;
  }

  private after(ms: number, fn: () => void): unknown {
    const id = this.scheduler.setTimeout(() => {
      this.timers.delete(id);
      if (!this.disposed) fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  private set(patch: Partial<AdventureState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }
}

export type { TeddyHeldAction, TeddyPose };
