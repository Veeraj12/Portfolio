/**
 * Original architecture/workflow artifacts supplied by Veeraj.
 * These are intentionally consumed only by the Adventure architecture destination;
 * the professional landing page stays concise and recruiter-first.
 */
export interface ArchitectureCaseStudy {
  id: string;
  title: string;
  context: string;
  tags: string[];
  previewImage: string;
  problem: string;
  originalArchitecture: string;
  bottlenecks: string[];
  proposedImprovement: string;
  reasoning: string;
  tradeoffs: string[];
  finalArchitecture: string;
  diagramsReady: boolean;
}

export const architectureCaseStudies: ArchitectureCaseStudy[] = [
  {
    id: "eco-bin",
    title: "Eco Bin — E-Waste Management",
    context: "Web application workflow · Original Canva export",
    tags: ["Web Application", "User Flows", "E-Waste"],
    previewImage: "/adventure-archive/eco-bin.png",
    problem: "Make the user journey for responsible e-waste reuse and recycling clear across people, products and organisations.",
    originalArchitecture: "The supplied flowchart connects registration and profile setup to a dashboard, second-hand product discovery, resale, recycling, eco tokens and recycling-status tracking.",
    bottlenecks: ["Several user actions share one dense diagram", "The organisation hand-off is a key part of the recycling journey"],
    proposedImprovement: "Present the existing flow as a readable exhibit and explain its main journey without redrawing the original artifact.",
    reasoning: "The diagram communicates both user-facing features and the link between individuals and recycling organisations.",
    tradeoffs: ["The original is a concept/workflow diagram; it should not be presented as proof that every flow was implemented."],
    finalArchitecture: "Original design preserved as supplied; description clarifies the intended application workflow.",
    diagramsReady: true,
  },
  {
    id: "result-analyzer-flow",
    title: "Result Analyzer — Workflow Evolution",
    context: "Enrollment and result retrieval automation · Flowchart",
    tags: ["Automation", "Workflow", "Excel"],
    previewImage: "/adventure-archive/result-analyzer.png",
    problem: "Reduce repeated manual steps involved in retrieving enrollment results and organising the returned data.",
    originalArchitecture: "The supplied diagrams map a simple enrollment form, CAPTCHA/manual interaction, result retrieval, local storage and Excel output, alongside a proposed multi-enrollment Excel integration.",
    bottlenecks: ["The flow includes manual interaction with the source portal", "The Excel integration is labelled as planned work in the original design"],
    proposedImprovement: "Show the initial and extended workflow as design history, keeping proposed functionality clearly distinguished from completed functionality.",
    reasoning: "The multiple flowcharts document the evolution from a single-enrollment path toward a batch-oriented workflow.",
    tradeoffs: ["The diagrams describe workflow intent and do not independently verify current portal compatibility."],
    finalArchitecture: "Original Result Analyzer diagram preserved. A separate flowchart file is also included in the exhibit assets.",
    diagramsReady: true,
  },
  {
    id: "result-analyzer-detailed-flow",
    title: "Result Analyzer — Detailed Flowcharts",
    context: "Process states and Excel integration · Original SVG export",
    tags: ["Process Design", "Data Extraction", "Excel"],
    previewImage: "/adventure-archive/result-analyzer-flow.svg",
    problem: "Document the detailed sequence of user, portal and file-processing steps for the result retrieval workflow.",
    originalArchitecture: "The original SVG contains the dummy module, main module, completed flow and proposed Excel integration flow.",
    bottlenecks: ["Dense labels require zooming to inspect", "Completed and proposed paths must remain distinct"],
    proposedImprovement: "Keep the vector source intact so visitors can inspect it at high resolution, paired with a concise overview.",
    reasoning: "A vector artifact preserves readability when enlarged and makes the process evolution easier to inspect.",
    tradeoffs: ["The source diagram is information-dense; the portfolio should not imply every label is readable at thumbnail size."],
    finalArchitecture: "Original SVG preserved in the Adventure archive.",
    diagramsReady: true,
  },
  {
    id: "system-architecture",
    title: "System Architecture — Processing Pipeline",
    context: "Layered application, ingestion and AI/ML design · Original slide",
    tags: ["System Design", "Data Ingestion", "AI/ML", "Async Processing"],
    previewImage: "/adventure-archive/system-architecture.png",
    problem: "Communicate how user-facing services, data ingestion, processing, AI/ML and storage interact in one system.",
    originalArchitecture: "The supplied slide separates the frontend/backend, processing and AI/ML layers, storage, consumer services, data sources, scheduling and message-queue flow.",
    bottlenecks: ["Many component relationships compete for attention in one slide", "Async boundaries need careful reading"],
    proposedImprovement: "Present the original design at full size with a concise description of the major layers.",
    reasoning: "The layered view makes responsibilities and data movement visible without hiding the integration points.",
    tradeoffs: ["This is a design artifact; the diagram alone does not establish that every named service was deployed."],
    finalArchitecture: "Original architecture slide preserved without altering its technical content.",
    diagramsReady: true,
  },
  {
    id: "webseekers-technical-approach",
    title: "WebSeekers — Technical Approach",
    context: "SIH 2026 technical approach and layered stack · Original slide",
    tags: ["System Architecture", "Data Pipeline", "ML Workflow"],
    previewImage: "/adventure-archive/webseekers-technical-approach.png",
    problem: "Show the relationship between the technology stack and a six-layer data-processing workflow.",
    originalArchitecture: "The supplied slide groups the frontend, backend, database, AI/ML and DevOps stack alongside a system flow with data sources, validation, processing and results.",
    bottlenecks: ["The slide combines stack inventory and process flow", "Small annotations benefit from a full-resolution viewer"],
    proposedImprovement: "Keep the source slide intact and let visitors zoom into the stack and flow independently through the image viewer.",
    reasoning: "The combined view provides both implementation context and an end-to-end picture of the proposed system.",
    tradeoffs: ["Technology labels represent the presented approach and should not be interpreted as proof of production deployment."],
    finalArchitecture: "Original WebSeekers technical approach slide preserved.",
    diagramsReady: true,
  },
  {
    id: "polarlink-flow",
    title: "PolarLink — End-to-End Flow",
    context: "SIH 2026 · Expedition logistics and emergency workflow",
    tags: ["Offline-First", "QR Tracking", "Emergency Response"],
    previewImage: "/adventure-archive/polarlink-flow.png",
    problem: "Coordinate expedition planning, cargo hand-offs, station inventory and emergency escalation across remote operations.",
    originalArchitecture: "The original slide maps HQ planning, QR-tagged cargo, station verification, inventory, SOS, muster, evacuation and consumption forecasting.",
    bottlenecks: ["Several operational roles interact across the flow", "Connectivity-dependent and offline paths need to remain distinguishable"],
    proposedImprovement: "Present the workflow as an original design exhibit with the offline-first and emergency-response concepts highlighted in the case-study text.",
    reasoning: "The end-to-end view ties logistics operations to incident response and resupply decisions.",
    tradeoffs: ["The slide communicates the proposed workflow and does not claim that satellite hardware integrations are production-ready."],
    finalArchitecture: "Original PolarLink flow diagram preserved.",
    diagramsReady: true,
  },
  {
    id: "polarlink-technical-architecture",
    title: "PolarLink — Technical Architecture",
    context: "SIH 2026 · Technical layers and offline operations",
    tags: ["FastAPI", "PostgreSQL", "Redis", "Decision Support"],
    previewImage: "/adventure-archive/polarlink-technical-architecture.png",
    problem: "Describe a multi-role system for expedition planning, cargo custody, station operations and decision support when connectivity is unreliable.",
    originalArchitecture: "The supplied architecture groups the interface, backend services, data layer, AI/decision engine, edge nodes and external APIs.",
    bottlenecks: ["Offline edge operation adds synchronisation complexity", "The design spans operational services and analytical decision support"],
    proposedImprovement: "Show the architecture at full resolution and explain the responsibilities of each layer without inventing implementation details beyond the slide.",
    reasoning: "Separating operational services, data, decision support and edge operation makes the proposed system easier to discuss.",
    tradeoffs: ["The diagram is a proposed technical approach; actual implementation status should be described separately from the design."],
    finalArchitecture: "Original PolarLink technical architecture slide preserved.",
    diagramsReady: true,
  },
];
