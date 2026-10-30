import * as THREE from 'three';

// Smoked optical glass, stylised: a dark translucent body, Fresnel reflections of a small studio
// (warm key, soft ceiling, restrained lavender fill), champagne light on the bevelled edges,
// and a bright line where the beam crosses each slab. Cheap enough for phones; no extra render passes.

const vertex = /* glsl */`
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWP = wp.xyz; vWN = normalize(mat3(modelMatrix) * normal);
    vLN = normal; vLP = position;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

const fragment = /* glsl */`
  uniform float hl;       // stage highlight 0…1
  uniform float reveal;   // opening light 0…1
  uniform float side;     // 1 front faces, ~.6 back faces
  uniform float beamY;
  varying vec3 vWN; varying vec3 vWP; varying vec3 vLN; varying vec3 vLP;

  vec3 studio(vec3 r){
    float key  = pow(max(dot(r, normalize(vec3(-.55, .62, .56))), 0.0), 22.0);
    float ceil = smoothstep(.25, .95, r.y) * .32;
    float lav  = pow(max(dot(r, normalize(vec3(.82, .12, .25))), 0.0), 7.0);
    float back = pow(max(dot(r, normalize(vec3(.15, .25, -1.0))), 0.0), 5.0);
    return vec3(1.0, .9, .76) * key * 1.7 + vec3(.95, .92, .88) * ceil + vec3(.7, .66, .92) * lav * .3 + vec3(.9, .84, .78) * back * .18;
  }

  void main(){
    vec3 N = normalize(vWN); if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWP);
    float c = clamp(abs(dot(N, V)), 0.0, 1.0);
    float F = .04 + .96 * pow(1.0 - c, 5.0);
    vec3 refl = studio(reflect(-V, N));

    vec3 ln = normalize(vLN);
    float bevel = smoothstep(.22, .6, min(abs(ln.z), length(ln.xy)));   // the chamfered edges
    float rim = (1.0 - abs(ln.z)) * (1.0 - bevel);                       // the thin side faces
    vec3 champagne = mix(vec3(.9, .78, .6), vec3(1.0, .76, .44), hl);

    float beam = exp(-pow((vLP.y - beamY) / .028, 2.0)) * abs(ln.z) * reveal;
    float body = .55 + .45 * smoothstep(-.3, .6, vLP.y);                  // the smoke thins toward the apex
    // soft internal reflections that drift across each face as the viewing angle changes
    float drift = dot(V, vec3(.6, .2, .4)) * 2.2;
    float sheen = smoothstep(.55, 1.0, sin((vLP.x * 1.6 + vLP.y * 2.3 + drift) * 3.2)) * abs(ln.z);
    float lavSheen = smoothstep(.7, 1.0, sin((vLP.x * -2.1 + vLP.y * 1.4 - drift) * 2.6)) * abs(ln.z);

    vec3 col = vec3(.11, .108, .115) * body
      + refl * (.22 + F * 1.3) * (1.0 - hl * .35)
      + vec3(.95, .9, .82) * sheen * .07 + vec3(.72, .68, .92) * lavSheen * .05
      + champagne * bevel * (.55 + hl * 1.3) * (.4 + .6 * reveal) + champagne * rim * hl * .35
      + vec3(.86, .82, .78) * rim * (.16 + F * .6)
      + vec3(1.0, .97, .92) * beam * (.3 + hl * .25);
    float a = .16 + F * .5 + sheen * .06 + bevel * (.42 + hl * .4) + rim * .26 + beam * .55 + hl * .05;
    gl_FragColor = vec4(col, clamp(a, 0.0, .97) * side);
  }`;

export function glassMaterial(back: boolean) {
  return new THREE.ShaderMaterial({
    uniforms: { hl: { value: 0 }, reveal: { value: 0 }, side: { value: back ? .55 : 1 }, beamY: { value: 0 } },
    vertexShader: vertex, fragmentShader: fragment,
    transparent: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
  });
}
