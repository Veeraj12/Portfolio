# FINAL MASTER INTEGRATION PROMPT
# PROJECT: VEERAJ'S WORLD — INTERACTIVE DEVELOPER PORTFOLIO

You are the FINAL INTEGRATION ENGINEER for an existing Next.js developer portfolio.

Your job is NOT to build one isolated module.

Your job is to take the existing portfolio + seven independently developed modules and integrate them into ONE coherent, production-quality interactive portfolio experience.

You are the final architect.

============================================================
0. ABSOLUTE PRIORITY
============================================================

The final product must feel like ONE intentionally designed experience.

Do NOT simply place the seven modules next to each other.

You must connect them into a single continuous story.

The user should never feel:

- "this is module A"
- "now I am entering module B"
- "this component came from another developer"
- "these animations were generated independently"

Everything must feel like one world.

Preserve the existing professional portfolio while adding the interactive adventure experience.

============================================================
1. WHAT YOU HAVE BEEN GIVEN
============================================================

You will receive:

1. The existing portfolio repository.
2. ADVENTURE_CONTRACT.md
3. Module 01 — Teddy
4. Module 02 — World / Opening Scene
5. Module 03 — Destination Bricks
6. Module 04 — Adventure Board / Cards / Paper
7. Module 05 — Exit / Timer / Goodbye
8. Module 06 — Professional Portfolio Polish
9. Module 07 — Portal / Loading / Transitions
10. README.md from every module.

Treat the existing repository as the source of truth for existing portfolio functionality and project data.

Treat ADVENTURE_CONTRACT.md as the source of truth for shared interfaces, event names, types, responsibilities, and integration boundaries.

Treat each module README as the source of truth for that module's exported API and implementation details.

DO NOT assume module internals.

DO NOT blindly rewrite modules.

First inspect everything.

============================================================
2. FIRST TASK — UNDERSTAND BEFORE CODING
============================================================

Before making changes:

A. Inspect the entire existing repository.

B. Inspect ADVENTURE_CONTRACT.md.

C. Inspect all seven module READMEs.

D. Inspect the source code of all seven modules.

E. Identify:

- exported components
- exported functions
- exported types
- props
- callbacks
- events
- state requirements
- dependencies
- asset locations
- animation libraries
- styling assumptions
- routing assumptions
- browser-only APIs
- client/server boundaries
- possible dependency conflicts

F. Build a mental dependency graph.

G. Identify duplicate functionality.

H. Identify conflicting implementations.

I. Identify missing adapters.

DO NOT immediately start coding.

Understand the architecture first.

============================================================
3. IMPORTANT — DO NOT THROW AWAY GOOD WORK
============================================================

Each module was intentionally developed independently.

Do not discard an entire module just because its implementation differs from another module.

Instead:

1. preserve the best implementation,
2. create adapters where necessary,
3. normalize interfaces,
4. resolve conflicts centrally.

If two modules solve the same problem differently, choose the implementation that:

- best matches the story,
- best matches the contract,
- has the best performance,
- has the cleanest API,
- is easiest to maintain.

============================================================
4. FINAL ARCHITECTURE
============================================================

Create a clear integration layer.

The modules themselves should NOT directly control unrelated modules.

The integration layer owns:

- adventure state
- current phase
- selected destination
- selected project
- transitions
- event coordination
- Teddy reactions
- board opening
- exit sequence
- return to portfolio

Prefer a structure similar to:

app/
  page.tsx
  adventure/
    page.tsx

components/
  adventure/
    AdventureExperience.tsx
    AdventureController.tsx
    AdventureScene.tsx
    AdventureEventBus.ts
    AdventureState.ts
    adapters/
    ...

Do not blindly use this exact structure if the repository suggests a better architecture.

The important principle is:

MODULES
    ↓
INTEGRATION LAYER
    ↓
SINGLE EXPERIENCE

============================================================
5. THE STORY OF THE WEBSITE
============================================================

The final experience is called:

"Veeraj's World"

It has TWO modes.

MODE 1:
Interactive Adventure

MODE 2:
Professional Portfolio

The adventure is playful, cinematic and unusual.

The professional portfolio is polished, recruiter-friendly and practical.

They must feel like two modes of the same website.

============================================================
6. ADVENTURE ENTRY
============================================================

The normal professional portfolio contains a small floating portal.

The portal should communicate something similar to:

"Wanna go on an adventure?"

Do not make it obnoxious.

It should feel like a hidden interactive feature.

When activated:

NORMAL PORTFOLIO
        ↓
PORTAL TRANSITION
        ↓
LOADING EXPERIENCE
        ↓
ADVENTURE WORLD

============================================================
7. LOADING EXPERIENCE
============================================================

Use the loading module.

The loading experience should feel intentional rather than like a generic website spinner.

The desired concept is:

A cute dragon moving around a circular path.

Keep it lightweight.

Do not introduce a massive 3D asset solely for loading.

The loading screen should transition smoothly into the world.

============================================================
8. ADVENTURE OPENING — EXACT STORY
============================================================

When the adventure begins:

Everything is initially dark.

Almost completely black.

Then:

A tiny warm yellow/orange light begins glowing.

The glow slowly becomes stronger.

Something falls from above.

The scene should feel like entering a mysterious 3D world.

The warm light expands.

Then:

WELCOME

appears.

The word should feel physically present in the world.

Not just ordinary HTML text floating on a page.

Then the camera moves toward:

HELLO

The experience should feel cinematic.

============================================================
9. TEDDY ARRIVAL
============================================================

Teddy is the guide of this world.

IMPORTANT:

Always call the character:

"Teddy"

Do NOT repeatedly call Teddy "the robot".

Teddy is a character.

Teddy should feel alive.

Required characteristics:

- blinking
- expressive face
- talking mouth
- small arms
- small legs
- idle animation
- walking
- jumping
- waving
- happy
- sad
- confused
- surprised
- excited
- crying
- hiding
- other useful expressions if provided by the Teddy module

Teddy climbs over:

HELLO

Then Teddy wiggles his tiny hands.

Teddy says:

"Hey I am Teddy what do you want to explore"

The dialogue should feel like a character speaking.

Do not turn Teddy into a chatbot interface.

============================================================
10. DESTINATION DISCOVERY
============================================================

Particles begin appearing.

The particles form nodes.

The nodes represent destinations.

The nodes then transform into physical 3D bricks.

Four destinations:

1. Projects
2. AI/ML
3. Architecture
4. Motion

The bricks should feel like physical objects in the same world.

They should not feel like four ordinary HTML buttons.

============================================================
11. DESTINATION HOVER
============================================================

Hovering a brick should affect Teddy.

Suggested dialogue:

PROJECTS:
"Want to see what I've built?"

AI/ML:
"Ooooh... the brainy stuff."

ARCHITECTURE:
"Let's see how everything fits together."

MOTION:
"Okay... this is where things get weird."

You may improve the wording slightly if necessary, but preserve the personality.

Hover should trigger:

- Teddy expression
- Teddy reaction
- subtle brick animation
- glow
- text emphasis
- appropriate sound/visual feedback if already implemented

Do not overload the scene with effects.

============================================================
12. TEDDY DISAPPOINTMENT SYSTEM
============================================================

This is an important character interaction.

If the user keeps hovering around without selecting anything:

Teddy should progressively become disappointed.

Suggested progression:

neutral
→ confused
→ sad
→ crying

After prolonged indecision:

Teddy eventually jumps/hides behind:

WELCOME

This should be playful.

Do not make it feel like a timeout error.

The user should understand that Teddy is reacting to them.

The integration layer should coordinate this behavior.

The bricks module should NOT directly manipulate Teddy internals.

============================================================
13. DESTINATION SELECTION
============================================================

When the user selects a brick:

Teddy reacts.

Teddy jumps onto the selected brick.

The world transitions.

The selected brick becomes the focus.

The other bricks/world elements move away or transition appropriately.

Then the adventure board appears.

============================================================
14. ADVENTURE BOARD
============================================================

The board is REUSABLE.

The same board system should work for:

Projects
AI/ML
Architecture
Motion

Do NOT create four separate board implementations.

Use:

destinationId

to determine the content.

============================================================
15. PROJECT DATA
============================================================

The existing portfolio project data is the canonical source.

DO NOT invent:

- projects
- technologies
- GitHub URLs
- live URLs
- features

Reuse the repository's existing data.

If a project has:

data.live

then show a Live button.

If it does not have a real live URL:

DO NOT fabricate one.

GitHub should point to the actual repository when available.

============================================================
16. BOARD VISUALIZATION
============================================================

The board should feel like an object inside the adventure world.

It contains small project cards.

Cards should include useful information without becoming unreadable.

If there are more cards:

The BOARD itself has its own internal scroll area.

Do NOT make the entire webpage scroll just because the board contains many projects.

============================================================
17. PROJECT CARD INTERACTION
============================================================

When the user clicks a card:

The card should expand/transform into a paper/document view.

Do not simply open an unrelated modal with a sudden fade.

The transition should feel like:

CARD
  ↓
EXPAND
  ↓
PAPER

The paper should contain:

- project title
- description
- problem
- solution
- technologies
- technology icons/logos where supported
- GitHub button
- Live button only when a real live URL exists

The paper should be readable.

============================================================
18. PAPER CLOSE
============================================================

When the paper is closed:

PAPER
  ↓
CARD

The transition should feel continuous.

The user should return to the same board state.

Preserve scroll position where practical.

============================================================
19. BOARD EXIT
============================================================

The board has a red X close button.

Hovering the X should trigger Teddy's emotional response.

Teddy should look sad/concerned.

Dialogue:

"Are you going this soon?"

But this should become time-aware.

============================================================
20. ADVENTURE TIMER
============================================================

Record the adventure entry timestamp when the adventure starts.

Do NOT reset it every render.

Calculate elapsed time.

Example:

"Going so soon in 37 seconds?"

If appropriate, simplify to:

"Going so soon?"

If the user has been exploring for more than approximately 10 minutes:

"Bye byee lets meet again"

The exact wording can be polished slightly while preserving the personality.

The timer should be based on actual elapsed adventure time.

============================================================
21. EXIT SEQUENCE
============================================================

When the user confirms exit:

Do NOT immediately hard-navigate.

First:

BOARD
 ↓
TEDDY REACTION
 ↓
EXIT TRANSITION
 ↓
PORTAL
 ↓
NORMAL PORTFOLIO

The transition should feel like leaving the world.

============================================================
22. PORTAL
============================================================

The portal module should provide the visual transition.

The portal should feel connected to the same world.

Avoid generic sci-fi portal clichés.

It should use the same visual language as:

- warm glow
- dark space
- particles
- cinematic lighting
- typography
- motion

The portal should eventually return the user to the professional portfolio.

============================================================
23. NORMAL PROFESSIONAL PORTFOLIO
============================================================

The existing professional portfolio is NOT being replaced.

Preserve its existing:

- project structure
- data
- architecture section
- contact section
- navigation
- routing
- theme system
- dark/light mode
- useful functionality

Improve only where the modules/project require it.

The professional mode should remain:

- clean
- modern
- technically impressive
- recruiter-friendly
- responsive
- readable

Do NOT turn the normal portfolio into the adventure.

============================================================
24. ARCHITECTURE LAB
============================================================

Architecture diagrams should remain meaningful.

Present architecture work as case studies rather than random images.

Where possible:

Problem
 ↓
Existing Architecture
 ↓
Bottlenecks
 ↓
Improved Architecture
 ↓
Reasoning / Tradeoffs
 ↓
Final Design

Do not invent architecture details that are not present in the existing data.

============================================================
25. VISUAL LANGUAGE
============================================================

The entire website should share one design language.

Adventure:

- cinematic
- dark
- warm
- mysterious
- playful
- interactive
- spatial

Professional:

- clean
- restrained
- premium
- technical
- recruiter-friendly

Shared visual DNA:

- typography
- spacing principles
- warm accent
- motion quality
- depth
- subtle glow
- visual hierarchy

============================================================
26. AVOID GENERIC AI PORTFOLIO DESIGN
============================================================

DO NOT produce:

- generic purple gradients
- giant glowing blobs
- excessive glassmorphism
- floating React logos everywhere
- random 3D laptops
- generic AI robots
- meaningless particle explosions
- fade-up animation on every element
- excessive rounded cards
- "AI generated portfolio" aesthetic
- unnecessary neon effects
- animation for animation's sake

Every animation must have a purpose.

============================================================
27. PERFORMANCE
============================================================

This is extremely important.

The adventure must not destroy performance.

Use:

- lazy loading
- dynamic imports where appropriate
- code splitting
- bounded particle counts
- lightweight geometry
- reasonable texture sizes
- cleanup of animation loops
- cleanup of event listeners
- proper disposal of Three.js resources where applicable
- device-aware quality
- reduced-motion support

Do not load the entire adventure experience when the user is simply viewing the professional portfolio.

============================================================
28. MOBILE
============================================================

The adventure must have a mobile strategy.

Do NOT blindly shrink the desktop 3D experience.

Adapt:

- camera
- object scale
- spacing
- particle count
- board dimensions
- card layout
- touch interaction
- typography

If certain interactions cannot work identically on mobile, create an intentional mobile equivalent.

Do not leave broken hover-only interactions.

============================================================
29. ACCESSIBILITY
============================================================

Support:

- keyboard navigation
- visible focus
- semantic controls
- readable text
- reduced motion
- accessible labels
- reasonable contrast

Hover must never be the only way to understand or operate the interface.

============================================================
30. DARK / LIGHT MODE
============================================================

Preserve the existing theme system.

The normal portfolio must support the existing dark/light behavior.

The adventure may remain predominantly dark/cinematic if that is the intentional experience.

Do not break theme switching.

============================================================
31. ROUTING
============================================================

Prefer a dedicated route such as:

/adventure

for the adventure.

Normal portfolio remains accessible through:

/

or the existing route.

The user must be able to:

Portfolio
 → Adventure
 → Portfolio

repeatedly.

Re-entry must work.

Do not create routing loops.

Do not rely on a full browser refresh unless absolutely necessary.

============================================================
32. STATE MANAGEMENT
============================================================

Create one clear adventure state machine or equivalent centralized state model.

Conceptually:

loading
 ↓
intro
 ↓
selection
 ↓
destination
 ↓
board
 ↓
paper
 ↓
exit
 ↓
complete

Do not scatter critical adventure state across seven unrelated components.

The integration layer owns the state.

============================================================
33. EVENT INTEGRATION
============================================================

Use the events defined in ADVENTURE_CONTRACT.md.

Examples include:

ADVENTURE_READY
INTRO_STARTED
INTRO_COMPLETE
TEDDY_READY
DESTINATION_HOVER
DESTINATION_UNHOVER
DESTINATION_SELECTED
BOARD_OPEN
PROJECT_SELECTED
PROJECT_CLOSED
BOARD_CLOSE_HOVER
BOARD_CLOSE_SELECTED
EXIT_SEQUENCE_STARTED
PORTAL_READY
ADVENTURE_EXIT
ADVENTURE_RESTART

Do not rename events arbitrarily.

If an adapter is necessary, implement it centrally.

============================================================
34. TEDDY COORDINATION
============================================================

The integration layer should be responsible for deciding WHEN Teddy reacts.

The Teddy module is responsible for HOW Teddy renders those reactions.

Example:

DESTINATION_HOVER
        ↓
Integration layer
        ↓
Teddy expression = excited
Teddy action = wave/talk
Teddy dialogue = appropriate line

Similarly:

NO_SELECTION_TIMEOUT
        ↓
Integration layer
        ↓
Teddy confused
        ↓
Teddy sad
        ↓
Teddy crying
        ↓
Teddy hides

Do not duplicate Teddy logic inside the world or brick modules.

============================================================
35. DO NOT BREAK EXISTING DATA
============================================================

Before modifying project data:

Inspect the existing source.

Do not replace data with fake examples.

Do not remove existing projects.

Do not fabricate technology stacks.

Do not fabricate deployment links.

============================================================
36. INTEGRATION QUALITY
============================================================

After integration, test the complete story from beginning to end.

Test:

1. Open portfolio.
2. Enter adventure.
3. Loading.
4. Intro.
5. Welcome.
6. Hello.
7. Teddy arrival.
8. Teddy dialogue.
9. Destination discovery.
10. Hover each destination.
11. Wait without selecting.
12. Verify Teddy disappointment.
13. Select each destination.
14. Verify Teddy jumps.
15. Verify world transition.
16. Verify board.
17. Scroll board.
18. Hover cards.
19. Open project.
20. Verify paper.
21. Verify technology icons.
22. Verify GitHub.
23. Verify Live only when available.
24. Close paper.
25. Close board.
26. Hover close.
27. Verify time-aware Teddy dialogue.
28. Exit.
29. Portal.
30. Return to portfolio.
31. Re-enter adventure.
32. Repeat.

============================================================
37. TEST EVERY DESTINATION
============================================================

Do not only test Projects.

Test:

Projects
AI/ML
Architecture
Motion

Each must correctly resolve its content.

If one destination has no data, handle that gracefully.

Never show broken cards or undefined content.

============================================================
38. ERROR HANDLING
============================================================

The final product must fail gracefully.

Handle:

- missing project
- missing image
- missing technology icon
- missing GitHub
- missing Live URL
- unsupported device capability
- WebGL failure where applicable
- reduced motion
- navigation failure

Do not crash the entire portfolio.

============================================================
39. HYDRATION / NEXT.JS
============================================================

Pay special attention to:

- SSR vs client components
- window/document access
- Date/time access
- random particle generation
- WebGL initialization
- hydration mismatches
- browser-only APIs

Do not introduce hydration errors.

============================================================
40. CLEANUP
============================================================

Check for:

- memory leaks
- animation loops continuing after unmount
- event listeners not removed
- timers not cleared
- Three.js resources not disposed
- duplicate event subscriptions

Especially test:

Adventure → Portfolio → Adventure

multiple times.

============================================================
41. CODE QUALITY
============================================================

The final implementation must be maintainable.

Avoid:

- giant monolithic component
- duplicated destination logic
- duplicated board implementations
- duplicated Teddy logic
- magic strings everywhere
- hard-coded project data
- unnecessary global state

Prefer:

- typed interfaces
- small focused components
- central orchestration
- reusable primitives
- clear naming
- documented integration points

============================================================
42. README / DOCUMENTATION
============================================================

After integration create:

INTEGRATION_README.md

It must document:

1. final architecture
2. directory structure
3. adventure state machine
4. module integration
5. event flow
6. routing
7. project data source
8. Teddy API
9. board API
10. portal API
11. performance decisions
12. mobile strategy
13. accessibility strategy
14. known limitations
15. future improvements
16. how to run locally
17. how to build production
18. how to test the complete experience

============================================================
43. FINAL ACCEPTANCE CRITERIA
============================================================

The project is complete ONLY if:

[ ] Existing professional portfolio still works.

[ ] Adventure can be entered from portfolio.

[ ] Adventure loading works.

[ ] Opening cinematic works.

[ ] WELCOME / HELLO sequence works.

[ ] Teddy appears correctly.

[ ] Teddy can express multiple emotions.

[ ] Teddy can talk/animate.

[ ] Destination bricks appear.

[ ] Destination hover works.

[ ] Teddy reacts to hover.

[ ] No-selection disappointment works.

[ ] Destination selection works.

[ ] Teddy jumps onto selected destination.

[ ] Board appears.

[ ] Board is reusable.

[ ] Board supports scrolling.

[ ] Project cards work.

[ ] Paper expansion works.

[ ] Paper close works.

[ ] Technology information works.

[ ] GitHub links are real.

[ ] Live links only appear where real data exists.

[ ] Architecture content works.

[ ] Motion content works.

[ ] AI/ML content works.

[ ] Projects content works.

[ ] Board close interaction works.

[ ] Teddy reacts to exit.

[ ] Adventure timer works.

[ ] Time-aware goodbye works.

[ ] Exit transition works.

[ ] Portal works.

[ ] Portfolio return works.

[ ] Adventure can be re-entered.

[ ] Dark/light mode is not broken.

[ ] Mobile experience works.

[ ] Keyboard navigation works.

[ ] Reduced motion works.

[ ] No hydration errors.

[ ] No obvious memory leaks.

[ ] No console errors during normal use.

[ ] Production build succeeds.

============================================================
44. IMPORTANT FINAL RULE
============================================================

DO NOT stop after making the modules technically work.

The final goal is not:

"seven modules integrated."

The final goal is:

"A developer portfolio that feels like a single handcrafted interactive world."

The transitions, timing, camera movement, Teddy behavior, typography, board, cards, paper, portal and professional portfolio must feel like parts of the same product.

If necessary, create small integration-only components or adapters.

Do not unnecessarily rewrite completed modules.

When something conflicts with the contract:

1. inspect the contract,
2. inspect the module README,
3. inspect the implementation,
4. choose the cleanest solution,
5. document the decision.

When something is missing:

implement the smallest integration layer necessary rather than rewriting unrelated modules.

============================================================
45. FINAL DELIVERABLE
============================================================

Return the repository in a working integrated state.

Provide:

- completed integrated application
- INTEGRATION_README.md
- any necessary integration adapters
- updated package/dependency configuration
- no fake project data
- no invented URLs
- no broken routes

Then report:

1. what was integrated,
2. what was changed,
3. any conflicts that were resolved,
4. any assumptions made,
5. any remaining limitations,
6. how the final adventure flow works.

============================================================
END OF MASTER INTEGRATION PROMPT
============================================================