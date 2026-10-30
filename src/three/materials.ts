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

/**
 * Clear optical crystal, stylised: a nearly clear body, reflections of a small photo studio
 * (soft top light, two tall strip lights, a warm key), bright bevels, internal reflection lines
 * that follow the triangle's edges, thin rainbow fringes at the edges, and light scattered where
 * the beam passes through. Champagne edges mark the active stage.
 */
export function crystalMaterial(back: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { hl: { value: 0 }, reveal: { value: 0 }, beamY: { value: 0 }, side: { value: back ? .5 : 1 } },
    vertexShader: slabVertex,
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform float hl; uniform float reveal; uniform float beamY; uniform float side;
      varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;

      vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      // signed distance to the slab's triangle (side 1, centroid at origin); negative inside
      float sdTri(vec2 p){
        const float k = 1.7320508; const float r = .5;
        p.x = abs(p.x) - r; p.y = p.y + r / k;
        if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
        p.x -= clamp(p.x, -2.0 * r, 0.0);
        return -length(p) * sign(p.y);
      }
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
        float inner1 = exp(-pow((d - .042) / .007, 2.0));
        float inner2 = exp(-pow((d - .115) / .013, 2.0));
        float fringe = smoothstep(.012, .02, d) * smoothstep(.036, .027, d);
        vec3 rainbow = hue(fract((d - .012) / .024 + dot(V, N) * .8)) * fringe;

        float beamCore = exp(-pow((vLP.y - beamY) / .02, 2.0)) * reveal;
        float beamWide = exp(-pow((vLP.y - beamY) / .13, 2.0)) * reveal;

        vec3 champ = mix(vec3(.96, .93, .88), vec3(1.0, .78, .5), hl);
        vec3 body = mix(vec3(.17, .17, .19), vec3(.07, .07, .08), smoothstep(-.3, .5, vLP.y + vLP.x * .3));
        // a broad soft reflection sweeping diagonally across each face, shifting with the viewing angle
        float sweep = smoothstep(.0, .35, .35 - abs(vLP.x * .8 - vLP.y + dot(V, vec3(.9, .3, .6)) * .5 - .1)) * face;
        vec3 col = body * .55
          + refl * (F * 1.35 + bevel * .5)
          + champ * bevel * (.3 + hl * 1.2)
          + face * (vec3(.95) * inner1 * .5 * shimmer + vec3(.9, .88, 1.0) * inner2 * .3 * (1.0 - shimmer) + rainbow * .4)
          + vec3(.82) * rim * (.22 + F)
          + vec3(1.0, .97, .93) * (beamCore * .9 + beamWide * .12) * face
          + vec3(.92, .91, .96) * sweep * .18
          + champ * hl * .05;
        float a = .15 + sweep * .1 + F * .5 + bevel * .5 + rim * .3 + face * (inner1 * .35 + fringe * .2 + beamCore * .7 + beamWide * .08) + hl * .04;
        gl_FragColor = vec4(toLin(col), clamp(a, 0.0, .96) * side);
      }`,
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
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
        vec3 c = (vec3(.85, .84, .9) * (.05 + F * .25) + mix(vec3(.9, .88, .95), vec3(1.0, .8, .55), hl) * bevel * (.35 + hl * .5)) * fade * .55;
        gl_FragColor = vec4(toLin(c), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
  });
}

/** Glossy black floor that dissolves into the backdrop with distance. */
export function floorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { center: { value: new THREE.Vector2() }, reveal: { value: 0 } },
    vertexShader: 'varying vec3 vWP; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform vec2 center; uniform float reveal; varying vec3 vWP;
      void main(){
        vec2 d = vWP.xz - center;
        float pool = exp(-dot(d * vec2(.55, 1.0), d * vec2(.55, 1.0)) / 2.4);
        vec3 far = vec3(.043, .043, .048), near = vec3(.07, .068, .074);
        vec3 c = mix(far, near, pool) + vec3(.12, .11, .1) * pool * pool * .35 * reveal;
        gl_FragColor = vec4(toLin(c), 1.0);
      }`,
  });
}

/** Deep graphite backdrop with a soft lift behind the sculpture. Opaque, so the glass refracts it. */
export function backdropMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { focus: { value: new THREE.Vector2(.6, .5) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      ${TO_LINEAR}
      uniform vec2 focus; varying vec2 vUv;
      void main(){
        vec2 d = (vUv - focus) * vec2(1.8, 1.0);
        vec3 c = mix(vec3(.094, .092, .1), vec3(.04, .04, .045), smoothstep(0.0, .55, length(d)));
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
