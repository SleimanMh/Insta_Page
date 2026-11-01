import * as THREE from 'three';
import logoUrl from '../assets/brand/logo-horizontal.png';
import { STAGES } from '../data/process';
import { palette } from '../theme';

// The product panel's artwork: one glass card per stage, plus the finished product.
// Each card carries the logo, the stage, a short headline with its second line in champagne,
// a small flow, two illustrations of the stage's work, its deliverables and a link.
// Drawn into canvases in the brand's ivory, graphite, champagne and lavender.

const W = 800, H = 1200, PAD = 60;
const DIM = 'rgba(238,231,219,.55)', FAINT = 'rgba(238,231,219,.16)', LINE = 'rgba(238,231,219,.2)';
// the palette's colours, refreshed before every paint so a palette switch repaints the cards
let P = palette.css, INK = P['--ink'], SOFT = P['--ink-2'], GOLD = P['--gold'], LAV = P['--lav'];
const readPalette = () => { P = palette.css; INK = P['--ink']; SOFT = P['--ink-2']; GOLD = P['--gold']; LAV = P['--lav']; };
/** the card being drawn takes its stage's colour for the headline, the flow, the rim and the link */
let ACC = GOLD;
const alpha = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const FONT = '"Albert Sans", ui-sans-serif, system-ui, sans-serif';

type Ctx = CanvasRenderingContext2D;

const HEAD: Record<string, [string, string, string]> = {
  discover: ['From question', 'to clear plan.', 'Goals, users and a prioritised roadmap.'],
  design: ['From vision', 'to interface.', 'Journeys, interfaces and interactions.'],
  build: ['From design', 'to working code.', 'Dependable software, tested as it is built.'],
  connect: ['From systems', 'to one flow.', 'Integrations, automation and AI where it helps.'],
  launch: ['From staging', 'to the world.', 'Reliable cloud, routine releases.'],
  evolve: ['From launch', 'to always better.', 'Monitoring, care and steady improvement.'],
};

function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function text(g: Ctx, s: string, x: number, y: number, size: number, color = INK, weight = 300, spacing = 0) {
  g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color;
  (g as Ctx & { letterSpacing: string }).letterSpacing = `${spacing}px`;
  g.fillText(s, x, y);
  (g as Ctx & { letterSpacing: string }).letterSpacing = '0px';
}
function bar(g: Ctx, x: number, y: number, w: number, h = 8, color = FAINT) { g.fillStyle = color; rr(g, x, y, w, h, h / 2); g.fill(); }
function stroke(g: Ctx, color = LINE, width = 2) { g.strokeStyle = color; g.lineWidth = width; g.stroke(); }
function dot(g: Ctx, x: number, y: number, r: number, color: string) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function ring(g: Ctx, x: number, y: number, r: number, color = SOFT, width = 2) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); stroke(g, color, width); }
function arrow(g: Ctx, x: number, y: number, color = SOFT, s = 1) {
  g.beginPath(); g.moveTo(x - 14 * s, y); g.lineTo(x + 12 * s, y); g.moveTo(x + 2 * s, y - 10 * s); g.lineTo(x + 12 * s, y); g.lineTo(x + 2 * s, y + 10 * s);
  g.lineCap = 'round'; g.lineJoin = 'round'; stroke(g, color, 2.4);
}
function card(g: Ctx, x: number, y: number, w: number, h: number) {
  rr(g, x, y, w, h, 16); g.fillStyle = 'rgba(255,255,255,.025)'; g.fill(); stroke(g, 'rgba(238,231,219,.22)', 2);
}
function cross(g: Ctx, x: number, y: number, w: number, h: number) {
  rr(g, x, y, w, h, 6); stroke(g, 'rgba(238,231,219,.45)', 2);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); stroke(g, 'rgba(238,231,219,.35)', 1.6);
}
function hills(g: Ctx, x: number, y: number, w: number, h: number, color = 'rgba(167,156,224,.55)') {
  g.save(); rr(g, x, y, w, h, 6); g.clip();
  g.fillStyle = '#1D1C22'; g.fillRect(x, y, w, h);
  g.beginPath(); g.moveTo(x, y + h);
  for (let i = 0; i <= 20; i++) { const u = i / 20; g.lineTo(x + u * w, y + h * (.75 - .38 * Math.exp(-Math.pow((u - .62) / .16, 2)) - .2 * Math.exp(-Math.pow((u - .25) / .14, 2)))); }
  g.lineTo(x + w, y + h); g.closePath(); g.fillStyle = color; g.fill();
  g.restore(); rr(g, x, y, w, h, 6); stroke(g, 'rgba(238,231,219,.35)', 2);
}

/** The glass card every stage shares. */
function base(g: Ctx, logo: HTMLImageElement | null, label: string, head: [string, string, string]) {
  g.clearRect(0, 0, W, H);
  rr(g, 6, 6, W - 12, H - 12, 46);
  const bg = g.createLinearGradient(0, 0, W * .4, H); bg.addColorStop(0, P['--bg-2']); bg.addColorStop(1, P['--bg']);
  g.fillStyle = bg; g.fill();
  // a polished champagne rim, brightest where it catches the light
  const rim = g.createLinearGradient(0, 0, W, H);
  rim.addColorStop(0, alpha(ACC, .95)); rim.addColorStop(.5, alpha(GOLD, .5)); rim.addColorStop(1, alpha(ACC, .85));
  g.strokeStyle = rim; g.lineWidth = 4; g.stroke();
  rr(g, 14, 14, W - 28, H - 28, 40); stroke(g, 'rgba(255,255,255,.05)', 2);
  // soft sheen across the glass
  const sheen = g.createLinearGradient(0, 0, W, H * .5); sheen.addColorStop(0, 'rgba(255,255,255,.05)'); sheen.addColorStop(.5, 'rgba(255,255,255,0)');
  rr(g, 6, 6, W - 12, H - 12, 46); g.fillStyle = sheen; g.fill();

  if (logo && logo.complete && logo.naturalWidth) { const h = 44; g.drawImage(logo, PAD, 66, h * logo.naturalWidth / logo.naturalHeight, h); }
  else text(g, 'refract', PAD, 100, 44, INK, 400);
  text(g, label, PAD, 196, 19, 'rgba(238,231,219,.6)', 500, 6);
  text(g, head[0], PAD, 284, 72, INK, 300, -1);
  text(g, head[1], PAD, 364, 72, ACC, 300, -1);
  text(g, head[2], PAD, 424, 27, SOFT, 300);
}

/** A small flow across the card: start, the stage in progress, the outcome. */
function flow(g: Ctx, y: number) {
  ring(g, PAD + 14, y, 13, SOFT);
  g.beginPath(); g.moveTo(PAD + 28, y); g.lineTo(PAD + 170, y); stroke(g, SOFT, 2);
  dot(g, PAD + 186, y, 14, ACC);
  g.beginPath(); g.moveTo(PAD + 202, y); g.lineTo(PAD + 330, y); stroke(g, SOFT, 2); arrow(g, PAD + 330, y, SOFT);
  dot(g, PAD + 372, y, 13, LAV);
  g.beginPath(); g.moveTo(PAD + 386, y); g.bezierCurveTo(PAD + 450, y, PAD + 450, y + 34, PAD + 510, y + 34); g.bezierCurveTo(PAD + 560, y + 34, PAD + 560, y, PAD + 600, y); stroke(g, SOFT, 2);
  ring(g, W - PAD - 34, y, 30, SOFT, 2); ring(g, W - PAD - 34, y, 18, INK, 3); dot(g, W - PAD - 34, y, 6, INK);
}

function footer(g: Ctx, items: string[], link: string, y: number) {
  dot(g, PAD + 12, y, 11, ACC); dot(g, PAD + 46, y, 11, LAV); dot(g, PAD + 80, y, 11, '#3A3A40');
  g.beginPath(); g.moveTo(PAD + 112, y); g.lineTo(W - PAD, y); stroke(g, FAINT, 2);
  items.forEach((it, i) => {
    const ry = y + 36 + i * 70;
    g.beginPath(); g.moveTo(PAD, ry); g.lineTo(W - PAD, ry); stroke(g, LINE, 2);
    text(g, it, PAD + 4, ry + 46, 28, INK, 400);
    arrow(g, W - PAD - 18, ry + 36, SOFT);
  });
  const ly = y + 36 + items.length * 70;
  g.beginPath(); g.moveTo(PAD, ly); g.lineTo(W - PAD, ly); stroke(g, LINE, 2);
  text(g, link, PAD + 4, ly + 58, 26, ACC, 400);
  g.font = `400 26px ${FONT}`; const tw = g.measureText(link).width;
  g.beginPath(); g.moveTo(PAD + tw + 22, ly + 60); g.lineTo(PAD + tw + 40, ly + 42); g.moveTo(PAD + tw + 26, ly + 42); g.lineTo(PAD + tw + 40, ly + 42); g.lineTo(PAD + tw + 40, ly + 56);
  stroke(g, ACC, 2.4);
}

// The two illustrations for each stage, in a wide card (left) and a narrow one (right).
const L = { x: PAD, y: 520, w: 412, h: 300 }, R = { x: PAD + 432, y: 520, w: W - 2 * PAD - 432, h: 300 };
const ILLUSTRATE: Record<string, (g: Ctx) => void> = {
  discover(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    text(g, 'Goals', L.x + 28, L.y + 52, 26, INK, 400);
    ['Who it is for', 'What success means', 'Must haves', 'Constraints'].forEach((t, i) => {
      const y = L.y + 96 + i * 50, on = i < 2;
      rr(g, L.x + 28, y - 18, 24, 24, 6); if (on) { g.fillStyle = 'rgba(214,184,138,.2)'; g.fill(); } stroke(g, on ? GOLD : SOFT, 2);
      if (on) { g.beginPath(); g.moveTo(L.x + 34, y - 6); g.lineTo(L.x + 39, y); g.lineTo(L.x + 47, y - 12); stroke(g, GOLD, 2.4); }
      text(g, t, L.x + 68, y + 2, 22, on ? INK : DIM, 300);
    });
    text(g, 'Roadmap', R.x + 24, R.y + 52, 22, INK, 400);
    [[0, .35, GOLD], [.25, .6, LAV], [.45, .9, 'rgba(238,231,219,.4)'], [.7, 1, 'rgba(238,231,219,.25)']].forEach(([a, b, c], i) => {
      const x0 = R.x + 24, w = R.w - 48; bar(g, x0 + (a as number) * w, R.y + 90 + i * 46, ((b as number) - (a as number)) * w, 14, c as string);
    });
  },
  design(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    ring(g, L.x + 30, L.y + 28, 8, SOFT); bar(g, L.x + 48, L.y + 24, 70, 6, 'rgba(238,231,219,.4)');
    cross(g, L.x + 24, L.y + 52, L.w - 48, 92);
    bar(g, L.x + 24, L.y + 166, 120, 7, 'rgba(238,231,219,.5)'); bar(g, L.x + 24, L.y + 184, 90, 7, 'rgba(238,231,219,.3)'); bar(g, L.x + 24, L.y + 204, 70, 12, GOLD);
    cross(g, L.x + L.w - 112, L.y + 158, 88, 62);
    [0, 1, 2].forEach(i => { const x = L.x + 24 + i * 124; rr(g, x, L.y + 236, 116, 52, 6); stroke(g, 'rgba(238,231,219,.35)', 2); ring(g, x + 58, L.y + 254, 10, SOFT); bar(g, x + 34, L.y + 274, 48, 5, 'rgba(238,231,219,.3)'); });
    ring(g, R.x + 24, R.y + 28, 8, SOFT); bar(g, R.x + 42, R.y + 24, 60, 6, 'rgba(238,231,219,.4)');
    hills(g, R.x + 18, R.y + 48, R.w - 36, 92);
    [0, 1, 2].forEach(i => { const y = R.y + 170 + i * 36, on = i === 1; ring(g, R.x + 30, y, 10, on ? GOLD : SOFT); bar(g, R.x + 52, y - 4, 70, 7, on ? GOLD : 'rgba(238,231,219,.35)'); });
    rr(g, R.x + R.w - 74, R.y + R.h - 52, 52, 32, 16); g.fillStyle = GOLD; g.fill(); arrow(g, R.x + R.w - 48, R.y + R.h - 36, '#1A1814', .8);
  },
  build(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    [GOLD, LAV, '#3A3A40'].forEach((c, i) => dot(g, L.x + 30 + i * 22, L.y + 28, 6, c));
    const rows: [number, number, string][] = [[0, 140, LAV], [24, 180, 'rgba(238,231,219,.55)'], [24, 120, GOLD], [48, 160, 'rgba(238,231,219,.35)'], [48, 100, LAV], [24, 200, 'rgba(238,231,219,.55)'], [0, 90, GOLD], [0, 150, 'rgba(238,231,219,.35)']];
    rows.forEach(([ind, w, c], i) => { text(g, String(i + 1).padStart(2, '0'), L.x + 26, L.y + 74 + i * 27, 15, 'rgba(238,231,219,.3)', 400); bar(g, L.x + 66 + ind, L.y + 64 + i * 27, w, 9, c); });
    text(g, 'Tests', R.x + 24, R.y + 52, 22, INK, 400);
    ['Unit', 'Interface', 'End to end'].forEach((t, i) => {
      const y = R.y + 102 + i * 54; ring(g, R.x + 34, y - 6, 12, GOLD);
      g.beginPath(); g.moveTo(R.x + 28, y - 6); g.lineTo(R.x + 33, y - 1); g.lineTo(R.x + 41, y - 12); stroke(g, GOLD, 2.2);
      text(g, t, R.x + 58, y + 1, 20, SOFT, 300);
    });
    bar(g, R.x + 24, R.y + R.h - 40, R.w - 48, 10, 'rgba(214,184,138,.25)'); bar(g, R.x + 24, R.y + R.h - 40, (R.w - 48) * .86, 10, GOLD);
  },
  connect(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
    const nodes: [number, number, string][] = [[L.x + 70, L.y + 70, GOLD], [L.x + L.w - 70, L.y + 66, LAV], [L.x + 74, L.y + L.h - 64, SOFT], [L.x + L.w - 66, L.y + L.h - 70, GOLD]];
    nodes.forEach(([x, y, c]) => { g.beginPath(); g.moveTo(cx, cy); g.bezierCurveTo((cx + x) / 2, cy, (cx + x) / 2, y, x, y); stroke(g, c === SOFT ? 'rgba(238,231,219,.35)' : c, 2); g.fillStyle = '#121215'; g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); ring(g, x, y, 18, c, 2); dot(g, x, y, 6, c); });
    rr(g, cx - 46, cy - 34, 92, 68, 14); g.fillStyle = P['--bg-2']; g.fill(); stroke(g, GOLD, 2.4); bar(g, cx - 26, cy - 6, 52, 8, INK); bar(g, cx - 26, cy + 10, 34, 6, 'rgba(238,231,219,.4)');
    text(g, 'Linked', R.x + 24, R.y + 52, 22, INK, 400);
    [['Payments', GOLD], ['CRM', GOLD], ['AI assist', LAV]].forEach(([t, c], i) => { const y = R.y + 104 + i * 54; dot(g, R.x + 32, y - 7, 7, c); text(g, t, R.x + 52, y, 20, SOFT, 300); });
  },
  launch(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    text(g, 'Pipeline', L.x + 28, L.y + 52, 24, INK, 400);
    ['Build', 'Test', 'Deploy'].forEach((t, i) => {
      const x = L.x + 52 + i * 150, y = L.y + 128;
      if (i < 2) { g.beginPath(); g.moveTo(x + 20, y); g.lineTo(x + 130, y); stroke(g, GOLD, 2.4); }
      dot(g, x, y, 16, GOLD); g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x - 2, y + 5); g.lineTo(x + 7, y - 6); stroke(g, '#1A1814', 2.6);
      text(g, t, x - 26, y + 52, 20, SOFT, 300);
    });
    bar(g, L.x + 28, L.y + 232, L.w - 56, 12, 'rgba(214,184,138,.2)'); bar(g, L.x + 28, L.y + 232, L.w - 56, 12, GOLD);
    text(g, 'Released', L.x + 28, L.y + 278, 19, DIM, 400);
    rr(g, R.x + 24, R.y + 30, 100, 38, 19); g.fillStyle = 'rgba(214,184,138,.16)'; g.fill(); dot(g, R.x + 46, R.y + 49, 7, GOLD); text(g, 'Live', R.x + 62, R.y + 57, 20, INK, 400);
    g.beginPath(); g.arc(R.x + R.w / 2, R.y + 190, 60, -Math.PI / 2, Math.PI * 1.45); stroke(g, GOLD, 8);
    g.beginPath(); g.arc(R.x + R.w / 2, R.y + 190, 60, Math.PI * 1.45, Math.PI * 1.5); stroke(g, 'rgba(238,231,219,.2)', 8);
    dot(g, R.x + R.w / 2, R.y + 190, 8, INK);
  },
  evolve(g) {
    card(g, L.x, L.y, L.w, L.h); card(g, R.x, R.y, R.w, R.h);
    text(g, 'Product health', L.x + 28, L.y + 52, 24, INK, 400);
    [0, 1, 2, 3].forEach(i => { g.beginPath(); g.moveTo(L.x + 28, L.y + 100 + i * 50); g.lineTo(L.x + L.w - 28, L.y + 100 + i * 50); stroke(g, 'rgba(238,231,219,.08)', 2); });
    const pts = [.25, .32, .3, .42, .4, .55, .52, .66, .74, .82];
    g.beginPath(); pts.forEach((v, i) => { const x = L.x + 28 + (i / (pts.length - 1)) * (L.w - 56), y = L.y + 260 - v * 170; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); stroke(g, GOLD, 3.4);
    const lx = L.x + L.w - 28, ly = L.y + 260 - .82 * 170; dot(g, lx, ly, 8, GOLD); ring(g, lx, ly, 16, 'rgba(214,184,138,.5)');
    text(g, 'Next', R.x + 24, R.y + 52, 22, INK, 400);
    ['Faster search', 'New step', 'Fixes'].forEach((t, i) => { const y = R.y + 102 + i * 54, on = i < 2; ring(g, R.x + 34, y - 6, 12, on ? GOLD : SOFT); if (on) { g.beginPath(); g.moveTo(R.x + 28, y - 6); g.lineTo(R.x + 33, y - 1); g.lineTo(R.x + 41, y - 12); stroke(g, GOLD, 2.2); } text(g, t, R.x + 58, y + 1, 20, on ? SOFT : DIM, 300); });
  },
};

function stageCard(g: Ctx, logo: HTMLImageElement | null, i: number) {
  const s = STAGES[i];
  ACC = palette.stages[i];
  base(g, logo, `${s.num} / ${s.name}`.toUpperCase(), HEAD[s.id]);
  flow(g, 474);
  ILLUSTRATE[s.id](g);
  footer(g, s.deliverables, `Explore the ${s.name.toLowerCase()} stage`, 850);
}

/** The finished product, shown inside the re-formed pyramid. */
function finalCard(g: Ctx, logo: HTMLImageElement | null) {
  ACC = GOLD;
  base(g, logo, 'YOUR PRODUCT', ['Products for a', 'brighter tomorrow.', 'Designed, built, launched and cared for.']);
  flow(g, 474);
  card(g, L.x, L.y, L.w + R.w + 20, L.h);
  hills(g, L.x + 24, L.y + 24, L.w + R.w - 28, 170, 'rgba(214,184,138,.55)');
  bar(g, L.x + 24, L.y + 222, 260, 10, 'rgba(238,231,219,.5)'); bar(g, L.x + 24, L.y + 246, 180, 8, 'rgba(238,231,219,.25)');
  rr(g, L.x + L.w + R.w - 110, L.y + 222, 106, 40, 20); g.fillStyle = 'rgba(214,184,138,.16)'; g.fill(); dot(g, L.x + L.w + R.w - 88, L.y + 242, 7, GOLD); text(g, 'Live', L.x + L.w + R.w - 72, L.y + 250, 20, INK, 400);
  footer(g, ['Discover to launch', 'One coherent team', 'Ongoing care'], 'Start a project', 850);
}

export const ART_KEYS = ['discover', 'design', 'build', 'connect', 'launch', 'evolve', 'final'] as const;
export type ArtKey = typeof ART_KEYS[number];

/**
 * Paints every card once, then again when the brand font and the logo have loaded, so the canvases never
 * show fallback type for long. `onRepaint` lets the scene redraw with the finished artwork.
 */
export function makeStageArt(maxAnisotropy = 4, onRepaint?: () => void) {
  const out = {} as Record<ArtKey, THREE.CanvasTexture>;
  const canvases = {} as Record<ArtKey, HTMLCanvasElement>;
  const logo = new Image();
  const paint = () => { readPalette(); ART_KEYS.forEach((k, i) => {
    const g = canvases[k].getContext('2d')!;
    if (k === 'final') finalCard(g, logo); else stageCard(g, logo, i);
    out[k].needsUpdate = true;
  }); };
  ART_KEYS.forEach(k => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; canvases[k] = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;   // drawn in display colours; shown as is
    t.anisotropy = maxAnisotropy;
    out[k] = t;
  });
  paint();
  const fonts = document.fonts ? Promise.all(['300 72px', '400 29px', '500 19px'].map(f => document.fonts.load(`${f} "Albert Sans"`))) : Promise.resolve();
  const img = new Promise<void>(res => { logo.onload = () => res(); logo.onerror = () => res(); logo.src = logoUrl; });
  Promise.all([fonts, img]).then(() => { paint(); onRepaint?.(); }).catch(() => {});
  return { tex: out, repaint: paint };
}

/** Which two cards to blend, and how far, for a given story state. */
export function artFor(stageF: number, tr: number, complete: number): [ArtKey, ArtKey, number] {
  const k = Math.min(5, Math.floor(stageF + 1e-4));
  if (complete > 0) return ['evolve', 'final', complete];
  if (tr > 0 && k < 5) return [ART_KEYS[k], ART_KEYS[k + 1], tr];
  return [ART_KEYS[k], ART_KEYS[k], 0];
}
