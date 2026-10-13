import type { DestinationDefinition } from "../types";

/**
 * Canonical initial destination set.
 *
 * This is DATA, not markup. Rendering code (DestinationBrick /
 * DestinationBrickWorld) must never hardcode a destination's copy or
 * layout — everything content-specific lives here so new destinations
 * can be added without touching a single component.
 */
export const DEFAULT_DESTINATIONS: DestinationDefinition[] = [
  {
    id: "projects",
    label: "Projects",
    description: "A look at what's been built.",
    dialogue: {
      hover: "Want to see what I've built?",
      select: "Alright, let's go look!",
    },
    position: [-3, 0, 0],
  },
  {
    id: "ai-ml",
    label: "AI / ML",
    description: "Machine learning work and experiments.",
    dialogue: {
      hover: "Ooooh... the brainy stuff.",
      select: "This one's my favorite, honestly.",
    },
    position: [-1, 0, 0],
  },
  {
    id: "architecture",
    label: "Engineering Archive",
    description: "Original system designs and workflow exhibits.",
    dialogue: {
      hover: "Want to explore the engineering archive?",
      select: "Let’s open the lab archive.",
    },
    position: [1, 0, 0],
  },
  {
    id: "motion",
    label: "Motion",
    description: "Animation and interaction work.",
    dialogue: {
      hover: "Okay... this is where things get weird.",
      select: "Hehe. You asked for it.",
    },
    position: [3, 0, 0],
  },
];
