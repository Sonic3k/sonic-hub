/* Sky, sun and lamps. A place names its hours ("chieu", "toi"…) and says, for each, what the sky looks like, how
   strong the sun is and which lamps burn; the same lights serve every hour (only their strengths change), so the
   shaders never rebuild. One shadow map, from the sun, drawn once per change: nothing in a place moves across the light.

   What a place hands in (its `light`):
     sun     [x, y, z]  the way the sunlight travels
     shadow  { center: [x, y, z], left, right, top, bottom, near, far }   the box the one shadow map covers
     lamps   { name: [x, y, z, reach] }                                    where the fittings are
     hours   { id: { sky: { top, mid, horizon, ground, sun, glow, stars }, sun: [colour, strength],
                     hemi: [sky, ground, strength], room: [ceiling, wall, floor, window], env, exposure,
                     lamps: { name: [colour, strength] }, lit } }           lit: lamp shades and windows glow */
import * as THREE from 'three';

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

export function setupLight(renderer, scene, cfg) {
  const SUN_DIR = new THREE.Vector3(...cfg.sun).normalize();
  /* sky */
  const skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: SUN_DIR.clone().negate() }, uStars: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true }));
  sky.frustumCulled = false; sky.renderOrder = -10; sky.matrixAutoUpdate = false;
  scene.add(sky);

  /* sun: one shadow map over the whole place */
  const sun = new THREE.DirectionalLight('#ffffff', 1), sh = cfg.shadow;
  const c = new THREE.Vector3(...sh.center);
  sun.position.copy(c).addScaledVector(SUN_DIR, -34); sun.target.position.copy(c);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = sh.left; sc.right = sh.right; sc.top = sh.top; sc.bottom = sh.bottom; sc.near = sh.near; sc.far = sh.far; sc.updateProjectionMatrix();
  const big = renderer.capabilities.maxTextureSize >= 4096;
  sun.shadow.mapSize.set(big ? 4096 : 2048, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.018; sun.shadow.radius = big ? 2.4 : 1.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);

  /* the lamps: one per room, where the real fitting was (ceiling lamp, tube on the wall) */
  const lamps = {};
  for (const [k, [x, y, z, dist]] of Object.entries(cfg.lamps)) { const l = new THREE.PointLight('#ffffff', 0, dist, 2); l.position.set(x, y, z); scene.add(l); lamps[k] = l; }

  /* what the shiny things reflect: a small painted room of ceiling, wall and floor, a bright window on the sun's side */
  const pm = new THREE.PMREMGenerator(renderer);
  const from = new THREE.Vector3(-SUN_DIR.x, 0, -SUN_DIR.z).normalize();
  const envOf = ([top, wallc, floorc, win]) => {
    const s = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 24, 12), col = new Float32Array(g.attributes.position.count * 3), a = new THREE.Color(top), b = new THREE.Color(wallc), f = new THREE.Color(floorc), t = new THREE.Color();
    for (let i = 0; i < g.attributes.position.count; i++) { const y = g.attributes.position.getY(i) / 10; if (y > 0) t.copy(b).lerp(a, Math.min(1, y * 1.6)); else t.copy(b).lerp(f, Math.min(1, -y * 2.2)); t.toArray(col, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(win).multiplyScalar(4.5), side: THREE.DoubleSide });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.5), wm); w.position.set(from.x * 9, 1.2, from.z * 9); w.lookAt(0, 1.2, 0); s.add(w);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.7), wm); w2.position.set(-from.z * 8.5 + 4 * Math.abs(from.x), 1.5, from.x * -8.5); w2.lookAt(0, 1.5, 0); s.add(w2);
    const rt = pm.fromScene(s, 0.035); g.dispose(); return rt.texture;
  };
  const envs = {}; for (const [id, m] of Object.entries(cfg.hours)) envs[id] = envOf(m.room);
  pm.dispose();

  const state = { hour: Object.keys(cfg.hours)[0] };
  function setHour(id) {
    const m = cfg.hours[id]; if (!m) return;
    state.hour = id;
    skyU.uTop.value.set(m.sky.top); skyU.uMid.value.set(m.sky.mid); skyU.uHorizon.value.set(m.sky.horizon); skyU.uGround.value.set(m.sky.ground);
    skyU.uSun.value.set(m.sky.sun).multiplyScalar(6); skyU.uGlow.value.set(m.sky.glow); skyU.uStars.value = m.sky.stars;
    sun.color.set(m.sun[0]); sun.intensity = m.sun[1];
    hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
    scene.environment = envs[id]; scene.environmentIntensity = m.env;
    renderer.toneMappingExposure = m.exposure;
    for (const k in lamps) { const v = m.lamps[k] || ['#ffffff', 0]; lamps[k].color.set(v[0]); lamps[k].intensity = v[1]; }
    renderer.shadowMap.needsUpdate = true;
  }
  return { setHour, lamps, sun, sky, get hour() { return state.hour; }, lit: id => !!(cfg.hours[id] && cfg.hours[id].lit) };
}
