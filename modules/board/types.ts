import type { ReactNode } from "react";
import type { IconType } from "react-icons";

/**
 * Known destinations from MASTER_CONTEXT. Kept open (not a strict union)
 * so the integrator can add destinations without changing this module.
 */
export type DestinationId = "projects" | "ai-ml" | "architecture" | "motion" | (string & {});

/**
 * Adapter-boundary shape for a single project. This module does not read
 * from data/projects.ts directly — the integrator maps the real data into
 * this shape. Every field except id/title/description is optional and must
 * be handled gracefully (omit UI, never fabricate a value).
 */
export interface AdventureProject {
  id: string;
  title: string;
  category?: string;
  description: string;
  problem?: string;
  solution?: string;
  technologies?: string[];
  github?: string;
  live?: string;
  image?: string;
  /**
   * INTEGRATION ADDITION. Shown as a muted note when `technologies` is empty
   * (e.g. "Stack details pending verification"). Never fabricates a stack.
   */
  technologyNote?: string;
  /**
   * INTEGRATION ADDITION. Extra ordered sections rendered on the paper after
   * "Solution" — used for case-study style content (architecture) that has
   * more than problem/solution. Each section needs a heading plus a body
   * and/or a list of items; empty sections are skipped.
   */
  sections?: AdventureProjectSection[];
}

export interface AdventureProjectSection {
  heading: string;
  body?: string;
  items?: string[];
}

/** INTEGRATION ADDITION. Lets the host supply real tech icons (see TechnologyList). */
export type TechnologyIconResolver = (technology: string) => IconType | undefined;

/**
 * Typed render-prop slot for Teddy. This module never imports the real
 * Teddy implementation — the integrator (or a demo) supplies renderTeddy.
 */
export interface TeddySlotProps {
  renderTeddy?: () => ReactNode;
  className?: string;
}

export interface AdventureBoardProps {
  /** Which destination this board instance represents (e.g. "projects"). */
  destinationId: DestinationId;
  /** Board title, e.g. "Projects". */
  title: string;
  /** Small label shown above the title, e.g. "Destination". Defaults to destinationId. */
  destinationLabel?: string;
  /** Project data for this destination, already adapted to AdventureProject. */
  projects: AdventureProject[];
  /**
   * Optional controlled active-project id. When provided, the board no
   * longer manages paper open/close state internally — the parent must
   * update this prop in response to onProjectSelect / onProjectClose.
   * Omit it to let the board manage its own open/close state.
   */
  activeProjectId?: string | null;
  /** Fired when a card is clicked/activated (maps to PROJECT_SELECTED). */
  onProjectSelect?: (project: AdventureProject) => void;
  /** Fired when the paper is closed back to its card (maps to PROJECT_CLOSED). */
  onProjectClose?: (project: AdventureProject) => void;
  /** Fired when the board's close control is activated (maps to BOARD_CLOSE_SELECTED). */
  onClose?: () => void;
  /**
   * INTEGRATION ADDITION. Fired when the board's "Back" control is activated
   * (maps to BOARD_BACK). Returns to destination selection so the user can
   * choose a different brick; omit to hide the control.
   */
  onBack?: () => void;
  /** Fired on hover/focus enter+leave of the close control (maps to BOARD_CLOSE_HOVER). */
  onCloseIntent?: (intent: boolean) => void;
  /** Optional Teddy placement slot; omit entirely if no Teddy render is available yet. */
  teddySlot?: TeddySlotProps;
  /** INTEGRATION ADDITION. Copy for the empty state. Defaults to a neutral message. */
  emptyMessage?: string;
  /**
   * INTEGRATION ADDITION. Resolve a technology label to an icon. Checked
   * before the module's small built-in icon map; return undefined to fall
   * back to it (and then to a plain text chip — no invented icons).
   */
  resolveTechnologyIcon?: TechnologyIconResolver;
  className?: string;
}
