import type {
  DestinationDefinition,
  NoSelectionStage,
  OnTeddyReaction,
  TeddyReactionEvent,
} from "../types";

/**
 * This module never imports or renders the real Teddy character. It only
 * knows how to describe a reaction. The final integrator maps
 * `TeddyReactionEvent` onto the real Teddy API (Module 01).
 *
 * A `noop` adapter is provided so the module (and its demo) work fully
 * standalone with zero external wiring.
 */
export const noopTeddyReaction: OnTeddyReaction = () => {};

/** Builds the reaction emitted the moment a brick gains hover/focus. */
export function reactionForHover(destination: DestinationDefinition): TeddyReactionEvent {
  return {
    expression: "happy",
    action: "talk",
    dialogue: destination.dialogue.hover,
    source: "brick-hover",
    destinationId: destination.id,
  };
}

/** Builds the reaction emitted when hover/focus leaves a brick. */
export function reactionForUnhover(destination: DestinationDefinition): TeddyReactionEvent {
  return {
    expression: "neutral",
    action: "idle",
    source: "brick-unhover",
    destinationId: destination.id,
  };
}

/** Builds the reaction emitted the moment a brick is selected. */
export function reactionForSelect(destination: DestinationDefinition): TeddyReactionEvent {
  return {
    expression: "excited",
    action: "jump",
    dialogue: destination.dialogue.select ?? destination.dialogue.hover,
    source: "brick-select",
    destinationId: destination.id,
  };
}

/** Builds the reaction emitted as the no-selection state machine advances. */
export function reactionForNoSelectionStage(stage: NoSelectionStage): TeddyReactionEvent | null {
  switch (stage) {
    case "WAITING":
      // WAITING is the resting state — nothing to announce.
      return null;
    case "CONFUSED":
      return { expression: "confused", action: "idle", source: "no-selection-progress" };
    case "SAD":
      return { expression: "sad", action: "idle", source: "no-selection-progress" };
    case "CRYING":
      return { expression: "crying", action: "cry", source: "no-selection-progress" };
    case "HIDING":
      return { expression: "sad", action: "hide", source: "no-selection-progress" };
    default:
      return null;
  }
}

/** Builds the reaction emitted when the interaction resets (selection cleared / restart). */
export function reactionForReset(): TeddyReactionEvent {
  return { expression: "neutral", action: "idle", source: "reset" };
}
