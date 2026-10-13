/**
 * Teddy coordination types. The integration layer decides WHEN Teddy reacts
 * and WHERE he is (a "pose"); the Teddy module decides HOW that is rendered.
 */
import type { TeddyAction, TeddyExpression } from "@/modules/teddy/src/Teddy.types";

export type TeddyHeldAction = Extract<TeddyAction, "idle" | "walk" | "hide" | "cry">;
export type TeddyBurstAction = Extract<TeddyAction, "jump" | "wave" | "talk" | "blink">;

/**
 * Where Teddy is standing. Resolved to world coordinates by the scene.
 *
 * "onWelcome"/"behindWelcome" replace the earlier HELLO-relative poses
 * ("onHello"/"behindHello") now that HELLO has been removed from the
 * opening — Teddy's welcome gesture and "patience ladder" hide-behind
 * reaction both happen at WELCOME instead. See config.ts's
 * resolveTeddyPose() for how these resolve to actual coordinates.
 */
export type TeddyPose =
  | { kind: "onWelcome" }
  | { kind: "behindWelcome" }
  | { kind: "onBrick"; destinationId: string }
  | { kind: "farewell" };

export type TeddyPoseKind = TeddyPose["kind"];

export interface TeddyDirective {
  expression: TeddyExpression;
  /** Looping action Teddy holds until told otherwise. */
  held: TeddyHeldAction;
  /** One-shot flourish; `nonce` changes every time so the same action replays. */
  burst: { action: TeddyBurstAction; nonce: number } | null;
  pose: TeddyPose;
}

export function poseKey(pose: TeddyPose): string {
  return pose.kind === "onBrick" ? `onBrick:${pose.destinationId}` : pose.kind;
}

const BURSTS: ReadonlySet<string> = new Set(["jump", "wave", "talk", "blink"]);
export function isBurstAction(action: TeddyAction): action is TeddyBurstAction {
  return BURSTS.has(action);
}
export function isHeldAction(action: TeddyAction): action is TeddyHeldAction {
  return action === "idle" || action === "walk" || action === "hide" || action === "cry";
}
