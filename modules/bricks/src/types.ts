/**
 * Module 03 — Destination Bricks
 * Shared type definitions.
 *
 * These types are LOCAL to this module. They mirror the conceptual shared
 * contract described in MASTER_CONTEXT.md (section 10) closely enough that
 * the final integrator can normalize them, but this module does not import
 * anything from another module.
 */

// ------------------------------------------------------------------------
// Destination data model
// ------------------------------------------------------------------------

/**
 * A destination is identified by a free-form string id so the brick system
 * stays data-driven. The four initial destinations (projects, ai-ml,
 * architecture, motion) are just the default data set, not a hardcoded
 * union — new destinations can be added without touching component code.
 */
export type DestinationId = string;

export interface DestinationDialogue {
  /** Shown / spoken while the destination is hovered or focused. */
  hover: string;
  /** Optional line used at the moment of selection. Falls back to `hover`. */
  select?: string;
}

export interface DestinationDefinition {
  id: DestinationId;
  label: string;
  description?: string;
  dialogue: DestinationDialogue;
  /** Optional explicit 3D position. If omitted, the world lays bricks out automatically. */
  position?: [number, number, number];
  /** Optional accent color override (defaults to the shared warm palette). */
  accentColor?: string;
}

// ------------------------------------------------------------------------
// Teddy reaction adapter contract
// ------------------------------------------------------------------------

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

/** What caused this reaction. Purely informational — Teddy's real renderer decides what to do with it. */
export type TeddyReactionSource =
  | "brick-hover"
  | "brick-unhover"
  | "brick-select"
  | "no-selection-progress"
  | "reset";

export interface TeddyReactionEvent {
  expression: TeddyExpression;
  action: TeddyAction;
  /** Optional dialogue line to display/speak alongside the reaction. */
  dialogue?: string;
  source: TeddyReactionSource;
  destinationId?: DestinationId;
}

/** The only thing this module knows about Teddy: how to hand off a reaction. */
export type OnTeddyReaction = (event: TeddyReactionEvent) => void;

// ------------------------------------------------------------------------
// No-selection emotional state machine
// ------------------------------------------------------------------------

export type NoSelectionStage =
  | "WAITING"
  | "CONFUSED"
  | "SAD"
  | "CRYING"
  | "HIDING";

export interface NoSelectionTimingConfig {
  /** ms of no selection before Teddy becomes CONFUSED */
  toConfusedMs: number;
  /** ms of no selection before Teddy becomes SAD */
  toSadMs: number;
  /** ms of no selection before Teddy becomes CRYING */
  toCryingMs: number;
  /** ms of no selection before Teddy HIDES (terminal stage) */
  toHidingMs: number;
}

// ------------------------------------------------------------------------
// Rendering / device configuration
// ------------------------------------------------------------------------

export type QualityLevel = "low" | "medium" | "high";

// ------------------------------------------------------------------------
// Public component API
// ------------------------------------------------------------------------

export interface DestinationBrickWorldProps {
  /** Data-driven destination list. Order determines default layout order. */
  destinations: DestinationDefinition[];

  /** Controlled selection. If provided, this module will not manage selection internally. */
  selectedDestinationId?: DestinationId | null;
  /** Uncontrolled initial selection (ignored if `selectedDestinationId` is provided). */
  defaultSelectedDestinationId?: DestinationId | null;

  onDestinationHover?: (destinationId: DestinationId) => void;
  onDestinationUnhover?: (destinationId: DestinationId) => void;
  /** Fires when a brick is chosen. This module never navigates — the parent decides what happens next. */
  onDestinationSelect?: (destinationId: DestinationId) => void;
  onTeddyReaction?: OnTeddyReaction;

  /** Respect prefers-reduced-motion / an app-level toggle. */
  reducedMotion?: boolean;
  /** Device-aware rendering budget. */
  quality?: QualityLevel;
  /** Override any subset of the no-selection timing thresholds. */
  noSelectionTiming?: Partial<NoSelectionTimingConfig>;
  /** Whether bricks should resolve in from a particle field on mount. Default true. */
  particleIntro?: boolean;

  className?: string;
}
