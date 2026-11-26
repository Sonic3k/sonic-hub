/* The streets around the hotel, from OpenStreetMap (osm.js) and the satellite picture: Sepulveda Blvd (Pacific Coast
   Highway) with its median of palms, Mariposa Ave and its Indian laurel figs, Continental Blvd curving off it, Nash St
   under the Green Line's viaduct and the Mariposa station; the buildings of 2015 along them (the County's heights),
   Ralphs with its two Spanish gables, the Starbucks / Jersey Mike's pad on the corner, In-N-Out across the street; and a
   little traffic. Shop signs are plain lettering: no logo is drawn. */
import * as THREE from 'three';
import { Builder, part } from '../../engine/kit.js';
import { M, canvasTex, plateTex, rng, shade } from '../../engine/tex.js';
import { X, concTex } from './mat.js';
import { P, tree, ficus, palm, car, streetLight, lotLight, glare } from './props.js';
import { hipRoof } from './hotel.js';
import { swarm, pickKind, pickColour } from './cars.js';
import { BUILDINGS, ROADS, SERVICE, RAIL, PLATFORM } from './osm.js';
import { LOT } from './plan.js';

const LANE = 3.4;
const R0 = rng(77);
/* ── polylines ── */
const pts = flat => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; };
/** the part of a polyline (running west to east) between x0 and x1 */
function cutX(p, x0, x1) {
  const out = [], at = (a, c, x) => [x, a[1] + (c[1] - a[1]) * (x - a[0]) / (c[0] - a[0])];
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i], c = p[i + 1]; if (c[0] <= x0 || a[0] >= x1 || c[0] === a[0]) continue;
    const s = a[0] < x0 ? at(a, c, x0) : a, e = c[0] > x1 ? at(a, c, x1) : c;
    if (!out.length || out[out.length - 1][0] !== s[0]) out.push(s);
    out.push(e);
  }
  return out;
}
const FRONT = [-40, 47];             // the hotel's frontage on Mariposa (x)
function offsetLine(p, d) {        // a polyline moved sideways by d (positive: to the right of travel, i.e. +normal)
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], c = p[Math.min(p.length - 1, i + 1)];
    let tx = c[0] - a[0], tz = c[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
    out.push([p[i][0] - tz * d, p[i][1] + tx * d]);
  }
  return out;
}
/** a flat ribbon along a polyline, width w, at height y; UVs from world x, z (so overlapping ribbons line up) */
function ribbon(b, mat, p, w, y, o = {}) {
  const L = offsetLine(p, -w / 2), Rr = offsetLine(p, w / 2), pos = [], uv = [], idx = [], tu = o.tile ?? 4;
  for (let i = 0; i < p.length; i++) { for (const q of [L[i], Rr[i]]) { pos.push(q[0], y, q[1]); uv.push(q[0] / tu, q[1] / tu); } }
  for (let i = 0; i < p.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // the ribbon's normals must point up whichever way the polyline runs
  const n = g.attributes.normal; let flip = false; for (let i = 0; i < n.count; i++) if (n.getY(i) < 0) { flip = true; break; }
  if (flip) { g.setIndex(idx.map((v, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]])); g.computeVertexNormals(); }
  b.geo(mat, g, { cast: false, recv: true });
}
/** a raised strip (curb + sidewalk) along a polyline: its top at y, its outer face down to 0 */
function walkStrip(b, mat, p, w, y) {
  ribbon(b, mat, p, w, y, { tile: 1.5 });
  for (const side of [-1, 1]) { const e = offsetLine(p, side * w / 2); for (let i = 0; i < e.length - 1; i++) { const [x0, z0] = e[i], [x1, z1] = e[i + 1], len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.01) continue; b.rbox(P.curb(), (x0 + x1) / 2, y / 2, (z0 + z1) / 2, 0.16, y, len, Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI, { cast: false }); } }
}
/** points along a polyline every `step` metres: [x, z, heading of travel] */
function along(p, step, from = 0) {
  const out = []; let carry = from;
  for (let i = 0; i < p.length - 1; i++) {
    const [x0, z0] = p[i], [x1, z1] = p[i + 1], L = Math.hypot(x1 - x0, z1 - z0), h = Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI;
    let t = carry; while (t < L) { out.push([x0 + (x1 - x0) * t / L, z0 + (z1 - z0) * t / L, h]); t += step; }
    carry = t - L;
  }
  return out;
}
const lenOf = p => { let s = 0; for (let i = 0; i < p.length - 1; i++) s += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); return s; };
function pointAt(p, d) { for (let i = 0; i < p.length - 1; i++) { const [x0, z0] = p[i], [x1, z1] = p[i + 1], L = Math.hypot(x1 - x0, z1 - z0); if (d <= L) return [x0 + (x1 - x0) * d / L, z0 + (z1 - z0) * d / L, Math.atan2(x1 - x0, -(z1 - z0))]; d -= L; } const a = p[p.length - 2], c = p[p.length - 1]; return [c[0], c[1], Math.atan2(c[0] - a[0], -(c[1] - a[1]))]; }

/* ── façades: drawn per kind, with a second sheet of the windows lit at night ── */
const FAC = {
  office: { base: '#d9dbd8', glass: '#2c3d4c', floor: 3.8, band: [0.35, 0.95], mull: 1.5 },
  hotel: { base: '#ece6d6', glass: '#33424d', floor: 3.0, win: [0.9, 1.35], bay: 3.6 },
  stucco: { base: '#e2d4b4', glass: '#3a4650', floor: 3.0, win: [0.9, 1.2], bay: 4.2 },
  industrial: { base: '#d6d3cb', glass: '#3b4954', floor: 9.0, win: [0.0, 0.0], bay: 7.5, panel: true },
  retail: { base: '#e3d6bd', glass: '#2a3640', floor: 4.5, store: true, bay: 6 },
};
const facTex = (k, lit) => canvasTex(256, 256, (g, w, h) => {
  const f = FAC[k], R = rng(k.length * 17 + (lit ? 3 : 0)); const pxm = w / 8;                                                  // the sheet stands for 8 m × 8 m
  if (lit) { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); } else { g.fillStyle = f.base; g.fillRect(0, 0, w, h); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(80,70,60,${R() * 0.05})`; g.fillRect(R() * w, 0, 2 + R() * 6, h); } }
  const fl = f.floor * pxm;
  for (let y0 = h; y0 > 0; y0 -= fl) {
    if (f.band) { const y = y0 - fl * f.band[1], hh = fl * (f.band[1] - f.band[0]); if (lit) { for (let x = 0; x < w; x += f.mull * pxm) if (R() < 0.35) { g.fillStyle = `rgba(255,${200 + R() * 40},${140 + R() * 60},0.9)`; g.fillRect(x + 2, y, f.mull * pxm - 4, hh); } } else { g.fillStyle = f.glass; g.fillRect(0, y, w, hh); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, y, w, hh * 0.3); g.fillStyle = shade(f.base, -0.2); for (let x = 0; x < w; x += f.mull * pxm) g.fillRect(x, y, 2, hh); } }
    else if (f.store) { const y = y0 - fl * 0.78, hh = fl * 0.7; if (lit) { g.fillStyle = 'rgba(255,236,190,0.85)'; g.fillRect(0, y, w, hh); } else { g.fillStyle = f.glass; g.fillRect(0, y, w, hh); g.fillStyle = shade(f.base, -0.25); for (let x = 0; x < w; x += 1.5 * pxm) g.fillRect(x, y, 3, hh); } }
    else if (f.panel) { if (!lit) { g.fillStyle = shade(f.base, -0.12); for (let x = 0; x < w; x += f.bay * pxm) g.fillRect(x, 0, 2, h); g.fillStyle = shade(f.base, -0.08); g.fillRect(0, y0 - 6, w, 3); } }
    else { for (let x = 0; x < w; x += f.bay * pxm) { const ww = f.win[0] * pxm * 1.6, hh = f.win[1] * pxm, xx = x + (f.bay * pxm - ww) / 2, yy = y0 - fl * 0.75; if (lit) { if (R() < 0.3) { g.fillStyle = `rgba(255,${190 + R() * 50},${120 + R() * 60},0.9)`; g.fillRect(xx, yy, ww, hh); } } else { g.fillStyle = shade(f.base, 0.12); g.fillRect(xx - 3, yy - 3, ww + 6, hh + 6); g.fillStyle = f.glass; g.fillRect(xx, yy, ww, hh); } } }
  }
}, { aniso: 8 });
const facMats = {};
function facMat(k) {
  if (!facMats[k]) facMats[k] = new THREE.MeshStandardMaterial({ map: facTex(k, false), emissiveMap: facTex(k, true), emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.85 });
  return facMats[k];
}
const kindOf = (kind, h, name) => (/hotel|Inn|Aloft/i.test(name) || kind === 'hotel' ? 'hotel' : kind === 'industrial' || kind === 'warehouse' || (kind === 'yes' && h < 9) ? 'industrial' : kind === 'retail' || kind === 'commercial' && h < 7 ? 'retail' : kind === 'commercial' || kind === 'office' ? (h > 12 ? 'office' : 'stucco') : 'stucco');

/** a building from its footprint: walls with a drawn façade, a flat roof with a parapet and a few roof units */
function prism(b, flat, h, kind, o = {}) {
  const p = pts(flat); if (p.length < 3) return;
  let area = 0; for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; area += x0 * z1 - x1 * z0; }
  const ccw = area > 0, fm = o.mat ?? facMat(kind);
  for (let i = 0; i < p.length; i++) {
    const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length], L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.2) continue;
    // a wall as one quad, facing out
    let nx = z1 - z0, nz = -(x1 - x0); if (!ccw) { nx = -nx; nz = -nz; } const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
    const g = new THREE.BufferGeometry(), pos = [x0, 0, z0, x1, 0, z1, x1, h, z1, x0, h, z0], uv = [0, 0, L / 8, 0, L / 8, h / 8, 0, h / 8];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz], 3));
    // wind the two triangles so their front faces the outside
    const cr = (x1 - x0) * nz - (z1 - z0) * nx; g.setIndex(cr > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    b.geo(fm, g);
    if (L > 0.5) b.solid(Math.min(x0, x1) - 0.1, 0, Math.min(z0, z1) - 0.1, Math.max(x0, x1) + 0.1, h, Math.max(z0, z1) + 0.1);
  }
  // the roof: a flat cap (earcut by THREE.ShapeGeometry), a parapet line, a couple of roof units
  const sh = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
  const rg = new THREE.ShapeGeometry(sh); rg.rotateX(-Math.PI / 2); rg.translate(0, h, 0);
  b.geo(o.roof ?? M.plain('#b9b6ae', 0.9), rg, { cast: false });
  const xs = p.map(q => q[0]), zs = p.map(q => q[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  if (!o.bare && h > 5) for (let i = 0; i < 2; i++) b.box(M.plain('#cfcfca', 0.6, 0.3), cx - 1.2 + i * 2.6, h, cz - 0.8, cx + 0.2 + i * 2.6, h + 1.1, cz + 0.6, { cast: false });
}

/** things set along the streets, merged in bands of x: what is behind the walker is then not drawn at all */
function banded(scene, shared, name, fill) {
  const items = [], cuts = [-Infinity, 150, 450, Infinity];
  fill((x, fn) => items.push([x, fn]));
  for (let i = 0; i < 3; i++) { const mine = items.filter(([x]) => x >= cuts[i] && x < cuts[i + 1]); if (mine.length) part(scene, shared, b => { for (const [, fn] of mine) fn(b); }, `${name}-${i}`); }
}

export function buildTown(scene, shared, ctx) {
  const glowStreet = ctx.lampMat('#ffc98a', 2.4, 0.9, 0.04), glowLot = ctx.lampMat('#ffd9a0', 2.6, 0.9, 0.04);
  const roadMat = X.asphalt('#363636', 9), walkMat = new THREE.MeshStandardMaterial({ map: concTex('#c6c2b8', 4, true), roughness: 0.9 });
  const roads = ROADS.map(([name, cls, lanes, oneway, flat]) => ({ name, cls, lanes, oneway, p: pts(flat), w: lanes * LANE + (oneway ? 0.8 : 1.2) }));
  const major = roads.filter(r => /Pacific Coast|Mariposa|Nash|Continental|Lairport|Sepulveda/.test(r.name));
  /* Inside a world (engine/world: ctx.world) the streets are the world's own, here as everywhere: its tiles lay the
     roads of this place's box too — paving, kerbs and walks, lines, crosswalks, the median, the signals, the cars — by
     the same rules as the streets beyond it (the world's data/streets.py). This place then keeps what stands along
     them: its lawns and lots, trees and lights, buildings, the hotel. Alone, it draws its streets itself, as below. */
  const own = !ctx.world;

  /* ── the ground beyond the block, the roads, the sidewalks, markings ── */
  const ground = part(scene, shared, b => {
    b.box(X.lawn(), -300, -0.06, -280, 800, -0.03, 260, { uv: [2, 2], uvw: true, cast: false });
    // business-park lots east of the hotel and north of Mariposa: asphalt aprons around each building
    for (const [id, h, kind, name, fl] of BUILDINGS) { const p = pts(fl), xs = p.map(q => q[0]), zs = p.map(q => q[1]); if (kind === 'house' || kind === 'residential' || kind === 'apartments') continue; b.box(X.asphalt('#404040', 5), Math.min(...xs) - 14, -0.03, Math.min(...zs) - 14, Math.max(...xs) + 14, own ? -0.005 : -0.018, Math.max(...zs) + 14, { uv: [4, 4], uvw: true, cast: false }); }   // (in a world, clear of the world's own streets at 0)
    if (own) for (const r of roads) ribbon(b, roadMat, r.p, r.w, 0.004);
    for (const [kind, fl] of SERVICE) { const p = pts(fl); if (p.length > 1) ribbon(b, X.asphalt('#3d3d3c', 3), p, 6.5, 0.002); }
    // sidewalks along the big streets, a lawn parkway between walk and curb on Mariposa
    if (own) for (const r of major) for (const side of [-1, 1]) {
      if (r.oneway && /Pacific Coast/.test(r.name)) { if (side > 0) walkStrip(b, walkMat, offsetLine(r.p, r.w / 2 + 1.25), 2.4, 0.12); continue; }   // only on the kerb side of each carriageway
      if (/Mariposa/.test(r.name)) {
        // along the hotel's frontage the walk is at the kerb (the satellite picture) — the lawn and the hedge behind it are the
        // hotel's (site.js) — and it drops flush across the drive in; elsewhere a lawn parkway lies between kerb and walk
        const front = side > 0 && r.p[0][0] < FRONT[0] && r.p[r.p.length - 1][0] > FRONT[1];
        for (const seg of front ? [cutX(r.p, -1e9, FRONT[0]), cutX(r.p, FRONT[1], 1e9)] : [r.p]) { if (seg.length < 2) continue; walkStrip(b, X.lawn(), offsetLine(seg, side * (r.w / 2 + 1.1)), 2.0, 0.1); walkStrip(b, walkMat, offsetLine(seg, side * (r.w / 2 + 3.2)), 1.9, 0.12); }
        if (front) {
          for (const seg of [cutX(r.p, FRONT[0], LOT.drive[0]), cutX(r.p, LOT.drive[1], FRONT[1])]) walkStrip(b, walkMat, offsetLine(seg, r.w / 2 + 1.05), 1.9, 0.12);
          ribbon(b, walkMat, offsetLine(cutX(r.p, LOT.drive[0], LOT.drive[1]), r.w / 2 + 1.05), 1.9, 0.012, { tile: 1.5 });
          for (const x of [FRONT[0], FRONT[1]]) { const q = offsetLine(cutX(r.p, x - 0.01, x + 0.01), r.w / 2 + 2.1)[0]; b.box(walkMat, x - 0.95, 0, q[1] - 1.0, x + 0.95, 0.12, q[1] + 2.1, { uv: [1.5, 1.5], uvw: true, cast: false }); }      // where the two layouts meet
        }
      }
      else walkStrip(b, walkMat, offsetLine(r.p, side * (r.w / 2 + 1.1)), 2.0, 0.12);
    }
    // lane lines: dashes between lanes, a double yellow line down two-way streets
    const white = M.plain('#e8e6dd', 0.7), yellow = M.plain('#d9b030', 0.7);
    if (own) for (const r of major) {
      if (!r.oneway && lenOf(r.p) > 20) { ribbon(b, yellow, offsetLine(r.p, -0.12), 0.11, 0.009); ribbon(b, yellow, offsetLine(r.p, 0.12), 0.11, 0.009); }
      const half = r.oneway ? r.lanes : r.lanes / 2;
      for (let k = 1; k < half; k++) for (const side of r.oneway ? [1] : [-1, 1]) {
        const off = r.oneway ? -r.w / 2 + 0.4 + k * LANE : side * k * LANE;
        for (const [x, z, hd] of along(offsetLine(r.p, off), 9)) b.rbox(white, x, 0.009, z, 0.12, 0.003, 3, hd, { cast: false });
      }
    }
    // crosswalks at the three signals
    if (own) for (const [x, z, ax, len] of [[-116.5, -66.5, 'x', 32], [-116.5, -93.5, 'x', 32], [-98.5, -80.5, 'z', 21], [-134.5, -80.5, 'z', 21], [203, -80, 'z', 21], [692, -80, 'z', 21], [701, -94, 'x', 22], [701, -66, 'x', 22]]) {
      for (let i = 0; i < len / 0.9; i++) { const t = -len / 2 + i * 0.9 + 0.2; if (ax === 'x') b.box(white, x + t, 0.009, z - 1.5, x + t + 0.45, 0.012, z + 1.5, { cast: false }); else b.box(white, x - 1.5, 0.009, z + t, x + 1.5, 0.012, z + t + 0.45, { cast: false }); }
    }
    // the median of Sepulveda: a raised strip of lawn with palms
    if (own) {
      b.box(X.lawn(), -118.6, 0, -68, -115.4, 0.16, 240, { uv: [2, 2], uvw: true, cast: false });
      b.box(P.curb(), -118.8, 0, -68, -118.6, 0.17, 240, { cast: false }); b.box(P.curb(), -115.4, 0, -68, -115.2, 0.17, 240, { cast: false });
      b.box(X.lawn(), -118.6, 0, -250, -115.4, 0.16, -92, { uv: [2, 2], uvw: true, cast: false });
    }
  }, 'ground');

  /* ── street trees and lights (in a world they stand where the world's kerbs are: its tiles plant them) ── */
  if (own) banded(scene, shared, 'greenery', put => {
    const mar = major.filter(r => /Mariposa/.test(r.name));
    for (const r of mar) for (const side of [-1, 1]) {
      const line = offsetLine(r.p, side * (r.w / 2 + (own ? 1.1 : 2.9)));              // in the lawn between kerb and walk — in a world, whose walk is at the kerb, behind the walk
      for (const [x, z] of along(line, side > 0 ? 13 : 17, 4)) {
        if (x < -100 || (x > -40 && x < 45 && side > 0)) continue;                                   // the corner and the hotel's own frontage
        put(x, b => { if (x > 40 && x < 700) ficus(b, x, z, {}); else tree(b, x, z, { h: 7 }); });
      }
      for (const [x, z, hd] of along(offsetLine(r.p, side * (r.w / 2 + 0.6)), 42, side > 0 ? 4 : 31)) { const f = hd + (side > 0 ? -90 : 90); put(x, b => streetLight(b, x, z, f, glowStreet)); const hx = x + Math.sin(f * Math.PI / 180) * 2.5, hz = z - Math.cos(f * Math.PI / 180) * 2.5; POOLS.push([hx, hz, 24, 'street']); HEADS.push([hx, 8.95, hz]); }
    }
    for (let z = -240; z < 240; z += 22) { const dz = R0() * 6, h = 14 + R0() * 6; put(-117, b => palm(b, -117, z + dz, { h })); }
    for (const r of major.filter(r => /Pacific Coast/.test(r.name))) for (const [x, z] of along(r.p, 45, 12)) { const out = x < -116 ? -1 : 1, px = x + out * (r.w / 2 + 0.5); put(x, b => streetLight(b, px, z, out > 0 ? 270 : 90, glowStreet)); POOLS.push([px - out * 2.5, z, 24, 'street']); HEADS.push([px - out * 2.5, 8.95, z]); }
    for (const r of major.filter(r => /Nash|Continental|Lairport/.test(r.name))) for (const side of [-1, 1]) for (const [x, z, hd] of along(offsetLine(r.p, side * (r.w / 2 + 0.6)), 40, 15)) { const f = hd + (side > 0 ? -90 : 90); put(x, b => streetLight(b, x, z, f, glowStreet)); const hx = x + Math.sin(f * Math.PI / 180) * 2.5, hz = z - Math.cos(f * Math.PI / 180) * 2.5; POOLS.push([hx, hz, 24, 'street']); HEADS.push([hx, 8.95, hz]); }
    // palms along Nash St by the station (the photograph under the viaduct)
    for (let z = -160; z < 60; z += 14) { const h = 13 + R0() * 5; put(714.5, b => palm(b, 714.5, z, { h })); }
    // (the first one 18 m along: Continental's line starts in the middle of Mariposa, and a tree 5 m along stood in the road)
    for (const r of major.filter(r => /Continental/.test(r.name))) for (const [x, z] of along(offsetLine(r.p, r.w / 2 + 3), 21, 18)) put(x, b => ficus(b, x, z, { r: 4.8 }));
    // the signals at Sepulveda & Mariposa, Mariposa & Continental, Mariposa & Nash
    if (!ctx.world) for (const [x, z, face] of [[-100.5, -69.5, 270], [-133, -90.5, 90], [-100.5, -90.5, 0], [-133, -69.5, 180], [212, -69, 270], [212, -91, 0], [714, -69, 270], [714, -91, 0]]) put(x, b => signal(b, x, z, face, ctx));
  });

  /* ── buildings ── */
  const blds = part(scene, shared, b => {
    for (const [id, h, kind, name, fl] of BUILDINGS) {
      if (name === 'In-N-Out Burger') { innOut(b, fl, h); continue; }
      const k = kindOf(kind, h, name);
      if (kind === 'house' || kind === 'residential' || (kind === 'apartments' && h < 9)) { house(b, fl, h); continue; }
      prism(b, fl, h, k);
    }
    // two that the map keeps as relations: the Hacienda Hotel across Sepulveda (its top floor wrapped in green netting
    // for repairs in the photographs of August–September 2015) and the hotel at 2000 E Mariposa, Spanish, round a court
    hacienda(b); sonesta(b);
  }, 'buildings');

  /* ── Ralphs, the two pads on the corner ── */
  const shops = part(scene, shared, b => { ralphs(b, ctx); starbucksPad(b, ctx); octagonPad(b, ctx); }, 'shops');

  /* ── the Green Line on its viaduct, the Mariposa station ── */
  const metro = part(scene, shared, b => viaduct(b, ctx), 'metro');

  /* ── traffic: cars along Sepulveda and Mariposa, lights on after dark ── */
  const traffic = ctx.world ? { step() {}, setNight() {} } : makeTraffic(scene, roads);
  /* ── after dark: pools of light under the street lights, at the shop fronts, on the platform ── */
  const pools = part(scene, null, b => {
    const tint = { street: [255, 205, 150], warm: [255, 214, 160], cool: [225, 235, 255] }, mats = {};
    for (const [k, [r, g, bl]] of Object.entries(tint)) {
      const tex = canvasTex(64, 64, (c, w) => { const gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, `rgba(${r},${g},${bl},0.62)`); gr.addColorStop(0.4, `rgba(${r},${g},${bl},0.26)`); gr.addColorStop(1, `rgba(${r},${g},${bl},0)`); c.fillStyle = gr; c.fillRect(0, 0, w, w); }, { repeat: false });
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }); m.userData.noCast = true; m.userData.noRecv = true; m.userData.order = 1; mats[k] = m;
    }
    for (const [x, z, size, k, y = 0.14] of POOLS) b.quad(mats[k], '+y', x, y, z, size, size, { cast: false, recv: false });
  }, 'street pools');
  pools.visible = false;
  const shine = glare(scene, HEADS, 3.4, [255, 214, 160], 'street glare');
  const mats = Object.values(facMats);
  return {
    setHour(h) { const night = h === 'toi'; for (const m of mats) m.emissiveIntensity = night ? 0.9 : 0; for (const m of LIT) m.emissiveIntensity = night ? 1.1 : 0; pools.visible = shine.visible = night; traffic.setNight(night); },
    // the viaduct, 700 m off, is drawn only from the hotel's east side on: from the west the hotel hides it, and seen
    // through a near wall its slivers on the horizon would sparkle
    animate(dt, clock, camera) { traffic.step(dt); metro.visible = camera.position.x > 32; },
  };
}

/* ── houses west of Sepulveda: stucco boxes under low hip roofs ── */
function house(b, fl, h) {
  const p = pts(fl), xs = p.map(q => q[0]), zs = p.map(q => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), R = rng((x0 * 7 + z0 * 3) | 0);
  const wall = Math.min(h - 1.2, 5.6), col = ['#e9dcc0', '#f1ece0', '#d8c7a5', '#e6d2b8', '#c9c2b0'][(R() * 5) | 0];
  prism(b, fl, wall, 'stucco', { mat: X.stucco(col, 8), bare: true });
  hipRoof(b, R() < 0.5 ? X.roof('#a8523a', 6) : M.plain('#5e5a55', 0.9), x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, wall, 0.33, null);
}
/* ── In-N-Out across Mariposa: white walls, a red band, a red tile roof, two crossed palms ── */
function innOut(b, fl, h) {
  const p = pts(fl), xs = p.map(q => q[0]), zs = p.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  prism(b, fl, 4.2, 'retail', { mat: X.stucco('#f5f3ee', 9), bare: true });
  b.box(M.plain('#c4162d', 0.6), x0 - 0.05, 3.1, z0 - 0.05, x1 + 0.05, 3.6, z1 + 0.05, { cast: false });
  hipRoof(b, X.roof('#b0412f', 7), x0 - 0.6, z0 - 0.6, x1 + 0.6, z1 + 0.6, 4.2, 0.45, null);
  palm(b, x1 + 3, z1 + 2, { h: 11 }); palm(b, x1 + 4.5, z1 + 2.5, { h: 12 });
  sign(b, 'IN-N-OUT BURGER', (x0 + x1) / 2, 3.35, z1 + 0.07, 7.5, 0.55, '+z', '#c4162d', '#ffffff');
}
const LIT = [], POOLS = [], HEADS = [];          // signs lit after dark; pools of light on the ground [x, z, size, colour]
/** plain lettering on a panel (no logo) */
function sign(b, text, x, y, z, w, h, face, bg, fg, o = {}) {
  const t = plateTex(512, Math.round(512 * h / w), (g, W, H) => { g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.font = `${o.weight ?? 700} ${Math.round(H * 0.62)}px ${o.font ?? 'Arial, sans-serif'}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H * 0.55); });
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: '#ffffff', emissiveMap: o.lit ? t : null, emissiveIntensity: 0 });
  if (o.lit) LIT.push(m);
  b.quad(m, face, x, y, z, w, h, { cast: false });
}
/* ── Ralphs (1997): a big box of ochre stucco, a band of red tile along its front, two gabled pavilions over the
   entrances with a little iron balcony each, arched openings, the name in plain red letters on the west gable ── */
function ralphs(b, ctx) {
  const x0 = -86.3, x1 = -22.7, z0 = 63.6, z1 = 128.6, h = 7.6, wall = X.stucco('#d9b56c', 11);
  b.box(wall, x0, 0, z0 + 0.6, x1, h, z1, { uv: [2, 2], uvw: true, solid: true });
  b.box(M.plain('#bdbab2', 0.9), x0 + 0.3, h, z0 + 0.9, x1 - 0.3, h + 0.05, z1 - 0.3, { cast: false });
  b.box(wall, x0, h, z0 + 0.6, x1, h + 1.0, z0 + 0.9, { uv: [2, 2], uvw: true });                                    // the front parapet
  // the red tile band along the front and the west side, on brackets
  const tile = X.roof('#b0503a', 8);
  b.rbox(tile, (x0 + x1) / 2, h - 0.55, z0 + 0.1, x1 - x0 + 0.6, 0.12, 1.6, 0, { rx: -22 });
  b.rbox(tile, x0 - 0.2, h - 0.55, (z0 + z1) / 2, 1.6, 0.12, z1 - z0, 0, { rz: 22 });
  // the arcade in front: square piers, a deep shade, the doors
  for (let x = x0 + 4; x < x1 - 2; x += 6.2) b.box(wall, x - 0.35, 0, z0 - 2.4, x + 0.35, 4.2, z0 - 1.7, { uv: [2, 2], uvw: true, solid: true });
  b.box(wall, x0 + 3, 4.2, z0 - 2.5, x1 - 1, 4.9, z0 + 0.6, { uv: [2, 2], uvw: true });
  b.box(X.conc('#c8c3b8', 7, true), x0, 0, z0 - 2.6, x1, 0.14, z0 + 0.6, { uv: [1.5, 1.5], uvw: true, cast: false });
  for (const [g0, g1] of [[-69.1, -59.5], [-48.1, -38.3]]) {
    const gm = (g0 + g1) / 2, gh = 10.4;
    b.box(wall, g0, 0, z0 - 2.9, g1, gh, z0 + 3, { uv: [2, 2], uvw: true, solid: true });
    // the gable: a triangle of stucco under a tile roof whose ridge runs north–south
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([g0, gh, z0 - 2.95, g1, gh, z0 - 2.95, gm, gh + 1.9, z0 - 2.95], 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 4, 0, 2, 1], 2)); gg.setIndex([0, 2, 1]); gg.computeVertexNormals(); b.geo(wall, gg);
    for (const s of [-1, 1]) b.rbox(tile, gm + s * (g1 - g0) / 4, gh + 0.95, z0, (g1 - g0) / 2 + 0.9, 0.14, 6.6, 0, { rz: -s * 21 });
    b.box(M.plain('#f0ece2', 0.6), g0 - 0.2, gh - 0.1, z0 - 3.15, g1 + 0.2, gh + 0.05, z0 - 2.85, { cast: false });
    // a tall window with a little iron balcony; an arch over the door
    b.box(M.plain('#2f3b35', 0.3), gm - 0.55, 5.4, z0 - 2.92, gm + 0.55, 7.6, z0 - 2.9, { cast: false });
    for (let i = 0; i < 8; i++) b.box(M.plain('#1c1c1c', 0.5, 0.6), gm - 0.7 + i * 0.2, 5.4, z0 - 3.25, gm - 0.68 + i * 0.2, 6.0, z0 - 3.23, { cast: false });
    b.box(M.plain('#1c1c1c', 0.5, 0.6), gm - 0.75, 5.95, z0 - 3.3, gm + 0.75, 6.0, z0 - 2.9, { cast: false });
    b.box(M.plain('#1d262b', 0.15, 0.3), gm - 1.6, 0.14, z0 - 2.92, gm + 1.6, 3.3, z0 - 2.9, { cast: false });
    for (let i = 0; i < 20; i++) { const a = Math.PI * i / 20, a2 = Math.PI * (i + 1) / 20, xa = gm - Math.cos(a) * 1.6, xb = gm - Math.cos(a2) * 1.6; b.box(M.plain('#1d262b', 0.15, 0.3), Math.min(xa, xb) - 0.002, 3.29, z0 - 2.92, Math.max(xa, xb) + 0.002, 3.3 + Math.sin((a + a2) / 2) * 1.0, z0 - 2.9, { cast: false }); }
  }
  sign(b, 'Ralphs', -64.3, 8.5, z0 - 2.97, 5.2, 1.5, '-z', '#d9b56c', '#b3201b', { font: 'Georgia, serif', weight: 700, lit: true });
  // shop windows along the arcade, lit at night
  const lit = new THREE.MeshStandardMaterial({ color: '#1c2429', roughness: 0.12, metalness: 0.35, emissive: '#fff0d0', emissiveIntensity: 0 }); LIT.push(lit);
  for (const [a, c] of [[-84, -71], [-57, -50], [-36, -25]]) { b.box(lit, a, 0.3, z0 - 0.0, c, 3.2, z0 + 0.02, { cast: false }); for (let x = a + 3; x < c; x += 5) POOLS.push([x, z0 - 2.5, 9, 'warm']); }
  ctx.hot.push({ id: 'ralphs', pos: [-54, 3.2, z0 - 5], r: 0.6 });
}
/* ── the pad on the corner of the lot: Starbucks and Jersey Mike's under one tile mansard, a patio on its east ── */
function starbucksPad(b, ctx) {
  const x0 = -88, x1 = -70.5, z0 = -18.6, z1 = -1.2, h = 4.4, wall = X.stucco('#d8b878', 12), tile = X.roof('#b0503a', 9);
  b.box(wall, x0, 0, z0, x1, h, z1, { uv: [2, 2], uvw: true, solid: true });
  b.box(M.plain('#b9b6ae', 0.9), x0 + 0.5, h + 0.9, z0 + 0.5, x1 - 0.5, h + 0.95, z1 - 0.5, { cast: false });
  b.box(wall, x0, h, z0, x1, h + 1.0, z1, { uv: [2, 2], uvw: true, cast: true });
  for (const [cx, cz, w, d, rx, rz] of [[(x0 + x1) / 2, z0 - 0.4, x1 - x0 + 1.6, 1.8, -24, 0], [(x0 + x1) / 2, z1 + 0.4, x1 - x0 + 1.6, 1.8, 24, 0], [x0 - 0.4, (z0 + z1) / 2, 1.8, z1 - z0 + 1.6, 0, 24], [x1 + 0.4, (z0 + z1) / 2, 1.8, z1 - z0 + 1.6, 0, -24]]) b.rbox(tile, cx, h + 0.75, cz, w, 0.14, d, 0, { rx, rz });
  // storefronts: east (Starbucks, toward the lot) and south (Jersey Mike's)
  const glass = new THREE.MeshStandardMaterial({ color: '#1c2429', roughness: 0.12, metalness: 0.35, emissive: '#ffe2b8', emissiveIntensity: 0 }); LIT.push(glass);
  b.box(glass, x1, 0.15, z0 + 1.5, x1 + 0.02, 3.2, z1 - 1.5, { cast: false });
  for (let i = 0; i < 6; i++) b.box(M.plain('#2b2b2b', 0.5, 0.5), x1 + 0.02, 0.15, z0 + 1.5 + i * (z1 - z0 - 3) / 5 - 0.04, x1 + 0.06, 3.2, z0 + 1.5 + i * (z1 - z0 - 3) / 5 + 0.04, { cast: false });
  POOLS.push([x1 + 3, (z0 + z1) / 2 - 4, 11, 'warm'], [x1 + 3, (z0 + z1) / 2 + 4, 11, 'warm'], [(x0 + x1) / 2, z1 + 2.5, 9, 'warm']);
  b.box(glass, x0 + 1.5, 0.15, z1, x1 - 1.5, 3.2, z1 + 0.02, { cast: false });
  sign(b, 'STARBUCKS COFFEE', x1 + 0.06, 3.8, (z0 + z1) / 2, 6.0, 0.6, '+x', '#d8b878', '#0b4a33', { lit: true });
  sign(b, "JERSEY MIKE'S SUBS", (x0 + x1) / 2, 3.8, z1 + 0.06, 6.2, 0.55, '+z', '#d8b878', '#1d3f87', { lit: true });
  // the patio: a low rail, round tables with green umbrellas, chairs
  const rail = M.plain('#2b2b2b', 0.5, 0.6);
  b.box(X.conc('#c9c4b9', 8, true), x1, 0, z0 - 1, x1 + 6.5, 0.12, z1 + 1, { uv: [1.5, 1.5], uvw: true, cast: false });
  for (const [a0, c0, a1, c1] of [[x1 + 6.3, z0 + 1, x1 + 6.4, z1 - 3]]) { b.box(rail, a0, 0.95, c0, a1, 1.0, c1, {}); for (let z = c0; z <= c1; z += 1.5) b.box(rail, a0, 0, z, a1, 1.0, z + 0.05, {}); }
  b.solid(x1 + 6.25, 0, z0 + 1, x1 + 6.45, 1.0, z1 - 3);
  for (let i = 0; i < 4; i++) { const tx = x1 + 3.2, tz = z0 + 3 + i * 3.4; b.cyl(M.plain('#2b2b2b', 0.4, 0.6), tx, 0.12, tz, 0.35, 0.03, { seg: 14 }); b.cyl(M.plain('#2b2b2b', 0.4, 0.6), tx, 0.12, tz, 0.03, 0.62, { seg: 6 }); b.cyl(M.plain('#4a4a4a', 0.4, 0.4), tx, 0.74, tz, 0.4, 0.03, { seg: 16 }); b.cyl(M.plain('#cfcfcf', 0.4, 0.8), tx, 0.77, tz, 0.02, 1.6, { seg: 6 }); b.cyl(M.plain('#2f5d3d', 0.8), tx, 2.15, tz, 1.25, 0.32, { seg: 10, r2: 0.05, open: false }); for (const s of [-1, 1]) b.box(M.plain('#2b2b2b', 0.5, 0.5), tx + s * 0.6 - 0.2, 0.12, tz - 0.2, tx + s * 0.6 + 0.2, 0.55, tz + 0.2, {}); b.solid(tx - 0.5, 0, tz - 0.5, tx + 0.5, 0.8, tz + 0.5); }
  ctx.hot.push({ id: 'starbucks', pos: [x1 + 1.2, 2.6, (z0 + z1) / 2], r: 0.6 });
}
/** the octagonal pad at Sepulveda & Mariposa (a bank in those years), the same Spanish dress */
function octagonPad(b, ctx) {
  const cx = -82, cz = -56, r = 9.5, h = 5.0, wall = X.stucco('#dcc38f', 13), p = [];
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; p.push(cx + Math.cos(a) * r, cz + Math.sin(a) * r); }
  prism(b, p, h, 'retail', { mat: wall, bare: true });
  const tiles = X.roof('#b0503a', 10);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2 + Math.PI / 8, ex = cx + Math.cos(a) * (r - 0.2), ez = cz + Math.sin(a) * (r - 0.2); b.rbox(tiles, ex, h + 0.35, ez, 1.4, 0.12, 2 * r * Math.sin(Math.PI / 8) + 0.5, a * 180 / Math.PI - 180, { rz: 24 }); }
  for (let i = 0; i < 8; i++) { const a = (i + 1) / 8 * Math.PI * 2, d = r * Math.cos(Math.PI / 8) + 0.02; b.quad(M.plain('#20292e', 0.12, 0.3), '+z', cx + Math.cos(a) * d, 1.75, cz + Math.sin(a) * d, i % 2 ? 4.2 : 2.4, 2.6, { ry: a * 180 / Math.PI - 90, cast: false }); }
}
/* ── the Hacienda Hotel across Sepulveda: a long block of five floors and a taller middle ── */
function hacienda(b) {
  prism(b, [-199, -70, -152, -70, -152, 64, -199, 64], 17.5, 'hotel');
  prism(b, [-188, -30, -160, -30, -160, 20, -188, 20], 26.0, 'hotel');
  // the top floor of the long block wrapped in green netting (2015)
  const net = new THREE.MeshStandardMaterial({ color: '#2f6b45', roughness: 0.9, transparent: true, opacity: 0.88 });
  b.box(net, -199.4, 14.5, -70.4, -151.6, 17.9, 64.4, { cast: false });
  prism(b, [-201, 81, -138, 81, -138, 99, -201, 99], 27, 'hotel');                       // the tall hotel south of it
}
/* ── the hotel at 2000 E Mariposa (Spanish, three floors round a court with a pool) ── */
function sonesta(b) {
  const x0 = 284, x1 = 377, z0 = -40, z1 = 17, h = 9.5, wall = X.stucco('#e3d3ad', 14), tile = X.roof('#a94c33', 11);
  for (const [a0, c0, a1, c1] of [[x0, z0, x1, z0 + 14], [x0, z1 - 14, x1, z1], [x0, z0, x0 + 14, z1], [x1 - 14, z0, x1, z1]]) {
    prism(b, [a0, c0, a1, c0, a1, c1, a0, c1], h, 'stucco', { mat: facMat('stucco'), bare: true });
    hipRoof(b, tile, a0 - 0.5, c0 - 0.5, a1 + 0.5, c1 + 0.5, h, 0.4, null);
  }
}
/* ── a signal pole with its mast arm and a head of three lamps ── */
function signal(b, x, z, face, ctx) {
  const pole = M.plain('#8c8f90', 0.5, 0.7), head = M.plain('#2d3a2c', 0.6);
  b.cyl(pole, x, 0, z, 0.15, 6.4, { seg: 10 });
  b.push(x, 6.0, z, face);
  b.bar(pole, 0, 0, 0, 0, 0.2, 9, 0.12, { round: true, seg: 8 });
  for (const d of [4, 8]) { b.box(head, -0.2, -1.05, d - 0.15, 0.2, 0.0, d + 0.15, {}); for (const [k, c] of [[0, '#d82a20'], [1, '#e6a21c'], [2, '#2fcf6b']]) b.cyl(M.plain(k === 2 ? c : shade(c, -0.55), 0.3), 0, -0.2 - k * 0.32, d - 0.16, 0.1, 0.02, { rx: 90, seg: 10, cast: false }); }
  b.pop();
}
/* ── the Green Line: each track on its own box girder about 9 m up, single piers with hammerhead caps (photograph
   1787, under the viaduct on Nash St); the Mariposa station's island platform between the two ── */
const segs = (p, fn) => { for (let i = 0; i < p.length - 1; i++) { const [x0, z0] = p[i], [x1, z1] = p[i + 1], len = Math.hypot(x1 - x0, z1 - z0); if (len > 0.05) fn((x0 + x1) / 2, (z0 + z1) / 2, len, Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI); } };
function viaduct(b, ctx) {
  const conc = X.conc('#b3b0a8', 9, false), soffit = X.conc('#9d9a93', 9, false), dark = M.plain('#3a3a3a', 0.6, 0.5), steel = M.plain('#8a8d90', 0.4, 0.8), deckY = 8.6;
  const pl = PLATFORM.map(fl => { const q = pts(fl), xs = q.map(v => v[0]), zs = q.map(v => v[1]); return [Math.min(...xs) - 0.8, Math.min(...zs) - 1, Math.max(...xs) + 0.8, Math.max(...zs) + 1]; });
  const atStation = (x, z) => pl.some(([a, c, e, f]) => x > a && x < e && z > c && z < f);
  for (const [bridge, fl] of RAIL) {
    if (!bridge) continue;
    const p = pts(fl);
    // the map stops the east track at the station's north end; it runs on north beside the other (the photograph shows two girders)
    if (Math.min(...p.map(q => q[1])) > -100) { const n = p[p.length - 1][1] < p[0][1] ? p : p.reverse(); n.push([688.4, -110], [687.4, -170], [686.6, -259]); }
    ribbon(b, conc, p, 5.2, deckY, { tile: 2 });
    segs(p, (x, z, len, hd) => {
      b.rbox(soffit, x, deckY - 0.18, z, 5.2, 0.36, len + 0.05, hd, {});                       // the deck slab and its cantilevers
      b.rbox(soffit, x, deckY - 1.35, z, 3.3, 2.0, len + 0.05, hd, {});                         // the box below it
    });
    for (const side of [-1, 1]) segs(offsetLine(p, side * 2.48), (x, z, len, hd) => { if (!atStation(x, z)) b.rbox(conc, x, deckY + 0.5, z, 0.24, 1.0, len + 0.05, hd, {}); });
    for (const side of [-1, 1]) segs(offsetLine(p, side * 2.48), (x, z, len, hd) => { if (!atStation(x, z)) b.rbox(steel, x, deckY + 1.75, z, 0.04, 0.04, len + 0.05, hd, { cast: false }); });
    for (const [x, z, hd] of along(p, 30, 8)) {
      b.rbox(conc, x, (deckY - 3.6) / 2, z, 1.7, deckY - 3.6, 1.5, hd, {});                    // the pier, its hammerhead
      b.rbox(conc, x, deckY - 3.0, z, 4.4, 1.3, 1.9, hd, {});
      b.solid(x - 1, 0, z - 1, x + 1, 6, z + 1);
    }
    // the track: a plinth and a rail each side, the overhead wire on poles
    for (const side of [-0.72, 0.72]) { ribbon(b, dark, offsetLine(p, side), 0.5, deckY + 0.12); ribbon(b, steel, offsetLine(p, side), 0.08, deckY + 0.28); }
    segs(p, (x, z, len, hd) => b.rbox(M.plain('#4a4a4a', 0.5, 0.5), x, deckY + 5.4, z, 0.03, 0.03, len + 0.05, hd, { cast: false }));
    for (const [x, z, hd] of along(offsetLine(p, 2.2), 48, 20)) { b.cyl(steel, x, deckY, z, 0.12, 6.1, { seg: 8 }); b.push(x, deckY + 5.6, z, hd + 270); b.bar(steel, 0, 0, 0, 0, 0, 2.3, 0.08, { round: true, seg: 6 }); b.pop(); }
  }
  // the station: a platform between the tracks and a long canopy, a stair tower down to Nash St
  for (const fl of PLATFORM) {
    const p = pts(fl), xs = p.map(q => q[0]), zs = p.map(q => q[1]);
    const z0 = Math.min(...zs), z1 = Math.max(...zs), cx = (Math.min(...xs) + Math.max(...xs)) / 2;   // an island platform between the two tracks
    b.box(X.conc('#c9c5bb', 10, true), cx - 3.6, deckY, z0, cx + 3.6, deckY + 1.0, z1, { uv: [1.5, 1.5], uvw: true });
    b.box(M.plain('#e6c229', 0.6), cx - 3.6, deckY + 1.0, z0, cx - 3.3, deckY + 1.005, z1, { cast: false }); b.box(M.plain('#e6c229', 0.6), cx + 3.3, deckY + 1.0, z0, cx + 3.6, deckY + 1.005, z1, { cast: false });
    b.box(M.plain('#3f6d8f', 0.6, 0.3), cx - 3.6, deckY + 4.0, z0 + 6, cx + 3.6, deckY + 4.25, z1 - 6, {});
    b.box(ctx.lampMat('#eef4ff', 2.2, 0.85, 0.05), cx - 0.25, deckY + 3.98, z0 + 7, cx + 0.25, deckY + 4.0, z1 - 7, { cast: false });
    for (let z = z0 + 9; z < z1 - 6; z += 8) POOLS.push([cx, z, 8, 'cool', deckY + 1.03]);
    POOLS.push([cx, z0 - 11, 10, 'cool']);
    for (let z = z0 + 8; z < z1 - 6; z += 8) b.cyl(M.plain('#d6d6d0', 0.5, 0.5), cx, deckY + 1.0, z, 0.15, 3.1, { seg: 8 });
    b.box(X.conc('#bdb9b0', 11, true), cx - 3, 0, z0 - 8.5, cx + 3, deckY + 4.2, z0 + 0.5, { uv: [2, 2], uvw: true, solid: true });       // stairs and lift at the Mariposa end
    b.box(M.plain('#3f6d8f', 0.6, 0.3), cx - 3.4, deckY + 4.2, z0 - 8.9, cx + 3.4, deckY + 4.45, z0 + 0.9, {});
    sign(b, 'Metro  Mariposa', cx, 3.4, z0 - 8.54, 4.6, 0.8, '-z', '#1d1d1d', '#ffffff', { lit: true });
    ctx.hot.push({ id: 'greenline', pos: [cx, 2.4, z0 - 10], r: 0.8 });
  }
}

/* ── traffic: cars running the lanes of Sepulveda and Mariposa. The map cuts a road into pieces; they are joined into
   whole runs first, so a car does not vanish where one piece ends ── */
function chain(list, oneway) {
  const runs = list.map(p => p.slice()), near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5;
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i < runs.length && !again; i++) for (let j = 0; j < runs.length && !again; j++) {
      if (i === j) continue; const A = runs[i], B = runs[j];
      if (near(A[A.length - 1], B[0])) { runs[i] = A.concat(B.slice(1)); runs.splice(j, 1); again = true; }
      else if (!oneway && near(A[A.length - 1], B[B.length - 1])) { runs[i] = A.concat(B.slice(0, -1).reverse()); runs.splice(j, 1); again = true; }
    }
  }
  return runs;
}
function makeTraffic(scene, roads) {
  const lanes = [], groups = {};
  for (const r of roads) { if (!/Pacific Coast|Mariposa/.test(r.name)) continue; const k = r.name + (r.oneway ? '>' : '='); (groups[k] ||= { r, list: [] }).list.push(r.p); }
  for (const { r, list } of Object.values(groups)) for (const p of chain(list, r.oneway)) {
    const L = lenOf(p); if (L < 80) continue;
    const n = Math.max(1, Math.round(L / 140)), w = r.lanes * LANE + (r.oneway ? 0.8 : 1.2);
    if (r.oneway) for (const k of [0.5, 1.5]) lanes.push({ p: offsetLine(p, -w / 2 + 0.4 + LANE * k), v: 14 + k * 2, n });
    else for (const k of [0.5, 1.5]) { lanes.push({ p: offsetLine(p, LANE * k), v: 12 + k * 2, n }); lanes.push({ p: offsetLine(p, -LANE * k).reverse(), v: 12 + k * 2, n }); }
  }
  const R = rng(5), cars = [];
  for (const l of lanes) { const L = lenOf(l.p); for (let i = 0; i < l.n; i++) cars.push({ l, L, d: (i + R() * 0.6) / l.n * L, v: l.v * (0.85 + R() * 0.3), kind: pickKind(R), colour: pickColour(R) }); }
  const sw = swarm(scene, cars);
  const place = () => { cars.forEach((c, i) => { const [x, z, a] = pointAt(c.l.p, c.d); sw.set(i, x, z, a); }); sw.commit(); };
  place();
  return { step(dt) { for (const c of cars) c.d = (c.d + c.v * dt) % c.L; place(); }, setNight: n => sw.setNight(n), count: cars.length };
}
