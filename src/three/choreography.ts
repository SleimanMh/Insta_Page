import { StoryState, clamp, easeInOut, lerp, smooth } from '../story/progress';
import { GAP, SLABS, closedZ, openZ } from './geometry';

// Camera and sculpture poses as pure functions of the story state. No timers live here:
// scroll, clicks and resizing all arrive as the same state, so they cannot compete.

export const FOV = 30;
const T = Math.tan((FOV / 2) * Math.PI / 180);
export const YAW = 2.5;   // the depth axis recedes to the right, triangles face the viewer at an angle

export interface Pose {
  dist: number;       // camera distance
  camY: number;       // camera height
  lookY: number;
  sculptX: number;    // sculpture offset in world x (places it left or right on screen)
  sculptY: number;
  yaw: number;
}

export function cameraPose(s: StoryState, aspect: number, stacked: boolean): Pose {
  const e = easeInOut(clamp(s.open));
  let closed, open;
  if (stacked) {
    closed = { frac: .5, dist: 3.7 };
    open = { frac: .5, dist: 6.2 };
  } else {
    // on less wide windows the open sculpture sits further left and further away, clear of the copy
    const narrowness = clamp((1.75 - aspect) / .45);
    closed = { frac: .7, dist: 4.4 };
    open = { frac: lerp(.36, .3, narrowness), dist: lerp(7.0, 8.4, narrowness) };
  }
  // keep the whole sculpture in frame on narrower windows
  const fit = stacked ? Math.max(1, 1.15 / aspect) : Math.max(1, 1.6 / aspect);
  const dist = lerp(closed.dist, open.dist, e) * fit;
  const frac = lerp(closed.frac, open.frac, e);
  return {
    dist,
    camY: lerp(.4, .7, e),
    lookY: lerp(-.02, .02, e),
    sculptX: (frac - .5) * 2 * T * dist * aspect,
    sculptY: stacked ? lerp(.02, .08, e) : 0,
    yaw: YAW + lerp(0, -.06, e),
  };
}

export interface SlabPose { z: number; x: number; y: number; hl: number }

/** Per-slab position along the depth axis, the forward step of the active slab, and its highlight. */
export function slabPoses(s: StoryState, hover: number): SlabPose[] {
  const exploring = smooth(.55, 1, s.open) * (s.process > 0 ? 1 : 0);
  return Array.from({ length: SLABS }, (_, i) => {
    const ei = easeInOut(clamp(s.open * 1.35 - i * .07));
    const active = Math.max(0, 1 - Math.abs(s.stageF - i) * 1.7) * exploring;
    const hov = hover === i ? .55 * smooth(.3, 1, s.open) : 0;
    const hl = Math.min(1, active + hov);
    return { z: lerp(closedZ(i), openZ(i), ei), x: -active * .11, y: active * .04, hl };
  });
}

export interface PlanePose { x: number; y: number; z: number; w: number; h: number; opacity: number }

/** The product plane travels between the layers, then settles inside the reunited prism. */
export function planePose(s: StoryState): PlanePose {
  const e = easeInOut(clamp(s.open));
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.4) * s.process;
  const explore = {
    x: -.05 - launch * .26, y: .06 + launch * .02,
    z: ((s.stageF - (SLABS - 1) / 2) * GAP + GAP * .5) * e,
    w: .42 + launch * .04, h: .64 + launch * .06,
  };
  const inside = { x: -.02, y: -.04, z: -.02, w: .3, h: .43 };
  const c = easeInOut(s.complete);
  return {
    x: lerp(explore.x, inside.x, c), y: lerp(explore.y, inside.y, c), z: lerp(explore.z, inside.z, c),
    w: lerp(explore.w, inside.w, c), h: lerp(explore.h, inside.h, c),
    opacity: Math.max(smooth(.45, .85, s.open) * (1 - c), c),
  };
}

/** How strongly the launch path and the return ring show. */
export function paths(s: StoryState) {
  const launch = Math.max(0, 1 - Math.abs(s.stageF - 4) * 1.5) * s.process;
  const evolve = Math.max(0, 1 - Math.abs(s.stageF - 5) * 1.5) * s.process;
  return { launch, ring: Math.max(evolve, s.complete * .7), ringOpen: easeInOut(clamp(s.open)) };
}
