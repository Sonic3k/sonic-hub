/* Sky, sun and lamps. A place names its hours ("chieu", "toi"…) and says, for each, what the sky looks like, how
   strong the sun is and which lamps burn; the same lights serve every hour (only their strengths change), so the
   shaders never rebuild. One shadow map, from the sun, drawn once per change: nothing in a place moves across the light.

   What a place hands in (its `light`):
     sun     [x, y, z]  the way the sunlight travels
     shadow  { center: [x, y, z], left, right, top, bottom, near, far, back?, follow? }   the box the one shadow map covers;
             `follow` (metres): a place bigger than the box moves the box with the walker, in steps of that many metres
     lamps   { name: [x, y, z, reach] }                                    where the fittings are
     outdoor true: what shiny things reflect is the sky of the hour, not a painted room
     hours   { id: { sky: { top, mid, horizon, ground, sun, glow, stars, clouds?: [cover, colour, shade] }, sun: [colour, strength],
                     hemi: [sky, ground, strength], room: [ceiling, wall, floor, window], env, exposure, fog?: [colour, near, far], dir?: the hour's own sun,
                     lamps: { name: [colour, strength] }, lit } }           lit: lamp shades and windows glow */
import * as THREE from 'three';

const SKY_VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_FRAG = `
uniform vec3 uTop, uMid, uHorizon, uGround, uSun, uGlow; uniform vec3 uSunDir; uniform float uStars;
uniform float uCloud; uniform vec3 uCloudCol, uCloudDark; uniform vec2 uWind;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
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
  // a deck of cloud overhead (the marine layer of a coastal morning), thinner toward the sun's side
  if (uCloud > 0.0 && t > -0.02) {
    vec2 q = d.xz / (t + 0.14) * 1.35 + uWind;
    float m = fbm(q), cover = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.3, m) * smoothstep(-0.02, 0.16, t);
    float lit = 0.8 + 0.45 * pow(s, 3.0);
    vec3 cc = mix(uCloudDark, uCloudCol * lit, smoothstep(0.25, 0.85, fbm(q * 1.9 + 4.7)));
    c = mix(c, cc, cover * 0.94);
  }
  if (uStars > 0.0) { vec2 g = floor(d.xz / max(t, 0.05) * 60.0); float h = hash(g); c += vec3(0.9, 0.95, 1.0) * step(0.9975, h) * uStars * smoothstep(0.1, 0.5, t); }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function setupLight(renderer, scene, cfg) {
  const SUN_DIR = new THREE.Vector3(...cfg.sun).normalize();
  /* sky */
  const skyU = { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSunDir: { value: SUN_DIR.clone().negate() }, uStars: { value: 0 },
    uCloud: { value: 0 }, uCloudCol: { value: new THREE.Color('#ffffff') }, uCloudDark: { value: new THREE.Color('#888888') }, uWind: { value: new THREE.Vector2() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: true }));
  sky.frustumCulled = false; sky.renderOrder = -10; sky.matrixAutoUpdate = false;
  scene.add(sky);

  /* sun: one shadow map over the whole place (or over the part of it the walker is in) */
  const sun = new THREE.DirectionalLight('#ffffff', 1), sh = cfg.shadow, back = sh.back ?? 34;
  const c = new THREE.Vector3(...sh.center);
  sun.position.copy(c).addScaledVector(SUN_DIR, -back); sun.target.position.copy(c);
  sun.castShadow = true;
  const sc = sun.shadow.camera; sc.left = sh.left; sc.right = sh.right; sc.top = sh.top; sc.bottom = sh.bottom; sc.near = sh.near; sc.far = sh.far; sc.updateProjectionMatrix();
  const big = renderer.capabilities.maxTextureSize >= 4096;
  sun.shadow.mapSize.set(big ? 4096 : 2048, sh.follow ? (big ? 4096 : 2048) : 1024); sun.shadow.bias = sh.bias ?? -0.0006; sun.shadow.normalBias = sh.normalBias ?? 0.018; sun.shadow.radius = big ? 2.4 : 1.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  scene.add(hemi);
  if (Object.values(cfg.hours).some(m => m.fog)) scene.fog = new THREE.Fog('#ffffff', 1e4, 2e4);

  /* the lamps: one per room, where the real fitting was (ceiling lamp, tube on the wall) */
  const lamps = {};
  for (const [k, [x, y, z, dist]] of Object.entries(cfg.lamps)) { const l = new THREE.PointLight('#ffffff', 0, dist, 2); l.position.set(x, y, z); scene.add(l); lamps[k] = l; }

  /* what the shiny things reflect: a small painted room of ceiling, wall and floor, a bright window on the sun's side —
     or, out of doors, the sky of the hour over a grey ground */
  const pm = new THREE.PMREMGenerator(renderer);
  const from = new THREE.Vector3(-SUN_DIR.x, 0, -SUN_DIR.z).normalize();
  const dome = (stops, extra, seg = [24, 12]) => {
    const s = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, seg[0], seg[1]), col = new Float32Array(g.attributes.position.count * 3), t = new THREE.Color();
    for (let i = 0; i < g.attributes.position.count; i++) { stops(g.attributes.position.getY(i) / 10, t); t.toArray(col, i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    if (extra) extra(s);
    const rt = pm.fromScene(s, 0.035); g.dispose(); return rt.texture;
  };
  const envOf = ([top, wallc, floorc, win]) => dome((y, t) => { const a = new THREE.Color(top), b = new THREE.Color(wallc), f = new THREE.Color(floorc); if (y > 0) t.copy(b).lerp(a, Math.min(1, y * 1.6)); else t.copy(b).lerp(f, Math.min(1, -y * 2.2)); }, s => {
    const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(win).multiplyScalar(4.5), side: THREE.DoubleSide });
    const w = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.5), wm); w.position.set(from.x * 9, 1.2, from.z * 9); w.lookAt(0, 1.2, 0); s.add(w);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.7), wm); w2.position.set(-from.z * 8.5 + 4 * Math.abs(from.x), 1.5, from.x * -8.5); w2.lookAt(0, 1.5, 0); s.add(w2);
  });
  const skyEnvOf = (m) => dome((y, t) => {
    const k = m.sky, top = new THREE.Color(k.top), mid = new THREE.Color(k.mid), hor = new THREE.Color(k.horizon), gr = new THREE.Color(m.room ? m.room[2] : '#6d6a64');
    if (y >= 0) { t.copy(hor).lerp(mid, Math.min(1, y / 0.22)); if (y > 0.15) t.lerp(top, Math.min(1, (y - 0.15) / 0.6)); if (k.clouds) t.lerp(new THREE.Color(k.clouds[1]), k.clouds[0] * 0.6 * Math.min(1, y * 3)); }
    else t.copy(hor).lerp(gr, Math.min(1, -y * 4));
  }, s => {
    if (m.sun[1] <= 0) return;
    const sm = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(m.sun[0]).multiplyScalar(6) }));
    sm.position.copy(m.dir ? new THREE.Vector3(...m.dir).normalize() : SUN_DIR).multiplyScalar(-9); s.add(sm);
  }, [32, 16]);
  const envs = {}; for (const [id, m] of Object.entries(cfg.hours)) envs[id] = cfg.outdoor ? skyEnvOf(m) : envOf(m.room);
  pm.dispose();

  const state = { hour: Object.keys(cfg.hours)[0] };
  function setHour(id) {
    const m = cfg.hours[id]; if (!m) return;
    state.hour = id;
    skyU.uTop.value.set(m.sky.top); skyU.uMid.value.set(m.sky.mid); skyU.uHorizon.value.set(m.sky.horizon); skyU.uGround.value.set(m.sky.ground);
    skyU.uSun.value.set(m.sky.sun).multiplyScalar(6); skyU.uGlow.value.set(m.sky.glow); skyU.uStars.value = m.sky.stars;
    const cl = m.sky.clouds; skyU.uCloud.value = cl ? cl[0] : 0; if (cl) { skyU.uCloudCol.value.set(cl[1]); skyU.uCloudDark.value.set(cl[2]); }
    sun.color.set(m.sun[0]); sun.intensity = m.sun[1];
    // an hour may bring its own sun (dir: the way its light travels); otherwise the place's
    SUN_DIR.set(...(m.dir || cfg.sun)).normalize(); skyU.uSunDir.value.copy(SUN_DIR).negate();
    sun.position.copy(c).addScaledVector(SUN_DIR, -back); sun.target.position.copy(c);
    hemi.color.set(m.hemi[0]); hemi.groundColor.set(m.hemi[1]); hemi.intensity = m.hemi[2];
    scene.environment = envs[id]; scene.environmentIntensity = m.env;
    if (scene.fog) { const f = m.fog || ['#ffffff', 1e4, 2e4]; scene.fog.color.set(f[0]); scene.fog.near = f[1]; scene.fog.far = f[2]; }
    renderer.toneMappingExposure = m.exposure;
    for (const k in lamps) { const v = m.lamps[k] || ['#ffffff', 0]; lamps[k].color.set(v[0]); lamps[k].intensity = v[1]; }
    renderer.shadowMap.needsUpdate = true;
  }
  /** a place bigger than its shadow box: move the box to where the walker is (in steps), and draw the shadows again */
  let fx = Math.round(c.x), fz = Math.round(c.z);
  function follow(p) {
    sky.position.copy(p); sky.updateMatrix();               // the sky goes where the eye goes (a place may be wider than the dome)
    if (!sh.follow) return false;
    const nx = Math.round(p.x / sh.follow) * sh.follow, nz = Math.round(p.z / sh.follow) * sh.follow;
    if (nx === fx && nz === fz) return false;
    fx = nx; fz = nz; c.set(nx, sh.center[1], nz);
    sun.position.copy(c).addScaledVector(SUN_DIR, -back); sun.target.position.copy(c);
    renderer.shadowMap.needsUpdate = true; return true;
  }
  /** the clouds drift (a few metres a minute, seen from below) */
  function tick(dt) { skyU.uWind.value.x += dt * 0.004; skyU.uWind.value.y += dt * 0.0015; }
  return { setHour, follow, tick, lamps, sun, sky, get hour() { return state.hour; }, lit: id => !!(cfg.hours[id] && cfg.hours[id].lit) };
}
