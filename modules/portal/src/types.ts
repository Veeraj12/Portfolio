/**
 * MODULE 07 — PORTAL + LOADING + TRANSITIONS
 * Shared type contracts.
 *
 * These types are intentionally local to this module. Where they mirror
 * concepts from MASTER_CONTEXT.md's shared contract (e.g. DestinationId),
 * they are duck-type compatible so the final integrator can pass in the
 * "real" values from other modules without any adapter code — but this
 * module never imports another module's types directly.
 */

/** Visual/interaction state of the dormant portal object. */
export type PortalState = "dormant" | "hover" | "active" | "transitioning";

/**
 * Loose destination id. Kept as `string` (not a union) so this module
 * never needs to know the final, canonical set of destinations owned by
 * Module 03 / the integrator. Consumers can pass a more specific type at
 * their call sites.
 */
export type NavigationDestination = string;

/** Reasons the portal might want to notify an external character (Teddy). */
export type PortalReactionKind =
  | "portal-hover-start"
  | "portal-hover-end"
  | "portal-activated"
  | "entry-transition-start"
  | "entry-transition-complete"
  | "exit-transition-start"
  | "exit-transition-complete";

export interface PortalReactionEvent {
  kind: PortalReactionKind;
  /** Timestamp (ms since epoch) the event fired, for debugging/telemetry. */
  timestamp: number;
}

/**
 * Optional adapter callback. The final integrator may wire this to Teddy's
 * expression/action API. This module never imports Teddy.
 */
export type OnPortalReaction = (event: PortalReactionEvent) => void;

/** Fired when the user commits to entering the adventure via the portal. */
export type OnEnterAdventure = () => void;

/** Generic "phase finished" callback used by transitions and loader. */
export type OnComplete = () => void;

/** Navigation callback the parent app resolves however it wants. */
export type OnNavigate = (destination: NavigationDestination) => void;

/** Progress is always 0–1. Consumers may pass indeterminate = true instead. */
export interface LoaderProgress {
  /** 0–1. Ignored when indeterminate is true. */
  value: number;
  indeterminate?: boolean;
  /** Human readable status, surfaced to assistive tech via aria-live. */
  statusText?: string;
}

export interface PortalProps {
  state: PortalState;
  /** Optional size override, in px. Defaults to 220. */
  size?: number;
  className?: string;
}

export interface PortalTriggerProps {
  onEnterAdventure: OnEnterAdventure;
  onPortalReaction?: OnPortalReaction;
  size?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export interface PortalTransitionHandle {
  /** Plays the "portfolio → adventure" transition. */
  playEntry: () => Promise<void>;
  /** Plays the "adventure → portfolio" transition. */
  playExit: () => Promise<void>;
}

export interface PortalTransitionProps {
  onEntryComplete?: OnComplete;
  onExitComplete?: OnComplete;
  className?: string;
}

export interface AdventureLoaderProps {
  progress?: LoaderProgress;
  /** Called once when the loader considers itself "done" (progress >= 1). */
  onLoaded?: OnComplete;
  /** Minimum time (ms) the loader stays visible, avoids flash-of-loader. */
  minDurationMs?: number;
  className?: string;
}

export interface AdventureEntryProps {
  /** Simulated or real loading progress source. If omitted, auto-simulates. */
  progress?: LoaderProgress;
  destination?: NavigationDestination;
  onPortalReaction?: OnPortalReaction;
  onNavigate?: OnNavigate;
  /** Fired after transition + loader finish, once the adventure should mount. */
  onEntryComplete?: OnComplete;
  className?: string;
}

export interface AdventureExitHandle {
  /** Imperative trigger, e.g. called after Module 05 emits exit-ready. */
  startExit: () => void;
}

export interface AdventureExitProps {
  onPortalReaction?: OnPortalReaction;
  onNavigate?: OnNavigate;
  destination?: NavigationDestination;
  /** Fired once the exit transition finishes and it's safe to unmount adventure. */
  onExitTransitionComplete?: OnComplete;
  className?: string;
}
