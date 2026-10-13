import {
  SiPython,
  SiDjango,
  SiPandas,
  SiSqlite,
  SiNextdotjs,
  SiTypescript,
  SiReact,
  SiPrisma,
} from "react-icons/si";
import { FileSpreadsheet } from "lucide-react";
import type { IconType } from "react-icons";
import type { TechSlug } from "./projects";

interface TechMeta {
  label: string;
  Icon: IconType;
}

// Note: simple-icons has no licensed Microsoft Excel logo, so "excel" uses a
// generic spreadsheet glyph from lucide-react instead of a brand mark.
export const techRegistry: Record<TechSlug, TechMeta> = {
  python: { label: "Python", Icon: SiPython },
  django: { label: "Django", Icon: SiDjango },
  pandas: { label: "Pandas", Icon: SiPandas },
  excel: { label: "Excel / XLSX", Icon: FileSpreadsheet },
  sqlite: { label: "SQLite", Icon: SiSqlite },
  nextjs: { label: "Next.js", Icon: SiNextdotjs },
  typescript: { label: "TypeScript", Icon: SiTypescript },
  react: { label: "React", Icon: SiReact },
  prisma: { label: "Prisma", Icon: SiPrisma },
};
