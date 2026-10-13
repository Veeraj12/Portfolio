/**
 * Maps the repository's canonical data (data/projects.ts, data/architecture.ts)
 * onto the board module's AdventureProject shape, keyed by destinationId.
 *
 * Rules (from the integration brief):
 *  - never invent projects, technologies, URLs or features;
 *  - `live` is passed through ONLY when the source has a real http(s) URL;
 *  - a destination with no data source resolves to an empty list, and the
 *    board shows its empty state (never undefined cards).
 */
import type { AdventureProject } from "@/modules/board/types";
import { aiMlProjects, projects, type Project } from "@/data/projects";
import { architectureCaseStudies, type ArchitectureCaseStudy } from "@/data/architecture";
import { techRegistry } from "@/data/tech-icons";
import { getDestinationMeta } from "../config";

export interface BoardContent {
  destinationId: string;
  title: string;
  label: string;
  projects: AdventureProject[];
  emptyMessage: string;
}

export function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function toAdventureProject(p: Project): AdventureProject {
  return {
    id: p.id,
    title: p.name,
    category: p.categoryLabel,
    description: p.description,
    problem: p.problem,
    solution: p.solution,
    technologies: p.technologies.map((slug) => techRegistry[slug]?.label ?? slug),
    technologyNote: p.unverifiedNote,
    github: isHttpUrl(p.github) ? p.github : undefined,
    live: isHttpUrl(p.live) ? p.live : undefined,
  };
}

/**
 * Architecture work is presented as a case study (brief §24):
 * problem -> existing architecture -> bottlenecks -> improved architecture ->
 * reasoning / trade-offs -> final design. Every field comes from the data file.
 * There is no repository URL in the architecture data, so none is shown.
 */
export function toAdventureCaseStudy(s: ArchitectureCaseStudy): AdventureProject {
  return {
    id: s.id,
    title: s.title,
    category: "Architecture case study",
    description: s.context,
    problem: s.problem,
    technologies: s.tags,
    image: s.previewImage,
    sections: [
      { heading: "Existing architecture", body: s.originalArchitecture },
      { heading: "Bottlenecks", items: s.bottlenecks },
      { heading: "Improved architecture", body: s.proposedImprovement },
      { heading: "Reasoning", body: s.reasoning },
      { heading: "Trade-offs", items: s.tradeoffs },
      { heading: "Final design", body: s.finalArchitecture },
    ],
  };
}

type Source = () => AdventureProject[];

/**
 * destinationId -> data source. To populate a destination, add a source here.
 *
 * `projects` shows every project; `ai-ml` is the AI/ML lens over the same
 * data (the two intentionally overlap, mirroring the professional portfolio's
 * filters). `motion` has NO source: the repository contains no motion work,
 * and inventing some is forbidden, so it resolves to the empty state.
 */
const SOURCES: Record<string, Source> = {
  projects: () => projects.map(toAdventureProject),
  "ai-ml": () => aiMlProjects.map(toAdventureProject),
  architecture: () => architectureCaseStudies.map(toAdventureCaseStudy),
};

export function getBoardContent(destinationId: string): BoardContent {
  const meta = getDestinationMeta(destinationId);
  const source = SOURCES[destinationId];
  let list: AdventureProject[] = [];
  try {
    list = source ? source() : [];
  } catch {
    list = []; // a bad data source must not take the adventure down
  }
  return {
    destinationId,
    title: meta.boardTitle,
    label: meta.boardLabel,
    projects: list,
    emptyMessage: meta.emptyMessage,
  };
}

export function destinationHasContent(destinationId: string): boolean {
  return getBoardContent(destinationId).projects.length > 0;
}
