import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { story } from '../story/controller';
import { clamp, smooth } from '../story/progress';
import { FOV, cameraPose, paths, planePose, slabPoses } from './choreography';
import { APEX_Y, BASE_Y, BEAM_Y, SLABS, SLAB_DEPTH, slabGeometry } from './geometry';
import { TO_LINEAR, backdropMaterial, crystalMaterial, floorMaterial, floorReflectionMaterial, productMaterial } from './materials';
import { Ribbon } from './ribbon';
import { artFor, makeStageArt } from './stageArt';

const FLOOR_OFFSET = .024;   // the bevel reaches slightly below the triangle's base

const glintMaterial = () => new THREE.ShaderMaterial({
  uniforms: { scale: { value: 1 } },
  vertexShader: `attribute float aSize; attribute float aAlpha; varying float vA; uniform float scale;
    void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `${TO_LINEAR} varying float vA; void main(){ vec2 c = gl_PointCoord - .5; float d = length(c);
    float core = pow(smoothstep(.5, 0.0, d), 3.0); float streak = smoothstep(.035, 0.0, abs(c.y)) * smoothstep(.5, .0, abs(c.x)) * .55;
    gl_FragColor = vec4(toLin(vec3(1.0, .96, .9)) * 2.0, (core + streak) * vA); }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
});

function PrismWorld({ onReady, lowCost }: { onReady: () => void; lowCost: boolean }) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const born = useRef(performance.now());
  const parallax = useRef({ x: 0, y: 0 });

  // ---------------------------------------------------------------- build once
  const world = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;

    const root = new THREE.Group();
    const geo = slabGeometry();
    const slabs = Array.from({ length: SLABS }, () => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(geo, crystalMaterial(true));
      const glass = new THREE.Mesh(geo, crystalMaterial(false));
      back.renderOrder = 10; glass.renderOrder = 11;
      g.add(back, glass); root.add(g);
      const mirror = new THREE.Mesh(geo, floorReflectionMaterial());
      mirror.matrixAutoUpdate = false; mirror.matrixWorldAutoUpdate = false; mirror.renderOrder = 5; mirror.frustumCulled = false;
      return { g, back, glass, mirror };
    });

    const art = makeStageArt(gl.capabilities.getMaxAnisotropy());
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), productMaterial());
    plane.renderOrder = 60;
    root.add(plane);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMaterial());
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial());
    backdrop.renderOrder = -2;

    // the beam: a bright opaque core (so the glass refracts it) wrapped in soft glow
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.85, 1.75) }));
    const glowIn = new Ribbon(2, '#FFF7EC', 0, 1, .65), glowOut = new Ribbon(2, '#FFFFFF', .8, 0, .5);
    const launch = new Ribbon(32, '#D6B88A', .9, .1, .5);
    const ring = new Ribbon(97, '#E2C495', .55, .55, .45);
    const glints = new THREE.Points(new THREE.BufferGeometry(), glintMaterial());
    glints.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SLABS + 1) * 3), 3));
    glints.geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(SLABS + 1), 1));
    glints.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(SLABS + 1), 1));
    glints.frustumCulled = false; glints.renderOrder = 210;

    return { root, geo, slabs, art, plane, floor, backdrop, core, glowIn, glowOut, launch, ring, glints };
  }, [gl, lowCost]);

  // ---------------------------------------------------------------- post: restrained bloom, then tone mapping
  const post = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowCost ? 0 : 4 });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .36, .5, .88);
    if (!lowCost) composer.addPass(bloom);
    composer.addPass(new OutputPass());
    return { composer, bloom };
  }, [gl, scene, camera, lowCost]);

  useEffect(() => {
    post.composer.setPixelRatio(gl.getPixelRatio());
    post.composer.setSize(size.width, size.height);
    invalidate();
  }, [post, gl, size, invalidate]);

  useEffect(() => {
    story.invalidate = invalidate;
    onReady();
    invalidate();
    return () => {
      story.invalidate = null;
      world.geo.dispose();
      world.slabs.forEach(s => [s.back, s.glass, s.mirror].forEach(m => (m.material as THREE.Material).dispose()));
      Object.values(world.art).forEach(t => t.dispose());
      [world.plane, world.floor, world.backdrop, world.core, world.glints].forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      [world.glowIn, world.glowOut, world.launch, world.ring].forEach(r => r.dispose());
      post.composer.dispose(); post.bloom.dispose();
    };
  }, [world, post, invalidate, onReady]);

  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), m: new THREE.Matrix4(), s: new THREE.Matrix4(), q: new THREE.Quaternion(), up: new THREE.Vector3(0, 1, 0) }), []);

  // ---------------------------------------------------------------- every frame (only when invalidated)
  useFrame((_, delta) => {
    const s = story.state, stacked = story.mode === 'stack', reduce = story.reduce;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(.05, delta);
    let busy = false;

    const reveal = reduce ? 1 : clamp((performance.now() - born.current) / 1000);   // short, non-blocking light reveal
    if (reveal < 1) busy = true;

    // camera choreography, plus subtle desktop-only parallax added on top
    const pose = cameraPose(s, size.width / size.height, stacked);
    const allowParallax = !stacked && !reduce && story.finePointer;
    const px = allowParallax ? story.pointer.x : 0, py = allowParallax ? story.pointer.y : 0;
    parallax.current.x += (px - parallax.current.x) * (1 - Math.exp(-dt * 4));
    parallax.current.y += (py - parallax.current.y) * (1 - Math.exp(-dt * 4));
    if (Math.abs(px - parallax.current.x) + Math.abs(py - parallax.current.y) > .001) busy = true;
    cam.fov = FOV; cam.near = .1; cam.far = 80;
    cam.position.set(parallax.current.x * .2, pose.camY - parallax.current.y * .1, pose.dist);
    cam.lookAt(0, pose.lookY, 0);
    cam.updateProjectionMatrix();

    const root = world.root;
    root.position.set(pose.sculptX, pose.sculptY, 0);
    root.rotation.set(0, pose.yaw, 0);

    // the six layers
    const poses = slabPoses(s, story.hover);
    poses.forEach((p, i) => {
      const sl = world.slabs[i];
      sl.g.position.set(...p.pos);
      sl.g.rotation.set(...p.rot);
      const u = (sl.glass.material as THREE.ShaderMaterial).uniforms, ub = (sl.back.material as THREE.ShaderMaterial).uniforms;
      u.hl.value += (p.hl - u.hl.value) * (reduce ? 1 : 1 - Math.exp(-dt * 10));
      if (Math.abs(p.hl - u.hl.value) > .002) busy = true;
      u.reveal.value = ub.reveal.value = reveal; u.beamY.value = ub.beamY.value = BEAM_Y; ub.hl.value = u.hl.value;
    });

    // product plane
    const pp = planePose(s);
    world.plane.position.set(...pp.pos);
    world.plane.rotation.set(0, pp.rotY, 0);
    world.plane.scale.set(pp.w * Math.max(.001, pp.show), pp.h * Math.max(.001, pp.show), 1);
    world.plane.visible = pp.show > .02;
    const pu = (world.plane.material as THREE.ShaderMaterial).uniforms;
    const [a, b, m] = artFor(s.stageF, s.local, s.tr, s.complete);
    pu.texA.value = world.art[a]; pu.texB.value = world.art[b]; pu.mixv.value = m;

    root.updateMatrixWorld(true);

    // floor, backdrop and the slabs' reflections in the floor
    const fy = pose.sculptY + BASE_Y - FLOOR_OFFSET;
    world.floor.position.set(pose.sculptX, fy, 0);
    const fu = (world.floor.material as THREE.ShaderMaterial).uniforms;
    fu.center.value.set(pose.sculptX, 0); fu.reveal.value = reveal;
    world.backdrop.position.set(0, fy + 9, -14);
    world.backdrop.scale.set(70, 18, 1);
    (world.backdrop.material as THREE.ShaderMaterial).uniforms.focus.value.set(.5 + pose.sculptX / 70, .32);
    v.m.makeTranslation(0, 2 * fy, 0).multiply(v.s.makeScale(1, -1, 1));
    world.slabs.forEach((sl, i) => {
      sl.mirror.matrixWorld.multiplyMatrices(v.m, sl.glass.matrixWorld);
      const mu = (sl.mirror.material as THREE.ShaderMaterial).uniforms;
      mu.floorY.value = fy; mu.hl.value = poses[i].hl; mu.reveal.value = reveal;
    });

    // the beam enters from the left, crosses every layer and fades after the last
    const first = Math.min(...poses.map(p => p.pos[2])) - SLAB_DEPTH, last = Math.max(...poses.map(p => p.pos[2])) + SLAB_DEPTH / 2;
    const toWorld = (x: number, y: number, z: number, out: THREE.Vector3) => out.set(x, y, z).applyMatrix4(root.matrixWorld);
    const lead = 1.0 + 2.4 * smooth(.2, .8, s.open);   // beside the hero copy, not across it
    const start = toWorld(0, BEAM_Y, first - lead, v.a).clone(), mid = toWorld(0, BEAM_Y, last, v.b).clone();
    const end = toWorld(0, BEAM_Y, last + 2.6 - 1.9 * s.process, v.c).clone();
    world.glowIn.update([start, mid], cam, .006, .016); world.glowIn.uniforms.prog.value = reveal;
    world.glowOut.update([mid, end], cam, .016, .01); world.glowOut.uniforms.prog.value = smooth(.6, 1, reveal);
    const cs = start.clone().lerp(mid, .3), ce = mid.clone().lerp(end, .25);
    const dir = v.d.subVectors(ce, cs), len = dir.length() * reveal;
    dir.normalize();
    world.core.position.copy(cs).addScaledVector(dir, len / 2);
    world.core.quaternion.copy(v.q.setFromUnitVectors(v.up, dir));
    world.core.scale.set(.0032, Math.max(.001, len), .0032);

    // small glints where the beam passes through each layer
    const gp = world.glints.geometry.attributes.position as THREE.BufferAttribute;
    const gs = world.glints.geometry.attributes.aSize as THREE.BufferAttribute;
    const ga = world.glints.geometry.attributes.aAlpha as THREE.BufferAttribute;
    poses.forEach((p, i) => {
      toWorld(0, BEAM_Y, p.pos[2] - SLAB_DEPTH / 2, v.d); gp.setXYZ(i, v.d.x, v.d.y, v.d.z);
      gs.setX(i, (.4 + p.hl * .4) * size.height * .06); ga.setX(i, (.22 + p.hl * .4) * reveal);
    });
    toWorld(0, BEAM_Y, first + SLAB_DEPTH * .3, v.d); gp.setXYZ(SLABS, v.d.x, v.d.y, v.d.z);
    gs.setX(SLABS, size.height * .14); ga.setX(SLABS, .5 * reveal);
    (world.glints.material as THREE.ShaderMaterial).uniforms.scale.value = gl.getPixelRatio();
    gp.needsUpdate = gs.needsUpdate = ga.needsUpdate = true;

    // launch path and the return ring
    const pa = paths(s);
    if (pa.launch > .01) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 32; i++) {
        const t = i / 31;
        pts.push(toWorld(pp.pos[0] - .05 * t, pp.pos[1] + pp.h * .1 + Math.pow(t, 1.6) * .55, pp.pos[2] + .05 + t * 2.4, new THREE.Vector3()));
      }
      world.launch.update(pts, cam, .01, .018);
      world.launch.uniforms.prog.value = pa.launch;
    }
    world.launch.mesh.visible = pa.launch > .01;
    if (pa.ring > .01) {
      const rz = 1.0 + pa.ringOpen * 1.0, rx = .8 + pa.ringOpen * .2, pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const ang = Math.PI * .5 + (i / 96) * Math.PI * 2;
        pts.push(toWorld(rx * Math.sin(ang), .02 + .1 * Math.sin(ang), rz * Math.cos(ang), new THREE.Vector3()));
      }
      world.ring.update(pts, cam, .01, .01);
      world.ring.uniforms.prog.value = pa.ring;
    }
    world.ring.mesh.visible = pa.ring > .01;

    // leader line from the active layer's apex to its label (desktop only)
    const leader = story.leader;
    if (leader) {
      const show = !stacked && s.process > .6 && s.tr < .2;
      const label = show ? story.stageEls[s.stage]?.querySelector('.stage-label') : null;
      if (label) {
        world.slabs[s.stage].g.localToWorld(v.d.set(0, APEX_Y + .03, 0)).project(cam);
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

  // render through the composer (takes over from R3F's default render)
  useFrame(() => { post.composer.render(); }, 1);

  return (
    <>
      <primitive object={world.backdrop} />
      <primitive object={world.floor} />
      <primitive object={world.root} />
      {world.slabs.map((s, i) => <primitive key={i} object={s.mirror} />)}
      <primitive object={world.core} />
      <primitive object={world.glowIn.mesh} />
      <primitive object={world.glowOut.mesh} />
      <primitive object={world.launch.mesh} />
      <primitive object={world.ring.mesh} />
      <primitive object={world.glints} />
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const lowCost = typeof window !== 'undefined' && (matchMedia('(max-width: 899px)').matches || matchMedia('(pointer: coarse)').matches);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, lowCost ? 1.25 : 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, position: [0, .4, 4.4], near: .1, far: 80 }}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    >
      <PrismWorld onReady={onReady} lowCost={lowCost} />
    </Canvas>
  );
}
