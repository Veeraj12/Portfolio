/**
 * Module 02 — World / Opening Scene
 * Local type contract.
 *
 * These types are intentionally self-contained. They echo the *meaning* of
 * the shared contract described in MASTER_CONTEXT.md (AdventurePhase,
 * TeddyExpression, TeddyAction, INTRO_COMPLETE, etc.) without importing it,
 * since this module must build and run without any other module existing.
 *
 * The final integrator is expected to map:
 *   OpeningState 'complete'   -> INTRO_COMPLETE / ADVENTURE_READY
 *   TeddySlotProps            -> real <Teddy /> component props
 *   AnchorId                  -> positions consumed by Module 03/04
 *
 * V2 NOTE (physical stage revamp): the single flat "welcome" state has been
 * replaced with three states — "welcome-falling" | "welcome-impact" |
 * "welcome-settle" — because WELCOME is no longer a fade/scale-in, it is a
 * physically-falling object. This is a documented breaking change to the
 * OpeningState string union; see README "V2 — Public API changes." Every
 * other state name is unchanged.
 *
 * V4 NOTE (HELLO removed): the opening is WELCOME-only now. "camera-to-hello"
 * and "hello" have been removed from this union, HELLO_ANCHOR has been
 * removed from AnchorId, and previewComposition's "hello" target has been
 * removed. "welcome-settle" now advances straight to "teddy-slot-active" —
 * there is no second word for the camera to travel to.
 */

import type { Object3D } from "three";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Opening state machine
// ---------------------------------------------------------------------------

export type OpeningState =
  | "darkness" // STATE 1 — complete darkness
  | "glow-appear" // STATE 2 — tiny warm light appears (the spark ember)
  | "glow-expand" // STATE 3 — glow gradually expands
  | "falling" // STATE 4 — the spark ember falls the last short distance
  | "impact" // STATE 5 — spark ember's restrained landing (this is what ignites the world's light — NOT WELCOME; see WelcomeText for WELCOME's own fall)
  | "reveal" // STATE 6 — environment/ground becomes visible through warm light
  | "welcome-falling" // STATE 7a (V2) — WELCOME, a physical object, falls from above
  | "welcome-impact" // STATE 7b (V2) — THUD: squash, dust, ripple, camera shake
  | "welcome-settle" // STATE 7c (V2) — bounce + micro-settle to rest
  | "teddy-slot-active" // STATE 8 (V4 renumbered — HELLO's states removed)
  | "teddy-gesture" // STATE 9
  | "complete"; // STATE 10 — completion signal exposed

export const OPENING_STATE_ORDER: readonly OpeningState[] = [
  "darkness",
  "glow-appear",
  "glow-expand",
  "falling",
  "impact",
  "reveal",
  "welcome-falling",
  "welcome-impact",
  "welcome-settle",
  "teddy-slot-active",
  "teddy-gesture",
  "complete",
];

// ---------------------------------------------------------------------------
// Quality / motion controls
// ---------------------------------------------------------------------------

export type QualityLevel = "low" | "medium" | "high";

export interface WorldQualitySettings {
  /** Controls camera easing smoothness / dolly complexity. */
  cameraQuality: QualityLevel;
  /** Controls point-light shadow use, glow layering, etc. */
  lightingQuality: QualityLevel;
  /** 0..1 multiplier applied on top of the base particle count. */
  particleDensity: number;
  /** When true, all large motion is shortened or skipped. */
  reducedMotion: boolean;
  /** Coarse device classification, used to pick sane defaults. */
  deviceQuality: QualityLevel;
}

export const DEFAULT_QUALITY: WorldQualitySettings = {
  cameraQuality: "high",
  lightingQuality: "high",
  particleDensity: 1,
  reducedMotion: false,
  deviceQuality: "high",
};

// ---------------------------------------------------------------------------
// Named spatial anchors
// ---------------------------------------------------------------------------

export type AnchorId =
  | "WELCOME_ANCHOR"
  | "TEDDY_ANCHOR"
  | "DESTINATION_AREA"
  | "PORTAL_ANCHOR";

export type AnchorRegistry = Partial<Record<AnchorId, Object3D | null>>;

// ---------------------------------------------------------------------------
// Teddy integration boundary
// ---------------------------------------------------------------------------

/**
 * Minimal phase signal passed to the Teddy render callback so Teddy (or a
 * stand-in) can react without this module knowing anything about Teddy's
 * internals. Deliberately a subset of OpeningState — only the phases where
 * Teddy's presence/behavior actually changes.
 */
export type TeddySlotPhase =
  | "hidden"
  | "climbing"
  | "arrived"
  | "gesturing"
  | "ready-for-dialogue";

export interface TeddySlotRenderContext {
  visible: boolean;
  phase: TeddySlotPhase;
  /** True for the single beat where Teddy should wave/wiggle (STATE 11). */
  wiggle: boolean;
  position: [number, number, number];
  scale: number;
}

export interface TeddySlotProps {
  visible: boolean;
  position: [number, number, number];
  scale?: number;
  phase: TeddySlotPhase;
  wiggle?: boolean;
  /**
   * Final integrator supplies the real Teddy here. Left undefined, the slot
   * renders a lightweight neutral placeholder so demos/tests keep working.
   */
  renderTeddy?: (ctx: TeddySlotRenderContext) => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Camera controller imperative API
// ---------------------------------------------------------------------------

export interface CameraControllerHandle {
  reset: () => void;
  playIntro: () => void;
  skipIntro: () => void;
  setReducedMotion: (reduced: boolean) => void;
  /**
   * V2 addition (additive, non-breaking). Applies a brief, damped positional
   * jitter on top of wherever the camera currently is — used once, at the
   * moment WELCOME touches down, so the impact reads as physically felt
   * rather than merely watched. A no-op when reducedMotion is true.
   */
  shake: (magnitude?: number, duration?: number) => void;
}

// ---------------------------------------------------------------------------
// World imperative API (what a parent gets via ref)
// ---------------------------------------------------------------------------

export interface WorldHandle {
  playIntro: () => void;
  skipIntro: () => void;
  reset: () => void;
  /**
   * V3 addition. Jumps to a fully-settled, non-animating frame so the
   * static composition can be evaluated without replaying the whole
   * sequence — see README "Local demo instructions." V4: only "welcome"
   * is a meaningful target now (HELLO removed); the parameter is kept so
   * existing callers don't need to drop the argument, but there is only
   * one real destination to preview.
   */
  previewComposition: (target?: "welcome") => void;
  getAnchor: (id: AnchorId) => Object3D | null;
}

export interface OpeningSceneCallbacks {
  onStateChange?: (state: OpeningState) => void;
  /** Fired once, when STATE 12's completion signal is reached. */
  onIntroComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Ground / physical stage (V2)
// ---------------------------------------------------------------------------

export interface GroundProps {
  quality: QualityLevel;
  /** [width, depth] of the stage platform in world units. */
  size?: [number, number];
  thickness?: number;
  position?: [number, number, number];
  color?: string;
}
