/* Sky, sun and lamps. Two moments of a day: "chieu" — a June afternoon about half an hour before sunset, the sun low
   in the west and coming in through the balcony door, as on the 2013 video — and "toi", nine in the evening, the
   lamps and the screens on. The same lights serve both (only their strengths change), so the shaders never rebuild. */
import * as THREE from 'three';

/** where the sunlight travels (from the west, 8° above the horizon, drifting a little north) */
export const SUN_DIR = new THREE.Vector3(1, -0.135, -0.05).normalize();

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_FRAG = `
uniform vec3 uTop, uMid, uHorizon, uGround, uSun, uGlow; uniform vec3 uSunDir; uniform float uStars;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); float t = d.y;
  vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.22, t));
  c = mix(c, uTop, smoothstep(0.15, 0.75, t));
  c = mix(c, uGround, smoothstep(0.0, -0.25, t));
  float s = max(dot(d, uSunDir), 0.0);
  c += uGlow * (pow(s, 6.0) * 0.55 + pow(s, 60.0) * 0.9);
  c += uSun * smoothstep(0.99955, 0.99985, s);
  // a few long clouds near the horizon, lit from below
  float band = smoothstep(0.03, 0.12, t) * smoothstep(0.42, 0.16, t);
  float n = sin(d.x * 9.0 + sin(d.z * 5.0) * 1.7) * sin(t * 46.0 + d.z * 6.0) * 0.5 + 0.5;
  c = mix(c, c * 0.82 + uGlow * 0.22, band * smoothstep(0.62, 0.9, n) * 0.55);
  if (uStars > 0.0) { vec2 g = floor(d.xz / max(t, 0.05) * 60.0); float h = hash(g); c += vec3(0.9, 0.95, 1.0) * step(0.9975, h) * uStars * smoothstep(0.1, 0.5, t); }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const MODES = {
  chieu: {
    sky: { top: '#5d86c4', mid: '#c9b9c0', horizon: '#ffc98f', ground: '#6a6058', sun: '#fff1c8', glow: '#ff9a4a', stars: 0 },
    sun: ['#ffb066', 5.2], hemi: ['#c3cee4', '#b9a998', 0.7], env: 0.5, exposure: 1.0, fogColor: '#e8c9a8',
    // window bounce and the lamps that are off
    lamps: { living: ['#ffd7a8', 3.2], kitchen: ['#ffd9b0', 2.4], nook: ['#e9eefc', 1.6], big: ['#dfe8ff', 4.2], parents: ['#e8edff', 3.4], gallery: ['#fff1d8', 1.2], screen: ['#bcd2ff', 0.25] },
    emissive: 0,
  },
  toi: {
    sky: { top: '#0a1024', mid: '#141a33', horizon: '#3a2c3a', ground: '#0b0b10', sun: '#000000', glow: '#000000', stars: 1 },
    sun: ['#8fa6ff', 0], hemi: ['#28335c', '#0e0c0c', 0.25], env: 0.1, exposure: 1.08, fogColor: '#10131f',
    lamps: { living: ['#ffcf9a', 20], kitchen: ['#f2f5ff', 9], nook: ['#eef3ff', 13], big: ['#eef3ff', 16], parents: ['#fff0dc', 13], gallery: ['#ffd9a0', 5], screen: ['#a9c4ff', 1.4] },
    emissive: 1,
  },
};

export function setupLight(renderer, scene) {
  /* sky */
  const skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: SUN_DIR.clone().negate() }, uStars: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true }));
  sky.frustumCulled = false; sky.renderOrder = -10; sky.matrixAutoUpdate = false;
  scene.add(sky);

  /* sun: one shadow map over the whole flat, drawn once (nothing in the flat moves across the light) */
  const sun = new THREE.DirectionalLight('#ffffff', 1);
  const c = new THREE.Vector3(5.0, 1.45, -1.6);          // the flat and the near half of the gallery
  sun.position.copy(c).addScaledVector(SUN_DIR, -34); sun.target.position.copy(c);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = -11.2; sc.right = 11.2; sc.top = 3.6; sc.bottom = -3.4; sc.near = 6; sc.far = 62; sc.updateProjectionMatrix();
  const big = renderer.capabilities.maxTextureSize >= 4096;
  sun.shadow.mapSize.set(big ? 4096 : 2048, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.018; sun.shadow.radius = big ? 2.4 : 1.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);

  /* the lamps: one per room, where the real fitting was (ceiling lamp, tube on the wall) */
  const at = { living: [2.75, 2.5, 1.75, 9], kitchen: [2.45, 2.55, 5.4, 7], nook: [4.75, 2.45, 5.2, 6.5], big: [8.5, 2.5, 5.0, 8], parents: [7.6, 2.5, 1.8, 8], gallery: [0.9, 2.55, -3.2, 9], screen: [4.25, 1.05, 4.3, 2.6] };
  const lamps = {};
  for (const [k, [x, y, z, dist]] of Object.entries(at)) { const l = new THREE.PointLight('#ffffff', 0, dist, 2); l.position.set(x, y, z); scene.add(l); lamps[k] = l; }

  /* what the shiny things reflect: a small painted room of sky and wall */
  const pm = new THREE.PMREMGenerator(renderer);
  const envOf = (top, wallc, floorc, win) => {
    const s = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 24, 12), col = new Float32Array(g.attributes.position.count * 3), a = new THREE.Color(top), b = new THREE.Color(wallc), f = new THREE.Color(floorc), t = new THREE.Color();
    for (let i = 0; i < g.attributes.position.count; i++) { const y = g.attributes.position.getY(i) / 10; if (y > 0) t.copy(b).lerp(a, Math.min(1, y * 1.6)); else t.copy(b).lerp(f, Math.min(1, -y * 2.2)); t.toArray(col, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const w = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(win).multiplyScalar(4.5) })); w.position.set(-9, 1.2, 0); w.rotation.y = Math.PI / 2; s.add(w);
    const w2 = w.clone(); w2.position.set(4, 1.5, 8.5); w2.rotation.y = Math.PI; w2.scale.setScalar(0.6); s.add(w2);
    const rt = pm.fromScene(s, 0.035); g.dispose(); return rt.texture;
  };
  const envs = { chieu: envOf('#f4efe6', '#e6d9c8', '#bba894', '#ffd9a8'), toi: envOf('#3a3530', '#2c2824', '#241a14', '#ffcf9a') };
  pm.dispose();

  const state = { mode: 'chieu', glowMats: [], onMode: [] };
  function setMode(mode) {
    const m = MODES[mode]; if (!m) return;
    state.mode = mode;
    skyU.uTop.value.set(m.sky.top); skyU.uMid.value.set(m.sky.mid); skyU.uHorizon.value.set(m.sky.horizon); skyU.uGround.value.set(m.sky.ground);
    skyU.uSun.value.set(m.sky.sun).multiplyScalar(6); skyU.uGlow.value.set(m.sky.glow); skyU.uStars.value = m.sky.stars;
    sun.color.set(m.sun[0]); sun.intensity = m.sun[1];
    hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
    scene.environment = envs[mode]; scene.environmentIntensity = m.env;
    renderer.toneMappingExposure = m.exposure;
    for (const k in lamps) { lamps[k].color.set(m.lamps[k][0]); lamps[k].intensity = m.lamps[k][1]; }
    for (const f of state.onMode) f(mode, m);
    renderer.shadowMap.needsUpdate = true;
  }
  return { setMode, lamps, sun, sky, state, get mode() { return state.mode; }, onMode: f => state.onMode.push(f) };
}
