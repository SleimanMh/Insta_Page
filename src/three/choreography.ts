import { StoryState, clamp, easeInOut, lerp, smooth } from '../story/progress';
import { BASE_Y, GAP, SLABS, closedZ, openZ } from './geometry';

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
    closed = { frac: .69, dist: 3.7 };
    open = { frac: lerp(.375, .32, narrowness), dist: lerp(6.0, 7.3, narrowness) };
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

// ---- the layers: each one has its own resting angle, its own route and its own timing ----
// Resting pose once separated: a turn toward the viewer and a slight lean that differ per slab,
// so the arrangement reads as six individual pieces rather than a uniform row.
const REST_ROT: V3[] = [[.06, .78, .1], [-.03, .58, -.07], [.02, .7, .03], [-.05, .5, -.05], [.04, .66, .06], [-.02, .54, -.03]];
const REST_POS: V3[] = [[.02, .02, 0], [-.03, -.01, 0], [.01, .03, 0], [-.02, 0, 0], [.03, .02, 0], [0, -.01, 0]];
// While separating, each slab swings out on its own arc and enters its place from a different side.
const ARC_OPEN: V3[] = [[-1.1, .9, .5], [.5, -1.0, .7], [1.2, 1.15, -.3], [-.7, -.85, -.6], [.9, 1.3, .55], [-1.25, .25, .9]];
const TUMBLE_OPEN: V3[] = [[.7, -1.3, .45], [-.9, .8, -.6], [.5, 1.2, -.8], [-.6, -1.1, .7], [1.0, .6, .5], [-.4, -.9, -1.0]];
// Coming back together they take different routes again.
const ARC_CLOSE: V3[] = [[.8, -.9, -.6], [-1.0, 1.1, .3], [-.5, -1.2, .8], [1.1, .7, .5], [-.9, -.6, -.7], [.6, 1.25, -.4]];
const TUMBLE_CLOSE: V3[] = [[-.8, 1.0, -.5], [.6, -1.2, .7], [-1.0, .7, .4], [.8, .9, -.6], [-.5, -1.1, .9], [.9, -.5, -.7]];
// The order is shuffled too: no left-to-right sweep.
const ORDER_OPEN = [2, 5, 0, 3, 1, 4];
const ORDER_CLOSE = [4, 1, 3, 0, 5, 2];

export interface SlabPose { pos: V3; rot: V3; hl: number }

// While exploring, the layers part around the active stage so the product panel fits between them:
// slabs up to the active one ease back, the ones after it ease forward, and the opening travels with the stage.
const ROOM = .46;
// after the last layer there is nothing to stand between, so the final stage uses the opening before it
const gapAt = (s: StoryState) => Math.min(s.stageF, SLABS - 2);
const roomShift = (i: number, s: StoryState, exploring: number) => (smooth(-.5, .5, i - (gapAt(s) + .5)) - .5) * ROOM * exploring;

export function slabPoses(s: StoryState, hover: number): SlabPose[] {
  // the two route sets swap at the midpoint, where every slab is at rest, so the switch is invisible
  const opening = s.p < .5;
  const order = opening ? ORDER_OPEN : ORDER_CLOSE;
  const exploring = smooth(.6, 1, s.open) * (s.process > 0 ? 1 : 0);
  return Array.from({ length: SLABS }, (_, i) => {
    const t = easeInOut(clamp(s.open * 1.6 - order.indexOf(i) * .12));
    const detour = Math.sin(Math.PI * t);
    const arc = (opening ? ARC_OPEN : ARC_CLOSE)[i], tum = (opening ? TUMBLE_OPEN : TUMBLE_CLOSE)[i];
    const active = Math.max(0, 1 - Math.abs(s.stageF - i) * 1.7) * exploring;
    const hov = hover === i ? .5 * smooth(.3, 1, s.open) : 0;
    const rr = REST_ROT[i], rp = REST_POS[i];
    return {
      pos: [
        lerp(0, rp[0], t) + arc[0] * detour * .55 - active * .05,
        lerp(0, rp[1], t) + arc[1] * detour * .45 + active * .04,
        lerp(closedZ(i), openZ(i), t) + arc[2] * detour * .35 + roomShift(i, s, exploring),
      ],
      rot: [
        lerp(0, rr[0], t) + tum[0] * detour * .35,
        lerp(0, rr[1], t) + tum[1] * detour * .35 + active * .12,
        lerp(0, rr[2], t) + tum[2] * detour * .3,
      ],
      hl: Math.min(1, active + hov),
    };
  });
}

export interface PlanePose { pos: V3; rotY: number; w: number; h: number; show: number }

/** The product plane stands on the floor in the opening after the active layer, then settles inside the reunited prism. */
export function planePose(s: StoryState): PlanePose {
  const e = easeInOut(clamp(s.open));
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.4) * s.process;
  const w = .58 + launch * .03, h = .87 + launch * .04;
  const explore = {
    x: -.02 - launch * .12, y: BASE_Y + h / 2 + .03 + launch * .03,
    z: ((gapAt(s) - (SLABS - 1) / 2) * GAP + GAP * .5) * e,
    w, h, rotY: .62 + Math.PI,   // parallel to the layers, facing the viewer
  };
  const inside = { x: -.01, y: -.045, z: 0, w: .3, h: .43, rotY: Math.PI };
  const c = easeInOut(s.complete);
  return {
    pos: [lerp(explore.x, inside.x, c), lerp(explore.y, inside.y, c), lerp(explore.z, inside.z, c)],
    rotY: lerp(explore.rotY, inside.rotY, c),
    w: lerp(explore.w, inside.w, c), h: lerp(explore.h, inside.h, c),
    show: Math.max(smooth(.55, .95, s.open) * (1 - c), c),
  };
}

export function paths(s: StoryState) {
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.5) * s.process;
  const evolve = Math.max(0, 1 - Math.abs(s.stageF - 5) * 1.5) * s.process;
  return { launch, ring: Math.max(evolve, s.complete * .7), ringOpen: easeInOut(clamp(s.open)) };
}
