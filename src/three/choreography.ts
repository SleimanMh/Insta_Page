import { StoryState, clamp, easeInOut, lerp, smooth } from '../story/progress';
import { SLABS, closedZ } from './geometry';

// Camera and sculpture poses as pure functions of the story state. No timers live here:
// scroll, clicks and resizing all arrive as the same state, so they cannot compete.

export const FOV = 30;
export const YAW = 2.5;   // the row of blocks recedes to the right

type V3 = [number, number, number];

export interface Pose { fov: number; dist: number; camY: number; lookY: number; sculptX: number; sculptY: number; yaw: number }

export function cameraPose(s: StoryState, aspect: number, stacked: boolean): Pose {
  const e = easeInOut(clamp(s.open));
  let closed, open;
  if (stacked) {
    closed = { frac: .5, dist: 3.5 };
    open = { frac: .5, dist: 5.2 };
  } else {
    // on less wide windows the open sculpture sits further left and further away, clear of the copy
    const narrowness = clamp((1.75 - aspect) / .45);
    closed = { frac: .69, dist: 4.1 };
    open = { frac: lerp(.43, .38, narrowness), dist: lerp(4.6, 5.5, narrowness) };
  }
  // once open the camera comes close with a wider lens: near blocks loom large, far ones recede
  const fit = stacked ? Math.max(1, 1.15 / aspect) : Math.max(1, 1.6 / aspect);
  const dist = lerp(closed.dist, open.dist, e) * fit;
  const frac = lerp(closed.frac, open.frac, e);
  const fov = lerp(FOV, 38, e);
  return {
    fov, dist,
    camY: lerp(.36, .42, e),
    lookY: lerp(-.02, .02, e),
    sculptX: (frac - .5) * 2 * Math.tan((fov / 2) * Math.PI / 180) * dist * aspect,
    sculptY: stacked ? lerp(.02, .06, e) : 0,
    yaw: YAW + lerp(0, -.1, e),
  };
}

// ---- the blocks: eight thick pieces of glass that open like the pages of a book around the panel ----
// Each block rests in a slot, counted from the active one (slot 0, gold). The blocks before the panel
// (slots -3…-1) turn to face the beam's source; the active block and the ones after it turn the other way,
// each smaller and further back. The slots were measured from the reference render: position in the
// sculpture's frame, turn, in-plane roll and size. Moving to the next stage, every block steps one slot to
// the left, so the active block turns over like a page and the next one takes its place.
type Slot = [number, number, number, number, number, number];   // x, y, z, turn, roll, size
const SLOTS: Slot[] = [
  [-.335, .238, -1.618, 5.212, -.357, 1.053],   // -3
  [-.435, .225, -1.424, 5.077, -.375, 1.019],   // -2
  [-.632, .211, -1.271, 5.103, -.375, .998],    // -1
  [-1.411, .198, -1.089, 2.705, .332, 1.018],   //  0, active
  [-.905, .066, -.359, 3.014, -.042, 1.05],     //  1
  [-.709, .012, .328, 2.921, 0, .969],          //  2
  [-.886, -.03, .447, 2.921, -.026, .832],      //  3
];
const SLOT0 = 3, SIZE = 1.15;
/** First stage's block: two blocks always stand before it. */
export const FIRST = 2;
export const activeBlock = (stage: number) => (stage + FIRST) % SLABS;
// beyond the measured slots the row simply continues, fading out
const slotAt = (j: number): Slot => {
  if (j < 0) { const a = SLOTS[0], b = SLOTS[1]; return a.map((v, n) => v + (v - b[n]) * -j) as Slot; }
  if (j >= SLOTS.length) { const a = SLOTS[SLOTS.length - 1], b = SLOTS[SLOTS.length - 2]; return a.map((v, n) => v + (v - b[n]) * (j - SLOTS.length + 1)) as Slot; }
  return SLOTS[j];
};
function slot(k: number): Slot {
  const j = k + SLOT0, j0 = Math.floor(j), f = j - j0, a = slotAt(j0), b = slotAt(j0 + 1);
  return a.map((v, n) => lerp(v, b[n], f)) as Slot;
}
/** Wrap a slot index into the eight places the row has, -3.5 … 4.5; the wrap happens where a block is invisible. */
const wrap = (k: number) => ((((k + 3.5) % SLABS) + SLABS) % SLABS) - 3.5;
const slotOpacity = (k: number) => smooth(-3.5, -3.05, k) * (1 - smooth(3.05, 3.9, k));

// While separating, each block swings out on its own arc and enters its place from a different side.
const ARC_OPEN: V3[] = [[-1.1, .9, .5], [.5, -1.0, .7], [1.2, 1.15, -.3], [-.7, -.85, -.6], [.9, 1.3, .55], [-1.25, .25, .9], [.6, -.7, -.8], [-.4, 1.1, .4]];
const TUMBLE_OPEN: V3[] = [[.7, -1.3, .45], [-.9, .8, -.6], [.5, 1.2, -.8], [-.6, -1.1, .7], [1.0, .6, .5], [-.4, -.9, -1.0], [.8, .4, -.6], [-.7, -.5, .9]];
// Coming back together they take different routes again.
const ARC_CLOSE: V3[] = [[.8, -.9, -.6], [-1.0, 1.1, .3], [-.5, -1.2, .8], [1.1, .7, .5], [-.9, -.6, -.7], [.6, 1.25, -.4], [-.7, .8, .6], [.9, -.4, -.5]];
const TUMBLE_CLOSE: V3[] = [[-.8, 1.0, -.5], [.6, -1.2, .7], [-1.0, .7, .4], [.8, .9, -.6], [-.5, -1.1, .9], [.9, -.5, -.7], [-.6, .8, .5], [.7, -.9, -.4]];
// The order is shuffled too: no left-to-right sweep.
const ORDER_OPEN = [2, 5, 0, 7, 3, 1, 6, 4];
const ORDER_CLOSE = [4, 1, 6, 3, 0, 7, 5, 2];

export interface SlabPose { pos: V3; rot: V3; hl: number; fade: number; scale: number; etch: number }

/**
 * The break, as a function of scroll: the pyramid first fills with light from inside (`charge`),
 * fracture lines spread across the glass while it trembles (`crack`), then it bursts apart (`burst`
 * drives the shards, `flash` the flare at its heart) and the blocks fly out of it. `whole` is how much
 * of the pyramid is standing. On the way back the blocks gather and the pyramid re-forms in a softer glow (`fuse`).
 */
export function breakState(s: StoryState) {
  const p = s.p, opening = p < .5;
  return {
    charge: opening ? smooth(.012, .062, p) * (1 - smooth(.085, .13, p)) : 0,
    crack: opening ? smooth(.035, .074, p) * (1 - smooth(.08, .095, p)) : 0,
    burst: opening ? smooth(.072, .16, p) : 0,
    flash: opening ? Math.sin(Math.PI * smooth(.066, .11, p)) : 0,
    fuse: opening ? 0 : Math.sin(Math.PI * smooth(.86, .95, p)),
    whole: opening ? 1 - smooth(.07, .092, p) : smooth(.875, .935, p),
  };
}
// the blocks stay inside the pyramid until it has cracked
const splitOf = (s: StoryState) => clamp((s.open - .04) / .96);

/**
 * Moving to the next stage, the active block turns over to the far side of the panel like a page,
 * with a flare on it and shards thrown off. `tr` is the transit (0…1), `crossSlab` the block turning over.
 * All scroll-driven, so it reverses.
 */
export function panelTransit(s: StoryState) {
  const k = Math.floor(s.stageF + 1e-6), tr = s.stageF - k;
  const moving = tr > 1e-4 ? s.process : 0;
  return {
    tr: moving ? tr : 0, crossSlab: activeBlock(k),
    burst: moving ? smooth(.44, .98, tr) : 0,
    flash: moving * Math.sin(Math.PI * smooth(.3, .8, tr)),
  };
}

export function slabPoses(s: StoryState, hover: number): SlabPose[] {
  // the two route sets swap at the midpoint, where every block is at rest, so the switch is invisible
  const opening = s.p < .5;
  const order = opening ? ORDER_OPEN : ORDER_CLOSE;
  const exploring = smooth(.6, 1, s.open) * (s.process > 0 ? 1 : 0);
  const transit = panelTransit(s);
  const split = splitOf(s);
  const hovered = hover >= 0 ? activeBlock(hover) : -1;
  return Array.from({ length: SLABS }, (_, i) => {
    const t = easeInOut(clamp(split * 1.8 - order.indexOf(i) * .11));
    const detour = Math.sin(Math.PI * t);
    const arc = (opening ? ARC_OPEN : ARC_CLOSE)[i], tum = (opening ? TUMBLE_OPEN : TUMBLE_CLOSE)[i];
    const k = wrap(i - FIRST - s.stageF);
    const [x, y, z, turn, roll, size] = slot(k);
    const active = Math.max(0, 1 - Math.abs(k) * 1.7) * exploring;
    const hov = hovered === i ? .5 * smooth(.3, 1, s.open) : 0;
    return {
      pos: [
        lerp(0, x, t) + arc[0] * detour * .55,
        lerp(.02, y, t) + arc[1] * detour * .45,
        lerp(closedZ(i), z, t) + arc[2] * detour * .35,
      ],
      rot: [tum[0] * detour * .35, lerp(0, turn, t) + tum[1] * detour * .35, lerp(0, roll, t) + tum[2] * detour * .3],
      hl: Math.min(1, active + hov + (i === transit.crossSlab ? transit.flash * .9 : 0)),
      // each block grows out of the breaking pyramid and shrinks back into it on return;
      // at the ends of the row blocks fade, so the row can wrap around unseen
      fade: smooth(0, .2, t) * lerp(1, slotOpacity(k), smooth(.3, 1, t)), scale: lerp(.4, size * SIZE, smooth(0, .55, t)),
      // the two blocks just before the panel carry sketches of the work already done
      etch: smooth(-2.9, -2.3, k) * (1 - smooth(-.7, -.2, k)),
    };
  });
}

/** The beam's path in the sculpture's frame: straight along the closed prism, then angled through the open row. */
const BEAM_A: V3 = [SLOTS[0][0], SLOTS[0][1] + .12, SLOTS[0][2]];
const BEAM_B: V3 = [SLOTS[6][0], SLOTS[6][1] - .02, SLOTS[6][2]];
export function beamAt(u: number, open: number, out: [number, number, number]) {
  const dz = BEAM_B[2] - BEAM_A[2], f = (u - BEAM_A[2]) / dz;
  out[0] = lerp(0, BEAM_A[0] + (BEAM_B[0] - BEAM_A[0]) * f, open);
  out[1] = lerp(-.05, BEAM_A[1] + (BEAM_B[1] - BEAM_A[1]) * f, open);
  out[2] = u;
  return out;
}

export interface PlanePose { pos: V3; rot: V3; w: number; h: number; show: number }

/**
 * The product panel stands large in the opening after the active layer, drawn over the glass so it stays
 * readable. Between stages it breaks through the next layer; at the end it settles inside the reunited prism.
 */
export function planePose(s: StoryState): PlanePose {
  const T = panelTransit(s), bump = Math.sin(Math.PI * T.tr);
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.4) * s.process;
  // a tall glass panel standing upright on the floor, turned a little away so its far edge recedes;
  // as the next block turns over it only sways about its vertical axis, never tilting
  const w = .75, h = 1.125;
  const explore = {
    x: -.8 + bump * .08, y: -.293 + h / 2 + .015 + launch * .02, z: -.955 + bump * .06,
    rot: [0, -1.76 + bump * .25, 0] as V3,
    w, h,
  };
  const inside = { x: -.01, y: -.045, z: 0, rot: [0, -Math.PI, 0] as V3, w: .3, h: .45 };
  const c = easeInOut(s.complete);
  return {
    pos: [lerp(explore.x, inside.x, c), lerp(explore.y, inside.y, c), lerp(explore.z, inside.z, c)],
    rot: [lerp(explore.rot[0], inside.rot[0], c), lerp(explore.rot[1], inside.rot[1], c), lerp(explore.rot[2], inside.rot[2], c)],
    w: lerp(explore.w, inside.w, c), h: lerp(explore.h, inside.h, c),
    show: Math.max(smooth(.55, .95, s.open) * (1 - c), c),
  };
}

export function paths(s: StoryState) {
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.5) * s.process;
  const evolve = Math.max(0, 1 - Math.abs(s.stageF - 5) * 1.5) * s.process;
  return { launch, ring: Math.max(evolve, s.complete * .7), ringOpen: easeInOut(clamp(s.open)) };
}
