/* Turns one tile of a world (the data a place's data/world.py writes: 500 m of streets, buildings, lots) into the
   buffers its meshes are made of. NO IMPORTS AND NO OUTER NAMES: the page turns this function's source into a Worker,
   so that a tile is built off the frame's own time; where a Worker cannot be had it is called directly.
   Metres; x east, z south, y up; everything local to the tile's north-west corner. Colours are in linear light, and
   where a mesh wears a texture they multiply it (1 = the texture as it is). */
export function makeBuilder() {
  const T = 500;
  const lin = v => Math.pow(v / 255, 2.2), hex = s => [lin(parseInt(s.slice(1, 3), 16)), lin(parseInt(s.slice(3, 5), 16)), lin(parseInt(s.slice(5, 7), 16))];
  const hash = (a, b, c) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  /* heights of the layers that lie on the ground. A street inside the hotel place's box lies at 0, as that place's own
     streets did (its lots and aprons are fitted to that; its lawns are at −0.03). */
  const Y = { base: -0.14, use: -0.11, area: -0.08, service: -0.035, street: -0.02, box: 0, mark: 0.02, gutter: 0.03, apron: 0.04, walk: 0.12, median: 0.15, kerbFoot: -0.05 };
  const Y_GUTTER = Y.gutter, CONC_GUTTER = [0.8, 0.8, 0.8];
  const GUT = 0.5, LAP = 0.08;                                                         // the concrete gutter in front of a kerb; how far it runs in under the walk
  /* flat ground, by kind (no texture) */
  const BASE = [hex('#716f69'), hex('#7d8261')];                                       // paved lots · yards
  const USE = [hex('#6c6a65'), hex('#7b8160')];
  const AREA = [hex('#47474a'), hex('#5f7f45'), hex('#a09d94'), hex('#8a7a62'), hex('#4f7f9a')];   // parking · green · concrete · bare · water
  /* the paved ribbons wear the hotel place's asphalt (#363636): street as it is, a service way and a runway lighter */
  const RIB = [[1, 1, 1], [1.34, 1.34, 1.32], [3.4, 3.4, 3.3]];
  /* painted lines: 0 yellow · 1 white · 2 white, broken 12 ft in 48 (fast roads) · 3 a crosswalk's bars · 4 yellow, broken likewise
     · 5 white, broken 7 ft in 24 (city streets) · 6 yellow, broken likewise */
  const MARK = [hex('#d9b030'), hex('#e8e6dd'), hex('#e8e6dd'), hex('#e8e6dd'), hex('#d9b030'), hex('#e8e6dd'), hex('#d9b030')];
  const DASH = { 2: [3.66, 10.97], 3: [0.6, 0.6], 4: [3.66, 10.97], 5: [2.13, 5.18], 6: [2.13, 5.18] };
  const PAINT = { white: hex('#e8e6dd'), pad: hex('#d8b23a') };
  const CONC = { walk: [1, 1, 1], gutter: [0.8, 0.8, 0.8], apron: [0.9, 0.9, 0.89], deck: [0.62, 0.62, 0.63], pier: [0.55, 0.55, 0.56] };   // multiply the sidewalk's concrete (#c6c2b8)
  const LAWN = hex('#5f7f45');
  const MULCH = hex('#5a4030');                                                          // bark mulch: a median's bed under its trees
  /* figures painted on the road, in metres: u along the travel they are read from, v to its right. Each a list of
     outlines turning the way a strip's corners do (left start, left end, right end, right start). */
  const stroke = (pts, w) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) { const [u0, v0] = pts[i], [u1, v1] = pts[i + 1], l = Math.hypot(u1 - u0, v1 - v0) || 1, nu = -(v1 - v0) / l * w / 2, nv = (u1 - u0) / l * w / 2; out.push([u0 - nu, v0 - nv, u1 - nu, v1 - nv, u1 + nu, v1 + nv, u0 + nu, v0 + nv]); } return out; };
  const head = (u, v, du, dv, len, half) => [[u + dv * half, v - du * half, u + du * len, v + dv * len, u - dv * half, v + du * half]];   // an arrow's head at (u, v) pointing (du, dv)
  const bent = s => [...stroke([[-1.6, 0], [0.1, 0], [0.75, s * 0.62]], 0.3), ...head(0.75, s * 0.62, 0.72, s * 0.69, 1.0, 0.48)];      // a turn arrow: s −1 left, +1 right
  const thru = [...stroke([[-1.6, 0], [0.5, 0]], 0.3), ...head(0.5, 0, 1, 0, 1.15, 0.48)];
  const bar = (x0, y0, x1, y1) => [y0, x0, y1, x0, y1, x1, y0, x1];                    // a letter's stroke: x across (to the right), y up (onwards)
  const LETTER = {
    S: [[0, 2.05, 0.5, 2.4], [0, 1.375, 0.13, 2.05], [0, 1.025, 0.5, 1.375], [0.37, 0.35, 0.5, 1.025], [0, 0, 0.5, 0.35]],
    T: [[0, 2.05, 0.5, 2.4], [0.185, 0, 0.315, 2.05]],
    O: [[0, 0, 0.13, 2.4], [0.37, 0, 0.5, 2.4], [0.13, 2.05, 0.37, 2.4], [0.13, 0, 0.37, 0.35]],
    P: [[0, 0, 0.13, 2.4], [0.13, 2.05, 0.5, 2.4], [0.13, 1.05, 0.5, 1.4], [0.37, 1.4, 0.5, 2.05]],
  };
  const word = w => { const out = [], wide = w.length * 0.5 + (w.length - 1) * 0.26; [...w].forEach((ch, i) => { const x = -wide / 2 + i * 0.76; for (const [x0, y0, x1, y1] of LETTER[ch]) out.push(bar(x + x0, y0 - 1.2, x + x1, y1 - 1.2)); }); return out; };
  const FIG = [bent(-1), thru, bent(1), [...thru, ...bent(-1).slice(1)], [...thru, ...bent(1).slice(1)], word('STOP'), [...bent(-1), ...bent(1).slice(1)], [], [[-0.45, -0.6, 0.45, -0.6, 0.45, 0.6, -0.45, 0.6]]];
  const METAL = { pole: hex('#8c8f90'), head: hex('#22281f'), plate: hex('#15171a'), light: hex('#9a9c9c'), post: hex('#7d8082') };
  /* buildings: [rows of the façade sheet (ground, upper), ground floor height, floor height, bay width, roof colour, tints] */
  const STYLE = [
    { g: 2.9, f: 2.9, bay: 4.2, roof: hex('#7a6a5c'), tints: ['#e9dfcc', '#e3d3b8', '#d9d2c4', '#efe7d8', '#d8c7a8', '#cfd4cf', '#e0c8b0'] },   // 0 house
    { g: 3.0, f: 2.95, bay: 3.6, roof: hex('#8a8880'), tints: ['#e6dcc8', '#dccfb8', '#d0cdc4', '#e9e2d2', '#c9bca4'] },                         // 1 apartments
    { g: 5.2, f: 3.95, bay: 3.0, roof: hex('#8d9094'), tints: ['#ffffff', '#f2f6f8', '#eef2f4'] },                                               // 2 glass tower
    { g: 4.3, f: 3.9, bay: 3.6, roof: hex('#a7a59e'), tints: ['#eeebe4', '#e2ddd2', '#d9dad6', '#f3f0e8', '#d6cfc2'] },                          // 3 office
    { g: 5.5, f: 4.6, bay: 7.5, roof: hex('#b3b1aa'), tints: ['#e8e4da', '#dcd8cc', '#d0d2d0', '#efece4', '#c9c4b6', '#e2dccb'] },               // 4 industrial
    { g: 4.6, f: 3.6, bay: 5.0, roof: hex('#a8a59c'), tints: ['#efe6d2', '#e6d6b8', '#ddd8cc', '#f0ebe0'] },                                     // 5 retail
    { g: 3.3, f: 3.2, bay: 8.2, roof: hex('#9a9a96'), tints: ['#e6e4de', '#dad8d0', '#eceae4'] },                                                // 6 parking structure
    { g: 4.2, f: 3.05, bay: 3.9, roof: hex('#9b978d'), tints: ['#efe8d8', '#e6dcc6', '#dcd9d0'] },                                               // 7 hotel
  ];
  for (const s of STYLE) s.tints = s.tints.map(hex);
  const ROWS = 16;                                                                     // the façade sheet: 8 styles × (ground row, upper row)

  /** a growing set of vertices: position, normal (bytes), colour, and uv where asked */
  function Acc(withUv) {
    let n = 0, cap = 2048, pos = new Float32Array(cap * 3), nor = new Int8Array(cap * 3), col = new Float32Array(cap * 3), uv = withUv ? new Float32Array(cap * 2) : null;
    const grow = () => { cap *= 2; const p = new Float32Array(cap * 3); p.set(pos); pos = p; const q = new Int8Array(cap * 3); q.set(nor); nor = q; const c = new Float32Array(cap * 3); c.set(col); col = c; if (uv) { const u = new Float32Array(cap * 2); u.set(uv); uv = u; } };
    const A = {
      get n() { return n; },
      v(x, y, z, nx, ny, nz, c, u, w) {
        if (n === cap) grow();
        const i = 3 * n; pos[i] = x; pos[i + 1] = y; pos[i + 2] = z; nor[i] = Math.round(nx * 127); nor[i + 1] = Math.round(ny * 127); nor[i + 2] = Math.round(nz * 127);
        col[i] = c[0]; col[i + 1] = c[1]; col[i + 2] = c[2]; if (uv) { uv[2 * n] = u; uv[2 * n + 1] = w; } n++;
      },
      /** a flat triangle or quad lying on the ground, facing up (points given as x, z) */
      up(y, c, pts, ox, oz, ut) {
        for (let k = 1; k + 1 < pts.length / 2; k++) for (const i of [0, k + 1, k]) { const x = pts[2 * i], z = pts[2 * i + 1]; A.v(x, y, z, 0, 1, 0, c, (x + ox) / ut, (z + oz) / ut); }
      },
      /** a wall from (x0, z0) to (x1, z1) between two heights; it faces the right of that direction */
      wall(x0, z0, x1, z1, ya, yb, c, u0, u1, va, vb) {
        const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1e-6, nx = -dz / L, nz = dx / L;
        A.v(x0, ya, z0, nx, 0, nz, c, u0, va); A.v(x1, ya, z1, nx, 0, nz, c, u1, va); A.v(x1, yb, z1, nx, 0, nz, c, u1, vb);
        A.v(x0, ya, z0, nx, 0, nz, c, u0, va); A.v(x1, yb, z1, nx, 0, nz, c, u1, vb); A.v(x0, yb, z0, nx, 0, nz, c, u0, vb);
      },
      /** an upright box: centre (x, z), half sizes along its own axes (the long one at angle a), from ya to yb */
      box(x, z, a, hl, hw, ya, yb, c) {
        const cx = Math.cos(a), sx = Math.sin(a), P = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([l, w]) => [x + cx * l - sx * w, z + sx * l + cx * w]);
        for (let k = 0; k < 4; k++) { const p = P[k], q = P[(k + 1) % 4]; A.wall(q[0], q[1], p[0], p[1], ya, yb, c, 0, 1, 0, 1); }
        for (const i of [0, 3, 2, 0, 2, 1]) A.v(P[i][0], yb, P[i][1], 0, 1, 0, c, 0, 0);
        for (const i of [0, 1, 2, 0, 2, 3]) A.v(P[i][0], ya, P[i][1], 0, -1, 0, c, 0, 0);
      },
      done() { const o = { pos: pos.slice(0, n * 3), nor: nor.slice(0, n * 3), col: col.slice(0, n * 3), n }; if (uv) o.uv = uv.slice(0, n * 2); return o; },
    };
    return A;
  }

  /** index triples of an outline that turns the positive way in (x, z). A corner is cut off when no other point lies
      in it; a point that lies on the line between its two neighbours (or doubles back on it) is no corner and is
      dropped; and if the outline is so made that no corner can be cut, the flattest one goes, so that what is left
      can be gone on with (a fan from one point would turn some of its triangles over). */
  function ears(P, n, out) {
    const V = []; for (let i = 0; i < n; i++) V.push(i);
    const turn = (a, b, c) => (P[2 * b] - P[2 * a]) * (P[2 * c + 1] - P[2 * a + 1]) - (P[2 * b + 1] - P[2 * a + 1]) * (P[2 * c] - P[2 * a]);
    let guard = 0;
    while (V.length > 3 && guard++ < 8000) {
      let cut = false, flat = -1, least = Infinity;
      for (let k = 0; k < V.length; k++) {
        const a = V[(k + V.length - 1) % V.length], b = V[k], c = V[(k + 1) % V.length], t = turn(a, b, c);
        if (Math.abs(t) < least) { least = Math.abs(t); flat = k; }
        if (t <= 1e-7) continue;
        const ax = P[2 * a], az = P[2 * a + 1], bx = P[2 * b], bz = P[2 * b + 1], cx = P[2 * c], cz = P[2 * c + 1];
        let inside = false;
        for (let m = 0; m < V.length; m++) {
          const v = V[m]; if (v === a || v === b || v === c) continue; const px = P[2 * v], pz = P[2 * v + 1];
          if ((px === ax && pz === az) || (px === bx && pz === bz) || (px === cx && pz === cz)) continue;      // (an outline that comes back to one of its own points)
          if ((bx - ax) * (pz - az) - (bz - az) * (px - ax) >= 0 && (cx - bx) * (pz - bz) - (cz - bz) * (px - bx) >= 0 && (ax - cx) * (pz - cz) - (az - cz) * (px - cx) >= 0) { inside = true; break; }
        }
        if (inside) continue;
        out.push(a, b, c); V.splice(k, 1); cut = true; break;
      }
      if (!cut) V.splice(flat, 1);
    }
    if (V.length === 3 && turn(V[0], V[1], V[2]) > 1e-7) out.push(V[0], V[1], V[2]);
  }
  /** an outline (any turn) as triangles facing up */
  function poly(A, y, c, flat, from, ox, oz, ut) {
    let n = 0; const all = (flat.length - from) >> 1, P = new Float32Array(2 * all); let area = 0;
    const same = (i, x, z) => Math.abs(P[2 * i] - x) < 1e-3 && Math.abs(P[2 * i + 1] - z) < 1e-3;
    for (let i = 0; i < all; i++) { const x = flat[from + 2 * i] / 10, z = flat[from + 2 * i + 1] / 10; if (n && same(n - 1, x, z)) continue; P[2 * n] = x; P[2 * n + 1] = z; n++; }      // (no point twice running: an outline's corner cannot be cut off across an edge of no length)
    while (n > 1 && same(n - 1, P[0], P[1])) n--;
    if (n < 3) return;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += P[2 * i] * P[2 * j + 1] - P[2 * j] * P[2 * i + 1]; }
    if (area < 0) for (let a = 0, b = n - 1; a < b; a++, b--) { const tx = P[2 * a], tz = P[2 * a + 1]; P[2 * a] = P[2 * b]; P[2 * a + 1] = P[2 * b + 1]; P[2 * b] = tx; P[2 * b + 1] = tz; }
    const idx = []; ears(P, n, idx);
    for (let t = 0; t < idx.length; t += 3) for (const i of [idx[t], idx[t + 2], idx[t + 1]]) A.v(P[2 * i], y, P[2 * i + 1], 0, 1, 0, c, (P[2 * i] + ox) / ut, (P[2 * i + 1] + oz) / ut);
    return P;
  }
  /** a line's points in metres, and the two lines d to its left and right (mitred) */
  function line(flat, from) { const n = (flat.length - from) >> 1, p = new Float32Array(2 * n); for (let i = 0; i < 2 * n; i++) p[i] = flat[from + i] / 10; return p; }
  function sides(p, dl, dr) {
    const n = p.length >> 1, L = new Float32Array(2 * n), R = new Float32Array(2 * n);
    for (let i = 0; i < n; i++) {
      let ax = 0, az = 0, bx = 0, bz = 0;
      if (i > 0) { ax = p[2 * i] - p[2 * i - 2]; az = p[2 * i + 1] - p[2 * i - 1]; const l = Math.hypot(ax, az) || 1e-9; ax /= l; az /= l; }
      if (i < n - 1) { bx = p[2 * i + 2] - p[2 * i]; bz = p[2 * i + 3] - p[2 * i + 1]; const l = Math.hypot(bx, bz) || 1e-9; bx /= l; bz /= l; }
      if (i === 0) { ax = bx; az = bz; } if (i === n - 1) { bx = ax; bz = az; }
      let dx = ax + bx, dz = az + bz; const l = Math.hypot(dx, dz); if (l < 1e-6) { dx = bx; dz = bz; } else { dx /= l; dz /= l; }
      const k = 1 / Math.max(0.5, dx * bx + dz * bz), nx = -dz * k, nz = dx * k;        // to the right of travel
      L[2 * i] = p[2 * i] + nx * dl; L[2 * i + 1] = p[2 * i + 1] + nz * dl; R[2 * i] = p[2 * i] + nx * dr; R[2 * i + 1] = p[2 * i + 1] + nz * dr;
    }
    return [L, R];
  }
  /** a flat ribbon between two lines of the same count */
  function ribbon(A, L, R, y, c, ox, oz, ut) {
    const n = L.length >> 1, put = (P, i) => A.v(P[2 * i], y, P[2 * i + 1], 0, 1, 0, c, (P[2 * i] + ox) / ut, (P[2 * i + 1] + oz) / ut);
    for (let i = 0; i < n - 1; i++) { put(L, i); put(R, i); put(L, i + 1); put(R, i); put(R, i + 1); put(L, i + 1); }
  }
  /** A walk's own ribbon, scored as a walk is: across, a joint every FLAG metres along the kerb (a ribbon laid by the
      world's x and z would be scored square to the map — on a street that runs aslant, in lozenges); along, a joint
      behind the kerb's top and then flags of one width out to the back edge — one flag for a walk of 5 or 6 ft.
      `s0`: how far along its street the ribbon starts (→ how far it ends), `lo`, `hi`: laid from A + lo to A + hi of
      the way across (a gutter: from in the road to the kerb's foot). */
  const FLAG = 1.5, KERBTOP = 0.15;
  function scored(A, L, R, y, c, Lg, Rg) {
    const n = L.length >> 1, s = new Float32Array(n), w = new Float32Array(n);
    for (let i = 0; i < n; i++) { w[i] = Math.hypot(R[2 * i] - L[2 * i], R[2 * i + 1] - L[2 * i + 1]); if (i) s[i] = s[i - 1] + Math.hypot(L[2 * i] - L[2 * i - 2], L[2 * i + 1] - L[2 * i - 1]); }
    const wm = Array.from(w).sort((a, b) => a - b)[n >> 1], nf = Math.max(1, Math.round((wm - KERBTOP) / FLAG)), kerbOnly = wm < 0.6;
    const vl = i => kerbOnly ? 0.3 : -KERBTOP / (Math.max(0.3, w[i] - KERBTOP) / nf), vr = i => kerbOnly ? 0.3 + w[i] / FLAG : nf;
    const put = (P, i, v) => A.v(P[2 * i], y, P[2 * i + 1], 0, 1, 0, c, s[i] / FLAG, v);
    for (let i = 0; i < n - 1; i++) { put(L, i, vl(i)); put(R, i, vr(i)); put(L, i + 1, vl(i + 1)); put(R, i, vr(i)); put(R, i + 1, vr(i + 1)); put(L, i + 1, vl(i + 1)); }
    if (Lg) {                                                                             // its gutter: the same joints across, none along
      const g = (P, i, v) => A.v(P[2 * i], Y_GUTTER, P[2 * i + 1], 0, 1, 0, CONC_GUTTER, s[i] / FLAG, v);
      for (let i = 0; i < n - 1; i++) { g(Lg, i, 0.25); g(Rg, i, 0.6); g(Lg, i + 1, 0.25); g(Rg, i, 0.6); g(Rg, i + 1, 0.6); g(Lg, i + 1, 0.25); }
    }
  }
  /** pieces of a line: each `on` metres long, `off` apart → calls f(x0, z0, x1, z1) */
  function dashes(p, on, off, f) {
    const n = p.length >> 1; let d = off / 2;                                            // distance to the next dash's start
    for (let i = 0; i < n - 1; i++) {
      const ax = p[2 * i], az = p[2 * i + 1], dx = p[2 * i + 2] - ax, dz = p[2 * i + 3] - az, L = Math.hypot(dx, dz); if (L < 1e-6) continue;
      let s = d;
      while (s < L) { const e = Math.min(L, s + on); if (e - s > 0.25) f(ax + dx * s / L, az + dz * s / L, ax + dx * e / L, az + dz * e / L); s += on + off; }
      d = s - L;
    }
  }

  /** One tile → { tile: buffers and lists, transfer: their ArrayBuffers }. */
  function build(t) {
    const t0 = now(), ox = t.i * T, oz = t.j * T;
    const flat = Acc(false), road = Acc(true), marks = Acc(false), conc = Acc(true), walls = Acc(true), roofs = flat, metal = flat;   // roofs, poles and the flat ground share one mesh
    const trees = [], palms = [], lamps = [], stops = [], heads = [], cars = [];

    /* the ground: what lies under everything, land use, lots and greens */
    if (!t.n) flat.up(Y.base, BASE[t.g ? 1 : 0], [0, 0, T, 0, T, T, 0, T], ox, oz, 1);          // (n: nothing under — a place that lays its own ground and takes only the streets)
    for (const u of t.u || []) poly(flat, Y.use, USE[u[0]], u, 1, ox, oz, 1);
    for (const a of t.a || []) poly(flat, Y.area + (a[0] === 1 ? 0.01 : 0), AREA[a[0]], a, 1, ox, oz, 1);

    /* paved ribbons: service ways, runways */
    for (const r of t.r || []) {
      let p = line(r, 2); const hw = r[0] / 10;
      { let m = 1; for (let i = 1; i < p.length / 2; i++) if (Math.hypot(p[2 * i] - p[2 * m - 2], p[2 * i + 1] - p[2 * m - 1]) > 0.05) { p[2 * m] = p[2 * i]; p[2 * m + 1] = p[2 * i + 1]; m++; } p = p.subarray(0, 2 * m); }      // (no point twice)
      if (p.length < 4) continue;
      const [L, R] = sides(p, -hw, hw);
      for (const E of [L, R]) for (let pass = 0, moved = true; moved && pass < 6; pass++) {                           // inside a sharp bend an edge would fold back on itself: its points there are brought together
        moved = false;
        for (let i = 0; i + 1 < p.length / 2; i++) if ((E[2 * i + 2] - E[2 * i]) * (p[2 * i + 2] - p[2 * i]) + (E[2 * i + 3] - E[2 * i + 1]) * (p[2 * i + 3] - p[2 * i + 1]) < -1e-9) { const x = (E[2 * i] + E[2 * i + 2]) / 2, z = (E[2 * i + 1] + E[2 * i + 3]) / 2; E[2 * i] = E[2 * i + 2] = x; E[2 * i + 1] = E[2 * i + 3] = z; moved = true; }
      }
      ribbon(road, L, R, r[1] === 0 ? Y.street : Y.service, RIB[r[1]], ox, oz, 4);
    }
    /* the streets (a place's data/streets.py). Strips: [kind, then for each point four numbers in centimetres] — the left
       edge's point (the first as it is, the others as the step from the one before) and the step from it across to the
       right edge, looking along the list. 0 a street · 1 a street in the hotel place's box · 3 a walk behind its kerb ·
       5 a driveway's apron · 6 half of a paved median · 7 half of a planted one · 8 of one under bark mulch. Of 3 and 5–8 the LEFT edge is the
       kerb: the road lies to the left of it, and a walk's and an apron's gutter with it (GUT wide, not in the strip). */
    for (const k of t.k || []) {
      const kind = k[0], n = (k.length - 1) >> 2, A = new Float32Array(2 * n), B = new Float32Array(2 * n);
      for (let i = 0, x = 0, z = 0; i < n; i++) { x += k[1 + 4 * i]; z += k[2 + 4 * i]; A[2 * i] = x / 100; A[2 * i + 1] = z / 100; B[2 * i] = (x + k[3 + 4 * i]) / 100; B[2 * i + 1] = (z + k[4 + 4 * i]) / 100; }
      /** the edge that lies `o` metres from A towards B (o < 0: beyond A, in the road) */
      const edge = (o, most) => { const E = new Float32Array(2 * n); for (let i = 0; i < n; i++) { const dx = B[2 * i] - A[2 * i], dz = B[2 * i + 1] - A[2 * i + 1], l = Math.hypot(dx, dz) || 1, m = most ? Math.min(o, l * most) : o; E[2 * i] = A[2 * i] + dx / l * m; E[2 * i + 1] = A[2 * i + 1] + dz / l * m; } return E; };
      const face = (E, y1, left) => { for (let i = 0; i < n - 1; i++) { if (left) conc.wall(E[2 * i + 2], E[2 * i + 3], E[2 * i], E[2 * i + 1], Y.kerbFoot, y1, CONC.walk, 0, 1, 0, 0.1); else conc.wall(E[2 * i], E[2 * i + 1], E[2 * i + 2], E[2 * i + 3], Y.kerbFoot, y1, CONC.walk, 0, 1, 0, 0.1); } };
      const caps = y1 => { conc.wall(A[0], A[1], B[0], B[1], Y.kerbFoot, y1, CONC.walk, 0, 1, 0, 0.1); conc.wall(B[2 * n - 2], B[2 * n - 1], A[2 * n - 2], A[2 * n - 1], Y.kerbFoot, y1, CONC.walk, 0, 1, 0, 0.1); };
      /** an edge made from A must run on as A does: where it would fold back, its points are brought together */
      const along = E => { for (let pass = 0, moved = true; moved && pass < 6; pass++) { moved = false; for (let i = 0; i + 1 < n; i++) if ((E[2 * i + 2] - E[2 * i]) * (A[2 * i + 2] - A[2 * i]) + (E[2 * i + 3] - E[2 * i + 1]) * (A[2 * i + 3] - A[2 * i + 1]) < -1e-9) { const x = (E[2 * i] + E[2 * i + 2]) / 2, z = (E[2 * i + 1] + E[2 * i + 3]) / 2; E[2 * i] = E[2 * i + 2] = x; E[2 * i + 1] = E[2 * i + 3] = z; moved = true; } } return E; };
      if (kind === 0 || kind === 1) ribbon(road, A, B, kind ? Y.box : Y.street, RIB[0], ox, oz, 4);
      else if (kind === 3 || kind === 5) {
        const G0 = along(edge(-GUT)), G1 = along(edge(LAP));                                                      // (the gutter: a little way in under the walk — no crack at the kerb's foot)
        if (kind === 3) { scored(conc, A, B, Y.walk, CONC.walk, G0, G1); face(A, Y.walk, true); face(B, Y.walk, false); caps(Y.walk); }
        else { ribbon(conc, G0, G1, Y.gutter, CONC.gutter, ox, oz, 1.5); ribbon(conc, A, B, Y.apron, CONC.apron, ox, oz, 1.5); }
      } else if (kind === 6) { ribbon(conc, A, B, Y.median, CONC.walk, ox, oz, 1.5); face(A, Y.median, true); caps(Y.median); }
      else if (kind === 7 || kind === 8) {                                                                           // a kerb along the roadway; grass behind it, or a bed of bark mulch
        const K = along(edge(0.3, 0.5));
        ribbon(conc, A, K, Y.median, CONC.walk, ox, oz, 1.5); face(A, Y.median, true); caps(Y.median);
        for (let i = 0; i < n - 1; i++) flat.up(Y.median, kind === 8 ? MULCH : LAWN, [K[2 * i], K[2 * i + 1], K[2 * i + 2], K[2 * i + 3], B[2 * i + 2], B[2 * i + 3], B[2 * i], B[2 * i + 1]], 0, 0, 1);
      }
    }
    /* outlines: the paving where roads meet */
    for (const o of t.o || []) poly(road, o[0] === 1 ? Y.box : Y.street, RIB[0], o, 1, ox, oz, 4);
    /* the round corners of the walks: [how many points the kerb has, then the outline in centimetres — its first point,
       and the step to each next one]: the kerb from where one street's kerb ends, round the arc, to where the next
       one's begins; then the walk's back edge from that street's back to the first one's. The walk fills the outline;
       the gutter runs along the kerb, in the road. */
    for (const c of t.c || []) {
      const nk = c[0], n = (c.length - 1) >> 1, P = [], fl = [0]; let area = 0;
      for (let i = 0, x = 0, z = 0; i < n; i++) { x += c[1 + 2 * i]; z += c[2 + 2 * i]; P.push([x / 100, z / 100]); fl.push(x / 10, z / 10); }
      if (n < 3 || nk < 2) continue;
      poly(conc, Y.walk, CONC.walk, fl, 1, ox, oz, 1.5);
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
      const left = area > 0;                                                             // the walk lies to the right of the outline as listed: the road is on the kerb's left
      const unit = (x, z) => { const l = Math.hypot(x, z); return l > 1e-6 ? [x / l, z / l] : null; };
      const out = (a, b) => { const d = unit(b[0] - a[0], b[1] - a[1]) || [1, 0]; return left ? [d[1], -d[0]] : [-d[1], d[0]]; };          // across a piece of the kerb, towards the road
      const N = [];
      for (let i = 0; i < nk; i++) {
        if (i === 0) N.push(unit(P[0][0] - P[n - 1][0], P[0][1] - P[n - 1][1]) || out(P[0], P[1]));                    // at its two ends: straight on from the walk's end, as the gutter of the walk's own strip goes
        else if (i === nk - 1) N.push(unit(P[i][0] - P[nk][0], P[i][1] - P[nk][1]) || out(P[i - 1], P[i]));
        else { const u = out(P[i - 1], P[i]), v = out(P[i], P[i + 1]), m = unit(u[0] + v[0], u[1] + v[1]) || v, k = 1 / Math.max(0.6, m[0] * v[0] + m[1] * v[1]); N.push([m[0] * k, m[1] * k]); }
      }
      const off = (i, d) => [P[i][0] + N[i][0] * d, P[i][1] + N[i][1] * d], G = [], U = [];
      for (let i = 0; i < nk; i++) { G.push(off(i, GUT)); U.push(off(i, -LAP)); }
      for (const E of [G, U]) for (let pass = 0, moved = true; moved && pass < 6; pass++) {                              // where the kerb jogs, the gutter's edge would fold back on itself: its points there are brought together
        moved = false;
        for (let i = 0; i + 1 < nk; i++) if ((E[i + 1][0] - E[i][0]) * (P[i + 1][0] - P[i][0]) + (E[i + 1][1] - E[i][1]) * (P[i + 1][1] - P[i][1]) < -1e-9) { const m = [(E[i][0] + E[i + 1][0]) / 2, (E[i][1] + E[i + 1][1]) / 2]; E[i] = m; E[i + 1] = m; moved = true; }
      }
      for (let i = 0; i + 1 < nk; i++) {
        const a = P[i], b = P[i + 1], g = G[i], h = G[i + 1], u = U[i], v = U[i + 1];
        if (left) { conc.wall(b[0], b[1], a[0], a[1], Y.kerbFoot, Y.walk, CONC.walk, 0, 1, 0, 0.1); conc.up(Y.gutter, CONC.gutter, [g[0], g[1], h[0], h[1], v[0], v[1], u[0], u[1]], ox, oz, 1.5); }
        else { conc.wall(a[0], a[1], b[0], b[1], Y.kerbFoot, Y.walk, CONC.walk, 0, 1, 0, 0.1); conc.up(Y.gutter, CONC.gutter, [u[0], u[1], v[0], v[1], h[0], h[1], g[0], g[1]], ox, oz, 1.5); }
      }
      for (let i = nk; i + 1 < n; i++) { const a = P[i], b = P[i + 1]; if (left) conc.wall(b[0], b[1], a[0], a[1], Y.kerbFoot, Y.walk, CONC.walk, 0, 1, 0, 0.1); else conc.wall(a[0], a[1], b[0], b[1], Y.kerbFoot, Y.walk, CONC.walk, 0, 1, 0, 0.1); }      // the back of the walk, facing away from the road
    }
    /* painted lines (centimetres) */
    for (const m of t.m || []) {
      const n = (m.length - 2) >> 1, p = new Float32Array(2 * n), w = m[1] / 100, c = MARK[m[0]]; for (let i = 0; i < 2 * n; i++) p[i] = m[2 + i] / 100;
      if (m[0] === 0 || m[0] === 1) { const [L, R] = sides(p, -w / 2, w / 2); ribbon(marks, L, R, Y.mark, c, 0, 0, 1); }
      else dashes(p, DASH[m[0]][0], DASH[m[0]][1], (x0, z0, x1, z1) => { const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2; marks.up(Y.mark, c, [x0 - nx, z0 - nz, x1 - nx, z1 - nz, x1 + nx, z1 + nz, x0 + nx, z0 + nz], 0, 0, 1); });
    }
    /* painted figures: arrows, the word STOP; the yellow pads at the corners (on the walk) */
    for (const f of t.y || []) {
      const x = f[1] / 100, z = f[2] / 100, a = f[3] * Math.PI / 180, cu = Math.cos(a), su = Math.sin(a), pad = f[0] === 8;
      for (const g of FIG[f[0]] || []) { const pts = []; for (let i = 0; i < g.length; i += 2) pts.push(x + cu * g[i] - su * g[i + 1], z + su * g[i] + cu * g[i + 1]); marks.up(pad ? Y.walk + 0.006 : Y.mark, pad ? PAINT.pad : PAINT.white, pts, 0, 0, 1); }
    }
    /* decks in the air: a girder along the line, piers under it */
    for (const e of t.e || []) {
      const p = line(e, 3), h = e[1] / 10, hw = e[2] / 10, rail = e[0] === 0, depth = rail ? 1.7 : 1.3, [L, R] = sides(p, -hw, hw), n = p.length >> 1;
      ribbon(conc, L, R, h, CONC.deck, ox, oz, 3);
      for (let i = 0; i < n - 1; i++) {
        conc.wall(R[2 * i], R[2 * i + 1], R[2 * i + 2], R[2 * i + 3], h - depth, h + (rail ? 0.25 : 0.95), CONC.deck, 0, 1, 0, 1);
        conc.wall(L[2 * i + 2], L[2 * i + 3], L[2 * i], L[2 * i + 1], h - depth, h + (rail ? 0.25 : 0.95), CONC.deck, 0, 1, 0, 1);
        // the underside
        for (const [P, k] of [[L, i], [L, i + 1], [R, i], [R, i], [L, i + 1], [R, i + 1]]) conc.v(P[2 * k], h - depth, P[2 * k + 1], 0, -1, 0, CONC.pier, 0, 0);
      }
    }
    /* their piers: one column with a hammerhead under a track or a narrow deck, two under a wide one */
    for (const q of t.q || []) {
      const x = q[0] / 10, z = q[1] / 10, ang = q[2] * Math.PI / 180, h = q[3] / 10, depth = q[4] === 0 ? 1.7 : 1.3;
      if (q[4] !== 1) { conc.box(x, z, ang, 0.85, 0.7, 0, h - depth - 0.9, CONC.pier); conc.box(x, z, ang, 0.9, 2.2, h - depth - 0.9, h - depth, CONC.pier); }
      else for (const s of [-1, 1]) conc.box(x - Math.sin(ang) * s * 4.2, z + Math.cos(ang) * s * 4.2, ang, 0.8, 0.8, 0, h - depth, CONC.pier);
    }

    /* buildings */
    let nb = 0;
    for (const b of t.b || []) {
      const h = b[0] / 10, kind = b[1], n = (b.length - 2) >> 1; if (n < 3) continue;
      const P = line(b, 2), hh = hash(b[2], b[3], b[4] + 7 * n); nb++;
      if (kind === 8) {                                                               // an open roof on posts
        const idx = []; ears(P, n, idx);
        for (let k = 0; k < idx.length; k += 3) { for (const i of [idx[k], idx[k + 2], idx[k + 1]]) roofs.v(P[2 * i], h, P[2 * i + 1], 0, 1, 0, STYLE[4].roof); for (const i of [idx[k], idx[k + 1], idx[k + 2]]) roofs.v(P[2 * i], h - 0.25, P[2 * i + 1], 0, -1, 0, STYLE[4].roof); }
        for (let k = 0; k < n; k++) { const m = (k + 1) % n; roofs.wall(P[2 * m], P[2 * m + 1], P[2 * k], P[2 * k + 1], h - 0.25, h, STYLE[4].roof, 0, 0, 0, 0); if (k % 2 === 0 || n <= 6) metal.box(P[2 * k], P[2 * k + 1], 0, 0.09, 0.09, 0, h - 0.25, METAL.post); }
        continue;
      }
      const S = STYLE[kind] || STYLE[3], tint = S.tints[hh % S.tints.length], k0 = 0.9 + ((hh >>> 8) % 20) / 100, c = [tint[0] * k0, tint[1] * k0, tint[2] * k0];
      const g = Math.min(h, S.g), floors = h - g < 1.6 ? 0 : Math.max(1, Math.round((h - g) / S.f)), fh = floors ? (h - g) / floors : 0;
      const rowG = kind * 2, rowU = kind * 2 + 1, vG0 = 1 - (rowG + 1) / ROWS + 0.002, vG1 = 1 - rowG / ROWS - 0.002, vU0 = 1 - (rowU + 1) / ROWS + 0.002, vU1 = 1 - rowU / ROWS - 0.002;
      let run = ((hh >>> 16) % 7) * S.bay;
      for (let k = 0; k < n; k++) {
        const m = (k + 1) % n, ax = P[2 * k], az = P[2 * k + 1], bx = P[2 * m], bz = P[2 * m + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.05) continue;
        // whole bays along a wall where it is long enough, so that windows are not cut at the corners
        const bays = Math.max(1, Math.round(L / S.bay)), u0 = run / 4, u1 = u0 + (L > S.bay * 0.8 ? bays : L / S.bay) / 4; run += bays;
        walls.wall(bx, bz, ax, az, 0, g, c, u1, u0, vG0, floors ? vG1 : vG0 + (vG1 - vG0) * Math.min(1, h / S.g));
        for (let f = 0; f < floors; f++) walls.wall(bx, bz, ax, az, g + f * fh, g + (f + 1) * fh, c, u1, u0, vU0, vU1);
      }
      // the roof: hipped over a small house's four walls, flat otherwise (with a low parapet's shade round a big one)
      const rc = kind === 0 ? [S.roof[0] * (0.8 + (hh % 5) * 0.1), S.roof[1] * (0.8 + (hh % 5) * 0.09), S.roof[2] * (0.8 + (hh % 5) * 0.08)] : S.roof;
      let done = false;
      if (kind === 0 && n === 4) {
        const e0 = Math.hypot(P[2] - P[0], P[3] - P[1]), e1 = Math.hypot(P[4] - P[2], P[5] - P[3]);
        if (e0 > 3 && e1 > 3 && e0 < 30 && e1 < 30) {
          const long0 = e0 >= e1, a = long0 ? 0 : 1, sh = Math.min(e0, e1), lg = Math.max(e0, e1), top = h + sh * 0.22;
          const Q = [0, 1, 2, 3].map(i => [P[2 * ((i + a) % 4)], P[2 * ((i + a) % 4) + 1]]);   // Q0→Q1 a long side
          const dx = (Q[1][0] - Q[0][0]) / lg, dz = (Q[1][1] - Q[0][1]) / lg, mx = (Q[0][0] + Q[1][0] + Q[2][0] + Q[3][0]) / 4, mz = (Q[0][1] + Q[1][1] + Q[2][1] + Q[3][1]) / 4, half = Math.max(0, (lg - sh) / 2);
          const r0 = [mx - dx * half, mz - dz * half], r1 = [mx + dx * half, mz + dz * half];
          const face = (pts) => { const [p0, p1, p2] = pts; let ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2]; let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; const fl = ny < 0; if (fl) { nx = -nx; ny = -ny; nz = -nz; } const ord = pts.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]; const o2 = fl ? ord.slice().reverse() : ord; for (const i of o2) roofs.v(pts[i][0], pts[i][1], pts[i][2], nx, ny, nz, rc); };
          face([[Q[0][0], h, Q[0][1]], [Q[1][0], h, Q[1][1]], [r1[0], top, r1[1]], [r0[0], top, r0[1]]]);
          face([[Q[2][0], h, Q[2][1]], [Q[3][0], h, Q[3][1]], [r0[0], top, r0[1]], [r1[0], top, r1[1]]]);
          face([[Q[1][0], h, Q[1][1]], [Q[2][0], h, Q[2][1]], [r1[0], top, r1[1]]]);
          face([[Q[3][0], h, Q[3][1]], [Q[0][0], h, Q[0][1]], [r0[0], top, r0[1]]]);
          done = true;
        }
      }
      if (!done) { const idx = []; ears(P, n, idx); for (let k = 0; k < idx.length; k += 3) for (const i of [idx[k], idx[k + 2], idx[k + 1]]) roofs.v(P[2 * i], h, P[2 * i + 1], 0, 1, 0, rc); }
    }

    /* things along the streets */
    for (const p of t.p || []) {
      const x = p[1] / 10, z = p[2] / 10;
      if (p[0] === 0) { const hh = hash(p[1], p[2], 3); trees.push(x, z, p[4] / 10, (hh % 628) / 100, 0.85 + (hh >>> 9) % 30 / 100, (hh >>> 16) % 6 + 16 * Math.min(2, Math.max(0, p[3] | 0))); }   // (a: its kind — 0 a fig, 1 a round-headed tree, 2 a gum)
      else if (p[0] === 1) { const hh = hash(p[1], p[2], 5); palms.push(x, z, p[4] / 10, (hh % 628) / 100, ((hh >>> 10) % 100) / 100 - 0.5); }
      else if (p[0] === 2) {                                                          // a street light: a pole, an arm over the road, the lamp's box
        const a = p[3] * Math.PI / 180, ux = Math.cos(a), uz = Math.sin(a);
        metal.box(x, z, a, 0.08, 0.08, 0, 9.0, METAL.light); metal.box(x + ux * 1.25, z + uz * 1.25, a, 1.25, 0.05, 8.86, 8.96, METAL.light); metal.box(x + ux * 2.45, z + uz * 2.45, a, 0.38, 0.17, 8.82, 8.98, METAL.light);
        lamps.push(x + ux * 2.45, 8.8, z + uz * 2.45);
      } else if (p[0] === 5) cars.push(x, z, p[3] * Math.PI / 180, p[4]);
      else if (p[0] === 4) { const a = p[3] * Math.PI / 180; metal.box(x, z, a, 0.03, 0.03, 0, 2.15, METAL.post); stops.push(x + Math.cos(a) * 0.04, 2.25, z + Math.sin(a) * 0.04, a); }
    }
    /* signals: a pole beyond the crossing on the right, its arm back over the lanes, three heads */
    for (const s of t.s || []) {
      const x = s[0] / 10, z = s[1] / 10, a = s[2] * Math.PI / 180, arm = s[3] / 10, ux = Math.cos(a), uz = Math.sin(a), lx = uz, lz = -ux;   // u: the way the traffic goes · l: its left
      metal.box(x, z, a, 0.14, 0.14, 0, 6.3, METAL.pole);
      metal.box(x + lx * arm / 2, z + lz * arm / 2, Math.atan2(lz, lx), arm / 2, 0.09, 5.95, 6.13, METAL.pole);
      const put = (hx, hy, hz) => {
        metal.box(hx, hz, a, 0.16, 0.19, hy - 0.56, hy + 0.56, METAL.head); metal.box(hx + ux * 0.1, hz + uz * 0.1, a, 0.02, 0.33, hy - 0.72, hy + 0.72, METAL.plate);
        for (let k = 0; k < 3; k++) heads.push(hx - ux * 0.17, hy + 0.34 - k * 0.34, hz - uz * 0.17, a, s[4], s[5], k);
      };
      put(x + lx * arm, 5.45, z + lz * arm); put(x + lx * arm * 0.52, 5.45, z + lz * arm * 0.52); put(x - ux * 0.02 + lx * 0.34, 3.3, z - uz * 0.02 + lz * 0.34);
    }

    const out = { i: t.i, j: t.j, buildings: nb, plain: flat.done(), road: road.done(), marks: marks.done(), conc: conc.done(), walls: walls.done(),
      trees: new Float32Array(trees), palms: new Float32Array(palms), lamps: new Float32Array(lamps), stops: new Float32Array(stops), heads: new Float32Array(heads), cars: new Float32Array(cars) };
    out.tris = (out.plain.n + out.road.n + out.marks.n + out.conc.n + out.walls.n) / 3;
    out.ms = now() - t0;
    const transfer = [out.trees.buffer, out.palms.buffer, out.lamps.buffer, out.stops.buffer, out.heads.buffer, out.cars.buffer];
    for (const k of ['plain', 'road', 'marks', 'conc', 'walls']) for (const a of ['pos', 'nor', 'col', 'uv']) if (out[k][a]) transfer.push(out[k][a].buffer);
    return { tile: out, transfer };
  }
  return { build, T };
}
