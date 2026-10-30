import * as THREE from 'three';

// One triangular prism divided along its depth axis into six identical slabs.
// The triangle has side 1 and its centroid at the origin; the prism's depth axis is local z.
export const SLABS = 6;
export const APEX_Y = 1 / Math.sqrt(3);          // 0.577
export const BASE_Y = -APEX_Y / 2;               // -0.289
export const SLAB_DEPTH = 0.2;
export const SEAM = 0.012;                        // the hairline gap between closed slabs
export const GAP = 0.55;                           // spacing once separated
export const BEAM_Y = -0.05;                      // the beam runs just below the centroid
const BEVEL = 0.026;

export const closedZ = (i: number) => (i - (SLABS - 1) / 2) * (SLAB_DEPTH + SEAM);
export const openZ = (i: number) => (i - (SLABS - 1) / 2) * GAP;

/** A triangular slab with softly rounded corners and a small bevel that catches champagne light. */
export function slabGeometry() {
  const R = APEX_Y, r = 0.05;
  const pts = [0, 1, 2].map(k => {
    const a = Math.PI / 2 + k * 2 * Math.PI / 3;
    return new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R);
  });
  const shape = new THREE.Shape();
  pts.forEach((p, i) => {
    const prev = pts[(i + 2) % 3], next = pts[(i + 1) % 3];
    const a = p.clone().add(prev.clone().sub(p).setLength(r));
    const b = p.clone().add(next.clone().sub(p).setLength(r));
    if (i === 0) shape.moveTo(a.x, a.y); else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(p.x, p.y, b.x, b.y);
  });
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: SLAB_DEPTH - BEVEL * 2, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL * .9,
    bevelSegments: 5, curveSegments: 12,
  });
  g.translate(0, 0, -(SLAB_DEPTH - BEVEL * 2) / 2);
  g.computeVertexNormals();
  return g;
}
