import type { IconType } from "react-icons";
import type { TechnologyIconResolver } from "../types";
import {
  SiReact,
  SiTypescript,
  SiJavascript,
  SiNextdotjs,
  SiTailwindcss,
  SiNodedotjs,
  SiPython,
  SiPostgresql,
  SiMongodb,
  SiDocker,
  SiGraphql,
  SiRedis,
  SiFirebase,
  SiThreedotjs,
  SiFramer,
  SiVercel,
  SiGo,
  SiRust,
  SiSupabase,
} from "react-icons/si";

/**
 * Small, deliberately bounded icon set — not a full icon-library import.
 * Anything not listed here falls back to a plain text chip, per spec
 * ("do not invent an icon").
 */
const ICON_MAP: Record<string, IconType> = {
  react: SiReact,
  typescript: SiTypescript,
  javascript: SiJavascript,
  "next.js": SiNextdotjs,
  nextjs: SiNextdotjs,
  tailwind: SiTailwindcss,
  "tailwind css": SiTailwindcss,
  "node.js": SiNodedotjs,
  nodejs: SiNodedotjs,
  python: SiPython,
  postgresql: SiPostgresql,
  postgres: SiPostgresql,
  mongodb: SiMongodb,
  docker: SiDocker,
  graphql: SiGraphql,
  redis: SiRedis,
  firebase: SiFirebase,
  "three.js": SiThreedotjs,
  threejs: SiThreedotjs,
  "framer motion": SiFramer,
  framer: SiFramer,
  vercel: SiVercel,
  go: SiGo,
  golang: SiGo,
  rust: SiRust,
  supabase: SiSupabase,
};

interface TechnologyListProps {
  technologies?: string[];
  size?: "sm" | "md";
  /** Cap the number of chips shown, folding the rest into a "+N" chip. */
  max?: number;
  /** "dark" for the board surface, "light" for the paper surface. */
  theme?: "dark" | "light";
  /** INTEGRATION ADDITION. Host-supplied icon lookup, checked first. */
  resolveIcon?: TechnologyIconResolver;
  /** INTEGRATION ADDITION. Shown (muted) only when there are no technologies. */
  note?: string;
}

export function TechnologyList({
  technologies,
  size = "sm",
  max,
  theme = "dark",
  resolveIcon,
  note,
}: TechnologyListProps) {
  if (!technologies || technologies.length === 0) {
    if (!note) return null;
    return (
      <p className={`font-mono text-[11px] leading-snug ${theme === "light" ? "text-[#6b5a3f]" : "text-amber-200/45"}`}>
        {note}
      </p>
    );
  }

  const shown = max ? technologies.slice(0, max) : technologies;
  const overflow = max && technologies.length > max ? technologies.length - max : 0;

  const iconDims = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  const chip =
    theme === "light"
      ? "border-amber-900/15 bg-black/[0.04] text-[#3a2f21]"
      : "border-amber-900/25 bg-[#150f09] text-amber-200/80";

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono" aria-label="Technologies used">
      {shown.map((tech) => {
        const Icon = resolveIcon?.(tech) ?? ICON_MAP[tech.trim().toLowerCase()];
        return (
          <span key={tech} className={`inline-flex items-center gap-1 rounded border ${chip} ${pad}`}>
            {Icon ? <Icon className={iconDims} aria-hidden="true" /> : null}
            <span>{tech}</span>
          </span>
        );
      })}
      {overflow > 0 && <span className={`inline-flex items-center rounded border ${chip} ${pad}`}>+{overflow}</span>}
    </div>
  );
}
