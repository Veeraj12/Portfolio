import { Github, Linkedin, Mail } from "lucide-react";
import { Reveal } from "./Reveal";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-8">
      <Reveal y={10} className="container-lab flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-[13px] text-muted">
          Veeraj <span className="mx-1.5">·</span> {year}
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Veeraj12"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="text-muted transition-colors duration-200 hover:text-fg"
          >
            <Github size={16} />
          </a>
          <a
            href="https://linkedin.com/in/your-profile"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-muted transition-colors duration-200 hover:text-fg"
          >
            <Linkedin size={16} />
          </a>
          <a
            href="mailto:your-email@example.com"
            aria-label="Email"
            className="text-muted transition-colors duration-200 hover:text-fg"
          >
            <Mail size={16} />
          </a>
        </div>
      </Reveal>
    </footer>
  );
}
