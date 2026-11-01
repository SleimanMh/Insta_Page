import * as THREE from 'three';

// The scene renders into a linear buffer and is tone mapped once at the end (see Scene.tsx).
// Hand-written shaders below are authored in display colours, so they convert to linear on output.
export const TO_LINEAR = 'vec3 toLin(vec3 c){ return pow(max(c, vec3(0.0)), vec3(2.2)); }';

const slabVertex = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal); vLN = normal; vLP = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const HUE = 'vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }';

/** Reflections of a small photo studio: soft top light, two tall strip lights, a warm key. */
const STUDIO = /* glsl */`
  vec3 studio(vec3 r){
    float az = atan(r.x, r.z);
    float top = smoothstep(.45, .92, r.y);
    float band = smoothstep(-.3, .15, r.y) * smoothstep(.85, .45, r.y);
    float stripL = smoothstep(.1, .0, abs(az + 2.1)) * band;
    float stripR = smoothstep(.08, .0, abs(az - 1.45)) * band;
    float front  = smoothstep(.07, .0, abs(az - .35)) * band;
    float key = pow(max(dot(r, normalize(vec3(-.55, .5, .65))), 0.0), 28.0);
    float horizon = exp(-pow(r.y * 7.0, 2.0));
    return vec3(1.0) * top * .85 + vec3(1.0, .97, .92) * stripL * 1.7 + vec3(.86, .83, 1.0) * stripR * 1.1
         + vec3(1.0) * front * 1.0 + vec3(1.0, .86, .66) * key * 2.0 + vec3(.55, .55, .6) * horizon * .3;
  }`;

/** Spectral rays fanning out from a golden core at q = 0, the light inside a charged crystal. */
const RAYS = /* glsl */`
  vec4 rays(vec2 q, float seed){
    float r = length(q), ang = atan(q.y, q.x);
    float k = pow(.5 + .5 * sin(ang * 9.0 + seed * 6.3 + sin(ang * 4.0 + seed * 2.0) * 1.4), 7.0)
            + .55 * pow(.5 + .5 * sin(ang * 21.0 - seed * 3.1), 16.0);
    vec3 spec = mix(hue(fract(ang * .17 + seed * .23 + r * .5)), vec3(1.0), .12);
    float core = exp(-r * r / .0025), halo = exp(-r * r / .04);
    vec3 c = spec * k * exp(-r * 2.2) * 2.0 + vec3(1.0, .82, .55) * (core * 1.6 + halo * .22);
    return vec4(c, k * exp(-r * 2.2) * .55 + core * .7 + halo * .12);
  }`;

/** Straight, kinked fracture lines radiating from an impact point at p = 0; they grow with amt. */
const FRACTURE = /* glsl */`
  float rnd(float n){ return fract(sin(n) * 43758.5453); }
  float fracture(vec2 p, float amt, float sd){
    float acc = exp(-dot(p, p) / .0006) * 1.5;
    for (int k = 0; k < 8; k++){
      float fk = float(k);
      float a = fk * .785 + (rnd(fk * 12.99 + sd) - .5) * .6;
      vec2 dir = vec2(cos(a), sin(a));
      float along = dot(p, dir);
      float len = (.22 + .5 * rnd(fk * 7.31 + 3.0 + sd)) * amt;
      float off = dot(p, vec2(-dir.y, dir.x)) + (abs(fract(along * 6.0 + rnd(fk + sd)) - .5) - .25) * .03;
      float w = .004 * (1.0 - clamp(along / max(len, 1e-3), 0.0, 1.0) * .75);
      acc += smoothstep(w, 0.0, abs(off)) * step(0.0, along) * smoothstep(len, len - .06, along);
      // a short branch from part way along each line
      vec2 bdir = vec2(cos(a + .7), sin(a + .7));
      vec2 bp = p - dir * len * .45;
      float bal = dot(bp, bdir), boff = dot(bp, vec2(-bdir.y, bdir.x)) + (abs(fract(bal * 9.0 + fk * .3) - .5) - .25) * .016;
      acc += smoothstep(.003, 0.0, abs(boff)) * step(0.0, bal) * smoothstep(len * .35, len * .3, bal) * .8;
    }
    return acc;
  }`;

/**
 * A thick block of clear optical glass, stylised: a nearly clear body, studio reflections, wide bright
 * bevels, internal reflection lines that follow the triangle's edges, thin rainbow fringes at the edges,
 * and light scattered where the beam passes through. Champagne edges and a soft spectral glow from
 * inside (`radiant`) mark the active stage; `fade` lets the block emerge from the breaking pyramid.
 */
export function crystalMaterial(back: boolean, tri: THREE.Vector2[], seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      hl: { value: 0 }, reveal: { value: 0 }, beamY: { value: 0 }, side: { value: back ? .5 : 1 }, fade: { value: 1 },
      triA: { value: tri[0] }, triB: { value: tri[1] }, triC: { value: tri[2] },
      radiant: { value: 0 }, glowC: { value: new THREE.Vector2(0, -.17) }, seed: { value: seed }, etch: { value: 0 },
      hlColor: { value: new THREE.Vector3(1, .78, .5) },
    },
    vertexShader: slabVertex,
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      ${HUE}
      ${STUDIO}
      ${RAYS}
      uniform float hl; uniform float reveal; uniform float beamY; uniform float side; uniform float fade;
      uniform vec2 triA; uniform vec2 triB; uniform vec2 triC;
      uniform float radiant; uniform vec2 glowC; uniform float seed; uniform float etch; uniform vec3 hlColor;
      varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;

      // signed distance to the block's triangle; negative inside
      float sdTri(vec2 p){
        vec2 e0 = triB - triA, e1 = triC - triB, e2 = triA - triC;
        vec2 v0 = p - triA, v1 = p - triB, v2 = p - triC;
        vec2 q0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
        vec2 q1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
        vec2 q2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
        float s = sign(e0.x * e2.y - e0.y * e2.x);
        vec2 d = min(min(vec2(dot(q0, q0), s * (v0.x * e0.y - v0.y * e0.x)),
                         vec2(dot(q1, q1), s * (v1.x * e1.y - v1.y * e1.x))),
                         vec2(dot(q2, q2), s * (v2.x * e2.y - v2.y * e2.x)));
        return -sqrt(d.x) * sign(d.y);
      }

      // outline of a box (centre, half size), as a thin line
      float box(vec2 p, vec2 c, vec2 h){ vec2 q = abs(p - c) - h; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); return smoothstep(.004, .0, abs(d)); }
      float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return smoothstep(.0035, .0, length(pa - ba * t)); }
      // a small interface wireframe: a frame, a header, an image tile with a mark, a tile with a circle, lines of text
      float sketch(vec2 p){
        float k = box(p, vec2(0.0, -.03), vec2(.17, .2));
        k += seg(p, vec2(-.17, .12), vec2(.17, .12));
        k += box(p, vec2(-.075, .02), vec2(.07, .07)) + seg(p, vec2(-.145, -.05), vec2(-.005, .09)) + seg(p, vec2(-.145, .09), vec2(-.005, -.05));
        k += box(p, vec2(.085, .02), vec2(.06, .07)) + smoothstep(.004, .0, abs(length(p - vec2(.085, .02)) - .04));
        k += seg(p, vec2(-.145, -.1), vec2(.1, -.1)) + seg(p, vec2(-.145, -.14), vec2(.05, -.14)) + seg(p, vec2(-.145, -.18), vec2(.12, -.18));
        k += box(p, vec2(.125, .155), vec2(.02, .012));
        return min(k, 1.0);
      }

      void main(){
        vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vWP);
        float c = clamp(abs(dot(N, V)), 0.0, 1.0);
        float F = .07 + .93 * pow(1.0 - c, 4.0);
        vec3 refl = studio(reflect(-V, N));

        vec3 ln = normalize(vLN);
        float bevel = smoothstep(.2, .62, min(abs(ln.z), length(ln.xy)));
        float face = smoothstep(.9, .98, abs(ln.z));
        float rim = (1.0 - abs(ln.z)) * (1.0 - bevel);

        float d = -sdTri(vLP.xy);                                       // distance in from the edge
        float shimmer = .5 + .5 * sin(dot(V, vec3(3.0, 1.2, 2.0)) * 3.0 + vLP.x * 4.0);
        float inner1 = exp(-pow((d - .035) / .006, 2.0));
        float inner2 = exp(-pow((d - .13) / .014, 2.0));
        float fringe = smoothstep(.014, .022, d) * smoothstep(.04, .03, d);
        vec3 rainbow = hue(fract((d - .014) / .026 + dot(V, N) * .8)) * fringe;

        float beamCore = exp(-pow((vLP.y - beamY) / .02, 2.0)) * reveal;
        float beamWide = exp(-pow((vLP.y - beamY) / .13, 2.0)) * reveal;

        vec3 champ = mix(vec3(.96, .93, .88), hlColor, hl);
        // Solid clear glass, seen as it photographs: the faces are smoky and see-through, lit by a soft haze
        // that drifts across them with the viewing angle; near the edges the thickness shows as a brighter
        // refracted band with a thin internal reflection; the polished chamfers catch the studio lights;
        // the narrow sides stay dark with sharp streaks.
        vec3 thru = studio(refract(-V, N, .66));
        vec2 hdir = vec2(cos(seed * 1.7 + .6), sin(seed * 1.7 + .6));
        float haze = pow(smoothstep(-.45, .55, dot(vLP.xy, hdir) + dot(V, vec3(.5, .2, .4)) * .6), 2.2);
        float edgeBand = smoothstep(.07, .0, d) * smoothstep(-.01, .015, d);
        float sweep = smoothstep(.0, .35, .35 - abs(vLP.x * .8 - vLP.y + dot(V, vec3(.9, .3, .6)) * .5 - .1)) * face;
        // the faces are dense enough to veil what stands behind them, as thick glass does
        vec3 faceCol = vec3(.07, .07, .075) + thru * .14 + vec3(.66, .66, .68) * haze * .24 + vec3(.8, .79, .8) * edgeBand * .14
          + vec3(.95) * inner1 * .22 * (.6 + .4 * shimmer) + vec3(.9, .9, .95) * inner2 * .05 + rainbow * .06 + vec3(.92) * sweep * .2;
        float faceA = .5 + haze * .2 + edgeBand * .12 + inner1 * .15 + sweep * .1 + F * .35;
        vec3 rimCol = vec3(.06, .06, .065) + refl * (F * .9 + .3);
        float rimA = .55 + F * .3;
        vec3 bevCol = refl * .75 + vec3(.2, .2, .2) + champ * hl * .9;
        float bevA = .78;
        float sideW = max(rim, 0.0), faceW = face * (1.0 - bevel);
        vec3 col = faceCol * faceW + rimCol * sideW * (1.0 - face) + bevCol * bevel
          + refl * F * .6 * (1.0 - bevel)
          + vec3(1.0, .97, .93) * (beamCore * .9 + beamWide * .12) * face
          + champ * hl * (.04 + bevel * .45 + sideW * .3);
        float a = faceA * faceW + rimA * sideW * (1.0 - face) + bevA * bevel + face * (beamCore * .7 + beamWide * .08) + hl * (.03 + sideW * .2);

        if (etch > .001) {
          float k = sketch(vLP.xy * vec2(sign(vLP.z), 1.0)) * face * etch;
          col += vec3(.86, .85, .88) * k * .22;
          a += k * .14;
        }
        if (radiant > .001) {
          vec4 r = rays(vLP.xy - glowC, seed);
          float amt = radiant * mix(.7, smoothstep(.0, .035, d), face);
          col += r.rgb * amt + vec3(1.0, .86, .62) * bevel * radiant * .7;
          a += r.a * amt + bevel * radiant * .25;
        }
        gl_FragColor = vec4(toLin(col), clamp(a, 0.0, .96) * side * fade);
      }`,
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
  });
}

/**
 * The closed crystal pyramid. Light splits inside it: the inner faces glow green, amber and magenta,
 * brightest toward the base, with sharp boundaries where the faces meet; the edges are bright bevels
 * with spectral fringes. `charge` fills it with rays, `crack` spreads fractures, `opacity` fades it as it
 * shatters. The mirror variant draws its reflection in the floor, fading below it.
 */
export function pyramidMaterial(mode: 'back' | 'front' | 'mirror') {
  return new THREE.ShaderMaterial({
    uniforms: {
      opacity: { value: 1 }, reveal: { value: 0 }, charge: { value: 0 }, crack: { value: 0 }, floorY: { value: 0 },
      alt: { value: 1 }, mode: { value: mode === 'back' ? 0 : mode === 'front' ? 1 : 2 }, time: { value: 0 },
      tints: { value: [new THREE.Vector3(.95, .3, .75), new THREE.Vector3(1, .52, .1), new THREE.Vector3(.12, .95, .55), new THREE.Vector3(1, .8, .35)] },
    },
    vertexShader: /* glsl */`
      attribute vec3 aBary; attribute float aFace;
      varying vec3 vB; varying float vF; varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;
      void main(){
        vB = aBary; vF = aFace; vLP = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      ${HUE}
      ${STUDIO}
      ${RAYS}
      ${FRACTURE}
      uniform float opacity; uniform float reveal; uniform float charge; uniform float crack; uniform float floorY;
      uniform float alt; uniform float mode; uniform vec3 tints[4]; uniform float time;
      varying vec3 vB; varying float vF; varying vec3 vWN; varying vec3 vWP; varying vec3 vLP;

      // the light inside drifts: a smooth field through the volume, so colour flows across face boundaries
      float field(vec3 p){
        return sin(p.x * 3.4 + time * .55) + sin(p.y * 4.1 - time * .42 + p.z * 2.7) + sin((p.x + p.z) * 2.9 + time * .33)
             + .5 * sin((p.y - p.x) * 6.3 - time * .7);
      }
      // a smooth cycle through the four colours the pyramid splits light into
      vec3 ramp(float h){
        h = fract(h) * 4.0; float i = floor(h), f = smoothstep(0.0, 1.0, h - i);
        vec3 a = i < .5 ? tints[0] : i < 1.5 ? tints[1] : i < 2.5 ? tints[2] : tints[3];
        vec3 b = i < .5 ? tints[1] : i < 1.5 ? tints[2] : i < 2.5 ? tints[3] : tints[0];
        return mix(a, b, f);
      }

      void main(){
        vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
        vec3 V = normalize(cameraPosition - vWP);
        float c = clamp(abs(dot(N, V)), 0.0, 1.0);
        float F = .06 + .94 * pow(1.0 - c, 4.0);

        // distance to the nearest edge of this face, and which edge it is
        float m = min(min(vB.x, vB.y), vB.z), d = m * alt;
        float edgeId = vB.x == m ? 0.0 : vB.y == m ? 1.0 : 2.0;
        float edge = exp(-pow(d / .014, 2.0));
        float bevel = smoothstep(.034, .012, d);
        float inner = exp(-pow((d - .05) / .008, 2.0));
        float fringeBand = smoothstep(.012, .022, d) * smoothstep(.06, .03, d);
        // each edge carries its own colour, as in a real crystal: magenta, gold, a cool white
        vec3 fringe = edgeId < .5 ? vec3(1.0, .35, .75) : edgeId < 1.5 ? vec3(1.0, .78, .35) : vec3(.85, .9, 1.0);
        fringe = mix(fringe, hue(fract(d * 9.0 + dot(V, N) * .5 + vF * .2)), .25);

        // the colour each face carries once the light has split, flowing slowly through the glass
        float fl = field(vLP * 1.15);
        vec3 tint = ramp(fl * .09 + vLP.y * .35 - time * .045 + vF * .25);
        // thin bright filaments of light, like caustics drifting through water
        float caustic = pow(.5 + .5 * sin(fl * 2.4), 7.0) + .6 * pow(.5 + .5 * sin(field(vLP * 2.1 + 3.0) * 1.9), 9.0);
        float toBase = pow(1.0 - vB.z, 1.6);                         // brightest toward the floor
        float lateral = .45 + .55 * smoothstep(.0, .8, abs(vF - 1.0) < .5 ? vB.x : vB.y);
        float band = smoothstep(.0, .25, vB.x) * smoothstep(.0, .25, vB.y);

        vec3 col; float a;
        if (mode < .5) {
          // the inside of the far faces: saturated split light with sharp boundaries at the inner edges
          float glow = toBase * lateral * band * (.75 + .25 * sin(fl * .9));
          col = tint * glow * 2.5 + mix(vec3(1.0), tint, .45) * caustic * band * .6 + mix(vec3(1.0), tint, .5) * inner * .35 + vec3(.05, .06, .09);
          a = .22 + glow * .65 + caustic * band * .25 + inner * .25;
        } else {
          // the near faces: clear glass, studio reflections, bright bevelled edges with spectral fringes
          // the near faces: clear glass. Studio reflections, a soft sheen that slides across as the pyramid
          // turns, bright bevelled edges with spectral fringes, and the inner light seen through the surface
          vec3 refl = studio(reflect(-V, N));
          vec3 vh = vec3(V.x, 0.0, V.z), nh = vec3(N.x, 0.0, N.z);   // horizontal directions; the base has none, so guard the length
          float sheen = pow(max(0.0, 1.0 - abs(dot(vh / max(length(vh), 1e-4), nh / max(length(nh), 1e-4)) - .55) * 3.0), 3.0) * step(.05, length(nh));
          col = refl * F * 1.45 + vec3(.9, .95, 1.0) * sheen * .12 + vec3(.98, .97, 1.0) * (edge * .55 + bevel * .25) + fringe * fringeBand * .4
              + vec3(.95) * inner * .3 + tint * (toBase * .14 + caustic * .08) + vec3(.03, .035, .05);
          a = .1 + F * .6 + sheen * .06 + edge * .5 + bevel * .32 + fringeBand * .3 + inner * .22 + caustic * .04;
        }

        // face-local 2D coordinates (edge 1, centroid at the origin) for the rays and the fractures
        vec2 fp = vB.y * vec2(1.0, 0.0) + vB.z * vec2(.5, .866) - vec2(.5, .2887);
        if (charge > .001) {
          vec4 r = rays(fp - vec2(0.0, -.17), vF * 1.9 + .4);
          float k = charge * (mode < .5 ? 1.0 : .55);
          col += r.rgb * k + vec3(1.0, .86, .62) * bevel * charge * .8;
          a += r.a * k + bevel * charge * .3;
        }
        if (crack > .001 && abs(mode - 1.0) < .5) {
          float f = fracture(fp - vec2(.04, -.06), crack, vF * 3.0) * smoothstep(.0, .2, crack);
          col += vec3(1.0, .97, .92) * f * 2.2;
          a += f * .9;
        }
        if (mode > 1.5) {
          // reflected in the floor: dimmer, fading quickly below it
          float fall = exp(-max(0.0, floorY - vWP.y) * 7.0);
          gl_FragColor = vec4(toLin(col) * fall * .06 * reveal, 1.0);
          gl_FragColor.rgb *= opacity;
          return;
        }
        gl_FragColor = vec4(toLin(col), clamp(a, 0.0, .96) * opacity * (mode < .5 ? .7 : 1.0));
      }`,
    transparent: true, depthWrite: false,
    side: mode === 'back' ? THREE.BackSide : mode === 'front' ? THREE.FrontSide : THREE.DoubleSide,
    blending: mode === 'mirror' ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthTest: mode !== 'mirror',
  });
}

/** Glass shards thrown off when the panel breaks through a layer: bright edges, fading out. */
export function shardMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV;
      void main(){
        vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform float opacity; varying vec3 vN; varying vec3 vV;
      void main(){
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float glint = pow(facing, 12.0);
        vec3 c = mix(vec3(.75, .76, .82), vec3(1.0, .93, .8), glint);
        gl_FragColor = vec4(toLin(c) * (1.0 + glint * 2.0), (.35 + .65 * (1.0 - facing) + glint) * opacity);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
}

/** A cheap stand-in for each slab's reflection in the glossy floor; fades with distance below it. */
export function floorReflectionMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { floorY: { value: 0 }, hl: { value: 0 }, reveal: { value: 0 } },
    vertexShader: slabVertex,
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform float floorY; uniform float hl; uniform float reveal;
      varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;
      void main(){
        vec3 ln = normalize(vLN);
        float bevel = smoothstep(.2, .62, min(abs(ln.z), length(ln.xy)));
        vec3 N = normalize(vWN), V = normalize(cameraPosition - vWP);
        float F = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);
        float fade = exp(-max(0.0, floorY - vWP.y) * 3.2) * reveal;
        vec3 c = (vec3(.85, .84, .9) * (.05 + F * .25) + mix(vec3(.9, .88, .95), vec3(1.0, .8, .55), hl) * bevel * (.35 + hl * .5)) * fade * .3;
        gl_FragColor = vec4(toLin(c), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
}

/** Glossy black floor that dissolves into the backdrop with distance. */
export function floorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      center: { value: new THREE.Vector2() }, reveal: { value: 0 },
      caustic: { value: 0 }, cGreen: { value: new THREE.Vector2() }, cAmber: { value: new THREE.Vector2() },
      glow: { value: 0 }, glowAt: { value: new THREE.Vector2() }, glowColor: { value: new THREE.Vector3(1, .78, .5) },
      far: { value: new THREE.Vector3(.05, .05, .055) }, near: { value: new THREE.Vector3(.1, .098, .1) },
      cLeft: { value: new THREE.Vector3(.1, .75, .45) }, cRight: { value: new THREE.Vector3(1, .5, .12) }, cFront: { value: new THREE.Vector3(.85, .3, .65) },
    },
    vertexShader: 'varying vec3 vWP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform vec2 center; uniform float reveal; varying vec3 vWP;
      uniform float caustic; uniform vec2 cGreen; uniform vec2 cAmber; uniform float glow; uniform vec2 glowAt; uniform vec3 glowColor;
      uniform vec3 far; uniform vec3 near; uniform vec3 cLeft; uniform vec3 cRight; uniform vec3 cFront;
      // a soft streak of coloured light thrown forward across the floor
      float streak(vec2 p, vec2 at, vec2 size){ vec2 q = (p - at) / size; return exp(-dot(q, q)) * smoothstep(-1.6, -.2, q.y); }
      void main(){
        vec2 d = vWP.xz - center;
        float pool = exp(-dot(d * vec2(.4, .8), d * vec2(.4, .8)) / 2.4);
                vec3 c = mix(far, near, pool) + vec3(.12, .11, .1) * pool * pool * .35 * reveal;
        // the pyramid's split light, landing on the floor in front of it
        c += (cLeft * streak(vWP.xz, cGreen, vec2(.2, .55)) + cRight * streak(vWP.xz, cAmber, vec2(.24, .6))
            + cFront * streak(vWP.xz, (cGreen + cAmber) * .5 + vec2(0.0, .5), vec2(.12, .3)) * .5) * caustic * reveal * .9;
        // warm light pooled under the active block, stretched toward the viewer
        vec2 gq = (vWP.xz - glowAt) / vec2(.5, .32);
        c += glowColor * exp(-dot(gq, gq)) * glow * .22 * reveal;
        gl_FragColor = vec4(toLin(c), 1.0);
      }`,
  });
}

/** Deep graphite backdrop with a soft lift behind the sculpture. Opaque, so the glass refracts it. */
export function backdropMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      focus: { value: new THREE.Vector2(.6, .5) }, centre: { value: new THREE.Vector3(.19, .188, .19) }, edge: { value: new THREE.Vector3(.06, .06, .065) }, floorCol: { value: new THREE.Vector3(.05, .05, .055) },
      sky: { value: 0 }, time: { value: 0 }, hue: { value: 0 },
      auroraA: { value: new THREE.Vector3() }, auroraB: { value: new THREE.Vector3() }, auroraC: { value: new THREE.Vector3() },
      skyTop: { value: new THREE.Vector3() }, skyHorizon: { value: new THREE.Vector3() },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform vec2 focus; uniform vec3 centre; uniform vec3 edge; uniform vec3 floorCol; varying vec2 vUv;
      uniform float sky; uniform float time; uniform float hue;
      uniform vec3 auroraA; uniform vec3 auroraB; uniform vec3 auroraC; uniform vec3 skyTop; uniform vec3 skyHorizon;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }
      // turn a colour around the grey axis: the aurora's hues drift while staying an aurora
      vec3 hueTurn(vec3 c, float a){ const vec3 k = vec3(.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }

      // A northern sky: stars that twinkle, and curtains of light that fold and drift, green at their
      // lower edge, rising through teal into violet. q is in world units across the backdrop.
      vec3 northernSky(vec2 q){
        vec3 c = mix(skyHorizon, skyTop, smoothstep(.0, 6.0, q.y));
        // stars, two sizes, thinning toward the horizon
        for (int l = 0; l < 2; l++){
          float s = l == 0 ? 7.0 : 3.2;
          vec2 g = q * s, id = floor(g), f = fract(g) - .5;
          float h = hash(id + float(l) * 17.0);
          vec2 o = (vec2(hash(id + 3.1), hash(id + 7.7)) - .5) * .6;
          float on = step(l == 0 ? .955 : .985, h);
          float tw = .55 + .45 * sin(time * (1.2 + h * 3.0) + h * 60.0);
          c += vec3(.85, .9, 1.0) * on * tw * smoothstep(l == 0 ? .12 : .16, .0, length(f - o)) * (l == 0 ? 1.0 : 1.6) * smoothstep(.4, 2.2, q.y);
        }
        // three curtains at different heights and speeds
        vec3 aur = vec3(0.0);
        for (int k = 0; k < 3; k++){
          float fk = float(k);
          // each curtain drifts sideways at its own pace as it folds
          float x = (q.x + time * (.35 + fk * .18) * (k == 1 ? -1.0 : 1.0)) * (.22 + fk * .05) + fk * 3.7;
          float base = 1.55 + fk * .5 + .55 * sin(x * 1.1 + time * (.16 + fk * .05)) + 1.1 * (fbm(vec2(x * .8, time * .07 + fk)) - .5);
          float d = q.y - base;
          // a sharp lower hem and a long fade upward
          float band = d < 0.0 ? exp(-d * d / .02) : exp(-d * d / (1.1 + fk * .4));
          float rays = .35 + .9 * fbm(vec2((q.x + time * .5) * (1.6 + fk * .3) + fk * 9.0, time * .24));
          float fold = .55 + .45 * fbm(vec2(x * 2.4, time * .11 + fk * 5.0));
          vec3 col = mix(auroraA, auroraB, smoothstep(.0, .9, d));
          col = mix(col, auroraC, smoothstep(.7, 2.2, d));
          aur += col * band * rays * fold * (k == 1 ? 1.0 : .7);
        }
        c += hueTurn(aur, hue) * .4;
        return c;
      }

      void main(){
        vec2 d = (vUv - focus) * vec2(1.8, 1.0);
        vec3 c = mix(centre, edge, smoothstep(0.0, .7, length(d)));
        if (sky > .001) {
          vec2 q = vec2((vUv.x - .5) * 70.0, vUv.y * 18.0);
          c = mix(c, northernSky(q), sky);
        }
        // the backdrop curves into the floor without a seam, like a studio cyclorama
        c = mix(floorCol, c, smoothstep(.0, .3, vUv.y));
        gl_FragColor = vec4(toLin(c), 1.0);
      }`,
    depthWrite: false,
  });
}

/** The product plane: two stage images blended; drawn over the glass so it stays legible. */
export function productMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { texA: { value: null }, texB: { value: null }, mixv: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform sampler2D texA; uniform sampler2D texB; uniform float mixv; varying vec2 vUv;
      void main(){
        vec4 c = mix(texture2D(texA, vUv), texture2D(texB, vUv), mixv);
        gl_FragColor = vec4(toLin(c.rgb), c.a);
      }`,
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  });
}

/**
 * The pyramid's edges as polished glass rods: a bright core where they face the camera, a cool rim,
 * a faint spectral fringe and a highlight that slides along them as the pyramid turns.
 */
export function edgeGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 1 }, time: { value: 0 }, charge: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vWP; varying float vAlong; void main(){ vAlong = uv.y; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      ${HUE}
      uniform float opacity; uniform float time; uniform float charge;
      varying vec3 vN; varying vec3 vWP; varying float vAlong;
      void main(){
        vec3 N = normalize(vN), V = normalize(cameraPosition - vWP);
        float f = abs(dot(N, V));
        float core = pow(f, 6.0), rim = pow(1.0 - f, 2.5);
        float glint = exp(-pow((fract(vAlong * .8 - time * .12) - .5) / .06, 2.0));
        vec3 col = vec3(.95, .97, 1.0) * (core * .8 + glint * .9) + hue(fract(vAlong * .6 + rim * .5 + time * .03)) * rim * .35 + vec3(.6, .7, .9) * rim * .4;
        col *= 1.0 + charge * 1.5;
        gl_FragColor = vec4(toLin(col), (.25 + core * .55 + rim * .35 + glint * .4) * opacity);
      }`,
    transparent: true, depthWrite: false,
  });
}
