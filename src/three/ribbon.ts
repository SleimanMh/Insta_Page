import * as THREE from 'three';
import { TO_LINEAR } from './materials';

// A camera-facing light ribbon along a polyline in world space: used for the beam,
// the launch path and the return ring. Soft gaussian falloff, additive, drawn progressively.

const vertex = /* glsl */`
  attribute float aU;
  varying vec2 vUv;
  void main(){ vUv = vec2(aU, uv.y); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fragment = /* glsl */`
  ${TO_LINEAR}
  uniform vec3 color; uniform float a0; uniform float a1; uniform float prog; uniform float core;
  varying vec2 vUv;
  void main(){
    float y = abs(vUv.y - .5) * 2.0;
    float glow = exp(-y * y * 4.0) * .22 + exp(-y * y * 18.0) * .4 + exp(-y * y * 90.0) * core;
    float a = mix(a0, a1, vUv.x) * glow * smoothstep(prog, prog - .03, vUv.x);
    gl_FragColor = vec4(toLin(mix(color, vec3(1.0), exp(-y * y * 90.0) * .5)) * 1.6, a);
  }`;

export class Ribbon {
  mesh: THREE.Mesh;
  private max: number;
  private pos: Float32Array;
  private u: Float32Array;
  private tmp = new THREE.Vector3();
  private side = new THREE.Vector3();
  private toCam = new THREE.Vector3();

  constructor(maxPoints: number, color: string, a0: number, a1: number, core = .6) {
    this.max = maxPoints;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxPoints * 2 * 3);
    this.u = new Float32Array(maxPoints * 2);
    const uv = new Float32Array(maxPoints * 2 * 2), idx: number[] = [];
    for (let i = 0; i < maxPoints; i++) {
      uv[i * 4 + 1] = 0; uv[i * 4 + 3] = 1;
      if (i < maxPoints - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aU', new THREE.BufferAttribute(this.u, 1));
    g.setIndex(idx);
    g.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, a0: { value: a0 }, a1: { value: a1 }, prog: { value: 1 }, core: { value: core } },
      vertexShader: vertex, fragmentShader: fragment,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 200;
  }

  get uniforms() { return (this.mesh.material as THREE.ShaderMaterial).uniforms; }

  /** Rebuild the ribbon along world-space points. width may taper from start to end. */
  update(points: THREE.Vector3[], camera: THREE.Camera, w0: number, w1 = w0) {
    const n = Math.min(points.length, this.max);
    let total = 0; const acc = [0];
    for (let i = 1; i < n; i++) { total += points[i].distanceTo(points[i - 1]); acc.push(total); }
    for (let i = 0; i < n; i++) {
      const p = points[i], prev = points[Math.max(0, i - 1)], next = points[Math.min(n - 1, i + 1)];
      this.tmp.subVectors(next, prev).normalize();
      this.toCam.subVectors(camera.position, p).normalize();
      this.side.crossVectors(this.tmp, this.toCam).normalize();
      const u = total > 0 ? acc[i] / total : 0, w = (w0 + (w1 - w0) * u) / 2;
      this.pos.set([p.x - this.side.x * w, p.y - this.side.y * w, p.z - this.side.z * w, p.x + this.side.x * w, p.y + this.side.y * w, p.z + this.side.z * w], i * 6);
      this.u[i * 2] = this.u[i * 2 + 1] = u;
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.aU.needsUpdate = true;
    g.setDrawRange(0, Math.max(0, (n - 1) * 6));
  }

  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
