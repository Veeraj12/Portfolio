"use client";

import { motion } from "framer-motion";
import { ArrowRight, ArrowDownRight, Github } from "lucide-react";
import { AnimatedText } from "./AnimatedText";
import { Button } from "./Button";
import { HangingGreeting } from "./HangingGreeting";

const capabilities = ["AI / ML", "Full-Stack", "System Design", "Automation"];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.02 },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero() {
  return (
    <section
      id="home"
      data-ambient-zone
      className="relative overflow-hidden border-b border-border"
    >
      <motion.div
        aria-hidden
        animate={{ y: [0, -18, 0], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
      />

      <div className="container-lab relative py-24 sm:py-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-3xl"
        >
          <HangingGreeting />

          <AnimatedText
            as="p"
            trigger="mount"
            delay={0.04}
            stagger={0.05}
            spotlight
            className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl"
            text="I'm Veeraj Panchal."
          />

          <AnimatedText
            as="h1"
            trigger="mount"
            delay={0.16}
            stagger={0.03}
            spotlight
            className="mt-4 font-display text-display-1 font-semibold uppercase text-fg"
            text="From algorithms to intelligent systems."
          />

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted"
          >
          I build real-world applications, from architecting robust systems to exploring the mathematics that makes machines learn.
          </motion.p>

          <motion.ul variants={item} className="mt-8 flex flex-wrap gap-2">
            {capabilities.map((cap, i) => (
              <motion.li
                key={cap}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -2 }}
                className="rounded-full border border-border px-3.5 py-1.5 label-tag text-fg/80 transition-colors duration-200 hover:border-accent hover:text-accent"
              >
                {cap}
              </motion.li>
            ))}
          </motion.ul>

          <motion.div variants={item} className="mt-10 flex flex-wrap items-center gap-4">
            <Button href="#projects" variant="primary">
              View Projects
              <ArrowRight size={16} />
            </Button>
            <Button href="#architecture" variant="outline">
              Explore Architecture
              <ArrowDownRight size={16} />
            </Button>
            <a
              href="https://github.com/Veeraj12"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 flex items-center gap-2 text-sm text-muted transition-colors duration-200 hover:text-fg"
            >
              <Github size={16} />
              github.com/Veeraj12
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
