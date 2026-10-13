import type { IconType } from "react-icons";
import type { TechnologyIconResolver } from "@/modules/board/types";
import { techRegistry } from "@/data/tech-icons";

/**
 * Resolves a technology LABEL (as emitted by boardContent) to the icon the
 * professional portfolio already uses, so both modes show identical marks.
 * Unknown labels return undefined -> the board falls back to its own small
 * map and then to a plain text chip. No icon is ever invented.
 */
export function createTechnologyIconResolver(): TechnologyIconResolver {
  const byLabel = new Map<string, IconType>();
  for (const meta of Object.values(techRegistry)) {
    byLabel.set(meta.label.trim().toLowerCase(), meta.Icon);
  }
  return (technology: string) => byLabel.get(technology.trim().toLowerCase());
}
