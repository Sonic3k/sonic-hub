/* The parking structure at 940 N Nash St, El Segundo: where he left the car on working days at AT&T (DirecTV), most
   often on level 3. Built by hand from garage.json (the plan, and what each number rests on), as a site of the South
   Bay world; the map's own block for it is left out of the tiles (data/world.py: SITE_WAYS).

   From Street View of 12/2023: white concrete, eleven floors of 3.8 m — the ground, seven open decks, three closed
   floors under the roof with one ribbon of windows — a solid stair tower at each corner, a row of columns down the
   middle; on Nash two portals with gate arms: "EMPLOYEE/VISITOR ENTRANCE" to the north, and to the south two lanes
   out and one in. From his two photographs inside (27/4/2021): broomed concrete, stalls marked with double lines,
   walls painted white below, deep beams across the ceiling, tube lights.

   GUESSED, and said so to him: how the floors climb. The north bay is level (seen from Nash); the south bay is built
   here as one sloping floor that rises a level over its length — the usual way of a two-bay structure this long, and
   what the portal's signs suggest. Signs are plain lettering: no logo is drawn. */
import * as THREE from 'three';
import { canvasTex } from '../../engine/tex.js';
import { concTex } from '../esa-el-segundo-2015/mat.js';
import { carGeo, CAR_COLOURS } from '../../engine/world/tiles.js';
import { plantMaterial, treeAt, hedgeBox, mergePlants } from '../../engine/plants.js';
import G from './garage.json';

const F = G.floor, lvl = k => (k - 1) * F;
/** how high the south bay's k-th run is at x: level k at its west end, level k + 1 at its east */
export const slopeY = (x, k) => (k - 1 + Math.max(0, Math.min(1, (x - G.rampW) / (G.rampE - G.rampW)))) * F;
/** the floor under a point of the car's way, given roughly how high it is (for the checks): the nearest floor's height */
export function floorNear(x, z, y) {
  if (x < G.x0 - 0.2 || x > G.x1 + 0.2 || z < G.z0 || z > G.z1) return 0;
  let best = 0;
  for (let k = 1; k <= G.open; k++) { const h = z > G.zc && k < G.open ? slopeY(x, k) : lvl(k); if (Math.abs(h - y) < Math.abs(best - y)) best = h; }
  return best;
}

const lin = c => new THREE.Color(c);
const WHITE = lin('#f1efe9'), FLOOR = lin('#9a968e'), SOFFIT = lin('#b9b6af'), DARK = lin('#1b2228'), LINE = lin('#f4f3ee'), YELLOW = lin('#e2b523'), RED = lin('#c7352b'), MULCH = lin('#6a4e3a');

/** a growing mesh: quads with a colour each; uv from the world, a texture's tile `s` metres; `day`: how much daylight
    reaches a point (inside the structure: less, the further from an open face) — kept beside the colour, for lit() */
function Acc(s = 3, day = null) {
  const pos = [], nor = [], col = [], uv = [], idx = [], dl = [];
  const A = {
    /** four corners, anticlockwise seen from the side it faces */
    quad(a, b, c, d, k) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const i0 = pos.length / 3, ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      for (const p of [a, b, c, d]) {
        pos.push(p[0], p[1], p[2]); nor.push(nx, ny, nz); col.push(k.r, k.g, k.b); dl.push(day ? day(p[0], p[2]) : 1);
        if (ay >= ax && ay >= az) uv.push(p[0] / s, p[2] / s); else if (ax >= az) uv.push(p[2] / s, p[1] / s); else uv.push(p[0] / s, p[1] / s);
      }
      idx.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
    },
    /** a box; `skip`: faces left out, of 'xXyYzZ' (small letter: the low side) */
    box(x0, y0, z0, x1, y1, z1, k, skip = '') {
      if (!skip.includes('Y')) A.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], k);
      if (!skip.includes('y')) A.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], k);
      if (!skip.includes('x')) A.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], k);
      if (!skip.includes('X')) A.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], k);
      if (!skip.includes('z')) A.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], k);
      if (!skip.includes('Z')) A.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], k);
    },
    /** a slab along x whose height follows y(x), in strips between the z of `zs` (top face at y, underside t below, both
        long edges closed) */
    run(xs, y, zs, t, top, under) {
      const z0 = zs[0], z1 = zs[zs.length - 1];
      for (let i = 0; i + 1 < xs.length; i++) {
        const a = xs[i], b = xs[i + 1], ya = y(a), yb = y(b);
        for (let j = 0; j + 1 < zs.length; j++) {
          A.quad([a, ya, zs[j + 1]], [b, yb, zs[j + 1]], [b, yb, zs[j]], [a, ya, zs[j]], top);
          A.quad([a, ya - t, zs[j]], [b, yb - t, zs[j]], [b, yb - t, zs[j + 1]], [a, ya - t, zs[j + 1]], under);
        }
        A.quad([b, yb - t, z0], [a, ya - t, z0], [a, ya, z0], [b, yb, z0], under); A.quad([a, ya - t, z1], [b, yb - t, z1], [b, yb, z1], [a, ya, z1], under);
      }
    },
    mesh(mat, name, cast = true) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('day', new THREE.Float32BufferAttribute(dl, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, mat); m.name = name; m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; m.updateMatrix(); return m;
    },
  };
  return A;
}

/** the stalls of one row: [x of the stall's middle, bay, which of the bay's three] */
function stalls() { const out = []; for (let b = G.stallBays[0]; b <= G.stallBays[1]; b++) for (let i = 0; i < 3; i++) out.push([G.x0 + G.grid * b + 0.4 + G.stallW * (i + 0.5), b, i]); return out; }
/* What stands inside is lit by two things: daylight, which comes in at the open faces and dies away (each point's `day`),
   and the structure's own tubes, which light everything alike — little by day, all there is by night. A material made
   lit() takes both: its colour is dimmed by `day` while there is daylight (uDay 1), and its emissive colour works as the
   tubes' light, falling on the surface's own colour. */
const hourU = { value: 1 };
function lit(m) {
  m.onBeforeCompile = s => {
    s.uniforms.uDay = hourU;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float day;\nvarying float vDay;').replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvDay = day;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uDay;\nvarying float vDay;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;\n\tdiffuseColor.rgb *= mix(1.0, vDay, uDay);');
  };
  return m;
}
const hash = (a, b, c) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };

export function buildGarage({ scene }) {
  const tex = concTex('#c6c2b8', 4, true);
  const shellMat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.9 });                      // what the weather sees
  const TUBES = '#fff1dc', insideMat = lit(new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.92, emissive: TUBES }));   // what its own tubes light
  const flatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const lineMat = lit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, emissive: TUBES, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const { x0, x1, z0, z1, zc } = G, W = 0.25, GUARD = 1.1, SLAB = 0.3;
  const cols = []; for (let k = 0; k * G.grid <= x1 - x0 + 0.01; k++) cols.push(x0 + k * G.grid);
  const xsRun = [x0, x0 + 8, G.rampW, G.rampE, x1 - 8, x1], xsFlat = [x0, x0 + 8, x0 + 20, x1 - 20, x1 - 8, x1], T = G.tower, top = lvl(G.open + 1), roof = lvl(G.levels + 1);
  const zsN = [z0 + W, z0 + 5, z0 + 12, zc], zsS = [zc, z1 - 12, z1 - 5, z1 - W];
  /* daylight comes in at the open faces and dies away inside: what a point keeps of its colour, by how far it is from one */
  const daylight = (x, z) => 0.3 + 0.7 * Math.exp(-Math.max(0, Math.min(z - z0, z1 - z, x - x0, x1 - x)) / 7);

  /* ── the shell: towers, columns, the bands along every open deck, the three closed floors, the forecourt on Nash ── */
  const shell = Acc(3.2), inside = Acc(3.2, daylight), flat = Acc(1);
  for (const [tx, tz] of [[x0, z0], [x0, z1 - T], [x1 - T, z0], [x1 - T, z1 - T]]) shell.box(tx - 0.3, 0, tz - (tz === z0 ? 0.3 : 0), tx + T + (tx === x0 ? 0 : 0.3), roof, tz + T + (tz === z0 ? 0 : 0.3), WHITE, 'y');
  shell.box(x0, top, z0, x1, roof, z1, WHITE, 'y'); shell.box(x0 - 0.2, roof, z0 - 0.2, x1 + 0.2, roof + 0.9, z1 + 0.2, WHITE, 'y');      // the closed floors, the parapet
  for (const [a, b, c, d] of [[x0 + T, z0 - 0.04, x1 - T, z0 - 0.04], [x0 + T, z1 + 0.04, x1 - T, z1 + 0.04]]) flat.quad(...(b < zc ? [[c, roof - 3.4, b], [a, roof - 3.4, b], [a, roof - 2.2, b], [c, roof - 2.2, b]] : [[a, roof - 3.4, b], [c, roof - 3.4, b], [c, roof - 2.2, b], [a, roof - 2.2, b]]), DARK);   // the ribbon of windows, north and south
  flat.quad([x0 - 0.04, roof - 3.4, z0 + T], [x0 - 0.04, roof - 3.4, z1 - T], [x0 - 0.04, roof - 2.2, z1 - T], [x0 - 0.04, roof - 2.2, z0 + T], DARK);
  flat.quad([x1 + 0.04, roof - 3.4, z1 - T], [x1 + 0.04, roof - 3.4, z0 + T], [x1 + 0.04, roof - 2.2, z0 + T], [x1 + 0.04, roof - 2.2, z1 - T], DARK);
  for (const x of cols) {                                                           // the columns: on the two long faces and down the middle
    if (x > x0 + T - 0.5 && x < x1 - T + 0.5) { shell.box(x - 0.3, 0, z0 - 0.12, x + 0.3, top, z0 + 0.45, WHITE, 'yY'); shell.box(x - 0.3, 0, z1 - 0.45, x + 0.3, top, z1 + 0.12, WHITE, 'yY'); }
    inside.box(x - 0.3, 0, zc - 0.45, x + 0.3, top, zc + 0.45, WHITE, 'yY');
  }
  /* the bands (slab edge and guard wall in one) along each deck: level on the north face and at both ends, climbing with
     the floor on the south face; each has an outer face to the weather and an inner one, painted white, to the cars */
  const band = (acc, xa, ya, za, xb, yb, zb, out) => {                              // a wall from a to b, from 0.45 under the floor to the guard's top; out: the normal's side
    const lo = -0.45, hi = GUARD, p = [[xa, ya + lo, za], [xb, yb + lo, zb], [xb, yb + hi, zb], [xa, ya + hi, za]];
    acc.quad(...(out ? p : [p[1], p[0], p[3], p[2]]), WHITE);
  };
  for (let k = 2; k <= G.open; k++) {
    const y = lvl(k);
    band(shell, x1 - T, y, z0, x0 + T, y, z0, true); band(inside, x0 + T, y, z0 + W, x1 - T, y, z0 + W, true);                       // north
    band(shell, x0, y, z0 + T, x0, y, z1 - T, true); band(inside, x0 + W, y, z1 - T, x0 + W, y, z0 + T, true);                       // west (above the portals)
    band(shell, x1, y, z1 - T, x1, y, z0 + T, true); band(inside, x1 - W, y, z0 + T, x1 - W, y, z1 - T, true);                       // east
  }
  band(shell, x1, 0.45, z1 - T, x1, 0.45, z0 + T, true); band(shell, x1 - T, 0.45, z0, x0 + T, 0.45, z0, true);                      // the ground floor's low wall, east and north
  for (let k = 1; k < G.open; k++) for (let i = 0; i + 1 < xsRun.length; i++) {     // south: each run's band climbs with it
    const a = Math.max(xsRun[i], x0 + T), b = Math.min(xsRun[i + 1], x1 - T), ya = slopeY(a, k), yb = slopeY(b, k);
    if (k === 1 && i === 0) continue;                                               // (the ground at the portal's end: no wall)
    band(shell, a, ya, z1, b, yb, z1, true); band(inside, b, yb, z1 - W, a, ya, z1 - W, true);
  }
  band(shell, x0 + T, lvl(G.open), z1, x1 - T, lvl(G.open), z1, true);
  for (let x = G.rampW; x < x1 - 0.01; x += 6) {                                    // under the first run, which leaves the ground: closed along the middle and on the south face
    const xb = Math.min(x1, x + 6), ya = slopeY(x, 1) - 0.3, yb = slopeY(xb, 1) - 0.3;
    inside.quad([xb, 0, zc + 0.2], [x, 0, zc + 0.2], [x, ya, zc + 0.2], [xb, yb, zc + 0.2], WHITE); if (x >= x0 + T && xb <= x1 - T + 6) shell.quad([x, 0, z1], [Math.min(xb, x1 - T), 0, z1], [Math.min(xb, x1 - T), slopeY(Math.min(xb, x1 - T), 1) - 0.3, z1], [x, ya, z1], WHITE);
  }
  shell.quad([x1, 0, z1 - T], [x1, 0, zc], [x1, F - 0.3, zc], [x1, F - 0.3, z1 - T], WHITE);
  /* the decks. North bay: level slabs, 2 to the closed floors' underside. South bay: runs 1 to 7, then the top deck level. */
  for (let i = 0; i + 1 < xsFlat.length; i++) for (const zs of [zsN, zsS]) for (let j = 0; j + 1 < zs.length; j++) inside.quad([xsFlat[i], 0, zs[j + 1]], [xsFlat[i + 1], 0, zs[j + 1]], [xsFlat[i + 1], 0, zs[j]], [xsFlat[i], 0, zs[j]], FLOOR);   // the ground slab
  for (const [a, b] of [[z0, z0 + W], [z1 - W, z1]]) inside.quad([x0, 0, b], [x1, 0, b], [x1, 0, a], [x0, 0, a], FLOOR);
  shell.box(x0 - 6.4, -0.2, z0, x0, 0.0, z1, FLOOR, 'yX');                          // the forecourt, out to the sidewalk's back
  for (let k = 2; k <= G.open + 1; k++) inside.run(xsFlat, () => lvl(k), zsN, SLAB, FLOOR, SOFFIT);
  for (let k = 1; k < G.open; k++) inside.run(xsRun, x => slopeY(x, k), zsS, SLAB, FLOOR, SOFFIT);
  inside.run(xsFlat, () => lvl(G.open), zsS, SLAB, FLOOR, SOFFIT); inside.run(xsFlat, () => top, zsS, SLAB, FLOOR, SOFFIT);

  /* ── inside, where he drove: the beams, the guards between the bays, lines, lamps, cars — levels 1 to 3 ── */
  const fine = Acc(3.2, daylight), marks = Acc(1, daylight), lamps = Acc(1), DET = 3;                   // DET: the highest level fitted out
  const stall = stalls(), half = G.aisleW / 2, rows = [];                           // rows: [level or run, north bay?, z of the stalls' mouth, which way the stall runs from it (−1 north, +1 south)]
  for (let k = 1; k <= DET; k++) { rows.push([k, true, G.aisleN - half, -1], [k, true, G.aisleN + half, 1]); if (k < DET) rows.push([k, false, G.aisleS - half, -1], [k, false, G.aisleS + half, 1]); }
  const yAt = (k, north, x) => (north ? lvl(k) : slopeY(x, k));
  for (let k = 2; k <= DET + 1; k++) for (const x of cols) {                        // beams under each deck, bay by bay (the north bay's level, the south bay's with its floor)
    if (x < x0 + 1 || x > x1 - 1) continue;
    fine.box(x - 0.25, lvl(k) - SLAB - 0.85, z0 + W, x + 0.25, lvl(k) - SLAB, zc - 0.45, SOFFIT, 'Y');
    if (k <= DET) { const y = slopeY(x, k - 1); fine.box(x - 0.25, y - SLAB - 0.85, zc + 0.45, x + 0.25, y - SLAB, z1 - W, SOFFIT, 'Y'); }
  }
  for (let k = 1; k <= DET; k++) {                                                  // between the bays, where they stand at different heights: a guard on each floor's edge
    const a = G.rampW + 2, b = G.rampE - 2;
    if (k > 1) fine.box(a, lvl(k), zc - 0.5, b, lvl(k) + GUARD, zc - 0.3, WHITE, 'y');
    if (k < DET) for (let x = a; x < b - 0.01; x += 6) { const xb = Math.min(b, x + 6), ya = slopeY(x, k), yb = slopeY(xb, k), z = zc + 0.3; for (const [p, q] of [[z, z + 0.2]]) { fine.quad([xb, yb, q], [x, ya, q], [x, ya + GUARD, q], [xb, yb + GUARD, q], WHITE); fine.quad([x, ya, p], [xb, yb, p], [xb, yb + GUARD, p], [x, ya + GUARD, p], WHITE); fine.quad([x, ya + GUARD, p], [xb, yb + GUARD, p], [xb, yb + GUARD, q], [x, ya + GUARD, q], WHITE); } }
  }
  const mine = G.park, mineX = G.x0 + G.grid * mine.bay + 0.4 + G.stallW * (mine.stall + 0.5), parked = [];
  for (const [k, north, mouth, dir] of rows) {
    for (const [x, bay, i] of stall) {
      const y = x2 => yAt(k, north, x2) + 0.012, L = G.stall - 0.5;
      for (const e of i === 0 ? [-1, 1] : [1]) {                                    // a stall's lines: a pair, 10 cm each and 40 apart, closed at the aisle's end
        const xe = x + e * G.stallW / 2;
        for (const o of [-0.2, 0.2]) marks.quad(...order(dir, [[xe + o - 0.05, y(xe), mouth], [xe + o + 0.05, y(xe), mouth], [xe + o + 0.05, y(xe), mouth + dir * L], [xe + o - 0.05, y(xe), mouth + dir * L]]), LINE);
        marks.quad(...order(dir, [[xe - 0.25, y(xe), mouth - dir * 0.02], [xe + 0.25, y(xe), mouth - dir * 0.02], [xe + 0.25, y(xe), mouth + dir * 0.1], [xe - 0.25, y(xe), mouth + dir * 0.1]]), LINE);
      }
      const h = hash(Math.round(x * 10), k * 2 + (north ? 1 : 0), dir + 3);
      const his = k === mine.level && north && dir < 0 && bay === mine.bay;         // his bay stands empty: his stall, and room to swing into it
      if (!his && h % 100 < (k === 1 ? 44 : 66)) parked.push([x, yAt(k, north, x), mouth + dir * (G.stall / 2 + 0.25), dir, north ? 0 : Math.atan(F / (G.rampE - G.rampW)) * (x > G.rampW && x < G.rampE ? 1 : 0), (h >>> 8) % CAR_COLOURS.length]);
    }
    const zl = north ? G.aisleN : G.aisleS;                                         // a tube under every beam, over the aisle
    for (const x of cols) { if (x < x0 + 3 || x > x1 - 3) continue; const y = yAt(k, north, x) + F - SLAB - 0.9; if (dir < 0) lamps.box(x - 0.06, y - 0.07, zl - 0.75, x + 0.06, y, zl + 0.75, LINE); }
  }
  function order(dir, q) { return dir < 0 ? q : [q[1], q[0], q[3], q[2]]; }        // (so that the face looks up whichever way the stall runs)

  /* ── the two portals on Nash: the band with its signs, the islands with their gate arms; a bed of shrubs between ── */
  const gx = G.gateX, lanes = [...G.lanesVisitor, ...G.lanesOut, G.laneIn], isl = [];
  for (const group of [G.lanesVisitor, [...G.lanesOut, G.laneIn].sort((a, b) => a - b)]) { const s = [...group].sort((a, b) => a - b); isl.push(s[0] - 1.75); for (let i = 0; i + 1 < s.length; i++) isl.push((s[i] + s[i + 1]) / 2); isl.push(s[s.length - 1] + 1.75); }
  for (const z of isl) { fine.box(gx - 3.4, 0, z - 0.25, gx + 1.0, 0.15, z + 0.25, YELLOW, 'y'); fine.box(gx - 0.2, 0.15, z - 0.17, gx + 0.2, 1.25, z + 0.17, WHITE, 'y'); }      // an island, the machine on it
  const bedN = Math.max(...G.lanesVisitor) + 1.75 + 0.6, bedS = Math.min(...G.lanesOut) - 1.75 - 0.6;
  fine.box(x0 - 5.6, 0, bedN, x0 - 0.2, 0.22, bedS, MULCH, 'y');
  /* in it a clipped hedge towards the street and two gums (Street View, 12/2023: tall eucalyptus before the face) */
  const plants = new THREE.Mesh(mergePlants([hedgeBox({ x0: x0 - 5.3, y0: 0.2, z0: bedN + 0.4, x1: x0 - 4.3, y1: 1.15, z1: bedS - 0.4, seed: 7 }),
    treeAt('gum', { h: 15, r: 2.6, seed: 5, at: [x0 - 3.3, 0.2, bedN + 2.1] }), treeAt('gum', { h: 13, r: 2.4, seed: 9, at: [x0 - 3.5, 0.2, bedS - 2.3] })]), plantMaterial());
  plants.name = 'garage shell plants'; plants.castShadow = true; plants.receiveShadow = false; plants.matrixAutoUpdate = false;
  const signs = Acc(1), SIGN = [['↑ EMPLOYEE / VISITOR ENTRANCE ↑', (G.lanesVisitor[0] + G.lanesVisitor[1]) / 2, 6.4], ['EMPLOYEE ONLY EXIT', G.lanesOut[1], 3.2], ['EMPLOYEE ONLY EXIT', G.lanesOut[0], 3.2], ['EMPLOYEE ONLY ENTRANCE', G.laneIn, 3.2]];
  const signTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#1d2c4a'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f3ee'; g.textAlign = 'center'; g.textBaseline = 'middle';
    SIGN.forEach(([text], i) => { g.font = `700 ${i ? 30 : 34}px Arial, Helvetica, sans-serif`; g.fillText(text, w / 2, h * (i + 0.5) / 4); });
  }, { repeat: false });
  const signGeo = { pos: [], uv: [], idx: [] };
  SIGN.forEach(([, z, wide], i) => {
    const y0 = lvl(2) - 0.28, y1 = lvl(2) + 0.24, x = x0 - 0.06, n = signGeo.pos.length / 3, half = wide / 2, u = Math.min(0.5, wide / 12.8);
    signGeo.pos.push(x, y0, z - half, x, y0, z + half, x, y1, z + half, x, y1, z - half);
    signGeo.uv.push(0.5 - u, 1 - (i + 1) / 4, 0.5 + u, 1 - (i + 1) / 4, 0.5 + u, 1 - i / 4, 0.5 - u, 1 - i / 4); signGeo.idx.push(n, n + 1, n + 2, n, n + 2, n + 3);   // (read from Nash, looking east: the words run south)
  });
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(signGeo.pos, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(signGeo.uv, 2)); sg.setIndex(signGeo.idx); sg.computeVertexNormals();
  const signMesh = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 })); signMesh.name = 'garage signs'; signMesh.matrixAutoUpdate = false;

  /* gate arms: red and white, one to a lane, each hinged on the island to its north; up while the car is at it */
  const arm = Acc(1); for (let i = 0; i < 6; i++) arm.box(-0.045, -0.05, i * 0.52, 0.045, 0.05, (i + 1) * 0.52, i % 2 ? LINE : RED, i === 0 ? '' : i === 5 ? 'z' : 'zZ');
  const armGeo = arm.mesh(null, '').geometry;
  const arms = new THREE.InstancedMesh(armGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), lanes.length); arms.name = 'garage gates'; arms.frustumCulled = false;
  const armUp = lanes.map(() => 0), armWait = lanes.map(() => 0), was = { x: 0, z: 0 }, dummy = new THREE.Object3D();
  const setArms = () => { lanes.forEach((z, i) => { dummy.position.set(gx, 1.02, z - 1.6); dummy.rotation.set(-armUp[i] * 1.45, 0, 0); dummy.updateMatrix(); arms.setMatrixAt(i, dummy.matrix); }); arms.instanceMatrix.needsUpdate = true; };
  setArms();

  /* the cars in the stalls: nose to the wall or to the guard, each on its own floor's slope */
  const carMat = lit(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.25, emissive: TUBES }));
  const carShape = carGeo(true); carShape.setAttribute('day', new THREE.InstancedBufferAttribute(new Float32Array(parked.map(([x, , z]) => daylight(x, z))), 1));
  const cars = new THREE.InstancedMesh(carShape, carMat, parked.length); cars.name = 'garage cars'; cars.castShadow = false; cars.receiveShadow = true;
  parked.forEach(([x, y, z, dir, tilt, c], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, dir < 0 ? 0 : Math.PI, dir < 0 ? tilt : -tilt); dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix); cars.setColorAt(i, lin(CAR_COLOURS[c])); });   // (leaning with the floor: its east side the higher)
  cars.computeBoundingSphere();

  const lampMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const parts = [shell.mesh(shellMat, 'garage shell'), inside.mesh(insideMat, 'garage shell decks'), flat.mesh(flatMat, 'garage shell glass', false),
    fine.mesh(insideMat, 'garage inside'), marks.mesh(lineMat, 'garage inside lines', false), lamps.mesh(lampMat, 'garage inside lamps', false), signMesh, arms, cars, plants];
  for (const m of parts) scene.add(m);
  return {
    setHour(id) { const night = id === 'toi'; hourU.value = night ? 0 : 1; for (const m of [insideMat, lineMat, carMat]) m.emissiveIntensity = night ? 0.55 : 0.2; },   // by night the tubes are all the light there is
    /** the arm of a lane goes up when the car has drawn up to it and stood a moment (the card), and comes down again when
        the car is through */
    animate(dt, clock, eye) {
      const p = eye.position, still = dt > 0 && Math.hypot(p.x - was.x, p.z - was.z) < 0.4 * dt; was.x = p.x; was.z = p.z; let moved = false;
      lanes.forEach((z, i) => {
        const at = p.y < 2.5 && Math.abs(p.z - z) < 1.7 && Math.abs(p.x - gx) < 4.4;
        armWait[i] = !at ? 0 : armWait[i] > 0.4 || still ? armWait[i] + dt : 0;         // (once it has opened for the car it stays open while the car passes)
        const want = armWait[i] > 0.4 ? 1 : 0, v = armUp[i] + Math.max(-dt * 1.2, Math.min(dt * 1.2, want - armUp[i])); if (v !== armUp[i]) { armUp[i] = v; moved = true; }
      });
      if (moved) setArms();
    },
    arms: () => armUp.slice(),
    parked,
  };
}
