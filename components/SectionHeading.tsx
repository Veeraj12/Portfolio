import { AnimatedText } from "./AnimatedText";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  index: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  index,
  title,
  subtitle,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <Reveal>
        <div
          className={
            "mb-4 flex items-center gap-3 label-tag " +
            (align === "center" ? "justify-center" : "")
          }
        >
          <span>{index}</span>
          <span className="h-px w-8 bg-border" />
        </div>
      </Reveal>
      <AnimatedText
        as="h2"
        text={title}
        spotlight
        className="font-display text-display-2 font-semibold text-fg"
      />
      {subtitle && (
        <Reveal delay={0.12}>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
