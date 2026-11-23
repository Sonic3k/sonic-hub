/* A look: another way of drawing the same place. The place is built once, as it is (its surfaces, its lights, its
   hours); a look only changes how a frame gets to the screen. There is one for now:

     hoat-hinh   as an animated film would draw it. Light falls in three flat steps (softly joined) instead of a
                 smooth fade, nothing shines or mirrors, the grain of a surface is smoothed toward one colour, and
                 every thing gets a soft outline in a darker shade of its own colour: full round its silhouette,
                 lighter along its folds. What no lamp and no sun reaches leans toward plum, as shade does in such
                 films, and what is bright glows a little.

   How a frame is drawn in a look:
   1. While the place is drawn, every lit material is stood in for by a toon material that shares its colour and its
      pictures. The place's own materials are never touched: whatever a place does to them (a lamp shade that glows
      at night, a TV switched on) reaches the stand-in on the next frame, and switching the look off costs nothing.
      A stand-in mirrors nothing, but its surroundings still light it as they light the surface it stands for: it
      reads the hour's painted surroundings (scene.environment) at their most blurred, the way a matt surface does.
   2. The frame goes to a buffer, with its depth, instead of to the screen. The buffer is not multisampled: a
      multisampled depth is not the depth at the middle of each pixel, and the lines are read from exactly that.
   3. One pass over that buffer finds the outlines in the depth alone: where a surface turns there is a fold, where
      it stops in front of another there is a silhouette. The pass lays the lines over the colours, adds the glow,
      and does what the screen would have done (tone mapping, sRGB) — to the whole picture, also to the few unlit
      things a place keeps out of the tone curve when it is drawn plainly (a lit screen: a shade softer here).
   4. On a screen of ordinary pixels a last pass smooths the stair-steps (FXAA), which also softens the lines; a
      dense phone screen does without. */
import * as THREE from 'three';

export const LOOKS = [
  { id: 'hoat-hinh', label: 'Hoạt hình', say: 'ba mảng sáng tối, nét viền mềm theo màu của vật' },
];
/** the way a place is drawn when no look is on */
export const PLAIN = { id: '', label: 'Chân thực', say: 'ánh sáng như ngoài đời' };

const SET = {
  'hoat-hinh': {
    steps: [0.46, 0.76, 1],     // the light a surface takes from a lamp or the sun: turned away from it, side-on, toward it
    edge: 0.02,                 // two steps do not meet in a hard edge: this much of the strip, to each side, leads from one to the next
    sun: 0.92, lamp: 0.55,      // so a light reaches surfaces it would hardly touch: each gives less (the sun's shadows still cut it off)
    shadow: 0.45,               // the sun's shadows, drawn crisper
    shade: '#d8cbf3',           // the light of the sky and of the surroundings leans toward this colour (its hue only: no brighter, no darker)
    soft: 1.25,                 // surfaces that repeat (carpet, wood, plaster) read from a smaller copy of their picture: less grain
                                // (as many levels down as this, counted on a screen of ordinary pixels)
    width: 1.35,                // half the width of a line, in CSS pixels
    turn: [28, 52],             // a surface must turn by more than the first angle to get a line, by the second for all of it
    ink: 0.92, fold: 0.55, front: 0.45,  // how dark a line is · a fold's share of it · the near side of a silhouette's
    tint: 0.72, line: '#35212f',         // how much of a line is its surface's own colour, darkened · the rest
    fade: [40, 160],            // lines thin out between these distances (metres): a street far off is not all ink
    glow: 0.5, knee: 0.9,       // how much the bright parts spill · how bright a part must be to spill
    sat: 1.14,
  },
};

const VERT = 'varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }';
/* a quarter of the frame, keeping only what is brighter than the knee as the eye will see it (after the hour's exposure);
   its hue is kept, and a lamp's glare held down */
const BRIGHT = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uKnee, uExposure; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  s *= 0.25; float l = max(s.r, max(s.g, s.b)) * uExposure;
  gl_FragColor = vec4(s * (min(max(l - uKnee, 0.0), 1.6) / max(l, 1e-4)), 1.0);
}`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uStep; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb * 0.227027;
  s += (texture2D(tSrc, vUv + uStep * 1.384615).rgb + texture2D(tSrc, vUv - uStep * 1.384615).rgb) * 0.316216;
  s += (texture2D(tSrc, vUv + uStep * 3.230769).rgb + texture2D(tSrc, vUv - uStep * 3.230769).rgb) * 0.070270;
  gl_FragColor = vec4(s, 1.0);
}`;
/* the lines, the glow, and the screen's own work (TONE is the renderer's tone mapping) */
const DRAW = `
#include <tonemapping_pars_fragment>
uniform sampler2D tColor, tDepth, tGlowA, tGlowB;
uniform vec2 uTexel; uniform vec3 uLine;
uniform float uNear, uFar, uFocal, uWidth, uInk, uFold, uFront, uTint, uGlow, uSat, uFade0, uFade1, uTurn0, uTurn1;
varying vec2 vUv;
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;
  float d0 = texture2D(tDepth, vUv).x;
  float inv = 1.0 / uNear - 1.0 / uFar;                 // 1/z = 1/near − depth · inv
  float z0 = 1.0 / (1.0 / uNear - d0 * inv);
  // how a surface leans, as the card's depth tells it: depth as the card keeps it is linear across a flat surface
  // however steeply it is seen, and its step to the next sample, times k, is the tangent of the angle between the
  // surface and the screen. On a plane the step is the same on both sides of a pixel. Where the two differ, the
  // surface turns or stops: their difference over 1 + the smaller one squared is about the sine of the turn however
  // steeply the surface is seen (so the facets of a round thing stay quiet near its rim), and far more than 1 where
  // one surface stops in front of another
  float k = inv * z0 * uFocal / uWidth;
  vec2 o = uTexel * uWidth;
  float e = 0.0, dn = d0;
  for (int i = 0; i < 4; i++) {
    vec2 dir = i == 0 ? vec2(1.0, 0.0) : i == 1 ? vec2(0.0, 1.0) : i == 2 ? vec2(0.7071, 0.7071) : vec2(0.7071, -0.7071);
    float a = texture2D(tDepth, vUv + dir * o).x, b = texture2D(tDepth, vUv - dir * o).x;
    float sa = (a - d0) * k, sb = (d0 - b) * k, lean = min(abs(sa), abs(sb));
    float bend = abs(sa - sb) / (1.0 + lean * lean);
    float jump = smoothstep(3.0, 9.0, bend);
    // a silhouette is drawn in full on what lies behind it, lighter on the thing itself; a fold lighter still
    e += smoothstep(uTurn0, uTurn1, bend) * mix(uFold, mix(uFront, 1.0, step(sa, sb)), jump);
    dn = min(dn, min(a, b));
  }
  e = min(e * 0.34, 1.0);
  float zn = 1.0 / (1.0 / uNear - dn * inv);
  e *= 1.0 - smoothstep(uFade0, uFade1, zn);
  if (e > 0.003) {
    // the line's colour: the darker of what meets here, darkened and deepened, with a little of one ink for all
    vec3 m = min(c, min(min(texture2D(tColor, vUv + vec2(o.x, 0.0)).rgb, texture2D(tColor, vUv - vec2(o.x, 0.0)).rgb),
                       min(texture2D(tColor, vUv + vec2(0.0, o.y)).rgb, texture2D(tColor, vUv - vec2(0.0, o.y)).rgb)));
    float l = max(max(m.r, max(m.g, m.b)), 1e-4);
    vec3 own = m / l; own *= own;
    c = mix(c, mix(uLine, own * min(l, 1.1) * 0.3, uTint), e * uInk);
  }
  c += (texture2D(tGlowA, vUv).rgb * 0.6 + texture2D(tGlowB, vUv).rgb * 0.4) * uGlow;
  c = clamp(TONE(c), 0.0, 1.0);
  c = max(mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSat), 0.0);
  gl_FragColor = vec4(mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)), 1.0);
}`;
/* FXAA, the short form: along an edge, a pixel takes some of its neighbours */
const SMOOTH = `uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  const vec3 L = vec3(0.299, 0.587, 0.114);
  vec3 m = texture2D(tSrc, vUv).rgb;
  float nw = dot(texture2D(tSrc, vUv + vec2(-1.0, -1.0) * uTexel).rgb, L), ne = dot(texture2D(tSrc, vUv + vec2(1.0, -1.0) * uTexel).rgb, L);
  float sw = dot(texture2D(tSrc, vUv + vec2(-1.0, 1.0) * uTexel).rgb, L), se = dot(texture2D(tSrc, vUv + vec2(1.0, 1.0) * uTexel).rgb, L), lm = dot(m, L);
  float lo = min(lm, min(min(nw, ne), min(sw, se))), hi = max(lm, max(max(nw, ne), max(sw, se)));
  vec2 dir = vec2(-((nw + ne) - (sw + se)), (nw + sw) - (ne + se));
  float cut = max((nw + ne + sw + se) * 0.03125, 0.0078125);
  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + cut), -8.0, 8.0) * uTexel;
  vec3 a = 0.5 * (texture2D(tSrc, vUv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tSrc, vUv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tSrc, vUv - dir * 0.5).rgb + texture2D(tSrc, vUv + dir * 0.5).rgb);
  float lb = dot(b, L);
  gl_FragColor = vec4(lb < lo || lb > hi ? a : b, 1.0);
}`;
const TONES = ['', 'Linear', 'Reinhard', 'Cineon', 'ACESFilmic', 'Custom', 'AgX', 'Neutral'];

export function setupLook(renderer, scene, camera) {
  let cur = null, P = null;                    // the look that is on (one of LOOKS) and its settings
  let rt = null, out, gA, gA2, gB, gB2, W = 0, H = 0;
  let sun = null, steps = null, frameNo = 0, dense = 0, envH = 0;   // dense: how many times a screen pixel halves a CSS pixel
  const lamps = [], lit = [], stand = new Map(), swapped = [], size = new THREE.Vector2();
  const env = { value: null }, envTint = { value: new THREE.Color() };   // the hour's surroundings, as the stand-ins read them
  const fills = [], kept = [], tint = new THREE.Color(1, 1, 1);          // the lights that fill the shade (sky, ambient) · their own colours · the look's lean
  const info = { calls: 0, triangles: 0 };
  const hdr = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');

  const quad = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)), null);
  quad.frustumCulled = false;
  const qScene = new THREE.Scene(), qCam = new THREE.Camera(); qScene.add(quad);
  // these write what they mean to: the renderer adds no tone mapping or colour space of its own to them
  const pass = (frag, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });
  const U = v => ({ value: v });
  const bright = pass(BRIGHT, { tSrc: U(null), uTexel: U(new THREE.Vector2()), uKnee: U(1), uExposure: U(1) });
  const blur = pass(BLUR, { tSrc: U(null), uStep: U(new THREE.Vector2()) });
  const tone = TONES[renderer.toneMapping];
  const draw = pass(`#define TONE(c) ${tone ? tone + 'ToneMapping(c)' : '(c)'}\n` + DRAW, { tColor: U(null), tDepth: U(null), tGlowA: U(null), tGlowB: U(null), uTexel: U(new THREE.Vector2()), uLine: U(new THREE.Color()),
    toneMappingExposure: U(1), uNear: U(0.05), uFar: U(700), uFocal: U(600), uWidth: U(1), uInk: U(1), uFold: U(0.5), uFront: U(0.5), uTint: U(0.7), uGlow: U(0.5), uSat: U(1), uFade0: U(40), uFade1: U(160), uTurn0: U(0.47), uTurn1: U(0.79) });
  const smooth = pass(SMOOTH, { tSrc: U(null), uTexel: U(new THREE.Vector2()) });
  const run = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qScene, qCam); };

  /* the buffers: the frame with its depth; the finished picture (for the smoothing pass); and two small ones, a quarter
     and an eighth, for the glow, each with a spare */
  function buffers(w, h) {
    for (const t of [rt, out, gA, gA2, gB, gB2]) if (t) t.dispose();
    W = w; H = h;
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    rt = new THREE.WebGLRenderTarget(w, h, { type, depthTexture: new THREE.DepthTexture(w, h) });
    if (!hdr) rt.texture.colorSpace = THREE.SRGBColorSpace;
    out = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false });
    const small = k => new THREE.WebGLRenderTarget(Math.max(2, w >> k), Math.max(2, h >> k), { type, depthBuffer: false });
    gA = small(2); gA2 = small(2); gB = small(3); gB2 = small(3);
    draw.uniforms.tColor.value = rt.texture; draw.uniforms.tDepth.value = rt.depthTexture; draw.uniforms.tGlowA.value = gA.texture; draw.uniforms.tGlowB.value = gB.texture;
    smooth.uniforms.tSrc.value = out.texture;
    for (const m of [draw, bright, smooth]) m.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  /* what a stand-in's program has that three's toon program has not: its picture read `uSoft` levels down its chain
     of smaller copies, and the light of the surroundings on a matt surface, read as three's own lit materials read it
     (the map is three's blurred cube laid out flat; the three numbers say how, for a map `envH` high) */
  function program(sh, s) {
    const h = envH || 1024, top = Math.log2(h) - 2;
    sh.uniforms.uSoft = s.soft; sh.uniforms.uEnv = env; sh.uniforms.uEnvTint = envTint;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
uniform float uSoft; uniform vec3 uEnvTint; uniform sampler2D uEnv;
#define ENVMAP_TYPE_CUBE_UV
#define CUBEUV_TEXEL_WIDTH ${(1 / (3 * Math.max(2 ** top, 112))).toFixed(10)}
#define CUBEUV_TEXEL_HEIGHT ${(1 / h).toFixed(10)}
#define CUBEUV_MAX_MIP ${top.toFixed(1)}
#include <cube_uv_reflection_fragment>`)
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor *= texture2D( map, vMapUv, uSoft );\n#endif')
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n\tirradiance += PI * textureCubeUV( uEnv, inverseTransformDirection( geometryNormal, viewMatrix ), 1.0 ).rgb * uEnvTint;');
  }

  /** the toon material that stands in for a lit one: the same colours (the very objects) and pictures, three steps of light */
  function standIn(m) {
    let s = stand.get(m);
    if (!s) {
      const t = new THREE.MeshToonMaterial({ gradientMap: steps }); t.color = m.color; t.emissive = m.emissive; t.userData = m.userData; t.name = m.name;
      s = { mat: t, soft: { value: 0 }, seen: -1, ver: -1, sig: -1 };
      t.onBeforeCompile = sh => program(sh, s);
      t.customProgramCacheKey = () => 'look' + envH;
      stand.set(m, s);
    }
    const t = s.mat;
    if (s.seen === frameNo) return t;
    s.seen = frameNo;
    const sig = (m.map ? 1 : 0) | (m.emissiveMap ? 2 : 0) | (m.alphaMap ? 4 : 0) | (m.transparent ? 8 : 0) | (m.vertexColors ? 16 : 0) | (m.side << 5) | (m.alphaTest > 0 ? 128 : 0) | (m.fog ? 256 : 0);
    if (s.ver !== m.version || s.sig !== sig) {     // the place changed what the material is made of: the stand-in follows
      s.ver = m.version; s.sig = sig;
      t.transparent = m.transparent; t.vertexColors = m.vertexColors; t.side = m.side; t.shadowSide = m.shadowSide; t.alphaTest = m.alphaTest; t.fog = m.fog;
      t.depthWrite = m.depthWrite; t.depthTest = m.depthTest; t.blending = m.blending; t.premultipliedAlpha = m.premultipliedAlpha;
      t.polygonOffset = m.polygonOffset; t.polygonOffsetFactor = m.polygonOffsetFactor; t.polygonOffsetUnits = m.polygonOffsetUnits;
      t.needsUpdate = true;
    }
    t.map = m.map; t.emissiveMap = m.emissiveMap; t.alphaMap = m.alphaMap; t.emissiveIntensity = m.emissiveIntensity; t.opacity = m.opacity; t.visible = m.visible;
    // a surface that repeats loses its grain; a picture (a print, a label, a screen) keeps every line
    s.soft.value = m.map && m.map.wrapS === THREE.RepeatWrapping && m.alphaTest === 0 ? P.soft + dense : 0;
    return t;
  }
  function swapIn(all) {
    frameNo++; swapped.length = 0; dense = Math.log2(Math.max(1, renderer.getPixelRatio()));
    const e = scene.environment && scene.environment.mapping === THREE.CubeUVReflectionMapping ? scene.environment : null, h = e ? e.image.height : 0;
    env.value = e; envTint.value.copy(tint).multiplyScalar(e ? scene.environmentIntensity ?? 1 : 0);
    if (h && h !== envH) { envH = h; for (const s of stand.values()) s.mat.needsUpdate = true; }   // a map of another size is laid out otherwise
    scene[all ? 'traverse' : 'traverseVisible'](o => {
      const m = o.material; if (!m) return;
      if (Array.isArray(m)) { if (m.some(x => x.isMeshStandardMaterial)) { swapped.push(o, m); o.material = m.map(x => (x.isMeshStandardMaterial ? standIn(x) : x)); } }
      else if (m.isMeshStandardMaterial) { swapped.push(o, m); o.material = standIn(m); }
    });
  }
  function swapOut() { for (let i = 0; i < swapped.length; i += 2) swapped[i].material = swapped[i + 1]; swapped.length = 0; }

  /* takes a look's settings (none: the plain way) */
  function use(L) {
    P = L ? SET[L.id] : null;
    if (!L) return;
    lamps.length = fills.length = 0;
    scene.traverse(o => { if (o.isDirectionalLight) sun = o; else if (o.isPointLight || o.isSpotLight) lamps.push(o); else if (o.isHemisphereLight || o.isAmbientLight) fills.push(o); });
    while (kept.length < fills.length * 2) kept.push(new THREE.Color());
    tint.set(P.shade); tint.multiplyScalar(1 / (0.2126 * tint.r + 0.7152 * tint.g + 0.0722 * tint.b));
    if (steps) steps.dispose();
    // the steps as the strip three reads by how a surface faces a light (from turned away to turned toward): flat,
    // with a short ramp where one meets the next
    const N = 96, strip = new Uint8Array(N), k = P.steps.length;
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) / N * k, j = Math.min(k - 1, Math.floor(x)), f = x - j, e = P.edge * k;
      let v = P.steps[j];
      if (j + 1 < k && f > 1 - e) v += (P.steps[j + 1] - v) * 0.5 * (f - (1 - e)) / e;
      if (j > 0 && f < e) v += (P.steps[j - 1] - v) * 0.5 * (e - f) / e;
      strip[i] = Math.round(v * 255);
    }
    steps = new THREE.DataTexture(strip, N, 1, THREE.RedFormat);
    steps.minFilter = steps.magFilter = THREE.LinearFilter; steps.needsUpdate = true;
    for (const st of stand.values()) st.mat.gradientMap = steps;
    const u = draw.uniforms;
    u.uLine.value.set(P.line); u.uInk.value = P.ink; u.uFold.value = P.fold; u.uFront.value = P.front; u.uTint.value = P.tint;
    u.uGlow.value = P.glow; u.uSat.value = P.sat; u.uFade0.value = P.fade[0]; u.uFade1.value = P.fade[1]; bright.uniforms.uKnee.value = P.knee;
    u.uTurn0.value = Math.sin(P.turn[0] * Math.PI / 180); u.uTurn1.value = Math.sin(P.turn[1] * Math.PI / 180);
  }
  /** turns a look on (id of none: the plain way) */
  function set(id) {
    const next = LOOKS.find(l => l.id === id) || null;
    if (next === cur) return;
    cur = next; use(cur);
  }

  /* the place with the stand-ins and the look's light, into the buffer: drawn, or (make) only its programs built */
  function place(make) {
    renderer.getDrawingBufferSize(size);
    if (size.x !== W || size.y !== H) buffers(size.x, size.y);
    const si = sun ? sun.intensity : 0, sr = sun ? sun.shadow.radius : 0;
    if (sun) { sun.intensity = si * P.sun; sun.shadow.radius = sr * P.shadow; }
    for (let i = 0; i < lamps.length; i++) { lit[i] = lamps[i].intensity; lamps[i].intensity *= P.lamp; }
    for (let i = 0; i < fills.length; i++) { const f = fills[i]; kept[i * 2].copy(f.color); f.color.multiply(tint); if (f.groundColor) { kept[i * 2 + 1].copy(f.groundColor); f.groundColor.multiply(tint); } }
    swapIn(!!make);                    // what is hidden now (another year's furniture) gets its programs too
    renderer.setRenderTarget(rt);
    const made = make ? make(scene, camera) : renderer.render(scene, camera);
    swapOut();
    if (sun) { sun.intensity = si; sun.shadow.radius = sr; }
    for (let i = 0; i < lamps.length; i++) lamps[i].intensity = lit[i];
    for (let i = 0; i < fills.length; i++) { const f = fills[i]; f.color.copy(kept[i * 2]); if (f.groundColor) f.groundColor.copy(kept[i * 2 + 1]); }
    return made;
  }

  /** Has the card build every program a frame drawn this way needs (id of no look: the plain way), so that the first
      such frame does not wait for them. now: they are built before this returns. Otherwise the page goes on, drawn
      as it was, and the promise tells when they are there (at once, on a card that cannot build them on the side). */
  function prepare(id, now) {
    const L = LOOKS.find(l => l.id === id) || null, wait = [];
    const make = (sc, cam) => (now ? renderer.compile(sc, cam) : renderer.compileAsync(sc, cam));
    if (!L) { renderer.setRenderTarget(null); wait.push(make(scene, camera)); }
    else {
      use(L);
      wait.push(place(make));
      const fine = renderer.getPixelRatio() >= 1.75;
      for (const [m, to] of [[bright, gA], [blur, gA2], [draw, fine ? null : out], [smooth, null]]) {
        if (m === smooth && fine) continue;
        quad.material = m; renderer.setRenderTarget(to); wait.push(make(qScene, qCam));
      }
      renderer.setRenderTarget(null);
      use(cur);
    }
    return now ? null : Promise.all(wait);
  }

  /** draws one frame in the look that is on */
  function render() {
    renderer.info.autoReset = false; renderer.info.reset();
    place(null);
    info.calls = renderer.info.render.calls; info.triangles = renderer.info.render.triangles;
    // the glow: what is bright, a quarter of the size, blurred; then blurred again at an eighth
    bright.uniforms.tSrc.value = rt.texture; bright.uniforms.uExposure.value = renderer.toneMappingExposure; run(bright, gA);
    const bu = blur.uniforms;
    bu.tSrc.value = gA.texture; bu.uStep.value.set(1 / gA.width, 0); run(blur, gA2);
    bu.tSrc.value = gA2.texture; bu.uStep.value.set(0, 1 / gA.height); run(blur, gA);
    bu.tSrc.value = gA.texture; bu.uStep.value.set(1 / gB.width, 0); run(blur, gB2);
    bu.tSrc.value = gB2.texture; bu.uStep.value.set(0, 1 / gB.height); run(blur, gB);
    // the lines, the glow, the screen; where pixels are big enough to show their steps, smoothed on the way
    const u = draw.uniforms, dpr = renderer.getPixelRatio();
    u.uNear.value = camera.near; u.uFar.value = camera.far; u.toneMappingExposure.value = renderer.toneMappingExposure;
    u.uFocal.value = 0.5 * H / Math.tan(camera.fov * Math.PI / 360);
    u.uWidth.value = Math.max(1, P.width * dpr);
    if (dpr < 1.75) { run(draw, out); run(smooth, null); } else run(draw, null);
    renderer.info.autoReset = true;
  }

  return { get id() { return cur ? cur.id : ''; }, get on() { return !!cur; }, set, prepare, render, info };
}
