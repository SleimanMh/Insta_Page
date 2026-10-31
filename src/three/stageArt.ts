import * as THREE from 'three';

// The product plane's artwork for each stage: a "before" (A) and "after" (B) image per stage,
// plus the finished product. Drawn once into canvases in the brand's ivory, graphite and champagne.

const W = 600, H = 900;
const INK = '#EEE7DB', DIM = 'rgba(238,231,219,.5)', FAINT = 'rgba(238,231,219,.16)', GOLD = '#D6B88A', LAV = '#B5ACD8';
const FONT = '"Albert Sans", ui-sans-serif, system-ui, sans-serif';

type Ctx = CanvasRenderingContext2D;

function rr(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function frame(g: Ctx, solid = true) {
  g.clearRect(0, 0, W, H);
  rr(g, 6, 6, W - 12, H - 12, 34);
  // every stage sits on a dark panel so it stays legible behind glass; outline stages use a lighter, flatter one
  const bg = g.createLinearGradient(0, 0, 0, H);
  if (solid) { bg.addColorStop(0, '#17171A'); bg.addColorStop(1, '#0F0F11'); } else { bg.addColorStop(0, '#1A1A1D'); bg.addColorStop(1, '#141416'); }
  g.fillStyle = bg; g.fill();
  // a polished glass bezel: bright where it faces the light, fading along the far side
  const rim = g.createLinearGradient(0, 0, W, H);
  rim.addColorStop(0, 'rgba(255,246,232,.75)'); rim.addColorStop(.45, 'rgba(238,231,219,.28)'); rim.addColorStop(1, 'rgba(214,184,138,.5)');
  g.strokeStyle = rim; g.lineWidth = 5; g.stroke();
  rr(g, 13, 13, W - 26, H - 26, 28); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.stroke();
}
function text(g: Ctx, s: string, x: number, y: number, size: number, color = INK, weight = 300) {
  g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.fillText(s, x, y);
}
function bar(g: Ctx, x: number, y: number, w: number, h = 10, color = FAINT) { g.fillStyle = color; rr(g, x, y, w, h, h / 2); g.fill(); }
function logo(g: Ctx, x: number, y: number) {
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 11, y); g.lineTo(x + 22, y + 19); g.lineTo(x, y + 19); g.closePath(); g.stroke();
  text(g, 'refract', x + 32, y + 17, 22, INK, 400);
}
function mountains(g: Ctx, x: number, y: number, w: number, h: number, seed = 1) {
  g.save(); rr(g, x, y, w, h, 18); g.clip();
  // pale overcast sky, darker toward the top
  const sky = g.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, '#8F8D8A'); sky.addColorStop(.55, '#C9C6C0'); sky.addColorStop(1, '#5A5855');
  g.fillStyle = sky; g.fillRect(x, y, w, h);
  let r = seed * 9301 + 49297;
  const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  // a jagged ridge from midpoint displacement: rough like rock, not a wave
  const ridge = (base: number, rough: number, peakAt: number, peak: number, top: string, bottom: string) => {
    const n = 64, pts = new Array(n + 1).fill(0);
    pts[0] = 0; pts[n] = 0;
    for (let step = n; step > 1; step /= 2) for (let i = step / 2; i < n; i += step) pts[i] = (pts[i - step / 2] + pts[i + step / 2]) / 2 + (rand() - .5) * rough * step / n;
    g.beginPath(); g.moveTo(x, y + h);
    for (let i = 0; i <= n; i++) {
      const u = i / n, mass = Math.exp(-Math.pow((u - peakAt) / .22, 2)) * peak;
      g.lineTo(x + u * w, y + base - mass * h - pts[i] * h);
    }
    g.lineTo(x + w, y + h); g.closePath();
    const fill = g.createLinearGradient(0, y + base - peak * h, 0, y + h); fill.addColorStop(0, top); fill.addColorStop(1, bottom);
    g.fillStyle = fill; g.fill();
  };
  ridge(h * .62, 1.1, .78, .3, '#77746F', '#4A4845');     // far range, softened by haze
  ridge(h * .8, 1.6, .38, .62, '#2B2A28', '#121211');      // the dark peak
  ridge(h * .98, 1.2, .1, .22, '#1A1918', '#0B0B0B');      // foreground rock
  // mist pooled in the valley
  const mist = g.createLinearGradient(0, y + h * .55, 0, y + h * .85); mist.addColorStop(0, 'rgba(220,216,208,0)'); mist.addColorStop(.6, 'rgba(220,216,208,.35)'); mist.addColorStop(1, 'rgba(220,216,208,0)');
  g.fillStyle = mist; g.fillRect(x, y + h * .5, w, h * .4);
  const shine = g.createLinearGradient(x, y, x + w, y + h); shine.addColorStop(0, 'rgba(255,240,215,.12)'); shine.addColorStop(.5, 'rgba(255,240,215,0)'); g.fillStyle = shine; g.fillRect(x, y, w, h);
  g.restore();
}
function polishedUI(g: Ctx, headline: string[], live = false) {
  frame(g); logo(g, 52, 56);
  g.strokeStyle = INK; g.lineWidth = 2; [0, 8, 16].forEach(d => { g.beginPath(); g.moveTo(W - 82, 62 + d); g.lineTo(W - 56, 62 + d); g.stroke(); });
  mountains(g, 40, 120, W - 80, 380);
  headline.forEach((l, i) => text(g, l, 56, 590 + i * 64, 58, INK, 300));
  bar(g, 56, 600 + headline.length * 64, 300, 8, FAINT); bar(g, 56, 620 + headline.length * 64, 220, 8, FAINT);
  g.strokeStyle = GOLD; g.lineWidth = 2; g.beginPath(); g.arc(W - 90, H - 92, 26, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(W - 98, H - 84); g.lineTo(W - 82, H - 100); g.moveTo(W - 94, H - 100); g.lineTo(W - 82, H - 100); g.lineTo(W - 82, H - 88); g.stroke();
  if (live) {
    g.fillStyle = 'rgba(214,184,138,.16)'; rr(g, 56, H - 112, 104, 40, 20); g.fill();
    g.fillStyle = GOLD; g.beginPath(); g.arc(78, H - 92, 6, 0, Math.PI * 2); g.fill();
    text(g, 'Live', 94, H - 84, 22, INK, 400);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PAINTERS: Record<string, (g: Ctx, option?: any) => void> = {
  // 01 Discover: a fine brief outline becomes an organised plan
  discoverA(g) {
    frame(g, false);
    text(g, 'Brief', 56, 96, 40, INK, 300);
    g.strokeStyle = FAINT; g.lineWidth = 1.5;
    ['Goal', 'Users', 'Must have', 'Constraints'].forEach((l, i) => {
      const y = 170 + i * 150; text(g, l, 56, y, 22, DIM, 400);
      [0, 1, 2].forEach(k => { g.setLineDash([6, 8]); g.beginPath(); g.moveTo(56, y + 34 + k * 28); g.lineTo(56 + [470, 380, 300][k], y + 34 + k * 28); g.stroke(); g.setLineDash([]); });
    });
  },
  discoverB(g) {
    frame(g);
    text(g, 'Roadmap', 56, 96, 40, INK, 300); text(g, 'v1 · 11 weeks', 56, 134, 22, DIM, 400);
    const rows = [['Scope agreed', 0, 1], ['Design', 1, 3], ['Build', 3, 9], ['Integrations', 6, 9], ['Launch', 9, 10], ['Care', 10, 11]] as const;
    rows.forEach(([n, a, b], i) => {
      const y = 210 + i * 104;
      g.strokeStyle = FAINT; g.lineWidth = 1; g.beginPath(); g.moveTo(56, y + 52); g.lineTo(W - 56, y + 52); g.stroke();
      text(g, n, 56, y + 8, 24, INK, 400);
      bar(g, 56 + (a / 11) * 488, y + 22, Math.max(18, ((b - a) / 11) * 488), 12, i < 2 ? GOLD : 'rgba(238,231,219,.32)');
    });
  },
  // 02 Design: a wireframe resolves into a polished interface
  designA(g) {
    frame(g, false); logo(g, 52, 56);
    g.strokeStyle = 'rgba(238,231,219,.42)'; g.lineWidth = 1.6;
    const box = (x: number, y: number, w: number, h: number, cross = false) => { rr(g, x, y, w, h, 14); g.stroke(); if (cross) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke(); } };
    box(40, 120, W - 80, 300, true);
    g.beginPath(); g.arc(W / 2, 270, 46, 0, Math.PI * 2); g.stroke();
    box(40, 450, 250, 170, true); box(310, 450, 250, 170);
    [470, 510, 550].forEach(y => bar(g, 330, y, 190, 10, 'rgba(238,231,219,.22)'));
    box(40, 650, W - 80, 90); [0, 1].forEach(k => bar(g, 64, 676 + k * 30, 300 - k * 90, 10, 'rgba(238,231,219,.22)'));
    box(40, 770, 200, 60);
  },
  designB(g) { polishedUI(g, ['From', 'idea to', 'impact.']); },
  // 03 Build: the interface gains functional structure and connected components
  buildA(g) { polishedUI(g, ['From', 'idea to', 'impact.']); },
  buildB(g) {
    polishedUI(g, ['From', 'idea to', 'impact.']);
    g.strokeStyle = GOLD; g.lineWidth = 2; g.setLineDash([8, 7]);
    const comp = (x: number, y: number, w: number, h: number, label: string) => { rr(g, x, y, w, h, 12); g.stroke(); g.setLineDash([]); g.fillStyle = '#0F0F11'; rr(g, x + 10, y - 16, label.length * 12 + 20, 30, 15); g.fill(); text(g, label, x + 20, y + 6, 19, GOLD, 500); g.setLineDash([8, 7]); };
    comp(30, 40, W - 60, 60, '<Header />'); comp(30, 112, W - 60, 396, '<Hero />'); comp(30, 548, W - 60, 230, '<Content />'); comp(W - 132, H - 128, 92, 72, '<CTA />');
    g.setLineDash([]); g.lineWidth = 1.4; g.strokeStyle = 'rgba(214,184,138,.6)';
    g.beginPath(); g.moveTo(W - 60, 300); g.bezierCurveTo(W + 20, 400, W + 20, 700, W - 86, H - 128); g.stroke();
  },
  // 04 Connect: a few purposeful paths link the product to supporting systems
  connectA(g) { PAINTERS.connect(g, false); },
  connectB(g) { PAINTERS.connect(g, true); },
  connect(g: Ctx, lit = false) {
    frame(g, false);
    // the product, small, in the middle
    g.fillStyle = '#16161A'; rr(g, 200, 330, 200, 280, 22); g.fill(); g.strokeStyle = 'rgba(238,231,219,.4)'; g.lineWidth = 2; g.stroke();
    mountains(g, 214, 344, 172, 120); bar(g, 222, 486, 140, 10, 'rgba(238,231,219,.5)'); bar(g, 222, 508, 100, 10, FAINT);
    const nodes: [number, number, string, boolean][] = [[110, 150, 'Payments API', false], [490, 170, 'CRM', false], [100, 790, 'Automation', false], [490, 780, 'AI assistant', true]];
    nodes.forEach(([x, y, label, optional]) => {
      const tx = x < W / 2 ? 200 : 400, ty = y < H / 2 ? 330 : 610;
      g.strokeStyle = lit ? (optional ? LAV : GOLD) : 'rgba(238,231,219,.25)'; g.lineWidth = lit ? 2.4 : 1.4;
      if (optional) g.setLineDash([7, 8]);
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x, (y + ty) / 2, tx, (y + ty) / 2, tx, ty); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#121214'; g.beginPath(); g.arc(x, y, 30, 0, Math.PI * 2); g.fill(); g.strokeStyle = lit ? (optional ? LAV : GOLD) : 'rgba(238,231,219,.35)'; g.stroke();
      g.fillStyle = lit ? (optional ? LAV : GOLD) : DIM; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
      g.font = `400 21px ${FONT}`; const tw = g.measureText(label).width;
      text(g, label, Math.min(W - 24 - tw, Math.max(24, x - tw / 2)), y + (y < H / 2 ? -46 : 62), 21, INK, 400);
      if (optional) text(g, 'where useful', Math.min(W - 24 - 112, Math.max(24, x - 56)), y + 90, 18, DIM, 400);
    });
  },
  // 05 Launch: the product takes its place and a launch path lights up
  launchA(g) { PAINTERS.launch(g, 1); },
  launchB(g) { PAINTERS.launch(g, 3); },
  launch(g: Ctx, lit = 3) {
    polishedUI(g, ['From', 'idea to', 'impact.'], lit >= 3);
    const steps = ['Build', 'Test', 'Deploy'];
    g.fillStyle = 'rgba(15,15,17,.9)'; rr(g, 40, 40, W - 80, 64, 32); g.fill();
    steps.forEach((s, i) => {
      const x = 92 + i * 180, on = i < lit;
      if (i < 2) { g.strokeStyle = i < lit - 1 ? GOLD : FAINT; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 16, 72); g.lineTo(x + 164, 72); g.stroke(); }
      g.fillStyle = on ? GOLD : '#2A2A2D'; g.beginPath(); g.arc(x, 72, 9, 0, Math.PI * 2); g.fill();
      text(g, s, x + 20, 80, 20, on ? INK : DIM, 400);
    });
  },
  // 06 Evolve: the running product reports back, and improvements return to it
  evolveA(g) { PAINTERS.evolve(g, false); },
  evolveB(g) { PAINTERS.evolve(g, true); },
  evolve(g: Ctx, improved = false) {
    frame(g);
    text(g, 'Product health', 56, 96, 36, INK, 300);
    g.fillStyle = 'rgba(214,184,138,.16)'; rr(g, W - 170, 66, 112, 40, 20); g.fill(); g.fillStyle = GOLD; g.beginPath(); g.arc(W - 148, 86, 6, 0, Math.PI * 2); g.fill(); text(g, 'Live', W - 132, 94, 21, INK, 400);
    const chart = (y: number, label: string, pts: number[], col: string) => {
      text(g, label, 56, y, 21, DIM, 400);
      g.strokeStyle = FAINT; g.lineWidth = 1; g.beginPath(); g.moveTo(56, y + 140); g.lineTo(W - 56, y + 140); g.stroke();
      g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); pts.forEach((v, i) => { const x = 56 + (i / (pts.length - 1)) * (W - 112), yy = y + 130 - v * 100; if (i) g.lineTo(x, yy); else g.moveTo(x, yy); }); g.stroke();
    };
    chart(170, 'Availability', [.92, .94, .93, .95, .94, .96, .95, .96, .97, .96], GOLD);
    chart(380, 'Response time', improved ? [.7, .66, .68, .6, .52, .44, .4, .36, .34, .32] : [.7, .66, .68, .64, .7, .66, .69, .67, .7, .68], improved ? GOLD : 'rgba(238,231,219,.6)');
    text(g, 'Improvements', 56, 620, 21, DIM, 400);
    ['Faster search', 'New onboarding step', 'Accessibility fixes'].forEach((s, i) => {
      const y = 670 + i * 62, done = improved || i === 0;
      g.strokeStyle = done ? GOLD : FAINT; g.lineWidth = 2; g.beginPath(); g.arc(70, y - 7, 11, 0, Math.PI * 2); g.stroke();
      if (done) { g.beginPath(); g.moveTo(64, y - 7); g.lineTo(69, y - 2); g.lineTo(77, y - 13); g.stroke(); }
      text(g, s, 96, y, 24, done ? INK : DIM, 400);
    });
  },
  final(g) { polishedUI(g, ['Products', 'for a brighter', 'tomorrow.'], true); },
};

export const ART_KEYS = ['discoverA', 'discoverB', 'designA', 'designB', 'buildA', 'buildB', 'connectA', 'connectB', 'launchA', 'launchB', 'evolveA', 'evolveB', 'final'] as const;
export type ArtKey = typeof ART_KEYS[number];

export function makeStageArt(maxAnisotropy = 4) {
  const out = {} as Record<ArtKey, THREE.CanvasTexture>;
  ART_KEYS.forEach(k => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    PAINTERS[k](c.getContext('2d')!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;   // drawn in display colours; shown as is
    t.anisotropy = maxAnisotropy;
    out[k] = t;
  });
  return out;
}

/** Which two images to blend, and how far, for a given story state. */
export function artFor(stageF: number, local: number, tr: number, complete: number): [ArtKey, ArtKey, number] {
  const ids = ['discover', 'design', 'build', 'connect', 'launch', 'evolve'];
  const k = Math.min(5, Math.floor(stageF + 1e-4));
  if (complete > 0) return [`${ids[5]}B` as ArtKey, 'final', complete];
  if (tr > 0 && k < 5) return [`${ids[k]}B` as ArtKey, `${ids[k + 1]}A` as ArtKey, tr];
  const t = Math.min(1, Math.max(0, (local - .15) / .7));
  return [`${ids[k]}A` as ArtKey, `${ids[k]}B` as ArtKey, t * t * (3 - 2 * t)];
}
