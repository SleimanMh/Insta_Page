// Content for the process story and the expertise list.
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
}

// Each capability belongs to a process stage, and so to one block of the sculpture.
export const CAPABILITIES: Capability[] = [
  { id: 'strategy', name: 'Product strategy', stage: 0, desc: 'Workshops, research and a prioritised roadmap.' },
  { id: 'uxui', name: 'UI and UX design', stage: 1, desc: 'Journeys, interface design and a clickable prototype.' },
  { id: 'web', name: 'Web development', stage: 2, desc: 'Websites and web applications, frontend and backend.' },
  { id: 'software', name: 'Custom software', stage: 2, desc: 'Internal tools, platforms and mobile applications.' },
  { id: 'integrations', name: 'Integrations and automation', stage: 3, desc: 'APIs, payments, CRMs and automated workflows.' },
  { id: 'ai', name: 'AI solutions', stage: 3, desc: 'Assistants, search and automation, where they genuinely help.' },
  { id: 'devops', name: 'Deployment and DevOps', stage: 4, desc: 'Cloud setup, delivery pipelines and launch readiness.' },
  { id: 'care', name: 'Monitoring and maintenance', stage: 5, desc: 'Uptime monitoring, updates, support and improvements.' },
];
