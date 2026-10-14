"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Github, GitBranch, ChevronDown } from "lucide-react";
import type { Project } from "@/data/projects";
import { techRegistry } from "@/data/tech-icons";
import { useCardGlow } from "./useCardGlow";

export function ProjectCard({ project }: { project: Project }) {
  const cardRef = useCardGlow<HTMLElement>();
  const reducedMotion = useReducedMotion();

  return (
    <motion.article
      ref={cardRef}
      initial="rest"
      whileHover={reducedMotion ? undefined : "hover"}
      animate="rest"
      style={{ transformPerspective: 1000 }}
      variants={{
        rest: { y: 0, scale: 1 },
        hover: { y: -4, scale: 1.012 },
      }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      data-featured={project.featured ? "true" : undefined}
      className="card-ambient group relative flex h-full min-h-[20rem] flex-col rounded border border-border bg-surface p-5 sm:p-6 md:min-h-[22rem] xl:min-h-[24rem]"
    >
      {project.relation && (
        <div className="mb-3 flex items-center gap-1.5 label-tag text-signal">
          <GitBranch size={12} aria-hidden />
          <span>{project.relation.label}</span>
        </div>
      )}

      <span className="label-tag mb-3">{project.categoryLabel}</span>
      <h3 className="font-display text-xl font-semibold text-fg">{project.name}</h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
        {project.description}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-3 gap-y-2" aria-label="Technologies">
        {project.technologies.length > 0 ? (
          project.technologies.map((slug) => {
            const tech = techRegistry[slug];
            if (!tech) return null;
            const Icon = tech.Icon;
            return (
              <span key={slug} title={tech.label} className="flex items-center gap-1.5 label-tag text-fg/75">
                <Icon size={13} aria-hidden />
                {tech.label}
              </span>
            );
          })
        ) : (
          <span className="label-tag italic text-muted/80">{project.unverifiedNote ?? "Technology details not yet verified"}</span>
        )}
      </div>

      <details className="group/details mt-5 border-t border-border pt-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-fg/80 marker:hidden transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
          <span>Problem & approach</span>
          <ChevronDown size={15} aria-hidden className="ml-auto transition-transform group-open/details:rotate-180" />
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <p className="label-tag mb-1.5">Problem</p>
            <p className="text-sm leading-relaxed text-fg/80">{project.problem}</p>
          </div>
          <div>
            <p className="label-tag mb-1.5">Approach</p>
            <p className="text-sm leading-relaxed text-fg/80">{project.solution}</p>
          </div>
        </div>
      </details>

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
        <a
          href={project.github}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${project.name} source code on GitHub`}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3.5 py-2 text-[13px] font-medium text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
        >
          <Github size={14} aria-hidden />
          GitHub
          <ArrowUpRight size={13} aria-hidden />
        </a>
        {project.live && (
          <a
            href={project.live}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open live demo of ${project.name}`}
            className="inline-flex items-center gap-1.5 rounded border border-accent px-3.5 py-2 text-[13px] font-medium text-accent transition-colors duration-200 hover:bg-accent hover:text-accent-fg"
          >
            Live demo
            <ArrowUpRight size={14} aria-hidden />
          </a>
        )}
      </div>
    </motion.article>
  );
}
