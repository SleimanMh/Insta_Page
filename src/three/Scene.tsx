import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { story } from '../story/controller';
import { clamp, smooth } from '../story/progress';
import { FOV, activeBlock, beamAt, breakState, cameraPose, panelTransit, paths, planePose, slabPoses } from './choreography';
import { APEX_Y, BASE_Y, BEAM_Y, PYR_ALT, SLABS, SLAB_DEPTH, TRI, pyramidGeometry, slabGeometry } from './geometry';
import { TO_LINEAR, backdropMaterial, crystalMaterial, floorMaterial, floorReflectionMaterial, productMaterial, pyramidMaterial, shardMaterial } from './materials';
import { Ribbon } from './ribbon';
import { artFor, makeStageArt } from './stageArt';
import { auroraHue, onPalette, palette, rgb, stageColor } from '../theme';

const FLOOR_OFFSET = .004;   // the pyramid and the blocks stand exactly on the base line
const PYR_TURN = -.12;       // the pyramid's front face, turned a little from the viewer
const SHARDS = 36;
// fixed pseudo-random shard set, so the break looks the same every time and plays backwards cleanly
const SHARD_SET = Array.from({ length: SHARDS }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); };
  const a = r(1) * Math.PI * 2, up = r(2) * 1.2 - .35;
  return {
    dir: new THREE.Vector3(Math.cos(a) * .9, up, Math.sin(a) * .9 + .55).normalize(),
    // when the whole prism breaks, the glass flies out in every direction
    out: new THREE.Vector3(Math.cos(a), up * .8 + .15, Math.sin(a)).normalize(),
    dist: .22 + r(3) * .5, size: .35 + r(4) * .9,
    spin: new THREE.Vector3(r(5) - .5, r(6) - .5, r(7) - .5).multiplyScalar(14),
    offset: new THREE.Vector3((r(8) - .5) * .3, (r(9) - .5) * .5, 0),
  };
});

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
  const { camera, gl, scene, size, invalidate, setDpr } = useThree();
  const born = useRef(performance.now());
  // the night sky moves on its own, so it keeps drawing, but only while the story is on screen
  const onScreen = useRef(true);
  const parallax = useRef({ x: 0, y: 0 });
  // layout reads are expensive mid-scroll; the leader's label position is cached and refreshed sparingly
  const labelCache = useRef({ stage: -1, at: 0, x: 0, y: 0 });
  // adaptive quality: if frames run long, step the resolution down (and bloom off) rather than stutter
  const quality = useRef({ avg: 16, slow: 0, level: 0 });

  // ---------------------------------------------------------------- build once
  const world = useMemo(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;

    const root = new THREE.Group();
    const geo = slabGeometry();
    const slabs = Array.from({ length: SLABS }, (_, i) => {
      const g = new THREE.Group();
      const back = new THREE.Mesh(geo, crystalMaterial(true, TRI, i * 1.37 + .4));
      const glass = new THREE.Mesh(geo, crystalMaterial(false, TRI, i * 1.37 + .4));
      back.renderOrder = 10; glass.renderOrder = 11;
      g.add(back, glass); root.add(g);
      const mirror = new THREE.Mesh(geo, floorReflectionMaterial());
      mirror.matrixAutoUpdate = false; mirror.matrixWorldAutoUpdate = false; mirror.renderOrder = 5; mirror.frustumCulled = false;
      return { g, back, glass, mirror };
    });

    // the closed form: one crystal pyramid, inner faces first, then the near faces over them
    const pyrGeo = pyramidGeometry();
    const pyr = new THREE.Group();
    const pyrBack = new THREE.Mesh(pyrGeo, pyramidMaterial('back')), pyrFront = new THREE.Mesh(pyrGeo, pyramidMaterial('front'));
    pyrBack.renderOrder = 40; pyrFront.renderOrder = 41;
    pyr.add(pyrBack, pyrFront); root.add(pyr);
    const pyrMirror = new THREE.Mesh(pyrGeo, pyramidMaterial('mirror'));
    pyrMirror.matrixAutoUpdate = false; pyrMirror.matrixWorldAutoUpdate = false; pyrMirror.renderOrder = 5; pyrMirror.frustumCulled = false;

    const art = makeStageArt(gl.capabilities.getMaxAnisotropy(), () => invalidate());
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), productMaterial());
    plane.renderOrder = 100;   // over the glass, so every part of the panel stays readable
    root.add(plane);
    // shards: small irregular triangles of glass
    const shardGeo = new THREE.BufferGeometry();
    shardGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, .05, 0, -.032, -.022, .004, .041, -.03, -.003], 3));
    shardGeo.computeVertexNormals();
    const shards = new THREE.InstancedMesh(shardGeo, shardMaterial(), SHARDS);
    shards.frustumCulled = false; shards.renderOrder = 120; shards.visible = false;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMaterial());
    floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), backdropMaterial());
    backdrop.renderOrder = -2;

    // the beam: a bright opaque core (so the glass refracts it) wrapped in soft glow
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.85, 1.75) }));
    const glowIn = new Ribbon(2, '#FFF7EC', 0, 1, .65), glowOut = new Ribbon(2, '#FFFFFF', .8, 0, .5);
    const launch = new Ribbon(32, '#E8C48C', .9, .1, .5);
    const ring = new Ribbon(97, '#8C7BFF', .55, .55, .45);
    const glints = new THREE.Points(new THREE.BufferGeometry(), glintMaterial());
    // one glint per layer, one where the beam enters, one for the flash when the panel breaks through
    glints.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SLABS + 2) * 3), 3));
    glints.geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(SLABS + 2), 1));
    glints.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(SLABS + 2), 1));
    glints.frustumCulled = false; glints.renderOrder = 210;

    return { root, geo, slabs, pyr, pyrBack, pyrFront, pyrMirror, art, plane, shards, floor, backdrop, core, glowIn, glowOut, launch, ring, glints };
  }, [gl, lowCost]);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { onScreen.current = e.isIntersecting; if (e.isIntersecting) invalidate(); });
    io.observe(gl.domElement);
    return () => io.disconnect();
  }, [gl, invalidate]);

  // ---------------------------------------------------------------- the palette's studio
  // pyramid faces, the split light on the floor, backdrop and floor tones, the closing paths;
  // applied once and again whenever the visitor switches palette
  useEffect(() => {
    const v3 = (hex: string) => new THREE.Vector3(...rgb(hex));
    const apply = () => {
      [world.pyrBack, world.pyrFront, world.pyrMirror].forEach(m => { (m.material as THREE.ShaderMaterial).uniforms.tints.value = palette.pyramid.map(v3); });
      const fu = (world.floor.material as THREE.ShaderMaterial).uniforms;
      fu.far.value = v3(palette.floor[0]); fu.near.value = v3(palette.floor[1]);
      fu.cFront.value = v3(palette.pyramid[0]); fu.cRight.value = v3(palette.pyramid[1]); fu.cLeft.value = v3(palette.pyramid[2]);
      const bu = (world.backdrop.material as THREE.ShaderMaterial).uniforms;
      bu.centre.value = v3(palette.backdrop[0]); bu.edge.value = v3(palette.backdrop[1]); bu.floorCol.value = v3(palette.floor[0]);
      bu.sky.value = palette.sky ? 1 : 0;
      if (palette.sky) {
        bu.auroraA.value = v3(palette.sky.aurora[0]); bu.auroraB.value = v3(palette.sky.aurora[1]); bu.auroraC.value = v3(palette.sky.aurora[2]);
        bu.skyTop.value = v3(palette.sky.top); bu.skyHorizon.value = v3(palette.sky.horizon);
      }
      world.launch.uniforms.color.value.set(palette.launch); world.ring.uniforms.color.value.set(palette.ring);
    };
    apply();
    return onPalette(() => { apply(); world.art.repaint(); invalidate(); });
  }, [world, invalidate]);

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
      Object.values(world.art.tex).forEach(t => t.dispose());
      [world.pyrBack, world.pyrFront, world.pyrMirror].forEach(m => (m.material as THREE.Material).dispose());
      world.pyrBack.geometry.dispose();
      [world.plane, world.shards, world.floor, world.backdrop, world.core, world.glints].forEach(m => { m.geometry.dispose(); (m.material as THREE.Material).dispose(); });
      [world.glowIn, world.glowOut, world.launch, world.ring].forEach(r => r.dispose());
      post.composer.dispose(); post.bloom.dispose();
    };
  }, [world, post, invalidate, onReady]);

  const v = useMemo(() => ({
    a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(),
    start: new THREE.Vector3(), mid: new THREE.Vector3(), end: new THREE.Vector3(), cs: new THREE.Vector3(), ce: new THREE.Vector3(),
    e2: new THREE.Vector3(), bp: [0, 0, 0] as [number, number, number],
    m: new THREE.Matrix4(), s: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), up: new THREE.Vector3(0, 1, 0),
    launch: Array.from({ length: 32 }, () => new THREE.Vector3()), ring: Array.from({ length: 97 }, () => new THREE.Vector3()),
  }), []);
  useEffect(() => { labelCache.current.stage = -1; }, [size]);

  // ---------------------------------------------------------------- every frame (only when invalidated)
  useFrame((_, delta) => {
    const s = story.state, stacked = story.mode === 'stack', reduce = story.reduce;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(.05, delta);
    let busy = false;

    const q = quality.current;
    if (delta > 0 && delta < .25) {
      q.avg += (delta * 1000 - q.avg) * .08;
      q.slow = q.avg > 24 ? q.slow + 1 : 0;
      if (q.slow > 45 && q.level < 2) {
        q.level++; q.slow = 0;
        setDpr(q.level === 1 ? 1.25 : 1);
        if (q.level === 2) post.bloom.enabled = false;
      }
    }

    const reveal = reduce ? 1 : clamp((performance.now() - born.current) / 1000);   // short, non-blocking light reveal
    if (reveal < 1) busy = true;

    // camera choreography, plus subtle desktop-only parallax added on top
    // phones use the pinned story too, framed for a tall screen
    const compact = !stacked && size.width < 900;
    const pose = cameraPose(s, size.width / size.height, stacked, compact);
    const allowParallax = !stacked && !reduce && story.finePointer;
    const px = allowParallax ? story.pointer.x : 0, py = allowParallax ? story.pointer.y : 0;
    parallax.current.x += (px - parallax.current.x) * (1 - Math.exp(-dt * 4));
    parallax.current.y += (py - parallax.current.y) * (1 - Math.exp(-dt * 4));
    if (Math.abs(px - parallax.current.x) + Math.abs(py - parallax.current.y) > .001) busy = true;
    cam.fov = pose.fov; cam.near = .1; cam.far = 80;
    cam.position.set(parallax.current.x * .2, pose.camY - parallax.current.y * .1, pose.dist);
    cam.lookAt(0, pose.lookY, 0);
    cam.updateProjectionMatrix();

    const root = world.root;
    root.position.set(pose.sculptX, pose.sculptY, 0);
    root.rotation.set(0, pose.yaw, 0);

    // the six layers
    const poses = slabPoses(s, story.hover);
    const br = breakState(s);
    const sc = stageColor(s.stageF);   // the active block glows in its stage's colour
    poses.forEach((p, i) => {
      const sl = world.slabs[i];
      sl.g.position.set(...p.pos);
      sl.g.rotation.set(...p.rot);
      sl.g.scale.setScalar(p.scale);
      sl.g.visible = sl.mirror.visible = p.fade > .001;
      const u = (sl.glass.material as THREE.ShaderMaterial).uniforms, ub = (sl.back.material as THREE.ShaderMaterial).uniforms;
      u.hl.value += (p.hl - u.hl.value) * (reduce ? 1 : 1 - Math.exp(-dt * 10));
      if (Math.abs(p.hl - u.hl.value) > .002) busy = true;
      u.reveal.value = ub.reveal.value = reveal; ub.hl.value = u.hl.value;
      u.fade.value = ub.fade.value = p.fade;
      u.hlColor.value.set(...sc); ub.hlColor.value.set(...sc);
      // the stages already behind keep a faint sketch of their work etched into the glass
      u.etch.value = ub.etch.value = p.etch * s.process;
    });

    // the pyramid: charges with light, trembles as it cracks, swells a touch as it bursts, re-forms at the end
    const whole = br.whole, shake = br.crack * .006;
    world.pyr.visible = world.pyrMirror.visible = whole > .001;
    world.pyr.position.set(Math.sin(s.p * 2900) * shake, Math.sin(s.p * 3700) * shake * .5, 0);
    world.pyr.rotation.set(0, -pose.yaw + PYR_TURN, Math.sin(s.p * 3100) * shake * 1.2);
    world.pyr.scale.setScalar(s.p < .5 ? 1 + (1 - whole) * .1 : .9 + whole * .1);
    for (const m of [world.pyrBack, world.pyrFront, world.pyrMirror]) {
      const pu = (m.material as THREE.ShaderMaterial).uniforms;
      pu.opacity.value = whole; pu.reveal.value = reveal; pu.alt.value = PYR_ALT;
      pu.charge.value = Math.max(br.charge, br.fuse * .55); pu.crack.value = br.crack;
    }

    // product plane
    // the panel turns to face the camera (about its vertical axis only), wherever the camera is
    const lc = v.e2.set(cam.position.x - pose.sculptX, cam.position.y - pose.sculptY, cam.position.z).applyAxisAngle(v.up, -pose.yaw);
    const pp = planePose(s, (px, pz) => Math.atan2(lc.x - px, lc.z - pz));
    world.plane.position.set(...pp.pos);
    world.plane.rotation.set(...pp.rot);
    world.plane.scale.set(pp.w * Math.max(.001, pp.show), pp.h * Math.max(.001, pp.show), 1);
    world.plane.visible = pp.show > .02;
    const pu = (world.plane.material as THREE.ShaderMaterial).uniforms;
    const [a, b, m] = artFor(s.stageF, s.tr, s.complete);
    pu.texA.value = world.art.tex[a]; pu.texB.value = world.art.tex[b]; pu.mixv.value = m;

    root.updateMatrixWorld(true);

    // draw the glass far to near (the panel is drawn last, over it)
    const order: { d: number; set: (o: number) => void }[] = world.slabs.map(sl => ({
      d: sl.g.getWorldPosition(v.a).distanceToSquared(cam.position),
      set: (o: number) => { sl.back.renderOrder = o; sl.glass.renderOrder = o + 1; },
    }));
    order.sort((x, y) => y.d - x.d).forEach((it, k) => it.set(10 + k * 3));

    // floor, backdrop and the slabs' reflections in the floor
    const fy = pose.sculptY + BASE_Y - FLOOR_OFFSET;
    world.floor.position.set(pose.sculptX, fy, 0);
    const fu = (world.floor.material as THREE.ShaderMaterial).uniforms;
    fu.center.value.set(pose.sculptX, 0); fu.reveal.value = reveal;
    world.backdrop.position.set(0, fy + 9, -14);
    world.backdrop.scale.set(70, 18, 1);
    const bu = (world.backdrop.material as THREE.ShaderMaterial).uniforms;
    bu.focus.value.set(.5 + pose.sculptX / 70, .32);
    if (bu.sky.value > 0) {
      const t = reduce ? 0 : performance.now() / 1000;
      bu.time.value = t; bu.hue.value = auroraHue(t);
      if (!reduce && onScreen.current) busy = true;
    }
    v.m.makeTranslation(0, 2 * fy, 0).multiply(v.s.makeScale(1, -1, 1));
    world.slabs.forEach((sl, i) => {
      sl.mirror.matrixWorld.multiplyMatrices(v.m, sl.glass.matrixWorld);
      const mu = (sl.mirror.material as THREE.ShaderMaterial).uniforms;
      mu.floorY.value = fy; mu.hl.value = poses[i].hl; mu.reveal.value = reveal * poses[i].fade;
    });
    world.pyrMirror.matrixWorld.multiplyMatrices(v.m, world.pyrFront.matrixWorld);
    (world.pyrMirror.material as THREE.ShaderMaterial).uniforms.floorY.value = fy;
    // the pyramid's split light on the floor in front of it
    fu.caustic.value = whole;
    fu.cGreen.value.set(pose.sculptX - .32, .5); fu.cAmber.value.set(pose.sculptX + .3, .56);
    // a warm pool of light on the floor under the active block
    const act = world.slabs[activeBlock(s.stage)].g.getWorldPosition(v.a);
    fu.glowAt.value.set(act.x, act.z); fu.glow.value = s.process * (1 - s.tr * 1.5); fu.glowColor.value.set(...sc);

    // the beam enters from the left, crosses every layer and fades after the last
    let minZ = Infinity, maxZ = -Infinity;
    for (const p of poses) { minZ = Math.min(minZ, p.pos[2]); maxZ = Math.max(maxZ, p.pos[2]); }
    const first = minZ - SLAB_DEPTH, last = maxZ + SLAB_DEPTH / 2;
    const toWorld = (x: number, y: number, z: number, out: THREE.Vector3) => out.set(x, y, z).applyMatrix4(root.matrixWorld);
    const eo = smooth(.3, 1, s.open);
    const onBeam = (u: number, out: THREE.Vector3) => { beamAt(u, eo, v.bp); return toWorld(v.bp[0], v.bp[1], v.bp[2], out); };
    const lead = 1.0 + 2.4 * smooth(.2, .8, s.open);   // beside the hero copy, not across it
    const start = onBeam(first - lead, v.start), mid = onBeam(last, v.mid);
    const end = onBeam(last + 2.6 - 1.9 * s.process, v.end);
    world.glowIn.update([start, mid], cam, .006, .016); world.glowIn.uniforms.prog.value = reveal;
    world.glowOut.update([mid, end], cam, .016, .01); world.glowOut.uniforms.prog.value = smooth(.6, 1, reveal);
    const cs = v.cs.copy(start).lerp(mid, .3), ce = v.ce.copy(mid).lerp(end, .25);
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
      onBeam(p.pos[2], v.d); gp.setXYZ(i, v.d.x, v.d.y, v.d.z);
      gs.setX(i, (.4 + p.hl * .4) * size.height * .06); ga.setX(i, (.22 + p.hl * .4) * reveal * p.fade);
      // where the beam crosses this block, in the block's own frame, so the glass lights along it
      const sl = world.slabs[i], by = sl.g.worldToLocal(v.e2.copy(v.d)).y;
      (sl.glass.material as THREE.ShaderMaterial).uniforms.beamY.value = (sl.back.material as THREE.ShaderMaterial).uniforms.beamY.value = by;
    });
    onBeam(first + SLAB_DEPTH * .3, v.d); gp.setXYZ(SLABS, v.d.x, v.d.y, v.d.z);
    gs.setX(SLABS, size.height * .14); ga.setX(SLABS, .5 * reveal);

    // breaking: when the prism shatters open the flare sits at its heart and the glass flies out all
    // around; when the panel breaks through a layer the flare sits on that layer and shards fly toward the viewer
    const transit = panelTransit(s);
    const shatter = br.burst > .001 && br.burst < .999;
    const hit = shatter || br.flash > .001 || br.fuse > .001
      ? toWorld(0, BEAM_Y + .04, 0, v.c)
      : toWorld(pp.pos[0] - .06, pp.pos[1] - pp.h * .05, poses[transit.crossSlab].pos[2], v.c);
    const flare = Math.max(transit.flash * .32, br.flash * .55, br.fuse * .3);
    gp.setXYZ(SLABS + 1, hit.x, hit.y, hit.z);
    gs.setX(SLABS + 1, size.height * flare); ga.setX(SLABS + 1, Math.min(1, flare * 2.8));
    const burst = shatter ? br.burst : transit.burst;
    world.shards.visible = burst > .001 && burst < .999;
    if (world.shards.visible) {
      (world.shards.material as THREE.ShaderMaterial).uniforms.opacity.value = Math.pow(1 - burst, 1.3) * smooth(0, .06, burst);
      const reach = shatter ? 2.4 : 1, grow = shatter ? 1.7 : 1;
      SHARD_SET.forEach((sh, i) => {
        v.a.copy(shatter ? sh.out : sh.dir).applyQuaternion(root.quaternion).multiplyScalar(sh.dist * reach * burst);
        v.b.copy(hit).add(v.a).add(v.d.copy(sh.offset).multiplyScalar(1 - burst * .5)); v.b.y -= burst * burst * .32 * reach;
        v.q.setFromEuler(v.e.set(sh.spin.x * burst, sh.spin.y * burst, sh.spin.z * burst));
        v.m.compose(v.b, v.q, v.d.setScalar(sh.size * grow * (1 - burst * .4)));
        world.shards.setMatrixAt(i, v.m);
      });
      world.shards.instanceMatrix.needsUpdate = true;
    }
    (world.glints.material as THREE.ShaderMaterial).uniforms.scale.value = gl.getPixelRatio();
    gp.needsUpdate = gs.needsUpdate = ga.needsUpdate = true;

    // launch path and the return ring
    const pa = paths(s);
    if (pa.launch > .01) {
      for (let i = 0; i < 32; i++) {
        const t = i / 31;
        toWorld(pp.pos[0] - .05 * t, pp.pos[1] + pp.h * .1 + Math.pow(t, 1.6) * .55, pp.pos[2] + .05 + t * 2.4, v.launch[i]);
      }
      world.launch.update(v.launch, cam, .01, .018);
      world.launch.uniforms.prog.value = pa.launch;
    }
    world.launch.mesh.visible = pa.launch > .01;
    if (pa.ring > .01) {
      const rz = 1.0 + pa.ringOpen * 1.0, rx = .8 + pa.ringOpen * .2;
      for (let i = 0; i <= 96; i++) {
        const ang = Math.PI * .5 + (i / 96) * Math.PI * 2;
        toWorld(rx * Math.sin(ang), .02 + .1 * Math.sin(ang), rz * Math.cos(ang), v.ring[i]);
      }
      world.ring.update(v.ring, cam, .01, .01);
      world.ring.uniforms.prog.value = pa.ring;
    }
    world.ring.mesh.visible = pa.ring > .01;

    // leader line from the active layer's apex to its label (desktop only)
    const leader = story.leader;
    if (leader) {
      const show = !stacked && s.process > .6 && s.tr < .2;
      const label = show ? story.stageEls[s.stage]?.querySelector('.stage-label') : null;
      if (label) {
        world.slabs[activeBlock(s.stage)].g.localToWorld(v.d.set(0, APEX_Y + .03, 0)).project(cam);
        const ax = (v.d.x * .5 + .5) * size.width, ay = (-v.d.y * .5 + .5) * size.height;
        const lc = labelCache.current, now = performance.now();
        if (lc.stage !== s.stage || now - lc.at > 400) {
          const r = label.getBoundingClientRect(), host = gl.domElement.getBoundingClientRect();
          lc.stage = s.stage; lc.at = now; lc.x = r.left - host.left - 18; lc.y = r.top - host.top + r.height / 2;
        }
        leader.line.setAttribute('x1', ax.toFixed(1)); leader.line.setAttribute('y1', ay.toFixed(1));
        leader.line.setAttribute('x2', lc.x.toFixed(1)); leader.line.setAttribute('y2', lc.y.toFixed(1));
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
      <primitive object={world.pyrMirror} />
      <primitive object={world.core} />
      <primitive object={world.glowIn.mesh} />
      <primitive object={world.glowOut.mesh} />
      <primitive object={world.launch.mesh} />
      <primitive object={world.ring.mesh} />
      <primitive object={world.glints} />
      <primitive object={world.shards} />
    </>
  );
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const lowCost = typeof window !== 'undefined' && (matchMedia('(max-width: 899px)').matches || matchMedia('(pointer: coarse)').matches);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, lowCost ? 1.25 : 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: FOV, position: [0, .4, 4.4], near: .1, far: 80 }}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0 }}
    >
      <PrismWorld onReady={onReady} lowCost={lowCost} />
    </Canvas>
  );
}
