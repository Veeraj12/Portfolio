/**
 * AdventureEventBus — the typed event contract of Veeraj's World.
 *
 * ADVENTURE_CONTRACT.md was not supplied with the module bundle, so the event
 * NAMES below are exactly the ones listed in FINAL_MASTER_INTEGRATION_PROMPT §33
 * (plus NO_SELECTION_TIMEOUT from §34). The payload shapes are defined here and
 * are the single source of truth for them. Events marked "internal" only carry
 * signals between the scene and the controller and are not part of that list.
 *
 * Modules never import this file. Only the integration layer does: module
 * callbacks are translated into bus events by the components in this folder.
 */
import type { NoSelectionStage } from "@/modules/bricks/src/types";
import type { OpeningState } from "@/modules/world/src/types";
import type { TeddyPoseKind } from "./teddy";

export type InputSource = "pointer" | "touch" | "focus";

export interface AdventureEventMap {
  ADVENTURE_READY: Record<string, never>;
  INTRO_STARTED: Record<string, never>;
  INTRO_COMPLETE: Record<string, never>;
  TEDDY_READY: Record<string, never>;

  DESTINATION_HOVER: { destinationId: string; source: InputSource };
  DESTINATION_UNHOVER: { destinationId: string; source: InputSource };
  /** `confirmed` bypasses the touch two-step (used by the explicit "Go" button). */
  DESTINATION_SELECTED: { destinationId: string; confirmed?: boolean };
  NO_SELECTION_TIMEOUT: { stage: NoSelectionStage };

  BOARD_OPEN: { destinationId: string };
  PROJECT_SELECTED: { projectId: string; destinationId: string };
  PROJECT_CLOSED: { projectId: string; destinationId: string };
  BOARD_CLOSE_HOVER: { intent: boolean };
  BOARD_CLOSE_SELECTED: Record<string, never>;
  /**
   * "Back to destinations": dismiss the board (and any open project paper)
   * and return to the brick-selection scene, so the user can pick a
   * different brick without leaving the adventure entirely. Distinct from
   * BOARD_CLOSE_SELECTED, which runs the exit sequence.
   */
  BOARD_BACK: Record<string, never>;

  EXIT_SEQUENCE_STARTED: Record<string, never>;
  /**
   * The welcome-screen exit control was finally confirmed (after its playful
   * dodging). Shows a short "fine, leaving so soon..." line, then runs the
   * real goodbye -> portal exit sequence.
   */
  EXIT_CONFIRMED: Record<string, never>;
  PORTAL_READY: Record<string, never>;
  ADVENTURE_EXIT: Record<string, never>;
  ADVENTURE_RESTART: Record<string, never>;

  /** internal — World's opening state machine advanced. */
  WORLD_STATE: { state: OpeningState };
  /** internal — Teddy finished travelling to a pose. */
  TEDDY_ARRIVED: { pose: TeddyPoseKind };
  /** internal — every brick has resolved out of its particle cloud. */
  BRICKS_SETTLED: Record<string, never>;
}

export type AdventureEventName = keyof AdventureEventMap;
type Handler<K extends AdventureEventName> = (payload: AdventureEventMap[K]) => void;

export interface AdventureEventBus {
  on<K extends AdventureEventName>(event: K, handler: Handler<K>): () => void;
  emit<K extends AdventureEventName>(event: K, payload: AdventureEventMap[K]): void;
  /** Subscribe to every event (debugging / logging). */
  onAny(handler: (event: AdventureEventName, payload: unknown) => void): () => void;
  /** Remove every subscription. Call on unmount. */
  clear(): void;
}

export function createAdventureEventBus(): AdventureEventBus {
  const handlers = new Map<AdventureEventName, Set<(payload: never) => void>>();
  const anyHandlers = new Set<(event: AdventureEventName, payload: unknown) => void>();

  return {
    on(event, handler) {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler as (payload: never) => void);
      return () => {
        handlers.get(event)?.delete(handler as (payload: never) => void);
      };
    },
    emit(event, payload) {
      // Copy so a handler that unsubscribes during dispatch can't skip a sibling.
      const list = Array.from(handlers.get(event) ?? []);
      for (const h of list) (h as (p: typeof payload) => void)(payload);
      for (const h of Array.from(anyHandlers)) h(event, payload);
    },
    onAny(handler) {
      anyHandlers.add(handler);
      return () => {
        anyHandlers.delete(handler);
      };
    },
    clear() {
      handlers.clear();
      anyHandlers.clear();
    },
  };
}
