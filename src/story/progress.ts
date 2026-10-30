// The one authoritative model of the story. Everything visual is a pure function of a single
// progress value p in [0, 1]: Closed → Opening → Exploring 1–6 → Reassembling → Complete.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const easeInOut = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Where each phase sits along the scroll
export const P = {
  open0: .06, open1: .18,        // the prism separates
  stage0: .18, stageLen: .11,    // six stages, one after another
  re0: .84, re1: .95,            // the layers reassemble
} as const;

const HOLD = .62;                // share of each stage spent resting before moving on

/** Progress at which a stage is fully settled; used for navigation. */
export const stageCenter = (i: number) => P.stage0 + P.stageLen * i + P.stageLen * HOLD * .5;

/** Discrete rest points: hero, six stages, complete. Used for reduced motion and the stacked layout. */
export const SNAPS = [0, ...[0, 1, 2, 3, 4, 5].map(stageCenter), 1];

export type Phase = 'closed' | 'opening' | 'exploring' | 'reassembling' | 'complete';

export interface StoryState {
  p: number;
  phase: Phase;
  open: number;      // 0 closed prism … 1 fully separated layers
  stageF: number;    // continuous stage index 0…5 (rests on integers, eases between them)
  stage: number;     // nearest stage
  local: number;     // 0…1 progress within the current stage's rest
  tr: number;        // 0…1 transition toward the next stage
  complete: number;  // 0…1 the finished product is framed
  hero: number;      // pane visibilities, 0…1
  process: number;
  final: number;
  nav: number;
}

export function stateFromProgress(p: number): StoryState {
  const open = smooth(P.open0, P.open1, p) * (1 - smooth(P.re0, P.re1, p));
  const raw = clamp((p - P.stage0) / P.stageLen, 0, 5.9999);
  const k = Math.floor(raw), f = raw - k;
  const tr = k < 5 ? easeInOut(clamp((f - HOLD) / (1 - HOLD))) : 0;
  const stageF = k + tr;
  const complete = smooth(.88, .97, p);
  let phase: Phase = 'exploring';
  if (p < P.open0) phase = 'closed';
  else if (p < P.open1) phase = 'opening';
  else if (p >= P.re1) phase = 'complete';
  else if (p >= P.re0) phase = 'reassembling';
  return {
    p, phase, open, stageF, stage: Math.round(stageF), local: clamp(f / HOLD), tr, complete,
    hero: 1 - smooth(.04, .1, p),
    process: smooth(.12, .19, p) * (1 - smooth(.82, .87, p)),
    final: smooth(.9, .965, p),
    nav: smooth(.11, .18, p) * (1 - smooth(.85, .9, p)),
  };
}
