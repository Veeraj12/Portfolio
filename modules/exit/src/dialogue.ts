/**
 * dialogue.ts
 *
 * Time-aware exit dialogue, isolated from both the state machine and any
 * concrete UI. These are pure functions of elapsed time so they're trivial
 * to test and to override via ExitControllerConfig.dialogue.
 *
 * Nothing here is hardcoded into board/world/Teddy components — it is only
 * ever reached through ExitController's onTeddyReaction callback.
 */

import type { DialogueFns } from "./types";

export function defaultCloseIntentDialogue(elapsedSeconds: number): string {
  if (elapsedSeconds < 5) {
    return "Are you going this soon?";
  }
  if (elapsedSeconds < 90) {
    const unit = elapsedSeconds === 1 ? "second" : "seconds";
    return `Going so soon? It's only been ${elapsedSeconds} ${unit}.`;
  }
  const minutes = Math.round(elapsedSeconds / 60);
  const unit = minutes === 1 ? "minute" : "minutes";
  return `You're leaving already? We've only been exploring for ${minutes} ${unit}.`;
}

export function defaultGoodbyeDialogue(
  elapsedSeconds: number,
  longSessionThresholdSeconds: number
): string {
  if (elapsedSeconds >= longSessionThresholdSeconds) {
    return "Bye byee! Let's meet again.";
  }
  return "See you soon!";
}

export const defaultDialogue: DialogueFns = {
  closeIntent: defaultCloseIntentDialogue,
  goodbye: defaultGoodbyeDialogue,
};
