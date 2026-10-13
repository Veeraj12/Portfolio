"use client";

import { useSyncExternalStore } from "react";
import type { AdventureController, AdventureState } from "../controller";

/** Subscribe a component to the controller's state (single source of truth). */
export function useAdventure(controller: AdventureController): AdventureState {
  return useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
}
