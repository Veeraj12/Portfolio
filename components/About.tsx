import { Button } from "./Button";
import { SectionHeading } from "./SectionHeading";

const pillars = [
  {
    label: "What I build",
    body: "Systems that sit close to a real, specific problem — reconciliation engines, grievance workflows, small utilities that remove one recurring annoyance.",
  },
  {
    label: "How I think",
    body: "I start from the pain point, not the tech stack. Explainability and correctness first, then how much friction the system removes from someone's day.",
  },
  {
    label: "What I'm exploring",
    body: "AI/ML applied to structured problems like financial reconciliation, full-stack system design, and automation — plus packaging and performance.",
  },
];

const LABEL_RADIUS = 35; // % of the diagram box
const RING_RADIUS = 32; // matches the dotted circle's r in the 0–100 viewBox

/**
 * About as a circular infographic: the points sit around a dotted ring, the
 * whole assembly rotates clockwise, and each label counter-rotates so its text
 * stays upright. Hovering the diagram pauses the spin and lights it up.
 */
export function About() {
  const items = pillars.map((p, i) => {
    const theta = (360 / pillars.length) * i; // degrees, 0 = top
    const rad = (theta * Math.PI) / 180;
    return {
      ...p,
      lx: 50 + LABEL_RADIUS * Math.sin(rad),
      ly: 50 - LABEL_RADIUS * Math.cos(rad),
      dx: 50 + RING_RADIUS * Math.sin(rad),
      dy: 50 - RING_RADIUS * Math.cos(rad),
    };
  });

  return (
    <section id="about" className="scroll-mt-20 py-20 sm:py-24">
      <div className="container-lab">
        <SectionHeading
          index="01"
          title="About"
          subtitle="Not a resume — a working description of how I approach software."
        />

        <div className="mt-14">
          <div className="about-orbit">
            <div className="about-orbit-spin">
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <circle
                  className="about-ring"
                  cx="50"
                  cy="50"
                  r={RING_RADIUS}
                  fill="none"
                  stroke="rgb(var(--border))"
                  strokeWidth="0.7"
                  strokeDasharray="0.6 3"
                  strokeLinecap="round"
                />
              </svg>

              {items.map((it) => (
                <span
                  key={`dot-${it.label}`}
                  className="about-orbit-dot"
                  style={{ left: `${it.dx}%`, top: `${it.dy}%` }}
                />
              ))}

              {items.map((it) => (
                <div
                  key={it.label}
                  className="about-node"
                  style={{ left: `${it.lx}%`, top: `${it.ly}%` }}
                >
                  <div className="about-label">
                    <div className="about-card">
                      <p className="label-tag text-accent">{it.label}</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-fg/80">
                        {it.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="about-center">
              <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                Approach
              </p>
            </div>
          </div>

          <div className="mt-10 flex justify-center">
            <Button href="/resume/veeraj-resume.pdf" external variant="outline">
              Resume
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
