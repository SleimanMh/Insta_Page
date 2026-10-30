import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { story } from '../story/controller';
import { clamp, smooth } from '../story/progress';
import { FOV, cameraPose, paths, planePose, slabPoses } from './choreography';
import { APEX_Y, BASE_Y, BEAM_Y, SLABS, SLAB_DEPTH, slabGeometry } from './geometry';
import { glassMaterial } from './glass';
import { Ribbon } from './ribbon';
import { artFor, makeStageArt } from './stageArt';

// ---------------------------------------------------------------- materials
const planeMaterial = () => new THREE.ShaderMaterial({
  uniforms: { texA: { value: null }, texB: { value: null }, mixv: { value: 0 }, opacity: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D texA; uniform sampler2D texB; uniform float mixv; uniform float opacity; varying vec2 vUv;
    void main(){ vec4 a = texture2D(texA, vUv), b = texture2D(texB, vUv); vec4 c = mix(a, b, mixv); gl_FragColor = vec4(c.rgb, c.a * opacity); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});

const floorMaterial = () => new THREE.ShaderMaterial({
  uniforms: { zs: { value: new Array(SLABS).fill(0) }, hls: { value: new Array(SLABS).fill(0) }, reveal: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float zs[${SLABS}]; uniform float hls[${SLABS}]; uniform float reveal; varying vec3 vP;
    void main(){
      // vP.x runs across the triangles' base, vP.y along the depth axis (plane is rotated flat)
      float a = 0.0; vec3 col = vec3(0.0);
      for (int i = 0; i < ${SLABS}; i++) {
        vec2 d = vec2(vP.x / .62, (vP.y + zs[i]) / .2);
        float g = exp(-dot(d, d)) * (.16 + hls[i] * .3);
        col += mix(vec3(.88, .78, .62), vec3(.72, .68, .9), mod(float(i), 2.0) * .6) * g; a += g;
      }
      float pool = exp(-dot(vP.xy, vP.xy) / 4.0) * .12;
      gl_FragColor = vec4(col / max(a, .001) * .9 + vec3(.5) * pool, clamp(a + pool * .6, 0.0, .55) * reveal);
    }`,
  transparent: true, depthWrite: false,
});

const glintMaterial = () => new THREE.ShaderMaterial({
  uniforms: { scale: { value: 1 } },
  vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float scale;
    void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c);
    float core = pow(smoothstep(.5, 0.0, d), 3.0); float cross = smoothstep(.04, 0.0, abs(c.y)) * smoothstep(.5, .0, abs(c.x)) * .5;
    gl_FragColor = vec4(vec3(1.0, .95, .86), (core + cross) * vA); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
});

// ---------------------------------------------------------------- the world
function PrismWorld({ onReady }: { onReady: () => void }) {
  const { camera, gl, size, invalidate } = useThree();
  const born = useRef(performance.now());
  const parallax = useRef({ x: 0, y: 0 });

  const world = useMemo(() => {
    const root = new THREE.Group();
    const geo = slabGeometry();
    const slabs = Array.from({ length: SLABS }, () => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(geo, glassMaterial(true));
      const front = new THREE.Mesh(geo, glassMaterial(false));
      g.add(back, front); root.add(g);
      return { g, back, front };
    });
    const art = makeStageArt(gl.capabilities.getMaxAnisotropy());
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), planeMaterial());
    root.add(plane);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), floorMaterial());
    floor.rotation.x = -Math.PI / 2; floor.position.y = BASE_Y - .016; floor.renderOrder = 1;
    root.add(floor);
    const beamIn = new Ribbon(2, '#FFF6E8', 0, 1, .7);
    const beamOut = new Ribbon(2, '#FFFFFF', .7, 0, .5);
    const launch = new Ribbon(32, '#D6B88A', .9, .1, .5);
    const ring = new Ribbon(97, '#D6B88A', .55, .55, .45);
    const glints = new THREE.Points(new THREE.BufferGeometry(), glintMaterial());
    glints.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SLABS + 1) * 3), 3));
    glints.geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(SLABS + 1), 1));
    glints.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(SLABS + 1), 1));
    glints.frustumCulled = false; glints.renderOrder = 210;
    return { root, geo, slabs, art, plane, floor, beamIn, beamOut, launch, ring, glints };
  }, [gl]);

  useEffect(() => {
    story.invalidate = invalidate;
    onReady();
    invalidate();
    return () => {
      story.invalidate = null;
      world.geo.dispose();
      world.slabs.forEach(s => { (s.back.material as THREE.Material).dispose(); (s.front.material as THREE.Material).dispose(); });
      Object.values(world.art).forEach(t => t.dispose());
      [world.plane, world.floor, world.glints].forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      [world.beamIn, world.beamOut, world.launch, world.ring].forEach(r => r.dispose());
    };
  }, [world, invalidate, onReady]);

  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() }), []);

  useFrame((_, delta) => {
    const s = story.state, stacked = story.mode === 'stack', reduce = story.reduce;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(.05, delta);
    let busy = false;

    // a short, non-blocking light reveal when the scene first appears
    const reveal = reduce ? 1 : clamp((performance.now() - born.current) / 1000);
    if (reveal < 1) busy = true;

    // ---- camera choreography + subtle desktop parallax ----
    const pose = cameraPose(s, size.width / size.height, stacked);
    const allowParallax = !stacked && !reduce && story.finePointer;
    const px = allowParallax ? story.pointer.x : 0, py = allowParallax ? story.pointer.y : 0;
    parallax.current.x += (px - parallax.current.x) * (1 - Math.exp(-dt * 4));
    parallax.current.y += (py - parallax.current.y) * (1 - Math.exp(-dt * 4));
    if (Math.abs(px - parallax.current.x) + Math.abs(py - parallax.current.y) > .001) busy = true;
    cam.fov = FOV; cam.near = .1; cam.far = 60;
    cam.position.set(parallax.current.x * .22, pose.camY - parallax.current.y * .12, pose.dist);
    cam.lookAt(0, pose.lookY, 0);
    cam.updateProjectionMatrix();

    const root = world.root;
    root.position.set(pose.sculptX, pose.sculptY, 0);
    root.rotation.set(0, pose.yaw, 0);

    // ---- slabs ----
    const poses = slabPoses(s, story.hover);
    poses.forEach((p, i) => {
      const sl = world.slabs[i];
      sl.g.position.set(p.x, p.y, p.z);
      for (const m of [sl.back, sl.front]) {
        const u = (m.material as THREE.ShaderMaterial).uniforms;
        u.hl.value += (p.hl - u.hl.value) * (reduce ? 1 : 1 - Math.exp(-dt * 10));
        if (Math.abs(p.hl - u.hl.value) > .002) busy = true;
        u.reveal.value = reveal; u.beamY.value = BEAM_Y;
      }
    });

    // ---- product plane ----
    const pp = planePose(s);
    world.plane.position.set(pp.x, pp.y, pp.z);
    world.plane.scale.set(pp.w, pp.h, 1);
    world.plane.visible = pp.opacity > .01;
    const pu = (world.plane.material as THREE.ShaderMaterial).uniforms;
    const [a, b, m] = artFor(s.stageF, s.local, s.tr, s.complete);
    pu.texA.value = world.art[a]; pu.texB.value = world.art[b]; pu.mixv.value = m; pu.opacity.value = pp.opacity;

    // ---- floor light under each slab ----
    const fu = (world.floor.material as THREE.ShaderMaterial).uniforms;
    poses.forEach((p, i) => { fu.zs.value[i] = p.z; fu.hls.value[i] = p.hl; });
    fu.reveal.value = reveal;

    root.updateMatrixWorld(true);

    // ---- draw order: far to near, so each slab's glass tints only what is behind it ----
    const items: { d: number; set: (o: number) => void }[] = world.slabs.map(sl => ({
      d: sl.g.getWorldPosition(v.a).distanceTo(cam.position),
      set: (o: number) => { sl.back.renderOrder = o; sl.front.renderOrder = o + 1; },
    }));
    items.push({ d: world.plane.getWorldPosition(v.a).distanceTo(cam.position), set: o => { world.plane.renderOrder = o; } });
    items.sort((x, y) => y.d - x.d).forEach((it, k) => it.set(10 + k * 3));
    // the product plane is the thing being explained; keep it legible over the glass around it
    world.plane.renderOrder = 60;

    // ---- the beam: enters from the left, crosses every layer, fades after the last ----
    const first = poses[0].z - SLAB_DEPTH, last = poses[SLABS - 1].z + SLAB_DEPTH / 2;
    const toWorld = (x: number, y: number, z: number, out: THREE.Vector3) => out.set(x, y, z).applyMatrix4(root.matrixWorld);
    // while the hero or final copy is on the left, the beam starts just beside it instead of crossing it
    const lead = 1.0 + 2.4 * smooth(.2, .8, s.open);
    const start = toWorld(0, BEAM_Y, first - lead, v.a), mid = toWorld(0, BEAM_Y, last, v.b), end = toWorld(0, BEAM_Y, last + 2.6 - 1.9 * s.process, v.c);
    world.beamIn.update([start.clone(), mid.clone()], cam, .006, .016);
    world.beamIn.uniforms.prog.value = reveal;
    world.beamOut.update([mid.clone(), end.clone()], cam, .016, .012);
    world.beamOut.uniforms.prog.value = smooth(.6, 1, reveal);

    // glints where the beam passes through each slab
    const gp = world.glints.geometry.attributes.position as THREE.BufferAttribute;
    const gs = world.glints.geometry.attributes.aSize as THREE.BufferAttribute;
    const ga = world.glints.geometry.attributes.aAlpha as THREE.BufferAttribute;
    poses.forEach((p, i) => {
      toWorld(p.x, BEAM_Y + p.y, p.z - SLAB_DEPTH / 2, v.d); gp.setXYZ(i, v.d.x, v.d.y, v.d.z);
      gs.setX(i, (.5 + p.hl * .5) * size.height * .09); ga.setX(i, (.35 + p.hl * .5) * reveal);
    });
    toWorld(0, BEAM_Y, first - SLAB_DEPTH * .2, v.d); gp.setXYZ(SLABS, v.d.x, v.d.y, v.d.z);
    gs.setX(SLABS, size.height * .16); ga.setX(SLABS, .55 * reveal);
    (world.glints.material as THREE.ShaderMaterial).uniforms.scale.value = gl.getPixelRatio();
    gp.needsUpdate = gs.needsUpdate = ga.needsUpdate = true;

    // ---- launch path and the return ring ----
    const pa = paths(s);
    if (pa.launch > .01) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 32; i++) {
        const t = i / 31;
        pts.push(toWorld(pp.x - .05 * t, pp.y + pp.h * .1 + Math.pow(t, 1.6) * .55, pp.z + .05 + t * 2.4, new THREE.Vector3()));
      }
      world.launch.update(pts, cam, .012, .02);
      world.launch.uniforms.prog.value = pa.launch;
    }
    world.launch.mesh.visible = pa.launch > .01;
    if (pa.ring > .01) {
      const rz = 1.05 + pa.ringOpen * 1.15, rx = .78 + pa.ringOpen * .22, pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const t = i / 96, ang = Math.PI * .5 + t * Math.PI * 2;
        pts.push(toWorld(rx * Math.sin(ang), .02 + .1 * Math.sin(ang), rz * Math.cos(ang), new THREE.Vector3()));
      }
      world.ring.update(pts, cam, .012, .012);
      world.ring.uniforms.prog.value = pa.ring;
      world.ring.uniforms.a0.value = world.ring.uniforms.a1.value = .45 + .25 * (1 - s.complete);
    }
    world.ring.mesh.visible = pa.ring > .01;

    // ---- leader line from the active slab's apex to its label ----
    const leader = story.leader;
    if (leader) {
      const show = !stacked && s.process > .6 && s.tr < .2;
      const label = show ? story.stageEls[s.stage]?.querySelector('.stage-label') : null;
      if (label) {
        const p = poses[s.stage];
        toWorld(p.x, APEX_Y + p.y + .015, p.z, v.d).project(cam);
        const ax = (v.d.x * .5 + .5) * size.width, ay = (-v.d.y * .5 + .5) * size.height;
        const r = label.getBoundingClientRect(), host = gl.domElement.getBoundingClientRect();
        leader.line.setAttribute('x1', ax.toFixed(1)); leader.line.setAttribute('y1', ay.toFixed(1));
        leader.line.setAttribute('x2', (r.left - host.left - 18).toFixed(1)); leader.line.setAttribute('y2', (r.top - host.top + r.height / 2).toFixed(1));
        leader.dot.setAttribute('cx', ax.toFixed(1)); leader.dot.setAttribute('cy', ay.toFixed(1));
        leader.line.parentElement!.style.opacity = (smooth(.6, 1, s.process) * (1 - s.tr * 5)).toFixed(3);
      } else leader.line.parentElement!.style.opacity = '0';
    }

    if (busy) invalidate();
  });

  return (
    <>
      <primitive object={world.root} />
      <primitive object={world.beamIn.mesh} />
      <primitive object={world.beamOut.mesh} />
      <primitive object={world.launch.mesh} />
      <primitive object={world.ring.mesh} />
      <primitive object={world.glints} />
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const mobile = typeof window !== 'undefined' && matchMedia('(max-width: 899px)').matches;
  return (
    <Canvas
      frameloop="demand"
      flat
      linear
      dpr={[1, mobile ? 1.5 : 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, position: [0, .4, 4.4], near: .1, far: 60 }}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    >
      <PrismWorld onReady={onReady} />
    </Canvas>
  );
}
