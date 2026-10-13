You are preparing the shared technical context document for a multi-agent portfolio project.

The project is an existing Next.js 14 + TypeScript personal portfolio for Veeraj.

The existing implementation already contains:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Lucide React
- React Icons
- next-themes
- reusable portfolio components
- centralized project data
- architecture data
- dark/light theme support

Existing portfolio structure includes components such as:

Navbar
Hero
WhatIBuild
ProjectsExplorer
ProjectFilter
ProjectSection
ProjectCard
ArchitectureLab
ArchitectureCard
ArchitectureModal
About
Contact
Footer
ThemeToggle
ThemeProvider

Existing project data is centralized in:

data/projects.ts

Existing architecture data is centralized in:

data/architecture.ts

Existing global styling is in:

app/globals.css

Existing Tailwind configuration is in:

tailwind.config.ts

==================================================
NEW PRODUCT DIRECTION
==================================================

The portfolio is being transformed into a two-mode experience.

MODE 1:
Interactive Adventure

MODE 2:
Professional Portfolio

The interactive adventure is called:

"Veeraj's World"

The guide character is named:

"Teddy"

Never refer to Teddy as "the robot" inside user-facing UI.

Teddy is a cute small digital character with:

- small body
- oversized/simple face
- tiny arms
- tiny legs
- expressive eyes
- animated mouth
- blinking
- walking
- jumping
- emotional reactions
- talking animation

Teddy should feel like a character, not a generic chatbot.

==================================================
ADVENTURE FLOW
==================================================

The intended experience is:

1. Completely dark screen.

2. A small warm yellow/orange light begins glowing.

3. The warm glow gradually expands.

4. Something falls from above into the scene.

5. The welcome environment becomes visible.

6. Glowing 3D typography appears:

WELCOME

7. Camera slowly approaches the welcome typography.

8. The camera moves toward:

HELLO

9. Teddy climbs over the "HELLO" typography.

10. Teddy wiggles his tiny hands.

11. Teddy says:

"Hey, I'm Teddy. What do you want to explore?"

12. Particles gather and form interconnected nodes.

13. The nodes transform into floating 3D bricks.

14. Each brick represents one destination.

Initial destinations:

PROJECTS
AI / ML
ARCHITECTURE
MOTION

More destinations may be added later.

15. Hovering over a brick causes Teddy to react emotionally and display a contextual one-line phrase.

16. If the user keeps hovering but selects nothing, Teddy gradually becomes:

neutral
→ confused
→ sad
→ crying

17. Eventually Teddy hides/jumps behind the WELCOME/HELLO typography.

18. If the user selects a brick, Teddy jumps onto the selected brick.

19. The brick/world transition animation plays.

20. The user enters a reusable board environment.

21. The board displays small project cards.

22. The board can contain more cards than fit visually, so it supports an internal scroll area.

23. Clicking a project card expands/transforms the card into a paper/document-style detailed view.

24. The project paper displays:

- project name
- description
- problem
- solution
- technology icons
- GitHub link
- Live link only where a real deployment exists

25. The paper closes back into the card.

26. The board has an obvious red close/exit control.

27. Hovering the exit control triggers Teddy's emotional reaction.

Example:

"Are you going this soon?"

28. The adventure stores the user's entry timestamp.

29. When the user interacts with the exit control, Teddy can calculate elapsed adventure time.

Example:

"Going so soon? It's only been 37 seconds."

30. If elapsed time is greater than 10 minutes:

"Bye byee! Let's meet again."

31. The adventure then transitions to an exit portal.

32. Clicking the portal exits Veeraj's World.

33. The user enters the professional portfolio.

34. The professional portfolio contains a small floating portal entry point.

35. The portal includes text such as:

"Wanna go on another adventure?"

36. Clicking it returns the user to Veeraj's World.

==================================================
ARCHITECTURAL PRINCIPLE
==================================================

The interactive adventure must be modular.

Do not tightly couple:

Teddy
World
Bricks
Board
Project data
Exit system
Portal system

Each module must expose a small, documented API.

Prefer:

props
callbacks
typed event contracts
data-driven configuration

over direct imports between unrelated modules.

==================================================
IMPORTANT INTEGRATION RULE
==================================================

Every module is part of a larger system.

An agent must NOT assume its module is the entire application.

Every implementation must include:

- exact files created
- exact files modified
- public component API
- exported types
- callbacks/events
- expected inputs
- expected outputs
- integration instructions
- dependencies
- assumptions
- known limitations
- next module handoff

Each module must include its own README.md.

The README must explain:

"After this module is integrated, the next module should connect here."

==================================================
VISUAL LANGUAGE
==================================================

The adventure and professional portfolio must share:

- typography
- color philosophy
- warm yellow/orange glow
- dark foundation
- subtle technical aesthetic
- restrained visual noise

The adventure may be more cinematic.

The professional portfolio should remain highly usable and recruiter-friendly.

==================================================
3D PRINCIPLE
==================================================

Use 3D where it contributes to the experience.

Preferred stack:

Three.js / React Three Fiber where appropriate.

Framer Motion for normal UI transitions.

GSAP may be introduced for complex timeline/scroll choreography if justified.

Do not introduce heavy 3D assets unnecessarily.

Prefer procedural geometry, low-poly assets, SVGs, CSS and lightweight materials where possible.

The site must have graceful fallback/reduced-motion behavior.

==================================================
PERFORMANCE
==================================================

The adventure must not make the professional portfolio unusable.

Consider:

lazy loading
code splitting
dynamic imports
low-poly geometry
bounded particle counts
device-aware quality
reduced motion
cleanup of animation frames
cleanup of event listeners

==================================================
DO NOT INVENT
==================================================

Never invent:

project features
technologies
deployment URLs
personal information
achievements
metrics

Use existing project data wherever possible.

==================================================
CURRENT PORTFOLIO
==================================================

The existing portfolio remains the source of truth for current project content and professional sections.

Do not delete or replace the existing portfolio unless a module explicitly owns that responsibility.

The current implementation already has centralized project data and reusable components.

==================================================
MODULE HANDOFF
==================================================

Every module must finish with:

MODULE STATUS

FILES CREATED

FILES MODIFIED

PUBLIC API

EVENTS / CALLBACKS

DEPENDENCIES

INTEGRATION STEPS

NEXT MODULE

KNOWN LIMITATIONS

Do not claim a module is complete unless it can be run/tested independently according to its README.