import { Github, Linkedin, Mail } from "lucide-react";
import { AnimatedText } from "./AnimatedText";
import { Button } from "./Button";
import { ScrollReveal } from "./ScrollReveal";

const channels = [
  {
    label: "GitHub",
    value: "github.com/Veeraj12",
    href: "https://github.com/Veeraj12",
    Icon: Github,
  },
  {
    label: "Email",
    value: "veerajpanchal@gmail.com",
    href: "mailto:veerajpanchal@gmail.com",
    Icon: Mail,
  },
  {
    label: "LinkedIn",
    value: "https://www.linkedin.com/in/veeraj-panchal",
    href: "https://www.linkedin.com/in/veeraj-panchal-310591384/",
    Icon: Linkedin,
  },
];

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 border-t border-border py-24 sm:py-32">
      <div className="container-lab flex flex-col items-start">
        <ScrollReveal y={24}>
          <p className="label-tag mb-4">06 · Contact</p>
          <AnimatedText
            as="h2"
            text="Have a problem worth building?"
            spotlight
            className="font-display text-display-2 font-semibold text-fg"
          />
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
            If it&rsquo;s a messy dataset, a workflow nobody enjoys, or a system
            that needs to be designed rather than duct-taped — I&rsquo;d like to
            hear about it.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid w-full gap-3 sm:max-w-md">
          {channels.map(({ label, value, href, Icon }) => (
            <ScrollReveal key={label} y={20} x={24}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex items-center justify-between rounded border border-border px-4 py-3.5 transition-all duration-300 ease-engineered hover:-translate-y-0.5 hover:border-accent"
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} className="text-muted transition-colors duration-300 group-hover:text-accent" />
                  <span className="text-[14px] text-fg">{value}</span>
                </span>
                <span className="label-tag text-muted group-hover:text-accent">
                  {label}
                </span>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal y={20} className="mt-10">
          <Button href="mailto:veerajpanchal@gmail.com" variant="primary">
            Start a conversation
          </Button>
        </ScrollReveal>
      </div>
    </section>
  );
}
