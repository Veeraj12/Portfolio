export { AdventureTimer, formatElapsedSeconds } from "./AdventureTimer";
export { ExitController } from "./ExitController";
export { useAdventureExit } from "./useAdventureExit";
export { defaultCloseIntentDialogue, defaultGoodbyeDialogue, defaultDialogue } from "./dialogue";

export type {
  TeddyExpression,
  TeddyAction,
  TeddyReaction,
  ElapsedDuration,
  AdventureTimerConfig,
  ExitState,
  DialogueFns,
  ExitControllerConfig,
} from "./types";

export type { UseAdventureExitOptions, UseAdventureExitResult } from "./useAdventureExit";
