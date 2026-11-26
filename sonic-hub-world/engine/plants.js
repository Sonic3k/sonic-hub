/* Trees, palms, shrubs and hedges, built the way real-time worlds build them (claude/chuan-dung-the-gioi-3d.md, "Cây
   cối"). What a plant is here:
     · a crown is not a ball. It is a dark opaque core with CARDS round it: flat pieces that carry a picture of a spray
       of leaves, cut out by the picture's alpha (alpha test; where the screen is multisampled, alpha to coverage) — so
       the crown's outline is leaves and there are gaps to see through;
     · the cards are lit as one rounded mass, not card by card: their normals are the crown's dome's; they are darker
       inside and underneath (occlusion painted on the vertices); a little light comes through the leaves (an emissive
       share of their own colour);
     · one sheet of pictures (an atlas) for every plant, drawn here on a canvas — no photograph is used. Its smaller
       copies (mip levels) are made here too, cell by cell, so that no cell bleeds into its neighbour and a spray keeps
       its cover (the share of it that passes the alpha test) when it is seen from far, instead of thinning out;
     · everything sways a little in the wind (in the vertex shader, by each vertex's `sway`; plantTime is the clock);
     · a kind is a shape and a tint: an Indian laurel fig (a dense dome wider than tall on a short grey trunk), a
       round-headed street tree, a gum (tall, open, its leaves hanging in clumps), a Mexican fan palm.
   One material for all of it — plantMaterial() — so that a place's plants are one draw call, or one per kind where
   they are instanced. */
import * as THREE from 'three';
import { rng } from './tex.js';

/** the wind's clock, in seconds: whoever animates the scene sets its value */
export const plantTime = { value: 0 };

/* ── the atlas: 4 × 2 cells of 512 px (a spray a metre or two across is still leaves from a few steps away) ── */
const CELL = 512, PX = CELL / 256, COLS = 4, ROWS = 2, LEVELS = 7, CUT = 0.5;
const CELLS = { fig: 0, round: 1, gum: 2, frond: 3, ring: 4, mass: 5, bark: 6, dead: 7 }, SPRAYS = ['fig', 'round', 'gum', 'frond', 'dead'];
/** where (u, v) of a cell is on the sheet (v up); inset: pixels kept clear of the cell's edge */
const uvOf = (cell, u, v, inset = 0) => { const k = CELLS[cell], m = inset / CELL; return [((k % COLS) + m + u * (1 - 2 * m)) / COLS, (((k / COLS) | 0) + m + (1 - v) * (1 - 2 * m)) / ROWS]; };

function drawAtlas() {
  const W = CELL * COLS, H = CELL * ROWS, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c.getContext('2d', { willReadFrequently: true }); };
  const gc = mk(), gm = mk(), R = rng(11);                                          // the colours (nowhere empty: no dark fringe round a leaf), and what is leaf (white) or air
  gm.fillStyle = '#000'; gm.fillRect(0, 0, W, H);
  const origin = name => [(CELLS[name] % COLS) * CELL, ((CELLS[name] / COLS) | 0) * CELL];
  /* the pictures are near white (each plant's tint is on its vertices): l how light, warm −1…1 towards blue or yellow */
  const tone = (l, warm = 0) => { const v = 255 * l; return `rgb(${Math.round(Math.max(0, Math.min(255, v + warm * 12)))},${Math.round(Math.min(255, v + 5))},${Math.round(Math.max(0, Math.min(255, v - 16 - warm * 14)))})`; };
  const grey = (l, k = 1) => { const v = Math.round(255 * l); return `rgba(${v},${v},${v},${k})`; };   // (bark is tinted too, and has no green of its own)
  const both = draw => { draw(gc, false); draw(gm, true); };
  const leaf = (x, y, len, wid, ang, fill) => both((g, mask) => {
    g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = mask ? '#fff' : fill;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(len * 0.3, -wid, len * 0.8, -wid * 0.7, len, 0); g.bezierCurveTo(len * 0.8, wid * 0.7, len * 0.3, wid, 0, 0); g.fill(); g.restore();
  });
  /* a spray of leaves: a few clumps, the leaves at the back dark and the ones in front light */
  const spray = (name, o) => {
    const [x0, y0] = origin(name); gc.fillStyle = tone(0.5); gc.fillRect(x0, y0, CELL, CELL);
    const subs = []; for (let i = 0; i < o.subs; i++) subs.push([x0 + CELL * (0.5 + (R() - 0.5) * o.spread), y0 + CELL * (0.5 + (R() - 0.5) * o.spread), CELL * (o.r0 + R() * o.r1)]);
    for (let layer = 0; layer < 3; layer++) {
      const n = (o.n * [0.5, 0.32, 0.18][layer]) | 0, lum = [0.42, 0.68, 0.94][layer];
      for (let i = 0; i < n; i++) {
        const s = subs[(R() * subs.length) | 0], a = R() * 6.2832, d = Math.sqrt(R()) * s[2] * [1, 0.9, 0.78][layer];
        const ang = o.droop != null ? Math.PI / 2 + (R() - 0.5) * o.droop : R() * 6.2832, L = o.len * PX * (0.7 + R() * 0.6);
        leaf(s[0] + Math.cos(a) * d - Math.cos(ang) * L / 2, s[1] + Math.sin(a) * d - Math.sin(ang) * L / 2, L, o.wid * PX * (0.7 + R() * 0.6), ang, tone(lum * (0.86 + R() * 0.2), R() - 0.5));
      }
    }
  };
  spray('fig', { subs: 5, spread: 0.3, r0: 0.19, r1: 0.1, n: 1500, len: 11.5, wid: 4.4 });
  spray('round', { subs: 4, spread: 0.26, r0: 0.2, r1: 0.1, n: 620, len: 19, wid: 7 });
  spray('gum', { subs: 5, spread: 0.24, r0: 0.17, r1: 0.1, n: 760, len: 30, wid: 4.2, droop: 1.2 });
  /* a fan palm's leaf: a stalk from the cell's foot, the fan's blades from its root */
  const fan = (name, o) => {
    const [x0, y0] = origin(name), cx = x0 + CELL / 2, cy = y0 + CELL * 0.56; gc.fillStyle = tone(o.base, o.warm); gc.fillRect(x0, y0, CELL, CELL);
    both((g, mask) => { g.strokeStyle = mask ? '#fff' : tone(o.base + 0.12, 1); g.lineWidth = 7 * PX; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, y0 + CELL - 4 * PX); g.lineTo(cx, cy); g.stroke(); });
    for (let i = 0; i < 46; i++) {
      const t = i / 45 - 0.5, a = -Math.PI / 2 + t * o.arc + (R() - 0.5) * 0.05, len = CELL * (0.39 + 0.06 * Math.cos(t * 3) + (R() - 0.5) * o.rag), w = 7.5 * PX;
      const ex = Math.cos(a), ey = Math.sin(a), px = -ey, py = ex, sag = o.sag ? len * 0.24 * Math.abs(t) : 0, fill = tone(o.base + (R() - 0.3) * 0.34, o.warm + R() - 0.5);
      both((g, mask) => {
        g.fillStyle = mask ? '#fff' : fill; g.beginPath(); g.moveTo(cx + px * 1.6 * PX, cy + py * 1.6 * PX);
        g.lineTo(cx + ex * len * 0.6 + px * w / 2, cy + ey * len * 0.6 + py * w / 2 + sag * 0.4); g.lineTo(cx + ex * len, cy + ey * len + sag);
        g.lineTo(cx + ex * len * 0.6 - px * w / 2, cy + ey * len * 0.6 - py * w / 2 + sag * 0.4); g.lineTo(cx - px * 1.6 * PX, cy - py * 1.6 * PX); g.fill();
      });
    }
  };
  fan('frond', { arc: 3.5, rag: 0.05, base: 0.72, warm: 0 });
  fan('dead', { arc: 2.7, rag: 0.15, base: 0.6, warm: 1, sag: true });
  /* the cells with no air in them: a mass of leaves (a crown's core, a hedge's face), bark, a palm's ringed trunk */
  const solid = (name, draw) => { const [x0, y0] = origin(name); gm.fillStyle = '#fff'; gm.fillRect(x0, y0, CELL, CELL); gc.save(); gc.beginPath(); gc.rect(x0, y0, CELL, CELL); gc.clip(); draw(x0, y0); gc.restore(); };
  solid('mass', (x0, y0) => {
    gc.fillStyle = tone(0.3); gc.fillRect(x0, y0, CELL, CELL);
    for (let i = 0; i < 1500; i++) { const l = i < 800 ? 0.42 : i < 1250 ? 0.64 : 0.9, ang = R() * 6.2832; gc.save(); gc.translate(x0 + R() * CELL, y0 + R() * CELL); gc.rotate(ang); gc.fillStyle = tone(l * (0.85 + R() * 0.22), R() - 0.5); gc.beginPath(); gc.ellipse(0, 0, (7 + R() * 5) * PX, (2.6 + R() * 2) * PX, 0, 0, 7); gc.fill(); gc.restore(); }
  });
  solid('bark', (x0, y0) => {
    gc.fillStyle = grey(0.78); gc.fillRect(x0, y0, CELL, CELL);
    for (let i = 0; i < 230; i++) { const x = x0 + R() * CELL, y = y0 + R() * CELL, len = (20 + R() * 90) * PX; gc.strokeStyle = R() < 0.6 ? `rgba(40,30,20,${0.1 + R() * 0.22})` : `rgba(255,250,235,${0.08 + R() * 0.16})`; gc.lineWidth = (1 + R() * 2.2) * PX; gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + (R() - 0.5) * 5 * PX, y + len); gc.stroke(); }
  });
  solid('ring', (x0, y0) => {
    gc.fillStyle = grey(0.8); gc.fillRect(x0, y0, CELL, CELL);
    for (let y = 6 * PX; y < CELL; y += 21 * PX) { gc.fillStyle = 'rgba(45,32,20,0.42)'; gc.fillRect(x0, y0 + y + (R() - 0.5) * 3 * PX, CELL, 3.5 * PX); gc.fillStyle = 'rgba(255,245,225,0.2)'; gc.fillRect(x0, y0 + y + 4 * PX, CELL, 2.5 * PX); }
    for (let i = 0; i < 300; i++) { gc.strokeStyle = `rgba(50,36,22,${0.07 + R() * 0.16})`; gc.lineWidth = PX; const x = x0 + R() * CELL, y = y0 + R() * CELL; gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + (R() - 0.5) * 3 * PX, y + (6 + R() * 12) * PX); gc.stroke(); }
  });
  const c = gc.getImageData(0, 0, W, H).data, m = gm.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H * 4; i += 4) { out[i] = c[i]; out[i + 1] = c[i + 1]; out[i + 2] = c[i + 2]; out[i + 3] = m[i]; }
  return { data: out, width: W, height: H };
}

/* The smaller copies. Each texel of a level is the mean of the four under it (their colours weighted by how much leaf
   each is; a box of four never straddles two cells). Then, in every cell that has air in it, the alpha is scaled until
   as much of the cell passes the cut as does in the full picture: the spray keeps its cover. */
const cover = (d, w, cs, k, scale = 1) => { const x0 = (k % COLS) * cs, y0 = ((k / COLS) | 0) * cs; let n = 0; for (let y = 0; y < cs; y++) for (let x = 0; x < cs; x++) if (d[((y0 + y) * w + x0 + x) * 4 + 3] * scale >= CUT * 255) n++; return n / (cs * cs); };
function mipChain(top) {
  const chain = [top];
  const want = SPRAYS.map(name => cover(top.data, top.width, CELL, CELLS[name], 1));
  let src = top.data, w = top.width, h = top.height, cs = CELL;
  for (let l = 1; l < LEVELS; l++) {
    const nw = w >> 1, nh = h >> 1, dst = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      let r = 0, g = 0, b = 0, a = 0, ws = 0;
      for (let k = 0; k < 4; k++) { const i = ((2 * y + (k >> 1)) * w + 2 * x + (k & 1)) * 4, wt = src[i + 3] + 1; r += src[i] * wt; g += src[i + 1] * wt; b += src[i + 2] * wt; a += src[i + 3]; ws += wt; }
      const o = (y * nw + x) * 4; dst[o] = r / ws; dst[o + 1] = g / ws; dst[o + 2] = b / ws; dst[o + 3] = a / 4;
    }
    cs >>= 1;
    SPRAYS.forEach((name, j) => {
      const k = CELLS[name]; let lo = 0.4, hi = 8;
      for (let it = 0; it < 14; it++) { const mid = (lo + hi) / 2; if (cover(dst, nw, cs, k, mid) < want[j]) lo = mid; else hi = mid; }
      const s = (lo + hi) / 2, x0 = (k % COLS) * cs, y0 = ((k / COLS) | 0) * cs;
      for (let y = 0; y < cs; y++) for (let x = 0; x < cs; x++) { const i = ((y0 + y) * nw + x0 + x) * 4 + 3; dst[i] = Math.min(255, dst[i] * s); }
    });
    chain.push({ data: dst, width: nw, height: nh }); src = dst; w = nw; h = nh;
  }
  return chain;
}

let sheet = null, material = null;
export function plantAtlas() {
  if (sheet) return sheet;
  const chain = mipChain(drawAtlas());
  sheet = new THREE.DataTexture(chain[0].data, chain[0].width, chain[0].height, THREE.RGBAFormat, THREE.UnsignedByteType);
  sheet.mipmaps = chain; sheet.generateMipmaps = false; sheet.minFilter = THREE.LinearMipmapLinearFilter; sheet.magFilter = THREE.LinearFilter;
  sheet.colorSpace = THREE.SRGBColorSpace; sheet.anisotropy = 4; sheet.needsUpdate = true;
  return sheet;
}
/** how much of each spray passes the cut at each of the sheet's levels (for the checks: it must hold from far) */
export function plantCover() { const chain = plantAtlas().mipmaps; return Object.fromEntries(SPRAYS.map(name => [name, chain.map((m, l) => +cover(m.data, m.width, CELL >> l, CELLS[name]).toFixed(3))])); }
/** the one material every plant wears */
export function plantMaterial() {
  if (material) return material;
  material = new THREE.MeshStandardMaterial({ map: plantAtlas(), vertexColors: true, alphaTest: CUT, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.86, emissive: '#e6ecc0', emissiveIntensity: 0.1 });
  material.onBeforeCompile = s => {
    s.uniforms.uPlantTime = plantTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float sway;\nuniform float uPlantTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
	#ifdef USE_INSTANCING
		float plantPhase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17 + position.y * 0.9;
	#else
		float plantPhase = position.x * 0.31 + position.z * 0.17 + position.y * 0.5;
	#endif
	transformed.xz += sway * ( vec2( sin( uPlantTime * 1.1 + plantPhase ), cos( uPlantTime * 0.83 + plantPhase * 1.3 ) ) * 0.035 + sin( uPlantTime * 2.7 + plantPhase * 2.1 + position.x * 3.0 ) * 0.012 );`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\n\tvec3 normal = normalize( vNormal );\n\tvec3 nonPerturbedNormal = normal;')   // both sides of a card are lit by the crown's dome
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= diffuseColor.rgb;');   // the light that comes through a leaf has the leaf's colour
  };
  material.userData.plants = true;
  return material;
}

/* ── building: vertices with a colour and a sway each ── */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
/** a colour as the vertices keep it */
export const lin = hex => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

function Acc() {
  const pos = [], nor = [], uv = [], col = [], sw = [], idx = [];
  return {
    v(p, n, t, c, s) { pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); uv.push(t[0], t[1]); col.push(c[0], c[1], c[2]); sw.push(s); return pos.length / 3 - 1; },
    quad(a, b, c, d) { idx.push(a, b, c, a, c, d); }, tri(a, b, c) { idx.push(a, b, c); },
    /** a round limb from p0 to p1 */
    tube(p0, p1, r0, r1, seg, cell, c0, c1, s0, s1) {
      const d = unit(sub(p1, p0)), u = unit(cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), w = cross(d, u), ring = [];
      for (const [p, r, c, s, v] of [[p0, r0, c0, s0, 0], [p1, r1, c1, s1, 1]]) for (let i = 0; i <= seg; i++) { const a = i / seg * 6.2832, n = add(mul(u, Math.cos(a)), mul(w, Math.sin(a))); ring.push(this.v(add(p, mul(n, r)), n, uvOf(cell, i / seg, v, 2), c, s)); }
      for (let i = 0; i < seg; i++) this.quad(ring[i], ring[i + 1], ring[seg + 2 + i], ring[seg + 1 + i]);
    },
    /** a lump of leaves with no air in it: an ellipsoid a little out of true. flat: nothing of it hangs below that height */
    blob(C, R, detail, colour, s, seed, flat = null) {
      const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
      for (let i = 0; i < p.count; i += 3) {
        const ids = [];
        for (let k = 0; k < 3; k++) {
          const v = [p.getX(i + k), p.getY(i + k), p.getZ(i + k)], f = 1 + 0.17 * Math.sin(v[0] * 7.3 + seed) * Math.cos(v[1] * 5.1 + seed * 1.7) + 0.1 * Math.sin(v[2] * 6.7 + seed * 0.3);
          const q = [C[0] + v[0] * R[0] * f, C[1] + v[1] * R[1] * f, C[2] + v[2] * R[2] * f]; if (flat != null && q[1] < flat) q[1] = flat + (q[1] - flat) * 0.12;
          ids.push(this.v(q, unit([v[0] / R[0], v[1] / R[1] + 0.3 / R[1], v[2] / R[2]]), uvOf('mass', 0.5 + v[0] * 0.42 + v[2] * 0.05, 0.5 + v[1] * 0.42 + v[2] * 0.05, 3), colour(q, v), s));
        }
        this.tri(ids[0], ids[1], ids[2]);
      }
      g.dispose();
    },
    /** a card: centre c, half-sizes hw × hh along ex and ey; colour, normal and sway asked of each corner */
    card(c, ex, ey, hw, hh, cell, flip, colour, normal, sway) {
      const ids = [];
      for (const [i, j] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = add(c, add(mul(ex, hw * i), mul(ey, hh * j))); ids.push(this.v(p, normal(p), uvOf(cell, flip ? (1 - i) / 2 : (i + 1) / 2, (j + 1) / 2), colour(p, j), sway(p))); }
      this.quad(ids[0], ids[1], ids[2], ids[3]);
    },
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('sway', new THREE.Float32BufferAttribute(sw, 1)); g.setIndex(idx); return g;
    },
    get triangles() { return idx.length / 3; },
  };
}

/* ── the kinds ── */
const TINT = { fig: lin('#4f7433'), round: lin('#6d9247'), gum: lin('#8b9f7a'), frond: lin('#74953f'), dead: lin('#a08c64'), shrub: lin('#5d853b'), hedge: lin('#4c7334') };
const BARK = { fig: lin('#98959b'), round: lin('#7f6f64'), gum: lin('#c4bdb4'), palm: lin('#84735d') };

/** a tree with one crown: a trunk, limbs into the leaves, a dark core, cards round it.
    o: h the crown's top · r its radius · rv its half height · flat: an underside cut level (a fig's ceiling) · cards, half
       (a card's half-size) · limbs · trunk (its radius at the foot) · tint, bark · cell · sway (metres a unit of sway is) */
function broadleaf(A, o) {
  const R = rng(o.seed), C = [0, o.h - o.rv, 0], under = C[1] - o.rv * (o.flat ? 0.5 : 0.82), th = under * (o.flat ? 0.5 : 0.85), K = o.sway;
  const q = p => [(p[0] - C[0]) / o.r, (p[1] - C[1]) / o.rv, (p[2] - C[2]) / o.r];
  const shade = p => { const v = q(p), out = Math.hypot(v[0], v[1], v[2]); return 0.36 + 0.64 * clamp(0.22 + 0.5 * out + 0.32 * v[1]); };   // dark inside and underneath
  const normal = p => { const v = q(p); return unit([v[0], v[1] + 0.45, v[2]]); }, swayOf = p => { const v = q(p); return K * (0.35 + 0.65 * clamp(Math.hypot(v[0], v[1], v[2]))); };
  const dark = mul(o.bark, 0.72);
  A.tube([0, 0, 0], [0, th, 0], o.trunk * 1.25, o.trunk, 7, 'bark', dark, o.bark, 0, K * 0.05);
  for (let i = 0; i < o.limbs; i++) {
    const a = i / o.limbs * 6.2832 + R() * 0.6, l1 = [Math.cos(a) * o.r * 0.36, under + o.rv * 0.12, Math.sin(a) * o.r * 0.36], l2 = [Math.cos(a + 0.35) * o.r * 0.64, C[1] + o.rv * 0.1, Math.sin(a + 0.35) * o.r * 0.64];
    A.tube([0, th * 0.96, 0], l1, o.trunk * 0.62, o.trunk * 0.38, 5, 'bark', o.bark, o.bark, K * 0.05, K * 0.2); A.tube(l1, l2, o.trunk * 0.38, o.trunk * 0.14, 4, 'bark', o.bark, mul(o.bark, 0.8), K * 0.2, K * 0.4);
  }
  const core = o.core ?? 0.68;                                                      // (a small tree's is smaller: its few sprays must hide it)
  A.blob(C, [o.r * core, o.rv * core, o.r * core], 1, p => mul(o.tint, 0.6 * shade(p)), K * 0.4, o.seed, o.flat ? under + o.rv * 0.08 : null);
  const ymin = o.flat ? -0.25 : -0.82;
  for (let i = 0; i < o.cards; i++) {
    const y = 1 - (i + 0.5) / o.cards * (1 - ymin), rr = Math.sqrt(Math.max(0, 1 - y * y)), ph = i * 2.39996 + R() * 0.5, dir = [Math.cos(ph) * rr, y, Math.sin(ph) * rr], deep = 0.76 + R() * 0.26;
    const c = [C[0] + dir[0] * o.r * deep, C[1] + dir[1] * o.rv * deep, C[2] + dir[2] * o.r * deep], rnd = unit([R() - 0.5, R() - 0.5, R() - 0.5]);
    let ex, ey;
    if (i % 3 !== 2) { const n = unit(add(dir, mul(rnd, 0.75))); ex = unit(cross(Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], n)); ey = cross(n, ex); }   // lying on the crown, more or less
    else { ey = unit(add(dir, mul(rnd, 0.3))); ex = unit(cross(ey, rnd)); }                                                                                  // standing out of it: the outline's leaves
    const size = o.half * (0.85 + R() * 0.4), light = 0.88 + R() * 0.22, warm = (R() - 0.5) * 0.12, tint = [o.tint[0] * (light + warm), o.tint[1] * light, o.tint[2] * (light - warm)];
    A.card(c, ex, ey, size, size, o.cell, R() < 0.5, p => mul(tint, shade(p)), normal, swayOf);
  }
  if (o.flat) for (let i = 0; i < Math.round(o.cards / 5); i++) {                   // a fig's rim: leaves hanging round the edge of its ceiling
    const a = i * 2.39996 + R(), d = o.r * (0.78 + R() * 0.16), c = [Math.cos(a) * d, under + o.rv * (0.12 + R() * 0.2), Math.sin(a) * d], size = o.half * (0.8 + R() * 0.3), light = 0.8 + R() * 0.2;
    A.card(c, [-Math.sin(a + (R() - 0.5)), 0, Math.cos(a + (R() - 0.5))], unit([Math.cos(a) * 0.25, 1, Math.sin(a) * 0.25]), size, size, o.cell, R() < 0.5, p => mul(o.tint, light * shade(p)), normal, swayOf);
  }
}
/** a gum: a tall pale trunk, a few limbs going up, the leaves hanging in clumps at their ends with air between.
    o: h its top · r how far the clumps reach · tint, bark · sway */
function gum(A, o) {
  const R = rng(o.seed), K = o.sway, h = o.h, r = o.r, lean = [(R() - 0.5) * r * 0.4, 0, (R() - 0.5) * r * 0.4], fork = [lean[0], h * 0.4, lean[2]], tr = r * 0.115, clumps = [];
  A.tube([0, 0, 0], fork, tr * 1.2, tr * 0.8, 7, 'bark', mul(o.bark, 0.82), o.bark, 0, K * 0.08);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * 6.2832 + R() * 0.8, d = r * (0.5 + R() * 0.3), end = [fork[0] + Math.cos(a) * d, h * (0.66 + 0.075 * i + R() * 0.05), fork[2] + Math.sin(a) * d], mid = [fork[0] + Math.cos(a) * d * 0.6, (fork[1] + end[1]) / 2 - h * 0.015, fork[2] + Math.sin(a) * d * 0.6];
    A.tube(fork, mid, tr * 0.62, tr * 0.42, 5, 'bark', o.bark, o.bark, K * 0.08, K * 0.25); A.tube(mid, end, tr * 0.42, tr * 0.16, 4, 'bark', o.bark, o.bark, K * 0.25, K * 0.5);
    const side = [mid[0] + Math.cos(a + 1.3) * r * 0.42, mid[1] + h * 0.05, mid[2] + Math.sin(a + 1.3) * r * 0.42], over = [end[0] * 0.55 + fork[0] * 0.45, end[1] + h * 0.09, end[2] * 0.55 + fork[2] * 0.45];
    A.tube(mid, side, tr * 0.2, tr * 0.08, 3, 'bark', o.bark, o.bark, K * 0.25, K * 0.5);
    clumps.push(end, side, over);
  }
  clumps.push([fork[0] * 1.3, h * 0.94, fork[2] * 1.3]);
  clumps.forEach((Cc, k) => {
    const rc = r * (0.5 + R() * 0.2), rv = rc * 1.25, lift = clamp((Cc[1] - h * 0.5) / (h * 0.5));
    const shade = p => 0.46 + 0.54 * clamp(0.3 + 0.45 * (p[1] - Cc[1]) / rv + 0.35 * lift + 0.2 * Math.hypot(p[0] - Cc[0], p[2] - Cc[2]) / rc);
    const normal = p => unit([(p[0] - Cc[0]) / rc, (p[1] - Cc[1]) / rv + 0.5, (p[2] - Cc[2]) / rc]), swayOf = p => K * (0.55 + 0.45 * clamp((Cc[1] + rv - p[1]) / (2 * rv)));   // the hanging ends swing most
    A.blob(Cc, [rc * 0.44, rv * 0.42, rc * 0.44], 0, p => mul(o.tint, 0.62 * shade(p)), K * 0.5, o.seed + k * 3.1);
    for (let i = 0; i < 9; i++) {
      const b = i * 2.39996 + R(), light = 0.86 + R() * 0.24;
      if (i % 3) {                                                                  // a spray hanging
        const d = rc * (0.1 + R() * 0.5), c = [Cc[0] + Math.cos(b) * d, Cc[1] + (R() - 0.6) * rv * 0.6, Cc[2] + Math.sin(b) * d], t = b + 1.5708 + (R() - 0.5) * 1.6;
        A.card(c, [Math.cos(t), 0, Math.sin(t)], unit([(R() - 0.5) * 0.3, 1, (R() - 0.5) * 0.3]), rc * 0.8, rv * 0.9, 'gum', R() < 0.5, p => mul(o.tint, light * shade(p)), normal, swayOf);
      } else {                                                                      // one lying on the clump's shoulder
        const dir = unit([Math.cos(b), 0.5 + R() * 0.5, Math.sin(b)]), c = [Cc[0] + dir[0] * rc * 0.6, Cc[1] + dir[1] * rv * 0.6, Cc[2] + dir[2] * rc * 0.6], ex = unit(cross([0, 1, 0], dir));
        A.card(c, ex, unit(add(cross(dir, ex), [0, 0.5, 0])), rc * 0.75, rv * 0.75, 'gum', R() < 0.5, p => mul(o.tint, light * shade(p)), normal, swayOf);
      }
    }
  });
}
/** a fan palm's head, at the top of its trunk (the origin): green leaves standing, spreading and hanging, the dead ones
    down against the trunk. Metres. o: s its size (1: leaves 2.3 m long) · seed · tint, dead · sway */
function fanHead(A, o) {
  const R = rng(o.seed), s = o.s || 1, K = o.sway, up = [0, 1, 0];
  A.blob([0, 0.05 * s, 0], [0.3 * s, 0.4 * s, 0.3 * s], 0, () => mul(o.tint, 0.3), K * 0.1, o.seed);
  const frond = (el, az, L, hw, cell, tint, base, droop, light) => {
    const d = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], e0 = [-Math.sin(az), 0, Math.cos(az)], roll = (R() - 0.5) * 0.8, e1 = cross(d, e0);
    const ex = add(mul(e0, Math.cos(roll)), mul(e1, Math.sin(roll))); let n = cross(ex, d); if (n[1] < 0) n = mul(n, -1);
    const p0 = add(base, mul(d, 0.12 * s)), p1 = add(add(base, mul(d, L)), [0, -droop, 0]), nn = unit(add(add(mul(n, 0.6), mul(up, 0.6)), mul(d, 0.4))), ids = [];
    for (const [p, v, k] of [[p0, 0, 0.72], [p1, 1, 1]]) for (const [u, side] of [[0, -1], [0.5, 0], [1, 1]]) ids.push(A.v(add(add(p, mul(ex, hw * side)), mul(n, Math.abs(side) * hw * 0.34)), nn, uvOf(cell, u, v), mul(tint, light * k), K * (0.15 + 0.85 * v)));   // folded along its rib
    A.quad(ids[0], ids[1], ids[4], ids[3]); A.quad(ids[1], ids[2], ids[5], ids[4]);
  };
  const n = 32;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), el = Math.asin(0.985 - t * 1.78), low = clamp((-el - 0.3) * 1.3, 0, 0.55);                       // from the spear at the top to the ones that hang
    frond(el, i * 2.39996 + R() * 0.4, (2.3 + R() * 0.6) * s, 0.72 * s, 'frond', mix(o.tint, o.dead, low), [0, 0.1 * s, 0], el < 0 ? -el * 0.5 * s : 0, 0.72 + 0.3 * (1 - t) + R() * 0.08);
  }
  for (let i = 0; i < 12; i++) frond(-1.18 - R() * 0.3, i * 2.39996 + R() * 0.6, (1.45 + R() * 0.5) * s, 0.55 * s, 'dead', o.dead, [0, -(0.15 + R() * 0.6) * s, 0], 0, 0.6 + R() * 0.3);   // the skirt
}

/* ── what places ask for ── */
/** the trees of the streets, each in units of its crown's radius as the tiles give it (so one instance matrix places
    any of them), and how the far blob is stretched to stand for each */
export const TREE_KINDS = ['fig', 'round', 'gum'];
export const TREE_BLOB = { fig: [1, 1, 1], round: [0.85, 1.35, 0.85], gum: [0.72, 2.4, 0.72] };
/** what the far blob (painted as a fig) is tinted by to stand for each kind */
export const TREE_FAR = Object.fromEntries(['fig', 'round', 'gum'].map(k => [k, TINT[k].map((v, i) => v / TINT.fig[i])]));
const UNIT = {
  fig: (A, seed) => broadleaf(A, { h: 2.14, r: 1, rv: 0.72, flat: true, cards: 78, half: 0.33, limbs: 5, trunk: 0.1, tint: TINT.fig, bark: BARK.fig, cell: 'fig', seed, sway: 1 }),
  round: (A, seed) => broadleaf(A, { h: 2.9, r: 0.86, rv: 0.98, cards: 62, half: 0.31, limbs: 3, trunk: 0.062, tint: TINT.round, bark: BARK.round, cell: 'round', seed, sway: 1 }),
  gum: (A, seed) => gum(A, { h: 5.1, r: 0.8, tint: TINT.gum, bark: BARK.gum, seed, sway: 1 }),
};
/** a street tree of a kind, one unit being its crown's radius (for instancing) */
export function treeUnit(kind, seed = 1) { const A = Acc(); UNIT[kind](A, seed); return A.geometry(); }
/** a fan palm's head in metres, at the origin (for instancing at the tops of trunks) */
export function palmHead(seed = 1) { const A = Acc(); fanHead(A, { seed, tint: TINT.frond, dead: TINT.dead, sway: 2.4 }); return A.geometry(); }

const placed = (A, o) => { const g = A.geometry(); if (o.ry) g.rotateY(o.ry); if (o.at) g.translate(o.at[0], o.at[1] || 0, o.at[2]); return g; };
const tintOf = (o, base) => (o.tint ? mul(lin(o.tint), o.gain ?? 1.45) : base);
/** a tree standing at o.at ([x, y, z]), in metres. kind 'round' | 'fig' | 'gum'; h its height, r its crown's radius;
    tint: the colour of its leaves (as the old plain crowns had it: made lighter here, the leaves' own shade does the rest) */
export function treeAt(kind, o) {
  const A = Acc(), seed = o.seed ?? 1, r = o.r, h = o.h;
  if (kind === 'gum') gum(A, { h, r, tint: tintOf(o, TINT.gum), bark: o.bark ? lin(o.bark) : BARK.gum, seed, sway: r * 1.2 });
  else if (kind === 'fig') broadleaf(A, { h, r, rv: Math.min(h * 0.36, r * 0.74), flat: true, cards: o.cards ?? 78, half: r * 0.33, limbs: 5, trunk: r * 0.085, tint: tintOf(o, TINT.fig), bark: o.bark ? lin(o.bark) : BARK.fig, cell: 'fig', seed, sway: r });
  else broadleaf(A, { h, r, rv: clamp(h * 0.33, r * 0.8, r * 1.2), cards: o.cards ?? (r < 1.3 ? 40 : 58), half: r * (r < 1.3 ? 0.46 : 0.37), core: r < 1.3 ? 0.5 : 0.68, limbs: 3, trunk: 0.06 + h * 0.014, tint: tintOf(o, TINT.round), bark: o.bark ? lin(o.bark) : BARK.round, cell: 'round', seed, sway: r });
  return placed(A, { ry: (seed * 2.1) % 6.2832, at: o.at });
}
/** a Mexican fan palm standing at o.at: h tall, leaning `lean` radians towards +x before it is turned */
export function palmAt(o) {
  const A = Acc(), seed = o.seed ?? 1, h = o.h, n = Math.max(3, Math.round(h / 1.4)), lean = o.lean || 0, top = [Math.sin(lean) * h, Math.cos(lean) * h, 0];
  for (let i = 0; i < n; i++) { const a = i / n, b = (i + 1) / n, ra = 0.25 - 0.08 * a, rb = 0.25 - 0.08 * b; A.tube(mul(top, a), mul(top, b), ra, rb, 8, 'ring', mul(BARK.palm, 0.8 + 0.2 * a), mul(BARK.palm, 0.8 + 0.2 * b), a * 0.3, b * 0.3); }
  const head = Acc(); fanHead(head, { seed, tint: tintOf(o, TINT.frond), dead: TINT.dead, sway: 2.4, s: o.s || 1 });
  const g = placed(A, {}), hg = head.geometry().translate(top[0], top[1], top[2]), out = mergePlants([g, hg]);
  return placed({ geometry: () => out }, { ry: o.ry ?? (seed * 1.7) % 6.2832, at: o.at });
}
/** a clipped ball of a shrub at o.at: r its radius */
export function shrubAt(o) {
  const A = Acc(), R = rng(o.seed ?? 3), r = o.r, tint = tintOf(o, TINT.shrub), C = [0, r * 0.62, 0], Rr = [r, r * 0.78, r];
  const shade = p => 0.4 + 0.6 * clamp(0.15 + 0.85 * p[1] / (r * 1.4)), normal = p => unit([(p[0]) / r, (p[1] - C[1]) / Rr[1] + 0.4, p[2] / r]), sway = p => r * 0.5 * clamp(p[1] / (r * 1.4));
  A.blob(C, mul(Rr, 0.86), 1, p => mul(tint, 0.62 * shade(p)), r * 0.2, o.seed ?? 3, 0.02);
  for (let i = 0; i < 12; i++) {
    const y = 1 - (i + 0.5) / 12 * 1.1, rr = Math.sqrt(Math.max(0, 1 - y * y)), ph = i * 2.39996 + R(), dir = [Math.cos(ph) * rr, y, Math.sin(ph) * rr], c = [dir[0] * Rr[0] * 0.92, C[1] + dir[1] * Rr[1] * 0.92, dir[2] * Rr[2] * 0.92];
    const n = unit(add(dir, mul([R() - 0.5, R() - 0.5, R() - 0.5], 0.8))), ex = unit(cross(Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], n)), size = r * (0.42 + R() * 0.16), light = 0.86 + R() * 0.24;
    A.card(c, ex, cross(n, ex), size, size, 'round', R() < 0.5, p => mul(tint, light * shade(p)), normal, sway);
  }
  return placed(A, { ry: R() * 6.2832, at: o.at });
}
/** a clipped hedge: the box from (x0, y0, z0) to (x1, y1, z1), its faces a mass of leaves, sprays standing out of its top
    edges and lying on its top so that its outline is not a ruler's */
export function hedgeBox(o) {
  const A = Acc(), R = rng(o.seed ?? 5), tint = tintOf(o, TINT.hedge), { x0, y0, z0, x1, y1, z1 } = o, H = y1 - y0;
  const shade = p => 0.45 + 0.55 * clamp((p[1] - y0) / H), col = p => mul(tint, 0.78 * shade(p));
  const face = (a, b, c, d, n) => {                                                 // a face, in pieces under a metre, each wearing the whole mass of leaves
    const lu = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), nu = Math.max(1, Math.round(lu / 0.85)), nn = unit(add(n, [0, 0.35, 0]));
    for (let i = 0; i < nu; i++) {
      const p = [mix(a, b, i / nu), mix(a, b, (i + 1) / nu), mix(d, c, (i + 1) / nu), mix(d, c, i / nu)], f = i % 2;
      const ids = p.map((q, k) => A.v(q, nn, uvOf('mass', (k === 1 || k === 2) !== !!f ? 1 : 0, k > 1 ? 1 : 0, 3), col(q), 0)); A.quad(ids[0], ids[1], ids[2], ids[3]);
    }
  };
  face([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]); face([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
  face([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]); face([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
  if (x1 - x0 >= z1 - z0) face([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]); else face([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0]);
  const spray = (c, ex, ey, size) => { const light = 0.88 + R() * 0.24; A.card(c, ex, ey, size, size, 'round', R() < 0.5, p => mul(tint, light * shade(p)), () => unit(add(ey, [0, 0.8, 0])), p => 0.25 * clamp((p[1] - y1 + size) / size)); };
  const long = x1 - x0 >= z1 - z0, L = long ? x1 - x0 : z1 - z0, Wd = long ? z1 - z0 : x1 - x0, at = (t, w, y) => (long ? [x0 + t, y, z0 + w] : [x0 + w, y, z0 + t]), along = long ? [1, 0, 0] : [0, 0, 1], across = long ? [0, 0, 1] : [1, 0, 0];
  for (let t = 0.15; t < L; t += 0.34 + R() * 0.12) for (const side of [0, 1]) {                                        // along both top edges, leaning out
    const out = mul(across, side ? 1 : -1), size = 0.17 + R() * 0.07;
    spray(at(t, side ? Wd : 0, y1 - size * 0.25), unit(add(along, mul(out, (R() - 0.5) * 0.6))), unit(add([0, 1, 0], mul(out, 0.35 + R() * 0.5))), size);
  }
  for (let t = 0.3; t < L; t += 0.5 + R() * 0.2) { const size = 0.2 + R() * 0.08, a = R() * 6.2832; spray(at(t, Wd * (0.3 + R() * 0.4), y1 + size * 0.12), [Math.cos(a), 0, Math.sin(a)], unit([-Math.sin(a) * 0.9, 0.45, Math.cos(a) * 0.9]), size); }   // on the top, nearly lying
  return placed(A, { at: o.at });
}
/** several plants' geometries as one */
export function mergePlants(list) {
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), sw = new Float32Array(nv), idx = new Uint32Array(ni); let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2); col.set(g.attributes.color.array, vo * 3); sw.set(g.attributes.sway.array, vo);
    const a = g.index.array; for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo; io += a.length; vo += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3)); out.setAttribute('sway', new THREE.BufferAttribute(sw, 1)); out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
