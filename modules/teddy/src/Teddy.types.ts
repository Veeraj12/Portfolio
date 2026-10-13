import type * as React from "react";

/**
 * Teddy — Module 01 (v2: 3D floating companion redesign)
 * Shared type contract (mirrors MASTER_CONTEXT.md section 10).
 *
 * These types are the integration surface and are UNCHANGED from v1 aside
 * from two additive, optional 3D-placement props at the bottom of
 * TeddyProps. Every expression/action name, the controller shape, and all
 * callback semantics are identical — only the renderer behind them changed
 * from SVG/CSS to Three.js/React Three Fiber. See Teddy3D.tsx for the new
 * `TeddyMesh` component (the actual 3D content, for embedding inside an
 * existing R3F <Canvas>) and Teddy.tsx for the drop-in-anywhere default
 * export that owns its own <Canvas>.
 */

/** Emotional state of Teddy's face/body. */
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

/**
 * A motion Teddy can perform.
 *
 * "Held" actions persist until the parent changes `action` again:
 *   idle, walk, hide, cry
 *
 * "One-shot" actions play once and then Teddy automatically returns to the
 * previously-held action (usually "idle"), firing `onActionComplete`:
 *   blink, jump, wave
 *
 * "talk" is a one-shot mouth-flurry burst when passed as an `action`. Most
 * parents will prefer the persistent `talking` prop instead (see below) —
 * both are supported and can be combined.
 */
export type TeddyAction =
  | "idle"
  | "blink"
  | "talk"
  | "walk"
  | "jump"
  | "wave"
  | "hide"
  | "cry";

/** Actions that loop/hold until explicitly changed by the parent. */
export const HELD_ACTIONS: ReadonlySet<TeddyAction> = new Set([
  "idle",
  "walk",
  "hide",
  "cry",
]);

/** Actions that play once and then resolve back to the held action. */
export const ONE_SHOT_ACTIONS: ReadonlySet<TeddyAction> = new Set([
  "blink",
  "talk",
  "jump",
  "wave",
]);

export type TeddyInteractionType = "hover" | "click" | "focus" | "touch";

/**
 * Which way Teddy's face is turned. "back" rotates the whole character
 * 180° around Y so he's looking the opposite direction from "front" — for
 * story beats where Teddy needs to glance/turn behind himself. The turn
 * animates smoothly (a quick, damped rotation) unless reduced motion is
 * active, in which case it snaps instantly, same policy as `hide`.
 */
export type TeddyFacing = "front" | "back";

export interface TeddyProps {
  /** Current facial/emotional expression. Defaults to "neutral". */
  expression?: TeddyExpression;

  /**
   * Current action. Defaults to "idle".
   * One-shot actions (blink/talk/jump/wave) auto-resolve back to whatever
   * held action was active before them — the parent does not need to reset
   * `action` back to "idle" itself, though it may.
   */
  action?: TeddyAction;

  /**
   * Persistent mouth-talking overlay, independent of `action`. Useful when
   * a parent is streaming/associating external dialogue text and wants the
   * mouth animating for the duration of that text, regardless of whatever
   * else Teddy is doing (e.g. talking while walking).
   */
  talking?: boolean;

  /** Uniform scale multiplier. Defaults to 1. */
  scale?: number;

  /** Passed through to the root container element. */
  className?: string;

  /** Passed through to the root container element. */
  style?: React.CSSProperties;

  /**
   * Force reduced-motion behavior on/off. If omitted, Teddy auto-detects
   * `prefers-reduced-motion: reduce` via matchMedia and reacts live to
   * changes.
   */
  reducedMotion?: boolean;

  /** Fires when any action's animation begins playing. */
  onAnimationStart?: (action: TeddyAction) => void;

  /** Fires when any action's animation finishes a full cycle (held actions
   * fire this once per loop iteration for walk/cry; idle/hide do not loop
   * a discrete "cycle" so they omit this). */
  onAnimationComplete?: (action: TeddyAction) => void;

  /**
   * Fires specifically when a one-shot action (blink/talk/jump/wave)
   * finishes and Teddy has returned to its held action. This is the hook
   * a parent state machine (e.g. Module 03's bricks, or an orchestrator)
   * should use to know it's safe to trigger the next beat.
   */
  onActionComplete?: (action: TeddyAction) => void;

  /** Fires on pointer hover / click / keyboard focus / touch of Teddy
   * himself. Teddy does not react to this internally — it is purely an
   * escape hatch for a parent that wants Teddy to be a focusable/clickable
   * element (e.g. "pet Teddy"). Expression/action reactions to page-level
   * interactions (like hovering a destination brick) are the parent's
   * responsibility, driven through the `expression`/`action` props. */
  onInteraction?: (type: TeddyInteractionType, event: React.SyntheticEvent) => void;

  /** DOM id for the root container. */
  id?: string;

  /** Accessible label. Defaults to "Teddy". */
  "aria-label"?: string;

  /**
   * V2 ADDITIVE — not part of the original contract, fully optional.
   * Local 3D position of the character group inside its own canvas
   * (default `<Teddy />` only — ignored by `<TeddyMesh />`, which is
   * positioned by whatever scene it's placed into). Defaults to [0, 0, 0].
   */
  position?: [number, number, number];

  /**
   * V2 ADDITIVE — optional. Local 3D rotation (radians) of the character
   * group inside its own canvas. Defaults to [0, 0, 0].
   */
  rotation?: [number, number, number];

  /**
   * V2 ADDITIVE — optional. Which way Teddy is facing. Defaults to
   * "front". Set to "back" to have him turn 180° and look the other way
   * (e.g. glancing behind himself for a story beat) — see TeddyFacing.
   */
  facing?: TeddyFacing;

  /**
   * V3 ADDITIVE — optional. When `false`, Teddy renders a completely still
   * pose (no idle float, blink, gesture, gaze drift or particles) while
   * KEEPING his current expression's shape — eyes/mouth and the expression's
   * resting hand pose. Use for static "portrait" placements (e.g. the board
   * header) where a moving character would be distracting. Defaults to true.
   */
  animated?: boolean;
}

/** Imperative controller exposed via ref. */
export interface TeddyController {
  /** Play an action. Equivalent to setting the `action` prop imperatively. */
  play: (action: TeddyAction) => void;
  /** Set the current expression. Equivalent to the `expression` prop. */
  setExpression: (expression: TeddyExpression) => void;
  /** Toggle the persistent talking overlay. */
  setTalking: (talking: boolean) => void;
  /**
   * V2 ADDITIVE — turn Teddy to face "front" or "back". Equivalent to the
   * `facing` prop, for imperative use (e.g. "turn around" as a one-off
   * cue rather than a controlled prop).
   */
  setFacing: (facing: TeddyFacing) => void;
  /** Convenience: returns to expression "neutral" and action "idle". */
  reset: () => void;
  /** Read the current resolved state (useful for debugging/tests). */
  getState: () => {
    expression: TeddyExpression;
    action: TeddyAction;
    heldAction: TeddyAction;
    talking: boolean;
    facing: TeddyFacing;
  };
}

/**
 * V2 ADDITIVE — props for `<TeddyMesh />`, the raw R3F content exported for
 * embedding directly inside a parent's existing `<Canvas>` (the World
 * module's scene, typically). Same behavioral contract as `TeddyProps`
 * minus DOM-only concerns (className/style/id/aria-label/onInteraction),
 * plus native 3D placement. `<Teddy />` (the default export) wraps this in
 * its own `<Canvas>` for drop-in-anywhere use — see Teddy.tsx.
 */
export interface TeddyMeshProps {
  expression?: TeddyExpression;
  action?: TeddyAction;
  talking?: boolean;
  reducedMotion?: boolean;
  onAnimationStart?: (action: TeddyAction) => void;
  onAnimationComplete?: (action: TeddyAction) => void;
  onActionComplete?: (action: TeddyAction) => void;
  /** Local position within the parent scene. Defaults to [0, 0, 0]. */
  position?: [number, number, number];
  /** Local rotation (radians). Defaults to [0, 0, 0]. */
  rotation?: [number, number, number];
  /** Uniform scale multiplier. Defaults to 1. */
  scale?: number;
  /** Which way Teddy is facing — see TeddyFacing. Defaults to "front". */
  facing?: TeddyFacing;
  /** Static pose (see TeddyProps.animated). Defaults to true. */
  animated?: boolean;
}
