import type { Project } from "@/data/projects";
import { ProjectDeck } from "./ProjectDeck";
import { SectionHeading } from "./SectionHeading";

interface ProjectSectionProps {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  projects: Project[];
  emptyLabel?: string;
}

export function ProjectSection({
  id,
  index,
  title,
  subtitle,
  projects,
  emptyLabel = "No projects in this category yet.",
}: ProjectSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden py-20 sm:py-24">
      <div className="container-lab">
        <SectionHeading index={index} title={title} subtitle={subtitle} />

        {projects.length === 0 ? (
          <p className="mt-12 label-tag">{emptyLabel}</p>
        ) : (
          <ProjectDeck projects={projects} />
        )}
      </div>
    </section>
  );
}
