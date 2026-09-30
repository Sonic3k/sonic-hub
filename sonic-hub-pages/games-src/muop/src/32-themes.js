/* ── Themes: terrain autotiles + parallax skies ──
   Three worlds walk through one day: morning meadow → sunset desert → aurora night.
   Each maze level is an interior of its world (roots, temple, tower). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const bayer = (x, y) => BAYER[((y & 3) << 2) | (x & 3)];
const _pk = new Map();
function pack(hex) {
  let v = _pk.get(hex);
  if (v === undefined) { const [r, g, b] = hexRgb(hex); v = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; _pk.set(hex, v); }
  return v;
}
class PixBuf {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; this.img = new ImageData(this.w, this.h); this.u = new Uint32Array(this.img.data.buffer); }
  set(x, y, hex) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.u[y * this.w + x] = pack(hex); }
  clear(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.u[y * this.w + x] = 0; }
  has(x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false; return this.u[y * this.w + x] !== 0; }
  toCanvas() { const [c, x] = mkCanvas(this.w, this.h); x.putImageData(this.img, 0, 0); return c; }
}
/* colour ramp: n evenly spaced colours through the stops */
function ramp(stops, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(t));
    out.push(mix(stops[k], stops[k + 1], t - k));
  }
  return out;
}
/* pick from a ramp at continuous position t∈[0,1] with ordered dithering */
function rampPick(r, t, x, y) {
  const f = clamp(t, 0, 1) * (r.length - 1), i = Math.floor(f), fr = f - i;
  return r[Math.min(r.length - 1, fr > bayer(x, y) ? i + 1 : i)];
}
function fillCircle(buf, cx, cy, r, col) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) buf.set(((x % buf.w) + buf.w) % buf.w, y, col);
}
const wrapX = (buf, x) => ((x % buf.w) + buf.w) % buf.w;

const THEMES = {
  meadow: {
    world: 1, outdoor: true, dark: 0, music: 'meadow', particles: 'petals',
    sky: ['#5AA8E8', '#83C3F0', '#B0DBF4', '#DCEEF2', '#F6EFD2'],
    tile: { style: 'grass', cap: ['#BDF07A', '#7FCC4E', '#4C9A3C'], capH: 5, body: ['#C47E4C', '#A9683F', '#8C5234', '#6E3E2C'], speck: ['#DDA170', '#6A3A28'], edge: '#4E2A20', under: '#7E4A30' },
    alt: { a: '#C9955E', b: '#A8784A', line: '#6A4428', top: '#E6BC84' },
    oneway: { top: '#EDB878', mid: '#C0824C', dark: '#7A4A2A' },
    spike: { hi: '#F2F4F8', mid: '#AAB2C4', lo: '#5E6478' },
    haze: '#DCEEF2',
  },
  cave: {
    world: 1, outdoor: false, dark: 0.86, music: 'maze', particles: 'spores',
    sky: ['#130F19', '#1A1422', '#211A2B'],
    tile: { style: 'moss', cap: ['#9EDB7C', '#62A456', '#3E7046'], capH: 3, body: ['#5E4B5B', '#4E3D4C', '#40313F', '#332733'], speck: ['#735E6E', '#281D28'], edge: '#1C121C', under: '#3C2D3A' },
    alt: { a: '#6E5646', b: '#58443A', line: '#2E2020', top: '#8A6E58' },
    oneway: { top: '#9ADFD2', mid: '#5FA89C', dark: '#2E5C58' },
    spike: { hi: '#E8D8E0', mid: '#A08898', lo: '#5A4458' },
    haze: '#2A2236',
  },
  desert: {
    world: 2, outdoor: true, dark: 0, music: 'desert', particles: 'dust',
    sky: ['#24174A', '#452066', '#7C2E6C', '#BC4260', '#E86A4E', '#F7A054', '#FFD88C'],
    tile: { style: 'sand', cap: ['#FFE6AE', '#F6C47C', '#D99A58'], capH: 4, body: ['#E28C52', '#CC7446', '#B25E3C', '#924830'], strata: ['#EA9C62', '#D07A48', '#BE6A40', '#DA8A52'], speck: ['#F2AC74', '#9C4C36'], edge: '#5E2626', under: '#B06440' },
    alt: { a: '#D49A62', b: '#B87E4E', line: '#7A4630', top: '#F0C488' },
    oneway: { top: '#F4C88A', mid: '#C98A58', dark: '#7A4630' },
    spike: { hi: '#FFF2DC', mid: '#D8B890', lo: '#8A6448' },
    haze: '#F7A054',
  },
  temple: {
    world: 2, outdoor: false, dark: 0.55, music: 'maze', particles: 'dust',
    sky: ['#24120E', '#321A12', '#402216'],
    tile: { style: 'brick', cap: ['#FFE08A', '#F2C14E', '#B8862E'], capH: 2, body: ['#CB8C5C', '#BA7C50', '#A86C46', '#945E3E'], mortar: '#6E3E2A', speck: ['#DDA070', '#86502E'], edge: '#44200F', under: '#8A5236' },
    alt: { a: '#E0B070', b: '#C4945A', line: '#7A4E2A', top: '#FFE08A' },
    oneway: { top: '#F2C14E', mid: '#C4945A', dark: '#6E4426' },
    spike: { hi: '#FFE8B0', mid: '#D8A850', lo: '#8A5A28' },
    haze: '#5A3020',
  },
  snow: {
    world: 3, outdoor: true, dark: 0, music: 'night', particles: 'snow',
    sky: ['#060A22', '#0C1334', '#141E48', '#22305E', '#34487E'],
    tile: { style: 'snow', cap: ['#FFFFFF', '#E2ECFF', '#AEC2EA'], capH: 5, body: ['#5C6C9C', '#4C5C8A', '#3E4C78', '#303C64'], speck: ['#7082B4', '#26305A'], edge: '#141A36', under: '#8698C8' },
    alt: { a: '#7A6A5A', b: '#5E5046', line: '#3A3030', top: '#E8F0FF' },
    oneway: { top: '#F2F6FF', mid: '#9A7A5E', dark: '#5A4636' },
    spike: { hi: '#FFFFFF', mid: '#A8E4F8', lo: '#4F9CC8' },
    ice: { top: '#F2FDFF', a: '#9BE2F6', b: '#6CC6EA', c: '#4AA4D6', line: '#DDF8FF' },
    haze: '#34487E',
  },
  crystal: {
    world: 3, outdoor: false, dark: 0.74, music: 'night', particles: 'motes',
    sky: ['#05081A', '#090E28', '#0E1538'],
    tile: { style: 'frost', cap: ['#D8F6FF', '#94DAF0', '#5AA8D0'], capH: 2, body: ['#323E74', '#2A3566', '#222C56', '#1B2346'], speck: ['#7FE0FF', '#C79BFF'], edge: '#0A0E26', under: '#28325E' },
    alt: { a: '#4A5A92', b: '#3A4878', line: '#1A2044', top: '#94DAF0' },
    oneway: { top: '#BDEBFF', mid: '#6A8CC8', dark: '#2E3E78' },
    spike: { hi: '#FFFFFF', mid: '#9EE6FF', lo: '#4A8CC8' },
    ice: { top: '#F2FDFF', a: '#9BE2F6', b: '#6CC6EA', c: '#4AA4D6', line: '#DDF8FF' },
    haze: '#101842',
  },
  tower: {
    world: 3, outdoor: false, dark: 0.5, music: 'tower', particles: 'motes',
    sky: ['#0A0C1E', '#10142C', '#161A38'],
    tile: { style: 'stone', cap: ['#B4BCE4', '#8A92C2', '#5E6698'], capH: 2, body: ['#5C6294', '#505686', '#464C78', '#3C426A'], mortar: '#282C4A', speck: ['#6C72A4', '#2E3256'], edge: '#16182E', under: '#3A3E62' },
    alt: { a: '#8A6A4A', b: '#6E543A', line: '#3A2A1E', top: '#C8A070' },
    oneway: { top: '#C8A070', mid: '#8A6A4A', dark: '#4A3624' },
    spike: { hi: '#FFFFFF', mid: '#B8C0E0', lo: '#5E6698' },
    ice: { top: '#F2FDFF', a: '#9BE2F6', b: '#6CC6EA', c: '#4AA4D6', line: '#DDF8FF' },
    haze: '#161A38',
  },
};

/* ───────── Terrain painting ───────── */
function paintTerrain(level, theme) {
  const Wt = level.w, Ht = level.h, W = Wt * TILE, H = Ht * TILE;
  const buf = new PixBuf(W, H);
  const fake = new PixBuf(W, H);
  const code = (x, y) => {
    if (x < 0 || x >= Wt) return T.SOLID;
    if (y >= Ht) return T.SOLID;
    if (y < 0) return T.EMPTY;
    return level.tiles[y * Wt + x];
  };
  const ground = (x, y) => isGroundCode(code(x, y));
  const tp = theme.tile, R = ramp(tp.body, 12), capR = tp.cap;
  const depthOf = (x, y) => { let d = 0; while (d < 6 && ground(x, y - d - 1)) d++; return d; };
  for (let ty = 0; ty < Ht; ty++) for (let tx = 0; tx < Wt; tx++) {
    const c = code(tx, ty);
    if (!isGroundCode(c)) continue;
    const target = c === T.FAKE ? fake : buf;
    const n = ground(tx, ty - 1), s = ground(tx, ty + 1), e = ground(tx + 1, ty), w = ground(tx - 1, ty);
    const depth = depthOf(tx, ty);
    const ox = tx * TILE, oy = ty * TILE;
    if (c === T.ALT) { paintAltTile(target, ox, oy, theme, n, s, e, w, tx, ty); continue; }
    const iceTile = c === T.ICE;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const gx = ox + x, gy = oy + y;
      // rounded outer corners
      if (!n && !w && x + y < 2) continue;
      if (!n && !e && 15 - x + y < 2) continue;
      if (!s && !w && x + 15 - y < 1) continue;
      if (!s && !e && 30 - x - y < 1) continue;
      let col;
      if (iceTile) {
        const ic = theme.ice;
        const tt = (depth * 16 + y) / 40;
        col = tt < 0.3 ? ic.a : tt < 0.7 ? ic.b : ic.c;
        if (((gx + gy) % 11 === 0 || (gx + gy + 1) % 11 === 0) && y > 2) col = ic.line;
        if (!n && y < 2) col = ic.top;
      } else {
        const tt = (depth * 16 + y) / (16 * 3.2);
        col = rampPick(R, tt, gx, gy);
        if (tp.style === 'sand') {
          const band = Math.floor((gy + pnoise(gx / 9, 64, 5) * 5) / 6) % tp.strata.length;
          if (depth > 0 || y > 7) col = mix(col, tp.strata[band], 0.55);
        }
        if (tp.style === 'brick' || tp.style === 'stone') {
          const bh = tp.style === 'brick' ? 5 : 8, bw = tp.style === 'brick' ? 10 : 16;
          const row = Math.floor(gy / bh), off = (row % 2) * (bw >> 1);
          if (gy % bh === 0 || (gx + off) % bw === 0) col = tp.mortar;
          else if (hash(Math.floor((gx + off) / bw), row, 9) < 0.18) col = mix(col, tp.speck[1], 0.35);
        }
        const hs = hash(gx, gy, 3);
        if (hs < 0.018) col = tp.speck[0];
        else if (hs > 0.986) col = tp.speck[1];
        if (tp.style === 'frost' && hash(gx >> 1, gy >> 1, 17) < 0.004) col = tp.speck[hash(gx, gy, 5) < 0.5 ? 0 : 1];
      }
      // exposed edges
      if (!w && x === 0) col = tp.edge; else if (!w && x === 1) col = mix(col, tp.edge, 0.45);
      if (!e && x === 15) col = tp.edge; else if (!e && x === 14) col = mix(col, tp.edge, 0.45);
      if (!s && y === 15) col = tp.edge; else if (!s && y === 14) col = mix(col, tp.edge, 0.5);
      // surface cap
      if (!n && !iceTile) {
        const wob = hash(gx, 1, 11) < 0.45 ? 1 : 0;
        const ch = tp.capH + wob + (tp.style === 'snow' && hash(gx >> 1, 3, 12) < 0.2 ? 2 : 0);
        if (y < ch) {
          col = y === 0 ? capR[0] : y >= ch - 1 ? capR[2] : capR[1];
          if (y === 1 && hash(gx, gy, 13) < 0.3) col = capR[0];
          if (!w && x === 0 && y > 0) col = capR[2];
          if (!e && x === 15 && y > 0) col = capR[2];
        } else if (y === ch && tp.style !== 'brick' && tp.style !== 'stone') col = mix(col, tp.under, 0.6);
      }
      target.set(gx, gy, col);
    }
    // grass tufts / snow lumps / moss strands spilling over the edge
    if (!n && !iceTile) {
      for (let x = 1; x < 15; x++) {
        const gx = ox + x, hh = hash(gx, ty, 21);
        if (tp.style === 'grass' && hh < 0.28) { target.set(gx, oy - 1, capR[1]); if (hh < 0.1) target.set(gx, oy - 2, capR[0]); }
        if (tp.style === 'snow' && hh < 0.18) target.set(gx, oy - 1, capR[0]);
        if (tp.style === 'moss' && hh < 0.2) target.set(gx, oy - 1, capR[1]);
      }
    }
    if (!s) {
      for (let x = 2; x < 14; x++) {
        const gx = ox + x, hh = hash(gx, ty, 31);
        if ((tp.style === 'grass' || tp.style === 'moss') && hh < 0.08) { target.set(gx, oy + 16, tp.edge); if (hh < 0.03) target.set(gx, oy + 17, tp.edge); }
        if ((tp.style === 'snow' || tp.style === 'frost') && hh < 0.06) { target.set(gx, oy + 16, theme.spike.mid); if (hh < 0.02) target.set(gx, oy + 17, theme.spike.hi); }
      }
    }
  }
  const [cv, cx] = mkCanvas(W, H);
  cx.putImageData(buf.img, 0, 0);
  // props painted onto the terrain layer: one-way planks and spikes
  for (let ty = 0; ty < Ht; ty++) for (let tx = 0; tx < Wt; tx++) {
    const c = level.tiles[ty * Wt + tx];
    if (c === T.ONEWAY) paintOneWay(cx, tx, ty, theme, level.tiles[ty * Wt + tx - 1] === T.ONEWAY, level.tiles[ty * Wt + tx + 1] === T.ONEWAY);
    else if (c >= T.SPIKE_U && c <= T.SPIKE_R) paintSpike(cx, tx, ty, c, theme);
  }
  let fakeCanvas = null;
  if (level.tiles.includes(T.FAKE)) { fakeCanvas = fake.toCanvas(); }
  return { canvas: cv, fake: fakeCanvas };
}
function paintAltTile(buf, ox, oy, theme, n, s, e, w, tx, ty) {
  const a = theme.alt;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const gx = ox + x, gy = oy + y;
    const row = Math.floor(y / 8), off = (row + ty) % 2 ? 8 : 0;
    let col = hash(Math.floor((x + off) / 16) + tx * 2, row + ty * 2, 41) < 0.5 ? a.a : a.b;
    if (y % 8 === 0 || (x + off) % 16 === 0) col = a.line;
    if (hash(gx, gy, 43) < 0.04) col = mix(col, a.line, 0.4);
    if (!n && y < 2) col = a.top;
    if (!w && x === 0) col = a.line; if (!e && x === 15) col = a.line; if (!s && y === 15) col = a.line;
    buf.set(gx, gy, col);
  }
}
function paintOneWay(ctx, tx, ty, theme, left, right) {
  const o = theme.oneway, x0 = tx * TILE, y0 = ty * TILE;
  ctx.fillStyle = o.dark; ctx.fillRect(x0, y0, 16, 6);
  ctx.fillStyle = o.mid; ctx.fillRect(x0, y0 + 1, 16, 4);
  ctx.fillStyle = o.top; ctx.fillRect(x0, y0 + 1, 16, 1);
  ctx.fillStyle = o.dark;
  if (!left) { ctx.fillRect(x0, y0, 1, 6); ctx.clearRect(x0, y0, 1, 1); ctx.clearRect(x0, y0 + 5, 1, 1); }
  if (!right) { ctx.fillRect(x0 + 15, y0, 1, 6); ctx.clearRect(x0 + 15, y0, 1, 1); ctx.clearRect(x0 + 15, y0 + 5, 1, 1); }
  ctx.fillRect(x0 + (tx % 2 ? 4 : 11), y0 + 2, 1, 2);   // plank seam / peg
  if (theme.world === 3 && theme.outdoor) { ctx.fillStyle = '#F2F6FF'; ctx.fillRect(x0, y0 - 1, 16, 2); ctx.fillStyle = '#CBD8F2'; ctx.fillRect(x0 + (tx * 5) % 12, y0 + 1, 3, 1); }
  // little bracket under the plank
  ctx.fillStyle = o.dark; ctx.fillRect(x0 + 7, y0 + 6, 2, 2);
}
function paintSpike(ctx, tx, ty, c, theme) {
  const sp = theme.spike, x0 = tx * TILE, y0 = ty * TILE;
  const tri = (ax, ay, dir) => {
    // one 8px spike; dir: 0 up,1 down,2 left,3 right
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      // local coords u across (0..7), v along (0 base .. 7 tip)
      const u = i, v = j;
      const half = (7 - v) / 2;
      if (Math.abs(u - 3.5) > half + 0.25) continue;
      let col = u < 3.5 ? sp.hi : sp.mid;
      if (Math.abs(u - 3.5) > half - 0.9) col = sp.lo;
      if (v === 7) col = sp.hi;
      let px, py;
      if (dir === 0) { px = ax + u; py = ay + 7 - v; }
      else if (dir === 1) { px = ax + u; py = ay + v; }
      else if (dir === 2) { px = ax + 7 - v; py = ay + u; }
      else { px = ax + v; py = ay + u; }
      ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1);
    }
  };
  if (c === T.SPIKE_U) { tri(x0, y0 + 8, 0); tri(x0 + 8, y0 + 8, 0); ctx.fillStyle = sp.lo; ctx.fillRect(x0, y0 + 15, 16, 1); }
  if (c === T.SPIKE_D) { tri(x0, y0, 1); tri(x0 + 8, y0, 1); ctx.fillStyle = sp.lo; ctx.fillRect(x0, y0, 16, 1); }
  if (c === T.SPIKE_L) { tri(x0 + 8, y0, 2); tri(x0 + 8, y0 + 8, 2); ctx.fillStyle = sp.lo; ctx.fillRect(x0 + 15, y0, 1, 16); }
  if (c === T.SPIKE_R) { tri(x0, y0, 3); tri(x0, y0 + 8, 3); ctx.fillStyle = sp.lo; ctx.fillRect(x0, y0, 1, 16); }
}

/* Background props planted on the surface (behind terrain, in world space) */
function paintProps(level, theme, seed) {
  const W = level.w * TILE, H = level.h * TILE;
  const back = new PixBuf(W, H);
  const r = rng(seed);
  const Wt = level.w, Ht = level.h;
  const at = (x, y) => (x < 0 || y < 0 || x >= Wt || y >= Ht ? T.SOLID : level.tiles[y * Wt + x]);
  const surface = [];
  for (let tx = 0; tx < Wt; tx++) for (let ty = 1; ty < Ht; ty++) {
    if ((at(tx, ty) === T.SOLID) && at(tx, ty - 1) === T.EMPTY && at(tx, ty - 2) === T.EMPTY) surface.push([tx, ty]);
  }
  const st = theme.tile.style;
  const lastAt = {};
  for (const [tx, ty] of surface) {
    const roll = r();
    const bx = tx * TILE + 8, by = ty * TILE;
    const spaced = k => { const ok = !(lastAt[k] > tx - 6); if (ok) lastAt[k] = tx; return ok; };
    if (theme === THEMES.meadow) {
      if (roll < 0.07 && spaced('tree') && at(tx, ty - 3) === T.EMPTY) propTree(back, bx, by, r, 0.75);
      else if (roll < 0.22) propBush(back, bx, by, r, ['#4E9A48', '#3B7E3E', '#6FB85A']);
    } else if (theme === THEMES.desert) {
      if (roll < 0.08 && spaced('cactus')) propCactus(back, bx, by, r);
      else if (roll < 0.16) propRock(back, bx, by, r, ['#B8704A', '#94563A', '#D08A5A']);
    } else if (theme === THEMES.snow) {
      if (roll < 0.1 && spaced('pine')) propPine(back, bx, by, r, ['#233258', '#1A2646', '#DDE8FA']);
      else if (roll < 0.18) propBush(back, bx, by, r, ['#DDE8FA', '#A8BCE0', '#FFFFFF']);
    } else if (theme === THEMES.cave || theme === THEMES.crystal) {
      if (roll < 0.12) propStalagmite(back, bx, by, r, theme === THEMES.cave ? ['#4A3A48', '#3A2C3A'] : ['#26305E', '#1C244A']);
    } else if (theme === THEMES.temple) {
      if (roll < 0.08 && spaced('urn')) propUrn(back, bx, by, r);
    } else if (theme === THEMES.tower) {
      if (roll < 0.06 && spaced('crate')) propCrate(back, bx, by, r);
    }
  }
  return back.toCanvas();
}
function propTree(b, x, y, r, sc) {
  const h = 26 + Math.floor(r() * 14);
  for (let i = 0; i < h; i++) { b.set(x, y - i, '#6E4630'); b.set(x + 1, y - i, '#5A3826'); }
  const cy = y - h, rad = 9 + r() * 4;
  fillCircle(b, x - 4, cy + 4, rad * 0.8, '#2E6E3C'); fillCircle(b, x + 6, cy + 3, rad * 0.75, '#2E6E3C');
  fillCircle(b, x + 1, cy - 2, rad, '#3E8646'); fillCircle(b, x - 2, cy - 5, rad * 0.6, '#58A452');
  fillCircle(b, x - 4, cy - 7, rad * 0.3, '#7CC060');
}
function propBush(b, x, y, r, c) {
  const w = 5 + r() * 4;
  fillCircle(b, x - 3, y - 3, w * 0.6, c[1]); fillCircle(b, x + 3, y - 3, w * 0.6, c[1]);
  fillCircle(b, x, y - 5, w * 0.7, c[0]); fillCircle(b, x - 2, y - 7, w * 0.3, c[2]);
}
function propCactus(b, x, y, r) {
  const h = 18 + Math.floor(r() * 12), g = '#3E7A50', G = '#2C5A3C', L = '#62A06A';
  for (let i = 0; i < h; i++) for (let k = -2; k <= 2; k++) b.set(x + k, y - i, k === -2 ? L : k === 2 ? G : g);
  const arm = (dir, ay, len) => {
    for (let i = 0; i < 5; i++) for (let k = -1; k <= 1; k++) b.set(x + dir * (3 + i), y - ay + k, k === -1 ? L : k === 1 ? G : g);
    for (let i = 0; i < len; i++) for (let k = -1; k <= 1; k++) b.set(x + dir * 7 + k, y - ay - i, k === -1 ? L : k === 1 ? G : g);
  };
  arm(-1, 8 + Math.floor(r() * 4), 6); if (r() < 0.7) arm(1, 12 + Math.floor(r() * 4), 5);
  if (r() < 0.5) { b.set(x, y - h, '#FF7AA8'); b.set(x - 1, y - h, '#FF7AA8'); }
}
function propRock(b, x, y, r, c) { const w = 3 + r() * 3; fillCircle(b, x, y, w, c[1]); fillCircle(b, x - 1, y - 1, w * 0.7, c[0]); b.set(x - 2, y - w + 1, c[2]); }
function propPine(b, x, y, r, c) {
  const h = 22 + Math.floor(r() * 16);
  for (let i = 0; i < 4; i++) b.set(x, y - i, '#3A2C26');
  for (let i = 4; i < h; i++) {
    const t = (i - 4) / (h - 4), half = Math.floor((1 - t) * 8 * (0.65 + 0.35 * ((i % 6) / 6)));
    for (let k = -half; k <= half; k++) b.set(x + k, y - i, k < 0 ? c[0] : c[1]);
    if ((i % 6) === 0) for (let k = -half; k <= half; k++) if (hash(x + k, i, 71) < 0.6) b.set(x + k, y - i, c[2]);
  }
}
function propStalagmite(b, x, y, r, c) { const h = 6 + Math.floor(r() * 10); for (let i = 0; i < h; i++) { const hw = Math.floor((1 - i / h) * 3.5); for (let k = -hw; k <= hw; k++) b.set(x + k, y - i, k <= 0 ? c[0] : c[1]); } }
function propUrn(b, x, y, r) {
  const c = ['#8A4A2E', '#6A3622', '#F2C14E'];
  for (let i = 0; i < 12; i++) { const hw = Math.round(Math.sin((i / 11) * Math.PI) * 4 + 1); for (let k = -hw; k <= hw; k++) b.set(x + k, y - 1 - i, k < 0 ? c[0] : c[1]); }
  for (let k = -4; k <= 4; k++) b.set(x + k, y - 6, c[2]);
}
function propCrate(b, x, y, r) {
  for (let i = 0; i < 12; i++) for (let k = -6; k < 6; k++) { let col = '#6E543A'; if (i === 0 || i === 11 || k === -6 || k === 5 || i === k + 6 || i === 5 - k) col = '#4A3624'; b.set(x + k, y - 1 - i, col); }
}

/* ───────── Parallax backgrounds ───────── */
function skyCanvas(stops, h = VIEW_H) {
  const b = new PixBuf(64, h), R = ramp(stops, 22);
  for (let y = 0; y < h; y++) for (let x = 0; x < 64; x++) b.set(x, y, rampPick(R, y / (h - 1), x, y));
  return b.toCanvas();
}
function ridgeLayer(w, h, opt) {
  const b = new PixBuf(w, h);
  const R = ramp(opt.cols, 10);
  const top = new Array(w);
  for (let x = 0; x < w; x++) {
    let v = 0;
    for (const [f, a, ph, ridged] of opt.waves) {
      let s = Math.sin((x / w) * Math.PI * 2 * f + ph);
      if (ridged) s = 1 - Math.abs(s) * 2;
      v += s * a;
    }
    v += (pnoise(x / (opt.noiseScale || 6), Math.round(w / (opt.noiseScale || 6)), opt.seed || 1) - 0.5) * (opt.noise || 0);
    top[x] = Math.round(opt.base - v);
  }
  if (opt.plateau) { for (let x = 0; x < w; x++) top[x] = Math.round(top[x] / opt.plateau) * opt.plateau; }
  for (let x = 0; x < w; x++) {
    const t0 = top[x];
    for (let y = Math.max(0, t0); y < h; y++) {
      const d = (y - t0) / Math.max(1, h - t0);
      let col = rampPick(R, d * (opt.fade || 1), x, y);
      if (opt.cap && y - t0 < opt.cap.depth + (hash(x, 3, 5) < 0.3 ? 1 : 0) && t0 < opt.cap.line) col = y === t0 ? opt.cap.hi : opt.cap.col;
      if (opt.lit && y - t0 < 3) { const slope = top[(x + 1) % w] - top[(x - 1 + w) % w]; if (slope > 0) col = mix(col, opt.lit, 0.55); }
      if (opt.strata && (y - t0) > 2 && ((y + Math.round(pnoise(x / 11, Math.round(w / 11), 3) * 3)) % opt.strata.every) === 0) col = mix(col, opt.strata.col, 0.5);
      if (y === t0 && opt.rim) col = opt.rim;
      b.set(x, y, col);
    }
  }
  return { b, top };
}
function buildBackground(themeId) {
  const th = THEMES[themeId];
  const L = [];
  const W = 512;
  if (themeId === 'meadow') {
    // clouds
    const cb = new PixBuf(W, 110), cr = rng(7);
    for (let i = 0; i < 9; i++) {
      const x = cr() * W, y = 18 + cr() * 60, s = 6 + cr() * 9;
      for (let k = 0; k < 5; k++) fillCircle(cb, x + (k - 2) * s * 0.9, y - Math.sin((k / 4) * Math.PI) * s * 0.6, s * (0.7 + 0.3 * Math.sin((k / 4) * Math.PI)), '#D2E8F6');
      for (let k = 0; k < 5; k++) fillCircle(cb, x + (k - 2) * s * 0.9, y - 1 - Math.sin((k / 4) * Math.PI) * s * 0.6, s * (0.66 + 0.3 * Math.sin((k / 4) * Math.PI)), '#FFFFFF');
    }
    L.push({ c: cb.toCanvas(), p: 0.05, drift: 3, y: 0 });
    const far = ridgeLayer(W, 110, { base: 64, waves: [[3, 16, 0.5, true], [7, 8, 1.3, true], [13, 3, 0.2, false]], cols: ['#9EC4E0', '#B4D4E8', '#CFE4EE'], cap: { line: 44, depth: 5, col: '#EAF4FA', hi: '#FFFFFF' }, lit: '#D8EAF4', seed: 3 });
    L.push({ c: far.b.toCanvas(), p: 0.1, y: 150 - 110 + 40 });
    const mid = ridgeLayer(W, 100, { base: 60, waves: [[2, 10, 0.3], [5, 6, 2.1], [9, 2, 0.9]], cols: ['#86C474', '#78B868', '#8CC47A'], rim: '#A8DC8A', seed: 4 });
    const tr = rng(11);
    for (let i = 0; i < 26; i++) { const x = Math.floor(tr() * W), t0 = mid.top[x]; const rr = 3 + tr() * 4; fillCircle(mid.b, x, t0 - rr * 0.6, rr, '#5E9E5A'); fillCircle(mid.b, x - 1, t0 - rr * 0.9, rr * 0.55, '#78B868'); }
    L.push({ c: mid.b.toCanvas(), p: 0.25, y: 256 - 100 - 6 });
    const near = ridgeLayer(W, 80, { base: 40, waves: [[3, 9, 1.1], [7, 4, 0.4], [11, 2, 2.2]], cols: ['#5AA850', '#4C9448', '#3E8040'], rim: '#7CC862', seed: 5 });
    for (let i = 0; i < 18; i++) { const x = Math.floor(tr() * W), t0 = near.top[x]; propBush(near.b, x, t0 + 3, tr, ['#3E8A44', '#2E7038', '#5FAE55']); }
    L.push({ c: near.b.toCanvas(), p: 0.42, y: 256 - 80 + 10, fill: '#3E8040' });
  } else if (themeId === 'desert') {
    const far = ridgeLayer(W, 110, { base: 58, waves: [[2, 14, 0.2], [5, 10, 1.4], [11, 5, 0.7]], plateau: 9, cols: ['#8E3E72', '#76346A', '#62305E'], strata: { every: 5, col: '#A24C78' }, rim: '#C0588A', seed: 8 });
    L.push({ c: far.b.toCanvas(), p: 0.07, y: 256 - 110 - 40 });
    const mid = ridgeLayer(W, 90, { base: 46, waves: [[2, 8, 0.8], [4, 7, 2.4], [9, 2, 0.1]], cols: ['#D4704C', '#BE5E44', '#A64E3E'], lit: '#F29A62', seed: 9 });
    L.push({ c: mid.b.toCanvas(), p: 0.22, y: 256 - 90 - 12 });
    const near = ridgeLayer(W, 72, { base: 30, waves: [[3, 6, 1.9], [6, 4, 0.6], [13, 1, 1.0]], cols: ['#9A4A44', '#843E3C', '#6E3436'], lit: '#C4644C', seed: 10 });
    const cr2 = rng(13);
    for (let i = 0; i < 7; i++) { const x = Math.floor(cr2() * W); propCactus(near.b, x, near.top[x] + 2, cr2); }
    L.push({ c: near.b.toCanvas(), p: 0.42, y: 256 - 72 + 8, fill: '#6E3436' });
  } else if (themeId === 'snow') {
    const far = ridgeLayer(W, 150, { base: 96, waves: [[2, 26, 0.4, true], [5, 16, 1.9, true], [11, 6, 0.8, true]], cols: ['#3C4C82', '#34427A', '#2C386C'], cap: { line: 70, depth: 12, col: '#8EA2D6', hi: '#C8D6F4' }, lit: '#A8BAE8', seed: 14 });
    L.push({ c: far.b.toCanvas(), p: 0.07, y: 256 - 150 - 26 });
    const mid = ridgeLayer(W, 100, { base: 52, waves: [[2, 9, 2.8], [5, 6, 0.3], [10, 2, 1.7]], cols: ['#6A7EB4', '#5A6CA2', '#4E5E92'], rim: '#9AAEDC', seed: 15 });
    const pr = rng(17);
    for (let i = 0; i < 30; i++) { const x = Math.floor(pr() * W); propPine(mid.b, x, mid.top[x] + 2, pr, ['#1E2A4C', '#18223E', '#8EA2D6']); }
    L.push({ c: mid.b.toCanvas(), p: 0.22, y: 256 - 100 - 10 });
    const near = ridgeLayer(W, 80, { base: 34, waves: [[3, 7, 0.4], [7, 4, 2.2], [12, 1.5, 1.1]], cols: ['#8C9ECB', '#7486B6', '#5E70A2'], rim: '#B4C4E6', seed: 16 });
    for (let i = 0; i < 12; i++) { const x = Math.floor(pr() * W); propPine(near.b, x, near.top[x] + 3, pr, ['#16203C', '#101830', '#DDE8FA']); }
    L.push({ c: near.b.toCanvas(), p: 0.42, y: 256 - 80 + 8, fill: '#5E70A2' });
  } else {
    // interiors: two tiling pattern layers
    const P = 256;
    const far = new PixBuf(P, P), near = new PixBuf(P, P), rr = rng(themeId.length * 31);
    if (themeId === 'cave' || themeId === 'crystal') {
      const c1 = themeId === 'cave' ? ['#1D1726', '#211A2B', '#18131F'] : ['#0A1130', '#0D1538', '#080D24'];
      for (let i = 0; i < 26; i++) { const x = rr() * P, y = rr() * P, s = 6 + rr() * 18; fillCircle(far, x, y, s, c1[i % 2]); fillCircle(far, x + P, y, s, c1[i % 2]); fillCircle(far, x, y + P, s, c1[i % 2]); fillCircle(far, x - P, y, s, c1[i % 2]); fillCircle(far, x, y - P, s, c1[i % 2]); }
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(rr() * P), y = Math.floor(rr() * P), len = 12 + Math.floor(rr() * 30);
        for (let k = 0; k < len; k++) { const hw = Math.floor((1 - k / len) * 3); for (let j = -hw; j <= hw; j++) far.set(wrapX(far, x + j), (y + k) % P, c1[2]); }
      }
      // near: roots (cave) or crystal clusters (crystal)
      for (let i = 0; i < 6; i++) {
        let x = rr() * P, y = rr() * P;
        const col = themeId === 'cave' ? '#2A2028' : '#141E46';
        for (let k = 0; k < 60; k++) { x += Math.sin(k * 0.3 + i) * 0.8; y += 1; near.set(wrapX(near, x), ((y % P) + P) % P, col); near.set(wrapX(near, x + 1), ((y % P) + P) % P, col); }
      }
      if (themeId === 'crystal') for (let i = 0; i < 16; i++) { const x = Math.floor(rr() * P), y = Math.floor(rr() * P), cc = i % 2 ? ['#3A6AB0', '#5A8AD0'] : ['#5A3E9A', '#7A5ABA']; for (let k = 0; k < 6; k++) { near.set(x, y - k, cc[0]); near.set(x + 1, y - k + 1, cc[1]); near.set(x - 2, y - k + 2, cc[0]); } }
    } else if (themeId === 'temple') {
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        const row = Math.floor(y / 12), off = (row % 2) * 12;
        let col = hash(Math.floor((x + off) / 24), row, 3) < 0.5 ? '#40241A' : '#3A2016';
        if (y % 12 === 0 || (x + off) % 24 === 0) col = '#2A160E';
        far.set(x, y, col);
      }
      for (let i = 0; i < 4; i++) {           // carved sun discs
        const cx = 32 + i * 64, cy = 40 + (i % 2) * 120;
        for (let a = 0; a < 16; a++) { const ang = (a / 16) * Math.PI * 2; for (let k = 9; k < 13; k++) far.set(Math.round(cx + Math.cos(ang) * k), Math.round(cy + Math.sin(ang) * k), '#5A3222'); }
        fillCircle(far, cx, cy, 7, '#523020'); fillCircle(far, cx, cy, 4, '#5E3826');
      }
      for (let i = 0; i < 3; i++) {           // hanging banners
        const x = 40 + i * 88;
        for (let y = 0; y < 70; y++) for (let k = -6; k <= 6; k++) { let col = y < 64 ? '#7A2A2E' : null; if (y >= 64 && Math.abs(k) > (70 - y) - 1) col = null; if (Math.abs(k) === 6) col = col && '#5A1E22'; if (col && (y === 12 || y === 14)) col = '#C8962E'; if (col) near.set(x + k, y, col); }
      }
    } else if (themeId === 'tower') {
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        const row = Math.floor(y / 16), off = (row % 2) * 16;
        let col = hash(Math.floor((x + off) / 32), row, 5) < 0.5 ? '#23264A' : '#1F2242';
        if (y % 16 === 0 || (x + off) % 32 === 0) col = '#171932';
        far.set(x, y, col);
      }
      for (let i = 0; i < 2; i++) {           // arched windows onto the night sky
        const wx = 48 + i * 128, wy = 60 + i * 110, ww = 26, wh = 46;
        for (let y = -ww / 2; y < wh; y++) for (let x = -ww / 2; x < ww / 2; x++) {
          const inArch = y >= 0 || x * x + y * y < (ww / 2) ** 2;
          if (!inArch) continue;
          const t = (y + ww / 2) / (wh + ww / 2);
          let col = rampPick(ramp(['#1A2A5E', '#243A78', '#3A5A8E'], 8), t, x, y);
          if (hash(x + wx, y + wy, 9) < 0.02) col = '#FFFFFF';
          if (Math.abs(x) > ww / 2 - 2 || (y >= wh - 2)) col = '#3A3E62';
          far.set(wx + x, ((wy + y) % P + P) % P, col);
        }
      }
      for (let i = 0; i < 3; i++) {           // chains
        const x = 20 + i * 90 + Math.floor(rr() * 20);
        for (let y = 0; y < P; y++) { if (y % 6 < 4) { near.set(x, y, '#3A3E5E'); near.set(x + 1, y, '#2A2E4A'); } else { near.set(x - 1, y, '#3A3E5E'); near.set(x + 2, y, '#2A2E4A'); } }
      }
    }
    L.push({ c: far.toCanvas(), p: 0.25, tile: true });
    L.push({ c: near.toCanvas(), p: 0.5, tile: true });
  }
  return { sky: skyCanvas(th.sky), layers: L };
}
/* stars for night & window skies */
function makeStars(n, seed) { const r = rng(seed); return Array.from({ length: n }, () => ({ x: r(), y: r() * 0.62, b: r(), s: r() < 0.12 ? 2 : 1, ph: r() * 6.28 })); }
