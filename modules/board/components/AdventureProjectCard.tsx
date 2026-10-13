"use client";

import { motion } from "framer-motion";
import type { KeyboardEvent } from "react";
import type { AdventureProject, TechnologyIconResolver } from "../types";
import { TechnologyList } from "./TechnologyList";

interface AdventureProjectCardProps {
  project: AdventureProject;
  onSelect: (project: AdventureProject) => void;
  reducedMotion: boolean;
  resolveIcon?: TechnologyIconResolver;
}

/** Shared-element id linking a card to its paper (see ProjectPaper). */
export const projectSurfaceId = (projectId: string) => `adventure-surface-${projectId}`;

export function AdventureProjectCard({ project, onSelect, reducedMotion, resolveIcon }: AdventureProjectCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(project);
    }
  };

  const lift = reducedMotion ? undefined : { y: -4, scale: 1.02 };

  return (
    <motion.div
      // INTEGRATION: shared layoutId => the card physically expands into the
      // paper and the paper collapses back into this exact card.
      layoutId={reducedMotion ? undefined : projectSurfaceId(project.id)}
      role="listitem"
      tabIndex={0}
      aria-label={`Open ${project.title}`}
      onClick={() => onSelect(project)}
      onKeyDown={handleKeyDown}
      whileHover={lift}
      whileFocus={lift}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group flex cursor-pointer flex-col gap-2 rounded-lg border border-cyan-900/35 bg-[#121e2a] p-3 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 hover:shadow-[0_10px_28px_rgba(8,145,178,0.12)]"
    >
      {project.image && (
        <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-[#150f09]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.image}
            alt=""
            className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
          />
        </div>
      )}

      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-100">{project.title}</p>
        {project.category && <p className="truncate font-mono text-[11px] text-cyan-300/65">{project.category}</p>}
      </div>

      <p className={`text-xs leading-snug text-slate-300/65 ${project.image ? "line-clamp-2" : "line-clamp-4"}`}>
        {project.description}
      </p>

      <TechnologyList technologies={project.technologies} size="sm" max={4} theme="dark" resolveIcon={resolveIcon} />
    </motion.div>
  );
}
