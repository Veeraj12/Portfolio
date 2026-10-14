"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { Project } from "@/data/projects";
import { ProjectCard } from "./ProjectCard";

/**
 * Each card folds down out of the deck — hinged at its top edge — then settles
 * flat. Applied per card (not to the whole grid at once) so cards in every row
 * animate as they enter the viewport, not just the first row.
 */
const fold: Variants = {
  hidden: { opacity: 0, y: 26, rotateX: -26, transformOrigin: "top center" },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] },
  }),
};

/** Columns must match the grid classes below so row-mates stagger together. */
function useColumns() {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const compute = () => {
      const width = window.innerWidth;
      setColumns(width >= 1280 ? 3 : width >= 768 ? 2 : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  return columns;
}

/**
 * The project grid.
 *
 * `items-start` keeps every card its own height so opening one card's
 * "Problem & approach" no longer stretches its neighbours. Even heights come
 * from the cards' shared responsive `min-h-*`, which lifts every resting card
 * to the same height while still letting a single card grow on its own.
 */
export function ProjectDeck({ projects }: { projects: Project[] }) {
  const reducedMotion = useReducedMotion();
  const columns = useColumns();

  const gridClass =
    "mt-12 grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3";

  if (reducedMotion) {
    return (
      <div className={gridClass}>
        {projects.map((project) => (
          <div key={project.id}>
            <ProjectCard project={project} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {projects.map((project, index) => (
        <motion.div
          key={project.id}
          custom={(index % columns) * 0.1}
          variants={fold}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          style={{ transformPerspective: 1200 }}
        >
          <ProjectCard project={project} />
        </motion.div>
      ))}
    </div>
  );
}
