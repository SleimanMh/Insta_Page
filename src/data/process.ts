// Content for the process story, the expertise list and the illustrative estimate.
// Everything a visitor reads lives in data and HTML; the 3D scene only illustrates it.

export interface Stage {
  id: string;
  num: string;
  name: string;
  heading: string;
  body: string;
  deliverables: string[];
}

export const STAGES: Stage[] = [
  {
    id: 'discover', num: '01', name: 'Discover',
    heading: 'Understand what matters.',
    body: 'We start with your goals, your users and your constraints, and turn a loose brief into a scoped, prioritised plan.',
    deliverables: ['Goals and requirements', 'Product scope', 'Delivery roadmap'],
  },
  {
    id: 'design', num: '02', name: 'Design',
    heading: 'Give the idea a clear form.',
    body: 'We shape the journeys, interfaces and interactions that make your product feel effortless.',
    deliverables: ['User journeys', 'UI and UX design', 'Interactive prototype'],
  },
  {
    id: 'build', num: '03', name: 'Build',
    heading: 'Make every interaction work.',
    body: 'Engineers turn the approved design into dependable software, tested as it is built.',
    deliverables: ['Frontend and backend', 'Custom software', 'Testing and quality'],
  },
  {
    id: 'connect', num: '04', name: 'Connect',
    heading: 'Connect the intelligence.',
    body: 'We link your product to the systems it depends on and automate repetitive work. AI is added where it clearly helps, not by default.',
    deliverables: ['API integrations', 'Workflow automation', 'AI where useful'],
  },
  {
    id: 'launch', num: '05', name: 'Launch',
    heading: 'Bring it into the world.',
    body: 'We deploy to reliable cloud infrastructure with automated pipelines, so every release is routine rather than risky.',
    deliverables: ['Cloud deployment', 'Delivery pipelines', 'Production readiness'],
  },
  {
    id: 'evolve', num: '06', name: 'Evolve',
    heading: 'Keep making it better.',
    body: 'After launch we monitor, maintain and improve the product as your users and your business grow.',
    deliverables: ['Monitoring', 'Maintenance', 'Continuous improvement'],
  },
];

export interface Capability {
  id: string;
  name: string;
  stage: number;
  desc: string;
  price?: [number, number];
  weeks?: [number, number];
  monthly?: [number, number];
}

// Each capability belongs to a process stage, and so to one layer of the prism.
// Prices are illustrative EUR ranges for a "standard" scope, to be replaced by real pricing rules.
export const CAPABILITIES: Capability[] = [
  { id: 'strategy', name: 'Product strategy', stage: 0, desc: 'Workshops, research and a prioritised roadmap.', price: [3000, 5000], weeks: [1, 2] },
  { id: 'uxui', name: 'UI and UX design', stage: 1, desc: 'Journeys, interface design and a clickable prototype.', price: [6000, 12000], weeks: [2, 4] },
  { id: 'web', name: 'Web development', stage: 2, desc: 'Websites and web applications, frontend and backend.', price: [12000, 30000], weeks: [4, 8] },
  { id: 'software', name: 'Custom software', stage: 2, desc: 'Internal tools, platforms and mobile applications.', price: [20000, 50000], weeks: [6, 12] },
  { id: 'integrations', name: 'Integrations and automation', stage: 3, desc: 'APIs, payments, CRMs and automated workflows.', price: [4000, 12000], weeks: [1, 4] },
  { id: 'ai', name: 'AI solutions', stage: 3, desc: 'Assistants, search and automation, where they genuinely help.', price: [8000, 20000], weeks: [2, 5] },
  { id: 'devops', name: 'Deployment and DevOps', stage: 4, desc: 'Cloud setup, delivery pipelines and launch readiness.', price: [3000, 8000], weeks: [1, 2] },
  { id: 'care', name: 'Monitoring and maintenance', stage: 5, desc: 'Uptime monitoring, updates, support and improvements.', monthly: [600, 2000] },
];

export interface Size { id: string; name: string; desc: string; k: number }

export const SIZES: Size[] = [
  { id: 'focused', name: 'Focused', desc: 'A small, well-defined scope', k: 0.6 },
  { id: 'standard', name: 'Standard', desc: 'A typical first release', k: 1 },
  { id: 'extended', name: 'Extended', desc: 'Larger scope or several platforms', k: 1.7 },
];
