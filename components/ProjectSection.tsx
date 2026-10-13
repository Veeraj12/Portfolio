import type { Project } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";
import { ScrollReveal } from "./ScrollReveal";
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
          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ScrollReveal key={project.id} y={20} x={0} className="h-full">
                <ProjectCard project={project} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
