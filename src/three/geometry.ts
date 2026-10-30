import * as THREE from 'three';

// One triangular prism divided along its depth axis into six slabs. Closed, every slab shares the same
// equilateral cross-section (side 1, centroid at the origin, depth along local z). When the prism breaks,
// each slab reshapes into its own crystal: wider, taller, leaning, thinner. Every slab is built with the
// same vertex layout, so the change between the two shapes is a smooth blend.
export const SLABS = 6;
export const APEX_Y = 1 / Math.sqrt(3);          // 0.577
export const BASE_Y = -APEX_Y / 2;               // -0.289
export const SLAB_DEPTH = 0.2;
export const SEAM = 0.012;                        // the hairline gap between closed slabs
export const GAP = 0.55;                          // spacing once separated
export const BEAM_Y = -0.05;                      // the beam runs just below the centroid

export const closedZ = (i: number) => (i - (SLABS - 1) / 2) * (SLAB_DEPTH + SEAM);
export const openZ = (i: number) => (i - (SLABS - 1) / 2) * GAP;

type Tri = [THREE.Vector2, THREE.Vector2, THREE.Vector2];   // apex, bottom left, bottom right
export interface Piece { tri: Tri; depth: number }
const v2 = (x: number, y: number) => new THREE.Vector2(x, y);

/** The shared cross-section of the closed prism. */
export const CLOSED: Piece = { tri: [v2(0, APEX_Y), v2(-.5, BASE_Y), v2(.5, BASE_Y)], depth: SLAB_DEPTH };

/** Each slab's own crystal once separated. All stand on the same floor line. */
export const PIECES: Piece[] = [
  { tri: [v2(-.08, .64), v2(-.62, BASE_Y), v2(.52, BASE_Y)], depth: .21 },   // broad and heavy
  { tri: [v2(.06, .74), v2(-.36, BASE_Y), v2(.4, BASE_Y)], depth: .17 },     // tall and narrow
  { tri: [v2(0, .6), v2(-.5, BASE_Y), v2(.48, BASE_Y)], depth: .23 },        // the classic
  { tri: [v2(.24, .8), v2(-.3, BASE_Y), v2(.34, BASE_Y)], depth: .15 },      // leaning spire
  { tri: [v2(-.16, .52), v2(-.47, BASE_Y), v2(.43, BASE_Y)], depth: .19 },   // low and offset
  { tri: [v2(.04, .43), v2(-.35, BASE_Y), v2(.34, BASE_Y)], depth: .14 },    // small and light
];

const CORNER = .05, BEVEL = .026, ARC = 4, CURVE = 10;
const RING = 3 * (CURVE + 1);                     // points around the outline
const RINGS = 2 * (ARC + 1);                      // front bevel, sides, back bevel

/** Rounded triangle outline, counter-clockwise, with outward normals. */
function outline(tri: Tri, pts: THREE.Vector2[], nrm: THREE.Vector2[]) {
  let n = 0;
  for (let i = 0; i < 3; i++) {
    const p = tri[i], prev = tri[(i + 2) % 3], next = tri[(i + 1) % 3];
    const a = p.clone().add(prev.clone().sub(p).setLength(CORNER));
    const b = p.clone().add(next.clone().sub(p).setLength(CORNER));
    for (let k = 0; k <= CURVE; k++) {
      const t = k / CURVE, u = 1 - t;
      pts[n++].set(u * u * a.x + 2 * u * t * p.x + t * t * b.x, u * u * a.y + 2 * u * t * p.y + t * t * b.y);
    }
  }
  for (let i = 0; i < RING; i++) {
    const a = pts[(i + RING - 1) % RING], b = pts[i], c = pts[(i + 1) % RING];
    const e1x = b.x - a.x, e1y = b.y - a.y, e2x = c.x - b.x, e2y = c.y - b.y;
    nrm[i].set(e1y / (Math.hypot(e1x, e1y) || 1) + e2y / (Math.hypot(e2x, e2y) || 1), -e1x / (Math.hypot(e1x, e1y) || 1) - e2x / (Math.hypot(e2x, e2y) || 1)).normalize();
  }
}

/** A slab whose shape can be blended between the closed cross-section and its own crystal. */
export class MorphSlab {
  geometry = new THREE.BufferGeometry();
  tri: Tri = [v2(0, 0), v2(0, 0), v2(0, 0)];
  private pos = new Float32Array((RINGS * RING + 2) * 3);
  private pts = Array.from({ length: RING }, () => v2(0, 0));
  private nrm = Array.from({ length: RING }, () => v2(0, 0));
  private amount = -1;

  constructor(private target: Piece) {
    const idx: number[] = [];
    for (let r = 0; r < RINGS - 1; r++) for (let i = 0; i < RING; i++) {
      const a = r * RING + i, b = r * RING + (i + 1) % RING, c = (r + 1) * RING + (i + 1) % RING, d = (r + 1) * RING + i;
      idx.push(a, d, b, b, d, c);
    }
    const front = RINGS * RING, back = front + 1, last = (RINGS - 1) * RING;
    for (let i = 0; i < RING; i++) {
      idx.push(front, i, (i + 1) % RING);
      idx.push(back, last + (i + 1) % RING, last + i);
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setIndex(idx);
    this.set(0);
  }

  /** 0 = the closed prism's cross-section, 1 = this slab's own crystal. */
  set(m: number) {
    if (Math.abs(m - this.amount) < 1e-4) return;
    this.amount = m;
    for (let k = 0; k < 3; k++) this.tri[k].copy(CLOSED.tri[k]).lerp(this.target.tri[k], m);
    const depth = CLOSED.depth + (this.target.depth - CLOSED.depth) * m;
    outline(this.tri, this.pts, this.nrm);
    let o = 0;
    for (let r = 0; r < RINGS; r++) {
      const front = r <= ARC, j = front ? r : r - (ARC + 1);
      const th = (front ? 0 : Math.PI / 2) + (j / ARC) * Math.PI / 2;
      const inset = BEVEL - BEVEL * Math.sin(th);
      const z = (front ? depth / 2 - BEVEL : -(depth / 2 - BEVEL)) + BEVEL * Math.cos(th);
      for (let i = 0; i < RING; i++) {
        this.pos[o++] = this.pts[i].x - this.nrm[i].x * inset;
        this.pos[o++] = this.pts[i].y - this.nrm[i].y * inset;
        this.pos[o++] = z;
      }
    }
    const cx = (this.tri[0].x + this.tri[1].x + this.tri[2].x) / 3, cy = (this.tri[0].y + this.tri[1].y + this.tri[2].y) / 3;
    this.pos.set([cx, cy, depth / 2, cx, cy, -depth / 2], o);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  dispose() { this.geometry.dispose(); }
}
