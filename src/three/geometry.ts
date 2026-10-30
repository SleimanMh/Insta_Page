import * as THREE from 'three';

// Two forms of the same glass. Closed, it is one crystal pyramid. When it breaks it becomes six
// thick triangular blocks (equilateral, side 1, centroid at the origin, depth along local z),
// each standing at its own angle so no two read alike.
export const SLABS = 6;
export const APEX_Y = 1 / Math.sqrt(3);          // 0.577
export const BASE_Y = -APEX_Y / 2;               // -0.289
export const SLAB_DEPTH = 0.15;
export const GAP = 0.55;                          // spacing once separated
export const BEAM_Y = -0.05;                      // the beam runs just below the centroid

/** Where the blocks gather, inside the pyramid, before they fly out and after they return. */
export const closedZ = (i: number) => (i - (SLABS - 1) / 2) * .07;
export const openZ = (i: number) => (i - (SLABS - 1) / 2) * GAP;

/** The block's triangle: apex, bottom left, bottom right. */
export const TRI = [new THREE.Vector2(0, APEX_Y), new THREE.Vector2(-.5, BASE_Y), new THREE.Vector2(.5, BASE_Y)];

const CORNER = .06, BEVEL = .034, ARC = 4, CURVE = 10;
const RING = 3 * (CURVE + 1);                     // points around the outline
const RINGS = 2 * (ARC + 1);                      // front bevel, sides, back bevel

/** Rounded triangle outline, counter-clockwise, with outward normals. */
function outline() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 3; i++) {
    const p = TRI[i], prev = TRI[(i + 2) % 3], next = TRI[(i + 1) % 3];
    const a = p.clone().add(prev.clone().sub(p).setLength(CORNER));
    const b = p.clone().add(next.clone().sub(p).setLength(CORNER));
    for (let k = 0; k <= CURVE; k++) {
      const t = k / CURVE, u = 1 - t;
      pts.push(new THREE.Vector2(u * u * a.x + 2 * u * t * p.x + t * t * b.x, u * u * a.y + 2 * u * t * p.y + t * t * b.y));
    }
  }
  const nrm = pts.map((b, i) => {
    const a = pts[(i + RING - 1) % RING], c = pts[(i + 1) % RING];
    const e1 = b.clone().sub(a).normalize(), e2 = c.clone().sub(b).normalize();
    return new THREE.Vector2(e1.y + e2.y, -e1.x - e2.x).normalize();
  });
  return { pts, nrm };
}

/** A thick glass block with generous rounded bevels. */
export function slabGeometry() {
  const { pts, nrm } = outline();
  const pos: number[] = [], idx: number[] = [];
  for (let r = 0; r < RINGS; r++) {
    const front = r <= ARC, j = front ? r : r - (ARC + 1);
    const th = (front ? 0 : Math.PI / 2) + (j / ARC) * Math.PI / 2;
    const inset = BEVEL - BEVEL * Math.sin(th);
    const z = (front ? SLAB_DEPTH / 2 - BEVEL : -(SLAB_DEPTH / 2 - BEVEL)) + BEVEL * Math.cos(th);
    for (let i = 0; i < RING; i++) pos.push(pts[i].x - nrm[i].x * inset, pts[i].y - nrm[i].y * inset, z);
  }
  for (let r = 0; r < RINGS - 1; r++) for (let i = 0; i < RING; i++) {
    const a = r * RING + i, b = r * RING + (i + 1) % RING, c = (r + 1) * RING + (i + 1) % RING, d = (r + 1) * RING + i;
    idx.push(a, d, b, b, d, c);
  }
  const front = RINGS * RING, back = front + 1, last = (RINGS - 1) * RING;
  pos.push(0, 0, SLAB_DEPTH / 2, 0, 0, -SLAB_DEPTH / 2);
  for (let i = 0; i < RING; i++) {
    idx.push(front, i, (i + 1) % RING);
    idx.push(back, last + (i + 1) % RING, last + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- the closed form: a regular crystal pyramid standing on the same floor line ----
export const PYR_EDGE = 1.1;
export const PYR_H = PYR_EDGE * Math.sqrt(2 / 3);
export const PYR_ALT = PYR_EDGE * Math.sqrt(3) / 2;   // height of each face, for edge distances in the shader

/**
 * Flat-shaded tetrahedron. Each face carries barycentric coordinates (the third one at the apex)
 * and its index: 0 front, 1 right, 2 left, 3 base.
 */
export function pyramidGeometry() {
  const e = PYR_EDGE, r = e / (2 * Math.sqrt(3));
  const A = [-e / 2, BASE_Y, r], B = [e / 2, BASE_Y, r], C = [0, BASE_Y, -2 * r], D = [0, BASE_Y + PYR_H, 0];
  const faces = [[A, B, D], [B, C, D], [C, A, D], [A, C, B]];
  const pos: number[] = [], bary: number[] = [], face: number[] = [];
  faces.forEach((f, k) => f.forEach((p, j) => {
    pos.push(...p);
    bary.push(j === 0 ? 1 : 0, j === 1 ? 1 : 0, j === 2 ? 1 : 0);
    face.push(k);
  }));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aBary', new THREE.Float32BufferAttribute(bary, 3));
  g.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 1));
  g.computeVertexNormals();
  return g;
}
