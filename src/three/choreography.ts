import { StoryState, clamp, easeInOut, lerp, smooth } from '../story/progress';
import { APEX_Y, BASE_Y, GAP, SLABS, closedZ, openZ } from './geometry';

// Camera and sculpture poses as pure functions of the story state. No timers live here:
// scroll, clicks and resizing all arrive as the same state, so they cannot compete.

export const FOV = 30;
const T = Math.tan((FOV / 2) * Math.PI / 180);
export const YAW = 2.5;   // the depth axis recedes to the right; triangle faces turn toward the viewer

type V3 = [number, number, number];

export interface Pose { dist: number; camY: number; lookY: number; sculptX: number; sculptY: number; yaw: number }

export function cameraPose(s: StoryState, aspect: number, stacked: boolean): Pose {
  const e = easeInOut(clamp(s.open));
  let closed, open;
  if (stacked) {
    closed = { frac: .5, dist: 3.5 };
    open = { frac: .5, dist: 6.1 };
  } else {
    // on less wide windows the open sculpture sits further left and further away, clear of the copy
    const narrowness = clamp((1.75 - aspect) / .45);
    closed = { frac: .69, dist: 4.1 };
    open = { frac: lerp(.37, .32, narrowness), dist: lerp(6.8, 8.0, narrowness) };
  }
  const fit = stacked ? Math.max(1, 1.15 / aspect) : Math.max(1, 1.6 / aspect);
  const dist = lerp(closed.dist, open.dist, e) * fit;
  const frac = lerp(closed.frac, open.frac, e);
  return {
    dist,
    camY: lerp(.36, .42, e),
    lookY: lerp(-.02, .02, e),
    sculptX: (frac - .5) * 2 * T * dist * aspect,
    sculptY: stacked ? lerp(.02, .06, e) : 0,
    yaw: YAW + lerp(0, -.1, e),
  };
}

// ---- the blocks: each one has its own resting angle, its own route and its own timing ----
// Resting pose once separated: every block turns and leans its own way (the first rocks onto a corner),
// so six identical pieces of glass read as six different shapes.
// Faces are seen at an angle, as in a photograph of real glass, not square-on.
const REST_ROT: V3[] = [[.1, .3, .42], [-.06, .44, .14], [.04, .24, .06], [-.03, .48, -.05], [.06, .2, -.1], [-.05, .38, -.17]];
export const REST_SCALE = 1.22;
// lift each block so its lowest corner stands on the floor line
const REST_POS: V3[] = REST_ROT.map(([, , rz], i) => {
  const low = Math.min(...[[0, APEX_Y], [-.5, BASE_Y], [.5, BASE_Y]].map(([x, y]) => x * Math.sin(rz) + y * Math.cos(rz)));
  return [[.02, -.03, .01, -.02, .03, 0][i], BASE_Y - low * REST_SCALE + .01, 0];
});
// While separating, each slab swings out on its own arc and enters its place from a different side.
const ARC_OPEN: V3[] = [[-1.1, .9, .5], [.5, -1.0, .7], [1.2, 1.15, -.3], [-.7, -.85, -.6], [.9, 1.3, .55], [-1.25, .25, .9]];
const TUMBLE_OPEN: V3[] = [[.7, -1.3, .45], [-.9, .8, -.6], [.5, 1.2, -.8], [-.6, -1.1, .7], [1.0, .6, .5], [-.4, -.9, -1.0]];
// Coming back together they take different routes again.
const ARC_CLOSE: V3[] = [[.8, -.9, -.6], [-1.0, 1.1, .3], [-.5, -1.2, .8], [1.1, .7, .5], [-.9, -.6, -.7], [.6, 1.25, -.4]];
const TUMBLE_CLOSE: V3[] = [[-.8, 1.0, -.5], [.6, -1.2, .7], [-1.0, .7, .4], [.8, .9, -.6], [-.5, -1.1, .9], [.9, -.5, -.7]];
// The order is shuffled too: no left-to-right sweep.
const ORDER_OPEN = [2, 5, 0, 3, 1, 4];
const ORDER_CLOSE = [4, 1, 3, 0, 5, 2];

export interface SlabPose { pos: V3; rot: V3; hl: number; fade: number; scale: number }

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

// While exploring, the layers part around the active stage so the product panel fits between them:
// slabs up to the active one ease back, the ones after it ease forward, and the opening travels with the stage.
const ROOM = .46;
// after the last layer there is nothing to stand between, so the final stage uses the opening before it
const gapAt = (s: StoryState) => Math.min(s.stageF, SLABS - 2);
const roomShift = (i: number, s: StoryState, exploring: number) => (smooth(-.5, .5, i - (gapAt(s) + .5)) - .5) * ROOM * exploring;

/**
 * Moving to the next stage, the panel does not slide: it draws back, then breaks through the layer
 * between the two openings. `tr` is the transit (0…1), `crossSlab` the layer it breaks through,
 * `burst` drives the flying shards and `flash` the flare on the broken layer. All scroll-driven, so it reverses.
 */
export function panelTransit(s: StoryState) {
  const g = gapAt(s), k = Math.min(SLABS - 2, Math.floor(g + 1e-6)), tr = g - k;
  const moving = tr > 1e-4 && k < SLABS - 2 ? s.process : 0;
  return {
    k, tr: moving ? tr : 0, crossSlab: k + 1,
    burst: moving ? smooth(.44, .98, tr) : 0,
    flash: moving * Math.sin(Math.PI * smooth(.36, .8, tr)),
  };
}
// anticipation and a small overshoot: pull back, punch through, settle
const punch = (t: number) => {
  const c = 1.1 * 1.525;
  return t < .5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};
const gapZ = (k: number) => (k - (SLABS - 1) / 2) * GAP + GAP * .5;

export function slabPoses(s: StoryState, hover: number): SlabPose[] {
  // the two route sets swap at the midpoint, where every slab is at rest, so the switch is invisible
  const opening = s.p < .5;
  const order = opening ? ORDER_OPEN : ORDER_CLOSE;
  const exploring = smooth(.6, 1, s.open) * (s.process > 0 ? 1 : 0);
  const transit = panelTransit(s);
  const split = splitOf(s);
  return Array.from({ length: SLABS }, (_, i) => {
    const t = easeInOut(clamp(split * 1.6 - order.indexOf(i) * .12));
    const detour = Math.sin(Math.PI * t);
    const arc = (opening ? ARC_OPEN : ARC_CLOSE)[i], tum = (opening ? TUMBLE_OPEN : TUMBLE_CLOSE)[i];
    const active = Math.max(0, 1 - Math.abs(s.stageF - i) * 1.7) * exploring;
    const hov = hover === i ? .5 * smooth(.3, 1, s.open) : 0;
    const rr = REST_ROT[i], rp = REST_POS[i];
    return {
      pos: [
        lerp(0, rp[0], t) + arc[0] * detour * .55 - active * .05,
        lerp(.02, rp[1], t) + arc[1] * detour * .45 + active * .04,
        lerp(closedZ(i), openZ(i), t) + arc[2] * detour * .35 + roomShift(i, s, exploring),
      ],
      rot: [
        lerp(0, rr[0], t) + tum[0] * detour * .35,
        lerp(0, rr[1], t) + tum[1] * detour * .35 - active * .35,   // the active block turns toward its edge
        lerp(0, rr[2], t) + tum[2] * detour * .3,
      ],
      hl: Math.min(1, active + hov + (i === transit.crossSlab ? transit.flash * .9 : 0)),
      // each block grows out of the breaking pyramid, and shrinks back into it on return
      fade: smooth(0, .2, t), scale: lerp(.4, REST_SCALE, smooth(0, .55, t)),
    };
  });
}

export interface PlanePose { pos: V3; rot: V3; w: number; h: number; show: number }

/**
 * The product panel stands large in the opening after the active layer, drawn over the glass so it stays
 * readable. Between stages it breaks through the next layer; at the end it settles inside the reunited prism.
 */
export function planePose(s: StoryState): PlanePose {
  const e = easeInOut(clamp(s.open));
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.4) * s.process;
  const T = panelTransit(s), bump = Math.sin(Math.PI * T.tr);
  const w = .76, h = 1.14;
  const explore = {
    x: .06 + bump * .16 - launch * .06,
    y: BASE_Y + h / 2 + .03 + bump * .07 + launch * .03,
    z: (gapZ(T.k) + (gapZ(T.k + 1) - gapZ(T.k)) * punch(T.tr)) * e,
    rot: [-bump * .12, .62 + Math.PI + bump * .38, Math.sin(Math.PI * 2 * T.tr) * .07] as V3,   // faces the viewer, tilts as it breaks through
    w: w * (1 - bump * .05), h: h * (1 + bump * .03),
  };
  const inside = { x: -.01, y: -.045, z: 0, rot: [0, Math.PI, 0] as V3, w: .3, h: .45 };
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
