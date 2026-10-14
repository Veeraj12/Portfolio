"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ProjectFilter, type FilterValue } from "./ProjectFilter";
import { ProjectSection } from "./ProjectSection";
import { featuredProjects, aiMlProjects, utilityProjects } from "@/data/projects";

const sections: {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: FilterValue;
  projects: typeof featuredProjects;
}[] = [
  {
    id: "projects",
    index: "02",
    title: "Featured Engineering",
    subtitle:
      "The systems I've put the most thought into — from problem framing to the code that ships.",
    category: "engineering",
    projects: featuredProjects,
  },
  {
    id: "ai-ml",
    index: "03",
    title: "AI / ML",
    subtitle: "Projects where intelligence meets practical systems.",
    category: "ai-ml",
    projects: aiMlProjects,
  },
  {
    id: "utilities",
    index: "04",
    title: "Utility Lab",
    subtitle: "Small systems built to remove everyday friction.",
    category: "utility",
    projects: utilityProjects,
  },
];

export function ProjectsExplorer() {
  const [filter, setFilter] = React.useState<FilterValue>("all");

  return (
    <div data-ambient-zone className="relative">
      <div className="container-lab flex justify-center pt-16 sm:justify-start">
        <ProjectFilter value={filter} onChange={setFilter} />
      </div>

      {sections.map((section) => {
        const visible = filter === "all" || filter === section.category;
        return (
          <AnimatePresence key={section.id} initial={false}>
            {visible && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <ProjectSection
                  id={section.id}
                  index={section.index}
                  title={section.title}
                  subtitle={section.subtitle}
                  projects={section.projects}
                />
              </motion.div>
            )}
          </AnimatePresence>
        );
      })}
    </div>
  );
}
