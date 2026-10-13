export type ProjectCategory = "engineering" | "ai-ml" | "utility";

export type TechSlug =
  | "python"
  | "django"
  | "pandas"
  | "excel"
  | "sqlite"
  | "nextjs"
  | "typescript"
  | "react"
  | "prisma";

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  categoryLabel: string;
  description: string;
  problem: string;
  solution: string;
  technologies: TechSlug[];
  /** Set when a technology could not be verified from the public repo. Rendered as a plain label, no invented stack. */
  unverifiedNote?: string;
  github: string;
  /** Only populated when a real, working deployment URL exists. */
  live?: string;
  featured: boolean;
  status: "active" | "archived" | "team";
  relation?: {
    label: string;
    target: string;
  };
}

export const projects: Project[] = [
  {
    id: "reconai",
    name: "ReconAI",
    category: "engineering",
    categoryLabel: "Featured Engineering",
    description:
      "Reconciles bank, Tally and ledger files through a structured, explainable matching workflow.",
    problem:
      "Financial reconciliation usually means comparing records from systems whose columns, formats, and naming conventions don't line up. Done by hand, it's repetitive, error-prone, and doesn't scale past a handful of accounts.",
    solution:
      "ReconAI ingests heterogeneous transaction files, interprets their schemas, maps related fields to a common structure, and runs reconciliation while keeping every match and exception explainable rather than a black box.",
    technologies: ["python", "django", "pandas", "excel", "sqlite"],
    github: "https://github.com/Veeraj12/ReconAI",
    featured: true,
    status: "active",
  },
  {
    id: "app-grievance-system",
    name: "App Grievance System",
    category: "engineering",
    categoryLabel: "Featured Engineering",
    description:
      "Turns student grievances into a trackable workflow from submission through resolution.",
    problem:
      "Students often have no structured way to submit, track, or follow up on grievances, so issues get lost across chats, emails, and hallway conversations.",
    solution:
      "A full-stack web application that turns grievance submission and management into a structured, trackable digital workflow from intake to resolution.",
    technologies: ["nextjs", "typescript", "react", "prisma"],
    github: "https://github.com/Veeraj12/App-Grievance-System",
    featured: true,
    status: "active",
  },
  {
    id: "reconai-buildathon",
    name: "ReconAI — Buildathon",
    category: "ai-ml",
    categoryLabel: "AI / ML",
    description:
      "A focused ReconAI iteration for mapping and matching data across five financial source types.",
    problem:
      "The core ReconAI engine needed to prove itself against a wider, messier set of real-world sources under competition constraints and a tight build window.",
    solution:
      "A focused rebuild of the reconciliation pipeline handling Bank, Tally, ERP, UPI, and Payment Gateway sources, with deterministic, explainable matching and exception identification across all of them.",
    technologies: ["python", "django"],
    github: "https://github.com/Veeraj12/ReconAIBuildathon",
    featured: false,
    status: "active",
    relation: {
      label: "ReconAI → Buildathon Evolution",
      target: "reconai",
    },
  },
  {
    id: "ipd-prototype",
    name: "IPD Prototype",
    category: "ai-ml",
    categoryLabel: "AI / ML · Team Project",
    description: "A collaborative prototype with separate frontend and backend components.",
    problem:
      "Team project context and requirements are documented in the repository rather than summarized publicly.",
    solution:
      "Built collaboratively with a separated backend and frontend architecture. See the repository for full implementation detail.",
    technologies: [],
    unverifiedNote: "Stack details pending verification from the repository",
    github: "https://github.com/TirthhShethh/IPD---Prototype",
    featured: false,
    status: "team",
  },
  {
    id: "attendance-generator",
    name: "Attendance Generator",
    category: "utility",
    categoryLabel: "Utility Lab",
    description: "Converts structured attendance data into a formatted document.",
    problem:
      "Preparing attendance or leave documentation by hand means repetitive data entry and formatting for something that should take seconds.",
    solution:
      "A lightweight Python utility that converts structured attendance and leave information directly into a formatted digital document.",
    technologies: ["python"],
    github: "https://github.com/Veeraj12/Attendance_Generator",
    featured: false,
    status: "active",
  },
  {
    id: "flashcard-reviser",
    name: "Flashcard Reviser",
    category: "utility",
    categoryLabel: "Utility Lab",
    description: "A lightweight flashcard tool for quick, repeatable active recall.",
    problem:
      "Revision slows down when study material isn't organized into a quick, repeatable recall workflow.",
    solution:
      "A browser-based flashcard revision tool designed around rapid review cycles and spaced repetition of material.",
    technologies: ["typescript"],
    github: "https://github.com/Veeraj12/FlashCardReviser",
    featured: false,
    status: "active",
  },
  {
    id: "simple-file-transfer",
    name: "Simple File Transfer",
    category: "utility",
    categoryLabel: "Utility Lab",
    description: "A small utility for direct local file transfer.",
    problem:
      "Moving files locally often ends up routed through a cloud service or third-party platform for what should be a direct transfer.",
    solution:
      "A minimal file-transfer utility focused on moving files directly, without an external service in the loop.",
    technologies: [],
    unverifiedNote: "Repository link pending re-verification — stack not yet confirmed",
    github: "https://github.com/Veeraj12/SimpleFileTransfer",
    featured: false,
    status: "active",
  },
  {
    id: "lifeos-file-transfer",
    name: "LifeOS File Transfer",
    category: "utility",
    categoryLabel: "Utility Lab",
    description: "An experiment exploring a broader personal-systems use for file transfer.",
    problem:
      "An open experiment in extending simple file movement into a broader personal-systems context.",
    solution:
      "A utility/system experiment building on the same direct-transfer approach. Full scope documented in the repository.",
    technologies: [],
    unverifiedNote: "Repository link pending re-verification — stack not yet confirmed",
    github: "https://github.com/Veeraj12/LifeOsFileTransfer",
    featured: false,
    status: "active",
  },
];

export const featuredProjects = projects.filter((p) => p.featured);
export const aiMlProjects = projects.filter((p) => p.category === "ai-ml");
export const utilityProjects = projects.filter((p) => p.category === "utility");
