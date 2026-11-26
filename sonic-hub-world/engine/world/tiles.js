/* The ground a world stands on, 500 m at a time. Only the squares round the eye are held: each is fetched, built off
   the frame's time (engine/world/tilework.js in a Worker), put in a mesh or two per material, and dropped again when
   the eye has gone 1.5 km on. What a square holds is worked out beforehand (a place's data/world.py). */
import * as THREE from 'three';
import { makeBuilder } from './tilework.js';

const T = 500;
export const CYCLE = 64;
/** what a signal shows the traffic of one group at a time: 0 red, 1 yellow, 2 green. Every junction runs the same
 *  64 s round (26 s green, 3.5 s yellow, 2.5 s with everyone stopped), each started at its own moment. */
export function signalState(junction, group, time) {
  const t = (((time + junction * 17.3) % CYCLE) + CYCLE) % CYCLE, u = group ? (t + CYCLE / 2) % CYCLE : t;
  return u < 26 ? 2 : u < 29.5 ? 1 : 0;
}
/** seconds of yellow left before that group's light turns red (0 unless it is yellow) */
export function untilRed(junction, group, time) {
  const t = (((time + junction * 17.3) % CYCLE) + CYCLE) % CYCLE, u = group ? (t + CYCLE / 2) % CYCLE : t;
  return u >= 26 && u < 29.5 ? 29.5 - u : 0;
}
/** seconds until that group's light next turns green (0 while it is green) */
export function untilGreen(junction, group, time) {
  const t = (((time + junction * 17.3) % CYCLE) + CYCLE) % CYCLE, u = group ? (t + CYCLE / 2) % CYCLE : t;
  return u < 26 ? 0 : CYCLE - u;
}

/* ── the façade sheet: 8 kinds of building × (ground floor, a floor above), four bays across; and the same lit at night ── */
function facadeSheet(lit) {
  const W = 1024, RH = 128, c = document.createElement('canvas'); c.width = W; c.height = RH * 16;
  const g = c.getContext('2d'), BW = W / 4;
  let seed = lit ? 911 : 407; const R = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const glassDay = (x, y, w, h, a = '#31465a', b = '#5d7f96') => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  const win = (x, y, w, h, o = {}) => {                                             // a window: by day dark glass in a frame, by night a lit or a dark pane
    if (lit) { const on = R() < (o.on ?? 0.4); g.fillStyle = on ? (o.cool ? '#dfe9f2' : ['#ffd9a0', '#ffe7bf', '#f6c98a'][(R() * 3) | 0]) : '#05070a'; g.globalAlpha = on ? 0.55 + R() * 0.45 : 1; g.fillRect(x, y, w, h); g.globalAlpha = 1; return; }
    g.fillStyle = o.frame || '#e9e6de'; g.fillRect(x - 3, y - 3, w + 6, h + 6); glassDay(x, y, w, h, o.a, o.b);
    if (o.bars) { g.fillStyle = o.frame || '#e9e6de'; g.fillRect(x + w / 2 - 1, y, 2, h); }
  };
  const row = (r, base, draw) => {                                                  // one row: its wall, then each bay's own drawing
    const y = r * RH; g.fillStyle = lit ? '#000' : base; g.fillRect(0, y, W, RH);
    if (!lit) for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},${R() < 0.5 ? 0 : 255},0.018)`; g.fillRect(R() * W, y + R() * RH, 2 + R() * 5, 1 + R() * 3); }
    for (let b = 0; b < 4; b++) { g.save(); g.beginPath(); g.rect(b * BW, y, BW, RH); g.clip(); g.translate(b * BW, y); draw(b); g.restore(); }
  };
  const line = (x, y, w, h, col) => { if (!lit) { g.fillStyle = col; g.fillRect(x, y, w, h); } };
  // 0 house: stucco; a door, windows, a garage door below · a window or two above
  row(0, '#f1eee6', b => { if (b === 1) { line(96, 34, 60, 94, '#7a5a44'); line(100, 38, 52, 86, '#8c6a50'); } else if (b === 3) { line(30, 40, 196, 88, '#dcd8cf'); for (let k = 1; k < 4; k++) line(30, 40 + k * 22, 196, 2, '#bdb8ad'); } else win(70, 36, 116, 58, { bars: true, on: 0.55 }); line(0, 120, BW, 8, '#cfcabf'); });
  row(1, '#f1eee6', b => { if (b % 2 === 0) win(78, 34, 100, 60, { bars: true, on: 0.4 }); });
  // 1 apartments: a window and a rail to every bay
  row(2, '#eeebe3', b => { if (b === 2) { line(98, 30, 60, 98, '#6f5a48'); } else win(60, 30, 136, 66, { bars: true, on: 0.5 }); line(0, 118, BW, 10, '#c9c4b8'); });
  row(3, '#eeebe3', b => { win(52, 26, 152, 70, { bars: true, on: 0.45 }); line(40, 104, 176, 4, '#8f8a80'); for (let k = 0; k < 9; k++) line(44 + k * 21, 104, 2, 22, '#a39e94'); line(0, 0, BW, 5, '#d8d3c8'); });
  // 2 glass tower: glass from slab to slab, a dark band at each floor, thin mullions
  const curtain = (b, ground) => {
    if (lit) { g.fillStyle = '#020305'; g.fillRect(0, 0, BW, RH); for (let k = 0; k < 2; k++) if (R() < (ground ? 0.8 : 0.3)) { g.fillStyle = '#cfe0ee'; g.globalAlpha = 0.12 + R() * 0.3; g.fillRect(k * BW / 2 + 3, ground ? 44 : 30, BW / 2 - 6, 70); g.globalAlpha = 1; } return; }
    const gr = g.createLinearGradient(0, 0, 0, RH); gr.addColorStop(0, '#7fa6bd'); gr.addColorStop(0.55, '#5f879f'); gr.addColorStop(1, '#4b7089'); g.fillStyle = gr; g.fillRect(0, 0, BW, RH);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 6, BW, 26);
    g.fillStyle = '#2f4656'; g.fillRect(0, ground ? 116 : 104, BW, ground ? 12 : 24);
    g.fillStyle = '#c3ccd2'; for (let k = 0; k <= 2; k++) g.fillRect(k * BW / 2 - 2, 0, 4, RH);
    if (ground) { g.fillStyle = '#263a48'; g.fillRect(4, 40, BW - 8, 76); g.fillStyle = '#c3ccd2'; g.fillRect(0, 36, BW, 4); }
  };
  row(4, '#5f879f', b => curtain(b, true)); row(5, '#5f879f', b => curtain(b, false));
  // 3 office: bands of dark glass between pale spandrels
  row(6, '#efece5', b => { if (lit) { g.fillStyle = R() < 0.5 ? '#d9e4ec' : '#06080b'; g.globalAlpha = 0.7; g.fillRect(8, 30, BW - 16, 84); g.globalAlpha = 1; return; } glassDay(8, 30, BW - 16, 84, '#22323e', '#48606f'); line(BW / 2 - 2, 30, 4, 84, '#d6d2c8'); line(0, 0, 10, RH, '#e2ded5'); line(0, 114, BW, 14, '#c9c5bb'); });
  row(7, '#efece5', b => { if (lit) { for (let k = 0; k < 2; k++) { g.fillStyle = R() < 0.3 ? '#dbe6ee' : '#04060a'; g.globalAlpha = 0.75; g.fillRect(k * BW / 2 + 2, 30, BW / 2 - 4, 60); g.globalAlpha = 1; } return; } glassDay(0, 30, BW, 60, '#24343f', '#4c6473'); for (let k = 0; k < 4; k++) line(k * BW / 4 - 1, 30, 3, 60, '#c8c4ba'); line(0, 26, BW, 4, '#d9d5cb'); line(0, 90, BW, 4, '#d9d5cb'); });
  // 4 industrial: concrete panels, a joint at each bay; a roll-up door, a man's door · high small windows
  row(8, '#f0ede6', b => { line(0, 0, 3, RH, '#cdc9bf'); line(0, 96, BW, 32, '#dedad0'); if (b === 3) { line(40, 28, 176, 100, '#c9cdd0'); for (let k = 1; k < 7; k++) line(40, 28 + k * 14, 176, 2, '#a9adb0'); if (lit) return; } else if (b === 1) { line(96, 52, 60, 76, '#3d4850'); line(100, 56, 52, 72, '#59646c'); } else win(34, 40, 188, 46, { on: 0.35, cool: true, frame: '#d2cec4', bars: true }); line(0, 122, BW, 6, '#c6c2b7'); });
  row(9, '#f0ede6', b => { line(0, 0, 3, RH, '#cdc9bf'); line(0, 12, BW, 3, '#d6d2c8'); if (b !== 3) win(b === 1 ? 0 : 30, 34, b === 1 ? BW : 196, 40, { on: 0.3, cool: true, frame: '#d2cec4' }); else line(0, 70, BW, 2, '#d6d2c8'); });
  // 5 retail: shop glass under a band · a plain parapet
  row(10, '#efe9dc', b => { if (lit) { g.fillStyle = '#ffe9c4'; g.globalAlpha = 0.5 + R() * 0.4; g.fillRect(10, 44, BW - 20, 76); g.globalAlpha = 1; return; } line(0, 0, BW, 30, ['#b5553c', '#3f6f8f', '#5e7d4a', '#c79a3c'][b]); glassDay(10, 44, BW - 20, 76, '#2a3944', '#587383'); line(BW / 2 - 2, 44, 4, 76, '#e4dfd4'); line(0, 120, BW, 8, '#bfb9ab'); });
  row(11, '#efe9dc', b => { line(0, 0, BW, 10, '#d6cfbf'); line(0, 112, BW, 4, '#d6cfbf'); });
  // 6 parking structure: open decks, dark inside, between concrete beams; a column at each bay
  const deck = ground => { if (lit) { g.fillStyle = '#9fb0a8'; g.globalAlpha = 0.35; g.fillRect(0, 12, BW, ground ? 116 : 62); g.globalAlpha = 1; return; } g.fillStyle = '#1b1d20'; g.fillRect(0, 12, BW, ground ? 116 : 62); const gr = g.createLinearGradient(0, 12, 0, 74); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(60,62,64,0.35)'); g.fillStyle = gr; g.fillRect(0, 12, BW, ground ? 116 : 62); g.fillStyle = '#dedbd3'; g.fillRect(0, 0, 14, RH); g.fillStyle = '#c9c6be'; g.fillRect(0, 0, BW, 12); };
  row(12, '#e9e6de', () => deck(true)); row(13, '#e9e6de', () => deck(false));
  // 7 hotel: two framed windows to a bay · glass at the door
  row(14, '#f0ebe0', b => { if (b === 1 || b === 2) { if (lit) { g.fillStyle = '#ffe2b0'; g.globalAlpha = 0.8; g.fillRect(8, 30, BW - 16, 92); g.globalAlpha = 1; } else glassDay(8, 30, BW - 16, 92, '#2b3a45', '#5a7483'); } else win(60, 40, 130, 56, { on: 0.6 }); line(0, 122, BW, 6, '#cbc5b8'); line(0, 0, BW, 14, '#d9d3c6'); });
  row(15, '#f0ebe0', b => { win(26, 34, 84, 64, { on: 0.42 }); win(146, 34, 84, 64, { on: 0.42 }); line(0, 112, BW, 3, '#d9d3c6'); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; t.name = lit ? 'facades lit' : 'facades';
  return t;
}

/* ── the things that stand along a street, one geometry each (drawn many times over) ── */
function wobble(geo, amt, seed) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719 + seed) * 43758.5453, f = 1 + ((n - Math.floor(n)) - 0.5) * amt; p.setXYZ(i, v.x * f, v.y * f, v.z * f); }
  return geo;
}
function paint(geo, fn) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i)); c.toArray(col, i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
function mergeGeos(list) {
  list = list.map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3)); return out;
}
function treeGeo(detail) {
  /* a street tree of the South Bay (an Indian laurel fig, more or less): a short grey trunk, a dense dark dome wider than
     tall. One unit is the crown's radius. */
  const leaf = new THREE.Color('#33531f'), under = new THREE.Color('#1f3414'), bark = new THREE.Color('#6d6a63');
  const crown = wobble(new THREE.IcosahedronGeometry(1, detail), detail ? 0.22 : 0.1, 3).scale(1, 0.72, 1).translate(0, 1.42, 0);
  crown.computeVertexNormals();
  paint(crown, (c, x, y) => c.copy(under).lerp(leaf, Math.min(1, Math.max(0, (y - 0.9) / 0.75))));
  const trunk = paint(new THREE.CylinderGeometry(0.075, 0.105, 0.95, detail ? 6 : 4, 1, true).translate(0, 0.475, 0), c => c.copy(bark));
  return mergeGeos([crown, trunk]);
}
function palmGeo() {
  /* a Mexican fan palm: a thin trunk (one unit tall; the instance stretches it), a mop of fronds, a skirt of dead ones */
  const bark = new THREE.Color('#7a6a55'), frond = new THREE.Color('#4a6628'), dead = new THREE.Color('#6f5a3e'), parts = [];
  parts.push(paint(new THREE.CylinderGeometry(0.17, 0.24, 1, 6, 1, true).translate(0, 0.5, 0), c => c.copy(bark)));
  parts.push(paint(new THREE.SphereGeometry(0.5, 6, 4).scale(1, 0.09, 1).translate(0, 0.975, 0), c => c.copy(dead)));
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + (i % 2) * 0.3, tilt = i % 3 === 0 ? 0.062 : i % 3 === 1 ? 0.018 : -0.035, L = 2.5, w = 0.55;
    const g = new THREE.BufferGeometry(), ca = Math.cos(a), sa = Math.sin(a), px = -sa * w, pz = ca * w;
    const P = [[0, 1, 0], [ca * L * 0.55 + px, 1 + tilt + 0.02, sa * L * 0.55 + pz], [ca * L * 0.55 - px, 1 + tilt + 0.02, sa * L * 0.55 - pz], [ca * L, 1 + tilt * 0.4 - 0.03, sa * L]];
    const tri = [0, 1, 2, 1, 3, 2, 0, 2, 1, 1, 2, 3], pos = new Float32Array(tri.length * 3); tri.forEach((k, j) => pos.set(P[k], j * 3));
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.computeVertexNormals(); parts.push(paint(g, c => c.copy(frond)));
  }
  return mergeGeos(parts);
}
export function carGeo(wheels) {
  /* a parked saloon, plain: the body, the glass house (dark all round, the roof in the body's colour), four wheels.
     It stands along z with its nose to −z; white, so that each one's own colour tints it. */
  const pos = [], col = [], body = [1, 1, 1], glass = [0.05, 0.065, 0.08], tyre = [0.03, 0.03, 0.03], dark = [0.3, 0.3, 0.3];
  const quad = (a, b, c, d, k) => { for (const p of [a, b, c, a, c, d]) { pos.push(...p); col.push(...k); } };
  const hexa = (lo, hi, sides, top) => {                                        // lo, hi: four corners each, the same way round seen from above
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(lo[i], hi[i], hi[j], lo[j], sides); }
    quad(hi[0], hi[3], hi[2], hi[1], top);
  };
  const ring = (w, z0, z1, y) => [[-w, y, z0], [w, y, z0], [w, y, z1], [-w, y, z1]];
  hexa(ring(0.89, -2.28, 2.28, 0.22), ring(0.89, -2.28, 2.28, 0.84), body, body);
  hexa(ring(0.84, -0.75, 1.75, 0.84), ring(0.7, -0.15, 1.2, 1.4), glass, body);
  if (wheels) for (const [x, z] of [[-0.8, -1.42], [0.8, -1.42], [-0.8, 1.38], [0.8, 1.38]]) hexa(ring(0.13, -0.32, 0.32, 0).map(p => [p[0] + x, p[1], p[2] + z]), ring(0.13, -0.32, 0.32, 0.64).map(p => [p[0] + x, p[1], p[2] + z]), tyre, tyre);
  quad([-0.8, 0.5, -2.285], [-0.8, 0.66, -2.285], [0.8, 0.66, -2.285], [0.8, 0.5, -2.285], dark);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
function stopTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const oct = (r, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; g[k ? 'lineTo' : 'moveTo'](64 + r * Math.cos(a), 64 + r * Math.sin(a)); } g.closePath(); g.fill(); };
  g.clearRect(0, 0, 128, 128); oct(64, '#f4f4f0'); oct(58, '#b3261e');
  g.fillStyle = '#f4f4f0'; g.font = '700 38px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', 64, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/** the colours cars come in (a parked car's own tints the white body) */
export const CAR_COLOURS = ['#e9e9e6', '#b9bcc0', '#1b1c1f', '#6d7178', '#243f6e', '#7d1f1f', '#d8d2bd', '#3d4a43', '#8f9296', '#101113'];

/**
 * @param scene   where the squares go
 * @param o       { base: the address of the tiles' folder, index: what index.json holds, road, walk: the materials
 *                  the paved ribbons and the sidewalks wear (the hotel place's own, so that streets join without a seam),
 *                  keep: how many squares each way round the eye (2), onError }
 *                or, for a place that carries its few squares with its page (the hotel's own streets, on foot):
 *                { tiles: { 'i_j': the square as data/world.py writes it }, road, walk } — all built at once and held.
 */
export function setupTiles(scene, o) {
  const own = o.tiles || null;
  const have = new Map((own ? Object.values(own).map(t => [t.i, t.j, 0]) : o.index.tiles).map(([i, j, bytes]) => [i + '_' + j, { i, j, bytes }]));
  const KEEP = o.keep ?? 2, DROP = own ? Infinity : KEEP + 1;
  const root = new THREE.Group(); root.name = 'tiles'; scene.add(root);
  const sheet = facadeSheet(false), sheetLit = facadeSheet(true);
  const M = {
    flat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),      // the ground's flat colours, the roofs, poles and posts: one mesh a square
    road: Object.assign(o.road.clone(), { vertexColors: true }),
    marks: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    conc: Object.assign(o.walk.clone(), { vertexColors: true }),
    walls: new THREE.MeshStandardMaterial({ vertexColors: true, map: sheet, emissiveMap: sheetLit, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.86 }),
    tree: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
    palm: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }),
    lamp: new THREE.MeshBasicMaterial({ toneMapped: false }),
    stop: new THREE.MeshStandardMaterial({ map: stopTexture(), transparent: true, alphaTest: 0.5, roughness: 0.6 }),
    glow: new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false }),
    car: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25 }),
  };
  for (const k of ['road', 'marks']) M[k].userData.noCast = true;
  const G = { treeHi: treeGeo(1), treeLo: treeGeo(0), palm: palmGeo(), carHi: carGeo(true), carLo: carGeo(false), lamp: new THREE.CircleGeometry(0.108, 10), stop: new THREE.PlaneGeometry(0.76, 0.76), glow: new THREE.PlaneGeometry(0.62, 0.3).rotateX(Math.PI / 2) };
  const TREE_TINT = ['#ffffff', '#e6f0d8', '#f2ead0', '#d8ecd8', '#fff4d6', '#e0e6c8'].map(c => new THREE.Color(c));
  const CAR_TINT = CAR_COLOURS.map(c => new THREE.Color(c));

  /* the builder: in a Worker where the browser allows one made from the page's own text */
  let worker = null, direct = null; const waiting = new Map(); let seq = 0;
  if (!own) try {
    const src = `const B = (${makeBuilder.toString()})(); onmessage = e => { try { const r = B.build(JSON.parse(e.data.text)); postMessage({ id: e.data.id, tile: r.tile }, r.transfer); } catch (err) { postMessage({ id: e.data.id, error: String(err && err.stack || err) }); } };`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => { const f = waiting.get(e.data.id); waiting.delete(e.data.id); if (f) f(e.data); };
    worker.onerror = () => { worker = null; direct = makeBuilder(); for (const f of waiting.values()) f({ error: 'worker' }); waiting.clear(); };
  } catch { worker = null; }
  if (!worker) direct = makeBuilder();
  const buildOff = text => new Promise((res, rej) => {
    if (worker) { const id = ++seq; waiting.set(id, m => (m.error ? rej(new Error(m.error)) : res(m.tile))); worker.postMessage({ id, text }); }
    else { try { res(direct.build(JSON.parse(text)).tile); } catch (e) { rej(e); } }
  });

  const tiles = new Map();          // key → { state: 'loading' | 'built' | 'live' | 'failed', i, j, data, group, … }
  const ready = [];                 // built, waiting for their turn to be put in the scene (one a frame)
  const st = { built: 0, msSum: 0, msMax: 0, live: 0, tris: 0, bytes: 0, failed: 0, fetched: 0, dropped: 0 };
  let night = false, time = 0, lastSig = -1;

  const geoOf = (b, uv) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(b.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(b.nor, 3, true)); g.setAttribute('color', new THREE.BufferAttribute(b.col, 3));
    if (uv && b.uv) g.setAttribute('uv', new THREE.BufferAttribute(b.uv, 2));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  };
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  function raise(t) {
    const d = t.data, grp = new THREE.Group(); grp.position.set(t.i * T, 0, t.j * T); grp.name = `tile ${t.i} ${t.j}`; grp.matrixAutoUpdate = false; grp.updateMatrix();
    const add = (key, mat, cast, recv, uv) => { if (!d[key].n) return null; const m = new THREE.Mesh(geoOf(d[key], uv), mat); m.castShadow = cast; m.receiveShadow = recv; m.matrixAutoUpdate = false; m.name = key; grp.add(m); t.bytes += d[key].pos.byteLength + d[key].nor.byteLength + d[key].col.byteLength + (d[key].uv ? d[key].uv.byteLength : 0); return m; };
    t.bytes = 0;
    add('plain', M.flat, true, true); add('road', M.road, false, true, true); t.marks = add('marks', M.marks, false, true);
    add('conc', M.conc, true, true, true); add('walls', M.walls, true, true, true);
    const inst = (geo, mat, n, each, cast) => { if (!n) return null; const m = new THREE.InstancedMesh(geo, mat, n); for (let k = 0; k < n; k++) { each(k); dummy.updateMatrix(); m.setMatrixAt(k, dummy.matrix); } m.castShadow = cast; m.receiveShadow = false; m.matrixAutoUpdate = false; m.frustumCulled = true; m.computeBoundingSphere(); grp.add(m); return m; };
    const tr = d.trees, nt = tr.length / 6;
    t.trees = inst(G.treeLo, M.tree, nt, k => { dummy.position.set(tr[6 * k], 0, tr[6 * k + 1]); const s = tr[6 * k + 2]; dummy.scale.set(s, s * tr[6 * k + 4], s); dummy.rotation.set(0, tr[6 * k + 3], 0); }, true);
    if (t.trees) { for (let k = 0; k < nt; k++) t.trees.setColorAt(k, TREE_TINT[tr[6 * k + 5] % TREE_TINT.length]); t.trees.name = 'trees'; }
    const pa = d.palms, np = pa.length / 5;
    t.palms = inst(G.palm, M.palm, np, k => { dummy.position.set(pa[5 * k], 0, pa[5 * k + 1]); dummy.scale.set(1, pa[5 * k + 2], 1); dummy.rotation.set(0, pa[5 * k + 3], pa[5 * k + 4] * 0.08); }, true);
    if (t.palms) t.palms.name = 'palms';
    const cr = d.cars, nc = cr.length / 4;
    t.cars = inst(G.carLo, M.car, nc, k => { dummy.position.set(cr[4 * k], 0, cr[4 * k + 1]); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, -Math.PI / 2 - cr[4 * k + 2], 0); }, false);
    if (t.cars) { for (let k = 0; k < nc; k++) t.cars.setColorAt(k, CAR_TINT[cr[4 * k + 3] % CAR_TINT.length]); t.cars.name = 'parked cars'; }
    const sp = d.stops, ns = sp.length / 4;
    const stops = inst(G.stop, M.stop, ns, k => { dummy.position.set(sp[4 * k], sp[4 * k + 1], sp[4 * k + 2]); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, Math.PI / 2 - sp[4 * k + 3], 0); }, false);
    if (stops) stops.name = 'stop signs';
    const hd = d.heads, nh = hd.length / 7;
    t.heads = inst(G.lamp, M.lamp, nh, k => { dummy.position.set(hd[7 * k], hd[7 * k + 1], hd[7 * k + 2]); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, -Math.PI / 2 - hd[7 * k + 3], 0); }, false);
    if (t.heads) { t.heads.name = 'signal lamps'; for (let k = 0; k < nh; k++) t.heads.setColorAt(k, col.set('#111')); t.headData = hd; t.sigKey = ''; }
    const lp = d.lamps, nl = lp.length / 3;
    t.glow = inst(G.glow, M.glow, nl, k => { dummy.position.set(lp[3 * k], lp[3 * k + 1], lp[3 * k + 2]); dummy.scale.set(1, 1, 1); dummy.rotation.set(0, 0, 0); }, false);
    if (t.glow) { t.glow.name = 'street lamps'; t.glow.visible = night; }
    grp.traverse(m => { if (m.isMesh) m.updateMatrixWorld(true); });
    grp.updateMatrixWorld(true);
    t.group = grp; t.tris = d.tris; t.data = null; t.state = 'live'; root.add(grp);
    st.live++; st.tris += t.tris; st.bytes += t.bytes;
  }
  function drop(key, t) {
    if (t.group) { root.remove(t.group); t.group.traverse(m => { if (m.isMesh && m.geometry && !Object.values(G).includes(m.geometry)) m.geometry.dispose(); if (m.isInstancedMesh) m.dispose(); }); st.live--; st.tris -= t.tris; st.bytes -= t.bytes; st.dropped++; }
    t.state = 'gone'; tiles.delete(key);
  }
  const built = (t, data) => { t.data = data; t.state = 'built'; ready.push(t); st.built++; st.msSum += data.ms; st.msMax = Math.max(st.msMax, data.ms); };
  function want(i, j) {
    const key = i + '_' + j; if (!have.has(key) || tiles.has(key)) return;
    const t = { state: 'loading', i, j }; tiles.set(key, t);
    if (own) { try { built(t, direct.build(own[key]).tile); } catch (e) { t.state = 'failed'; st.failed++; if (o.onError) o.onError(key, e); else throw e; } return; }
    fetch(o.base + key + '.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(text => { st.fetched++; if (t.state !== 'loading') return null; return buildOff(text); })
      .then(data => { if (data && t.state === 'loading') built(t, data); })
      .catch(e => { t.state = 'failed'; st.failed++; if (o.onError) o.onError(key, e); });
  }
  function paintSignals(t) {
    const hd = t.headData, n = hd.length / 7; let key = '';
    for (let k = 0; k < n; k += 3) key += signalState(hd[7 * k + 5], hd[7 * k + 4], time);
    if (key === t.sigKey) return; t.sigKey = key;
    for (let k = 0; k < n; k++) {
      const s = signalState(hd[7 * k + 5], hd[7 * k + 4], time), lampOf = hd[7 * k + 6];            // 0 the red lamp, 1 yellow, 2 green
      const on = (lampOf === 0 && s === 0) || (lampOf === 1 && s === 1) || (lampOf === 2 && s === 2);
      t.heads.setColorAt(k, col.set(on ? ['#ff2a1c', '#ffb81c', '#2dff7a'][lampOf] : ['#3a0d0a', '#3a2c08', '#0a3418'][lampOf]));
    }
    t.heads.instanceColor.needsUpdate = true;
  }

  if (own) { for (const { i, j } of have.values()) want(i, j); while (ready.length) raise(ready.shift()); }

  return {
    /** call every frame with where the eye is and the world's own clock */
    update(x, z, now) {
      time = now;
      const ci = Math.floor(x / T), cj = Math.floor(z / T);
      const order = []; for (let di = -KEEP; di <= KEEP; di++) for (let dj = -KEEP; dj <= KEEP; dj++) order.push([Math.abs(di) + Math.abs(dj), ci + di, cj + dj]);
      order.sort((a, b) => a[0] - b[0]); let asked = 0;
      for (const [, i, j] of order) { if (asked >= 3) break; const key = i + '_' + j; if (have.has(key) && !tiles.has(key)) { want(i, j); asked++; } }
      for (const [key, t] of tiles) if (Math.abs(t.i - ci) > DROP || Math.abs(t.j - cj) > DROP) { if (t.state === 'built') { const k = ready.indexOf(t); if (k >= 0) ready.splice(k, 1); } drop(key, t); }
      if (ready.length) { ready.sort((a, b) => Math.hypot(a.i * T + 250 - x, a.j * T + 250 - z) - Math.hypot(b.i * T + 250 - x, b.j * T + 250 - z)); raise(ready.shift()); }
      const sig = Math.floor(now * 2);
      for (const t of tiles.values()) {
        if (t.state !== 'live') continue;
        const dx = Math.max(t.i * T - x, 0, x - (t.i + 1) * T), dz = Math.max(t.j * T - z, 0, z - (t.j + 1) * T), d = Math.hypot(dx, dz);
        if (t.marks) t.marks.visible = d < 330;
        if (t.trees) { const g = d < 140 ? G.treeHi : G.treeLo; if (t.trees.geometry !== g) t.trees.geometry = g; }
        if (t.cars) { const g = d < 90 ? G.carHi : G.carLo; if (t.cars.geometry !== g) { t.cars.geometry = g; t.cars.castShadow = d < 90; } t.cars.visible = d < 620; }
        if (t.heads) { t.heads.visible = d < 420; if (sig !== lastSig && d < 420) paintSignals(t); }
      }
      lastSig = sig;
    },
    /** are the squares round this point all in place (for a start, or a tool that waits) */
    settled(x, z, reach = 1) {
      const ci = Math.floor(x / T), cj = Math.floor(z / T);
      for (let di = -reach; di <= reach; di++) for (let dj = -reach; dj <= reach; dj++) { const key = (ci + di) + '_' + (cj + dj); if (have.has(key) && (!tiles.has(key) || (tiles.get(key).state !== 'live' && tiles.get(key).state !== 'failed'))) return false; }
      return true;
    },
    setNight(v) { night = v; M.walls.emissiveIntensity = v ? 0.5 : 0; for (const t of tiles.values()) if (t.glow) t.glow.visible = v; },
    stats: () => ({ ...st, msAvg: st.built ? +(st.msSum / st.built).toFixed(1) : 0, waiting: ready.length, held: tiles.size, mb: +(st.bytes / 1048576).toFixed(1), worker: !!worker }),
    materials: M, root,
  };
}
