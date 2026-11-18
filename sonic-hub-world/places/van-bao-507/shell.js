/* Walls, floors, ceiling, doors and windows of flat 507, its two balconies, the loggia and the gallery outside.
   Everything here is laid down ON THE DRAWING'S GRID (heights against a 2.75 ceiling, the north strip 3.5 deep) and the
   builder's survey sets it where it was measured to be — see plan.js. Sizes that must come out right in real metres
   (a door leaf that has to fill its opening) are asked of the survey with P.sz / P.sy. */
import * as THREE from 'three';
import { M, plateTex, blindTex, canvasTex } from '../../engine/tex.js';
import { part } from '../../engine/kit.js';
import { makeWall, uvFor, along, casing, bars, windowFrame, doorLeaf, glazedLeaf } from '../../engine/walls.js';
import * as P from './plan.js';

const { H, T } = P;
export const PAINT = '#efe9dc', EXT = '#d9cfae', GALLERY = '#f0ede3', MAHOG = '#4c1712', WHITE = '#f3f1ea';

const paint = () => M.paint(PAINT), ext = () => M.concrete(EXT, 5, 0.9), galleryWhite = () => M.paint(GALLERY);
const mahog = () => M.wood(MAHOG, 0.85);
const wall = makeWall(H), uvOf = uvFor(H);

export function buildShell(b, scene, shared) {
  const fl = M.floor(), terra = M.terracotta(), btile = M.balconyTile(), wt = M.steelWhite();
  const { LIV, PAR, KIT, BIG, LOG, BW, BE, COR, LOBBY: L, NICHE } = P;
  const XE = BIG.x1 + T, ZS = 8.22;                // the outer faces of the east wall and of the south wall
  const LA = LOG.x0 - 0.14, LB = LOG.x1 + 0.14;   // the loggia's two ends, outside

  /* ── floors ── */
  const floor = (m, r, uv, y = 0) => b.box(m, r.x0, y - 0.1, r.z0, r.x1, y, r.z1, { uv, uvw: true, cast: false });
  b.box(M.plain('#2a211c'), -0.22, -0.16, -0.22, XE, -0.02, ZS, { cast: false });                   // the slab under everything
  b.box(M.plain('#2a211c'), LA, -0.16, ZS, LB, -0.02, LOG.z1 + 0.14, { cast: false });              // … and under the loggia
  floor(fl, { x0: 0, x1: LIV.x1, z0: 0, z1: 3.5 }, [1.6, 1.6]);
  floor(fl, { x0: LIV.x1, x1: PAR.x1, z0: 0, z1: 3.5 }, [1.6, 1.6]);                                // lobby, niche, the parents' room
  floor(fl, { x0: BIG.x0, x1: BIG.x1, z0: 3.5, z1: BIG.z1 }, [1.6, 1.6]);
  floor(terra, { x0: 1.85, x1: KIT.x1, z0: 3.5, z1: 8.0 }, [1.2, 1.2]);
  floor(terra, { x0: P.LOG_DOOR.a, x1: P.LOG_DOOR.b, z0: 8.0, z1: ZS }, [1.2, 1.2]);                // the door's threshold
  floor(M.bathTile(), { x0: 0, x1: 1.85, z0: 3.62, z1: 8.0 }, [0.6, 0.6]);                          // washing alcove and bathroom
  floor(btile, { x0: BW.x0, x1: 0, z0: BW.z0, z1: BW.z1 }, [0.8, 0.8], -0.02);
  floor(M.cement(), { x0: PAR.x1, x1: BE.x1 + 0.06, z0: BE.z0, z1: BE.z1 }, [0.8, 0.8], -0.02);            // the slab left of the old balcony, inside the cage
  floor(btile, { x0: LA, x1: LB, z0: ZS, z1: LOG.z1 + 0.05 }, [0.8, 0.8], -0.02);
  // the brass strip where boards meet tiles
  b.box(M.plain('#b9a36a', 0.35, 0.8), P.KIT_OPEN.a, 0, 3.5, P.KIT_OPEN.b, 0.006, 3.54, { cast: false });

  /* ── outer walls ── */
  const p = paint(), e = ext();
  // north: the front door closes the end of the gallery; the rest of this wall is shared with 506
  wall(b, 'x', -T, 0, -T, PAR.x1 + T, [{ a: P.MAIN_DOOR.a, b: P.MAIN_DOOR.b, y1: P.MAIN_DOOR.y1 }], galleryWhite(), p);
  // west: living room, washing alcove and bathroom behind one face
  wall(b, 'z', -T, 0, 0, 8.22, [{ a: P.BALC_DOOR.a, b: P.BALC_DOOR.b, y1: P.BALC_DOOR.y1 }], e, p);
  // south: one straight face — bathroom, kitchen, big room. The loggia is hung outside it.
  wall(b, 'x', 8.0, ZS, -T, XE, [P.WC_WIN, P.LOG_DOOR, P.S_WIN_W, P.S_WIN_E].map(o => ({ a: o.a, b: o.b, y0: o.y0, y1: o.y1 })), p, e);
  // east: the big room, then (set back) the parents' room behind its balcony
  wall(b, 'z', BIG.x1, XE, 3.5, ZS, [{ a: P.BIG_WIN.a, b: P.BIG_WIN.b, y0: P.BIG_WIN.y0, y1: P.BIG_WIN.y1 }], p, e);
  wall(b, 'z', PAR.x1, PAR.x1 + T, 0, 3.5, [{ a: P.PAR_WIN.a, b: P.PAR_WIN.b, y0: P.PAR_WIN.y0, y1: P.PAR_WIN.y1 }], p, e);
  wall(b, 'x', 3.3, 3.5, PAR.x1 + T, XE, [], e);                    // the cage's south side is the big room's wall; its north end is barred
  wall(b, 'x', 0, BW.z0, BW.x0, -T, [], e);
  wall(b, 'x', BW.z1, 3.5, BW.x0, -T, [], e);

  /* ── inner walls ── */
  wall(b, 'z', LIV.x1, NICHE.x0, 0, NICHE.z1, [], p);                                             // the TV wall
  wall(b, 'x', NICHE.z1, L.z0, LIV.x1, PAR.x0, [], p);                                            // the lobby's north side
  wall(b, 'z', L.x1, PAR.x0, L.z0, 3.5, [{ a: P.D2.a, b: P.D2.b, y1: P.D2.y1 }], p);              // its east side: the parents' door
  wall(b, 'x', 3.5, 3.62, 0, BIG.x1, [{ a: P.KIT_OPEN.a, b: P.KIT_OPEN.b, y1: P.KIT_OPEN.y1 }, { a: P.D1.a, b: P.D1.b, y1: P.D1.y1 }], p);
  wall(b, 'z', KIT.x1, P.KIT_WALL, 3.62, 8.0, [], p);                                            // kitchen | big room
  wall(b, 'z', 1.85, 1.95, P.ALC_MOUTH, 8.0, [], p);                                              // the screen between the kitchen table and the bathroom door
  wall(b, 'x', 5.6, 5.72, 0, 1.85, [{ a: P.WC_DOOR.a, b: P.WC_DOOR.b, y1: P.WC_DOOR.y1 }], p);    // washing alcove | bathroom
  // the pier beside his desk (the switch is on it), the column in the sofa wall
  b.box(p, P.D1.a - 0.22, 0, 3.62, P.D1.a, H, 3.9, { ...uvOf(p), solid: true });
  b.box(p, 1.68, 0, 0, 1.94, H, 0.07, { ...uvOf(p) });
  // the lobby's lowered ceiling, its face flush with the TV wall (the 2012 photograph shows it, and a downlight in it)
  b.box(p, L.x0, L.soffit, L.z0, L.x1, H, 3.5, { ...uvOf(p) });
  b.cyl(M.plain('#fbf6e6', 0.4), (L.x0 + L.x1) / 2, L.soffit - 0.008, (L.z0 + 3.5) / 2, 0.05, 0.008, { seg: 12, cast: false });

  /* ── ceiling and roof slab ── */
  const ceil = M.plain('#f3f0e8', 1);
  b.box(ceil, -1.3, H, -0.25, XE + 0.08, H + 0.22, ZS + 0.08, {});
  b.box(ceil, LA - 0.1, H, ZS + 0.08, LB + 0.1, H + 0.22, LOG.z1 + 0.22, {});                      // over the loggia
  b.box(ceil, COR.x0 - 0.3, H, COR.z0, COR.x1 + 0.3, H + 0.22, -0.25, {});
  for (let z = -3.3; z > COR.z0; z -= 3.3) b.box(M.concrete('#e3dcc8', 7, 0.6), COR.x0 - 0.2, H - 0.25, z - 0.11, COR.x1, H, z + 0.11, { uv: [2, 2] });   // beams over the gallery

  /* ── skirting (dark, as in every room with boards) and the cornice of the living room ── */
  const sk = mahog();
  const skirt = (axis, c, a0, a1, side, gaps = []) => {
    const put = along(b, axis); let cur = a0;
    for (const [g0, g1] of [...gaps].sort((x, y) => x[0] - y[0])) { if (g0 > cur) put(sk, cur, 0, c, g0, 0.085, c + side * 0.014, { cast: false }); cur = Math.max(cur, g1); }
    if (a1 > cur) put(sk, cur, 0, c, a1, 0.085, c + side * 0.014, { cast: false });
  };
  // living room and lobby (the stone behind the fish tank comes down to the floor)
  skirt('x', 0, 0, LIV.x1, 1, [[P.MAIN_DOOR.a - 0.03, P.MAIN_DOOR.b + 0.03]]);
  skirt('x', 3.5, 0, L.x1, -1, [[0.25, 1.45], [P.KIT_OPEN.a, P.KIT_OPEN.b], [P.D1.a - 0.03, P.D1.b + 0.03]]);
  skirt('z', 0, 0, 3.5, 1, [[P.BALC_DOOR.a, P.BALC_DOOR.b]]);
  skirt('z', LIV.x1, 0, L.z0, -1); skirt('x', L.z0, LIV.x1, L.x1, 1); skirt('z', L.x1, L.z0, 3.5, -1, [[P.D2.a - 0.03, P.D2.b + 0.03]]);
  // the parents' room and its niche
  skirt('z', NICHE.x0, 0, NICHE.z1, 1); skirt('x', NICHE.z1, NICHE.x0, PAR.x0, -1);
  skirt('z', PAR.x0, NICHE.z1, 3.5, 1, [[P.D2.a - 0.03, P.D2.b + 0.03]]); skirt('z', PAR.x1, 0, 3.5, -1);
  skirt('x', 0, NICHE.x0, PAR.x1, 1); skirt('x', 3.5, PAR.x0, PAR.x1, -1);
  // the big room
  skirt('x', 3.62, BIG.x0, BIG.x1, 1, [[P.D1.a - 0.03, P.D1.b + 0.03]]); skirt('x', BIG.z1, BIG.x0, BIG.x1, -1);
  skirt('z', BIG.x0, 3.62, BIG.z1, 1); skirt('z', BIG.x1, 3.62, BIG.z1, -1);
  const cor = (x0, z0, x1, z1) => b.box(sk, x0, H - 0.075, z0, x1, H, z1, { cast: false });
  cor(0, 0, LIV.x1, 0.035); cor(0, 3.465, LIV.x1, 3.5); cor(0, 0, 0.035, 3.5); cor(LIV.x1 - 0.035, 0, LIV.x1, 3.5);

  /* ── door linings ── */
  const mh = mahog();
  casing(b, 'x', P.D1.a, P.D1.b, P.D1.y1, 3.5, 3.62, mh);
  casing(b, 'z', P.D2.a, P.D2.b, P.D2.y1, L.x1, PAR.x0, mh);
  casing(b, 'x', P.WC_DOOR.a, P.WC_DOOR.b, P.WC_DOOR.y1, 5.6, 5.72, mh);
  casing(b, 'x', P.MAIN_DOOR.a, P.MAIN_DOOR.b, P.MAIN_DOOR.y1, -T, 0, mh, 0.055);
  // the ledge over his door, where the little figures stand
  b.box(mh, P.D1.a - 0.12, P.D1.y1 + 0.06, 3.62, P.D1.b + 0.12, P.D1.y1 + 0.095, 3.8, { uv: [1, 1] });

  /* ── the west balcony door: four barred leaves under a transom ── */
  {
    const d = P.BALC_DOOR, c = -T / 2, q = (d.b - d.a) / 4, w = (P.sz(d.b) - P.sz(d.a)) / 4;   // a quarter of the opening as drawn (to place a leaf), and a leaf's real width
    windowFrame(b, 'z', d.a, d.b, d.tr, d.y1, c, { mull: 3 });
    bars(b, 'z', d.a + 0.05, d.b - 0.05, d.tr + 0.04, d.y1 - 0.04, c - 0.05, wt, 0.145);
    b.box(wt, c - 0.035, 0, d.a, c + 0.035, d.tr, d.a + 0.05); b.box(wt, c - 0.035, 0, d.b - 0.05, c + 0.035, d.tr, d.b);
    b.box(wt, c - 0.035, d.tr - 0.05, d.a, c + 0.035, d.tr, d.b);
    // outer leaves shut, middle pair open onto the balcony
    b.push(c, 0, d.a + 0.05, 90); glazedLeaf(b, w - 0.05, d.tr - 0.05); b.pop();
    b.push(c, 0, d.b - 0.05, -90); glazedLeaf(b, w - 0.05, d.tr - 0.05); b.pop();
    b.push(c, 0, d.a + q, 190); glazedLeaf(b, w, d.tr - 0.05); b.pop();
    b.push(c, 0, d.b - q, 170); glazedLeaf(b, w, d.tr - 0.05); b.pop();
    b.solid(c - 0.04, 0, d.a, c + 0.04, 2, d.a + q); b.solid(c - 0.04, 0, d.b - q, c + 0.04, 2, d.b);
  }
  /* ── west balcony: floor curb, planter, full-height bars, the bamboo blind ── */
  {
    const x = BW.x0;
    b.box(e, x, -0.12, BW.z0, x + 0.12, 0.22, BW.z1, { uv: [2, 2], solid: true });
    bars(b, 'z', BW.z0, BW.z1, 0.22, H, x + 0.05, wt, 0.15, 0.03, 0.014, 1.0);
    b.box(M.plain('#b7a98c', 0.9), x + 0.13, 0, 0.5, x + 0.38, 0.26, 3.0, { solid: true });      // planter box
    b.box(M.plain('#3b2a1c', 1), x + 0.15, 0.25, 0.52, x + 0.36, 0.27, 2.98, { cast: false });
    // two bamboo blinds: the southern one let down, the northern one rolled up (so the evening sun comes in under it)
    const zm = (BW.z0 + BW.z1) / 2;
    b.quad(M.alpha(blindTex()), '+x', x + 0.1, 1.52, (zm + BW.z1) / 2, BW.z1 - zm - 0.05, 1.2, { uv: [0.9, 0.25] });
    b.bar(M.plain('#8a6a3a', 0.8), x + 0.1, 2.14, zm + 0.02, x + 0.1, 2.14, BW.z1 - 0.03, 0.03, { round: true });
    b.bar(M.plain('#b98a4e', 0.8), x + 0.1, 2.06, BW.z0 + 0.03, x + 0.1, 2.06, zm - 0.02, 0.13, { round: true, seg: 12 });
    b.quad(M.alpha(blindTex()), '+x', x + 0.1, 2.06, (BW.z0 + zm) / 2, zm - BW.z0 - 0.05, 0.16, { uv: [0.9, 0.25] });
    b.solid(x - 0.05, 0, BW.z0, x + 0.02, 2, BW.z1);
  }
  /* ── the parents' window and the steel cage over the street. The wall has a sill and no door (video 3:52–3:57): a wide
        white window, four leaves under a row of fanlights. Outside it what the renovation left of the old balcony, a
        slab about a metre deep, is closed in by a cage of flat bars — the air conditioner's outdoor unit and the folding
        ladder live in it, the flag is tied to one of its posts (video 3:58–4:02, 4:28–4:31) ── */
  {
    const w = P.PAR_WIN, c = PAR.x1 + T / 2;
    windowFrame(b, 'z', w.a, w.b, w.y0, w.y1, c, { mull: 3, trans: w.y1 - 0.34 });
    b.box(M.wood('#8a5a34', 0.6), PAR.x1 - 0.05, w.y0 - 0.035, w.a - 0.04, PAR.x1 + T + 0.02, w.y0, w.b + 0.04, { uv: [1, 1] });     // the sill board
    const sd = M.steelGrey(), x = BE.x1, zn = BE.z0 + 0.02;
    for (let y = 0.1; y < H - 0.05; y += 0.15) { b.box(sd, x, y, zn, x + 0.016, y + 0.03, BE.z1); b.box(sd, PAR.x1 + T, y, zn - 0.016, x + 0.016, y + 0.03, zn); }   // the face over the street, the north end
    for (let i = 0; i <= 4; i++) { const z = zn + (BE.z1 - zn) * i / 4; b.box(sd, x - 0.02, 0, z - 0.02, x + 0.02, H, z + 0.02); }
    for (const xx of [PAR.x1 + T + 0.02, (PAR.x1 + T + x) / 2]) b.box(sd, xx - 0.02, 0, zn - 0.03, xx + 0.02, H, zn + 0.01);
    b.box(M.concrete('#b9ad90', 9, 0.9), PAR.x1 + T, -0.14, BE.z0, x + 0.06, -0.02, BE.z1, { uv: [2, 2] });                         // the slab's edge
    b.solid(x - 0.02, 0, BE.z0, x + 0.05, 2, BE.z1); b.solid(PAR.x1 + T, 0, zn - 0.04, x, 2, zn + 0.02);
  }
  /* ── the wide window of the big room ── */
  {
    const w = P.BIG_WIN;
    windowFrame(b, 'z', w.a, w.b, w.y0, w.y1, BIG.x1 + 0.09, { mull: 3 });
    bars(b, 'z', w.a + 0.05, w.b - 0.05, w.y0 + 0.05, w.y1 - 0.05, BIG.x1 + 0.15, wt, 0.145);
    b.box(M.plain('#ece8dc', 0.6), BIG.x1 - 0.04, w.y0 - 0.04, w.a - 0.04, BIG.x1 + 0.24, w.y0, w.b + 0.04, {});   // sill
  }
  /* ── the big room's south window: two pairs of leaves with the row of wardrobes standing between them (one pair lights
     his corner, the other his sister's side); white bars within the frame, a deep wooden sill ── */
  for (const w of [P.S_WIN_W, P.S_WIN_E]) {
    const c = 8.11;
    windowFrame(b, 'x', w.a, w.b, w.y0, w.y1, c, { mull: 1 });
    bars(b, 'x', w.a + 0.03, w.b - 0.03, w.y0 + 0.04, w.y1 - 0.04, c + 0.06, wt, 0.16);
    b.box(M.wood(MAHOG, 0.8), w.a - 0.04, w.y0 - 0.035, 7.9, w.b + 0.04, w.y0, 8.2, { uv: [1, 1] });
  }
  /* ── the bathroom's high window: glass louvres, in the outside wall ── */
  {
    const fr = M.glass('#dfe8e6', 0.55);
    for (const [axis, w, c] of [['x', P.WC_WIN, 8.11]]) {
      windowFrame(b, axis, w.a, w.b, w.y0, w.y1, c, { mull: 0, glass: false });
      const put = along(b, axis);
      for (let y = w.y0 + 0.07; y < w.y1 - 0.05; y += 0.1) put(fr, w.a + 0.05, y, c - 0.03, w.b - 0.05, y + 0.085, c - 0.022, { cast: false });
    }
  }
  /* ── kitchen → loggia: a white glazed door under a fanlight. The loggia hangs on the south face from the kitchen's west
     wall to just short of his window: a parapet, then frames and bars up to the ceiling, on the south and at both ends ── */
  {
    const d = P.LOG_DOOR, c = 8.11;
    windowFrame(b, 'x', d.a, d.b, 2.1, d.y1, c, { mull: 1 });
    for (const x of [d.a, d.b - 0.05]) b.box(wt, x, 0, c - 0.035, x + 0.05, 2.1, c + 0.035, {});            // the door's posts
    b.push(d.a + 0.05, 0, c - 0.03, 268); glazedLeaf(b, d.b - d.a - 0.12, 2.08); b.pop();                    // the leaf, open inward against the west side
    b.solid(d.a - 0.02, 0, c - 0.78, d.a + 0.1, 2, c);
    const z = LOG.z1, pw = M.paint('#ebe7dc');
    b.box(pw, LA, -0.12, z, LB, 0.9, z + 0.14, { uv: [1, H], solid: true });
    windowFrame(b, 'x', LA + 0.02, LB - 0.02, 0.9, H, z + 0.07, { mull: 5, glass: false, trans: 2.3 });
    bars(b, 'x', LA + 0.05, LB - 0.05, 0.93, H - 0.03, z + 0.12, wt, 0.15);
    for (const x0 of [LA, LB - 0.14]) {
      b.box(pw, x0, -0.12, ZS, x0 + 0.14, 0.9, z, { uv: [1, H], solid: true });
      windowFrame(b, 'z', ZS, z, 0.9, H, x0 + 0.07, { mull: 0, glass: false, trans: 2.3 });
      bars(b, 'z', ZS + 0.03, z, 0.93, H - 0.03, x0 + (x0 === LA ? 0.03 : 0.11), wt, 0.15);
      b.solid(x0 - 0.05, 0, ZS, x0 + 0.19, 2, z);
    }
    b.solid(LA, 0, z, LB, 2, z + 0.2);
  }

  /* ── the gallery. It runs north from the front door — 507 is the last flat and its door closes the end of it — along the
        west face of the block: cement tiles, a balustrade of concrete fins (the last bay, by the door, a grey steel rail),
        the white wall of the neighbour on the east, the stairs half way along ── */
  {
    const cc = M.concrete('#e6dcc0', 11, 0.9), x0 = COR.x0, x1 = COR.x1, zN = COR.z0, bay = -2.5;
    floor(M.cement(), { x0: x0 - 0.2, x1, z0: zN, z1: 0 }, [0.8, 0.8], -0.02);
    // balustrade: curb, fins, rail
    b.box(cc, x0 - 0.2, -0.12, zN, x0, 0.14, bay, { uv: [2, 2], solid: true });
    b.box(cc, x0 - 0.22, 0.74, zN, x0 + 0.02, 0.9, bay, { uv: [2, 2] });
    for (let z = bay - 0.14; z > zN; z -= 0.235) b.box(cc, x0 - 0.16, 0.14, z - 0.085, x0 - 0.04, 0.74, z, { uv: [2, 2] });
    for (let z = bay; z > zN; z -= 3.3) b.box(cc, x0 - 0.24, 0, z - 0.24, x0 + 0.02, H, z, { uv: [2, 2], solid: true });
    b.solid(x0 - 0.3, 0, zN, x0 + 0.02, 1.2, 0);
    // the steel rail of the last bay
    const sg = M.steelGrey();
    for (const y of [0.08, 0.5, 0.92]) b.box(sg, x0 - 0.12, y, bay, x0 - 0.09, y + 0.035, -T);
    for (let z = bay + 0.12; z < -T; z += 0.17) b.box(sg, x0 - 0.115, 0.08, z, x0 - 0.095, 0.92, z + 0.02);
    b.box(cc, x0 - 0.2, -0.12, bay, x0, 0.08, -T, { uv: [2, 2] });
    // east wall: white beside 507, then yellow over an ochre dado; a grilled window with louvres over it, shuttered doors, 506's gate
    const wh = galleryWhite(), yel = M.concrete('#e6d593', 13, 0.8), och = M.concrete('#c98a45', 14, 0.9), sgd = M.steelDark(), shut = M.plain('#ece3c4', 0.8);
    b.box(wh, x1, 0, -6.2, x1 + 0.2, H, -T, { uv: [1, H], uvw: true, solid: true });
    b.box(yel, x1, 1.05, zN, x1 + 0.2, H, -6.2, { uv: [2, 2], uvw: true }); b.box(och, x1 - 0.006, 0, zN, x1 + 0.2, 1.05, -6.2, { uv: [2, 2], uvw: true, solid: true });
    { // the window with its iron pattern, and the row of small louvres above
      const z0 = -3.9, z1 = -2.8;
      b.box(M.plain('#2c3a3a', 0.4), x1 - 0.004, 0.95, z0, x1, 2.05, z1, { cast: false });
      for (let z = z0; z <= z1 + 0.001; z += (z1 - z0) / 5) b.box(wt, x1 - 0.03, 0.95, z - 0.008, x1 - 0.014, 2.05, z + 0.008, { cast: false });
      for (const y of [0.95, 1.2, 1.5, 1.8, 2.05]) b.box(wt, x1 - 0.03, y - 0.008, z0, x1 - 0.014, y + 0.008, z1, { cast: false });
      for (const [za, zb] of [[z0 + 0.22, z0 + 0.44], [z1 - 0.44, z1 - 0.22]]) b.box(wt, x1 - 0.03, 1.2, za, x1 - 0.014, 1.5, za + 0.016, { cast: false }), b.box(wt, x1 - 0.03, 1.5, zb, x1 - 0.014, 1.8, zb + 0.016, { cast: false });
      for (let i = 0; i < 3; i++) b.box(M.plain('#55606a', 0.5), x1 - 0.004, 2.3, z0 + 0.05 + i * 0.37, x1, 2.52, z0 + 0.33 + i * 0.37, { cast: false });
      b.box(M.glass('#dfe8e6', 0.6), x1 - 0.012, 2.28, -1.75, x1, 2.62, -1.0, { cast: false }); for (const y of [2.28, 2.39, 2.5, 2.61]) b.box(wt, x1 - 0.02, y, -1.77, x1 - 0.008, y + 0.014, -0.98, { cast: false });
    }
    for (const [z, gate] of [[-5.8, true], [-9.3, false], [-13.2, false]]) {   // doors along the wall
      b.box(shut, x1 - 0.03, 0, z - 0.85, x1, 2.1, z, {});
      for (let y = 0.25; y < 2.0; y += 0.07) b.box(M.plain('#d8cfae', 0.8), x1 - 0.04, y, z - 0.79, x1 - 0.028, y + 0.04, z - 0.06, { cast: false });
      if (gate) { for (let zz = z - 0.86; zz <= z + 0.001; zz += 0.086) b.box(sgd, x1 - 0.075, 0.02, zz, x1 - 0.06, 2.08, zz + 0.014, { cast: false }); for (const y of [0.02, 1.0, 2.08]) b.box(sgd, x1 - 0.078, y, z - 0.86, x1 - 0.058, y + 0.02, z, { cast: false }); }
    }
    // the stairs: a landing let into the balustrade, parapets going down, the tall fins that screen them
    { const zs = -8.4, ze = -11.6;
      b.box(cc, x0 - 2.9, -0.12, ze, x0 - 0.2, 0, zs, { uv: [2, 2] });
      for (let i = 0; i < 9; i++) b.box(cc, x0 - 2.9, -0.12 - (i + 1) * 0.17, zs + i * 0.28, x0 - 1.6, -(i + 1) * 0.17, zs + (i + 1) * 0.28 + 0.02, { uv: [2, 2] });
      b.box(cc, x0 - 3.1, -1.6, zs - 0.1, x0 - 2.9, 1.0, ze, { uv: [2, 2] }); b.box(cc, x0 - 1.6, -1.7, zs, x0 - 1.42, 0.9, zs + 2.6, { uv: [2, 2] });
      for (let z = ze + 0.2; z < zs - 0.1; z += 0.3) b.box(cc, x0 - 3.08, 1.0, z, x0 - 2.94, H, z + 0.1, { uv: [2, 2] });
      b.box(cc, x0 - 3.1, H - 0.2, ze - 0.2, x0, H + 0.22, zs + 0.2, { uv: [2, 2] });
    }
    b.solid(x0 - 0.3, 0, -12.3, x1 + 0.3, 2, -12.1);
  }

  /* ── the rest of the block: the flats north of 507 behind that wall, the four floors below with their galleries ── */
  {
    const body = M.concrete('#cfc5a6', 21, 1), cc = M.concrete('#e2d9be', 11, 0.9);
    b.box(body, -T, -13.4, -T, XE, -0.16, ZS, { uv: [3, 3], uvw: true, cast: false });
    b.box(body, LA, -13.4, ZS, LB, -0.16, LOG.z1 + 0.14, { uv: [3, 3], uvw: true, cast: false });        // the loggias of the floors below
    b.box(body, COR.x1 + 0.2, -13.4, -5.5, PAR.x1 + T, H + 0.22, -T, { uv: [3, 3], uvw: true, cast: false });     // 506: its east wall in line with the parents'
    b.box(body, COR.x1 + 0.2, -13.4, -40, XE, H + 0.22, -5.5, { uv: [3, 3], uvw: true, cast: false });               // further north the block steps out again (video 4:29)
    for (let f = 1; f <= 4; f++) {
      b.box(cc, COR.x0 - 0.2, -f * 3.2 - 0.12, -40, COR.x1 + 0.2, -f * 3.2, -T, { uv: [2, 2], cast: false });
      b.box(cc, COR.x0 - 0.22, -f * 3.2 + 0.74, -40, COR.x0, -f * 3.2 + 0.9, -T, { uv: [2, 2], cast: false });
      b.box(cc, COR.x0 - 0.16, -f * 3.2, -40, COR.x0 - 0.04, -f * 3.2 + 0.74, -T, { uv: [2, 2], cast: false });
    }
    b.box(cc, COR.x0 - 0.2, -0.12, -40, COR.x1 + 0.2, 0, COR.z0, { uv: [2, 2], cast: false }); b.box(cc, COR.x0 - 0.22, 0, -40, COR.x0, 0.9, COR.z0, { uv: [2, 2], cast: false });
    b.box(M.plain('#f3f0e8', 1), COR.x0 - 0.3, H, -40, COR.x1 + 0.3, H + 0.22, COR.z0, { cast: false });
  }
}

/** The doors, each its own part. They stand open, as on the afternoon of the video; a later version can swing them.
 *  A leaf is built along +x from its hinge, so a leaf's turn is the compass way it points: 0 east, 90 south, 180 west, 270 north. */
export function buildDoors(scene, shared) {
  const mh = M.wood(MAHOG, 0.85);
  // D1, his door: hung on its east jamb (photo of 25/5/2013), swung right round into the room until it rests by the bookshelf
  part(scene, shared, b => { b.push(P.D1.b - 0.03, 0, 3.64, 36); doorLeaf(b, P.D1.b - P.D1.a - 0.1, P.D1.y1 - 0.05, mh, {}); b.solid(0, 0, -0.03, P.D1.b - P.D1.a - 0.1, 2, 0.03); b.pop(); }, 'door-d1', P.SURVEY);
  // D2, the parents' door: open, flat to the south wall
  part(scene, shared, b => { b.push(P.PAR.x0 + 0.01, 0, P.D2.b - 0.05, 5); doorLeaf(b, P.sz(P.D2.b) - P.sz(P.D2.a) - 0.1, P.D2.y1 - 0.05, mh, {}); b.pop(); }, 'door-d2', P.SURVEY);
  // the bathroom door: hinged on its east jamb, swung well open toward the east wall, so the window shows beside it (video 2:27)
  part(scene, shared, b => { b.push(P.WC_DOOR.b - 0.05, 0, 5.72, 48); doorLeaf(b, P.WC_DOOR.b - P.WC_DOOR.a - 0.1, P.WC_DOOR.y1 - 0.05, mh, {}); b.pop(); }, 'door-wc', P.SURVEY);
  // the main door: a narrow west leaf that stays shut (the rack stands before it) and the leaf with the handle, swung in
  part(scene, shared, b => {
    const d = P.MAIN_DOOR, wl = d.leaf - 0.055, wr = d.b - d.a - d.leaf - 0.055, rows = [[0.14, 0.72], [0.82, 1.4], [1.5, d.y1 - 0.2]];
    b.push(d.a + 0.055, 0, -T / 2, 0); doorLeaf(b, wl, d.y1 - 0.06, mh, { rows, cols: 1, handle: 'none' }); b.solid(0, 0, -0.03, wl, 2, 0.03); b.pop();
    b.push(d.b - 0.055, 0, 0.01, 92); doorLeaf(b, wr, d.y1 - 0.06, mh, { rows, cols: 2, handle: 'lever' }); b.solid(0, 0, -0.03, wr, 2, 0.03); b.pop();
  }, 'door-main', P.SURVEY);
  // the iron gate outside it, and the number
  const plate = plateTex(128, 64, (g, W, Hh) => {
    g.fillStyle = '#1d3f8f'; g.fillRect(0, 0, W, Hh); g.strokeStyle = '#e9edf5'; g.lineWidth = 5; g.strokeRect(5, 5, W - 10, Hh - 10);
    g.fillStyle = '#f2f4f8'; g.font = '700 44px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('507', W / 2, Hh / 2 + 3);
  });
  part(scene, shared, b => {
    const d = P.MAIN_DOOR, sg = M.plain('#8d968a', 0.6, 0.35), gw = (d.b - d.a) / 2, top = d.y1 - 0.05;
    const leaf = numbered => {
      for (const y of [0.03, 0.42, top - 0.04]) b.box(sg, 0, y, -0.012, gw, y + 0.035, 0.012);
      b.box(sg, 0, 0.03, -0.014, 0.03, top, 0.014); b.box(sg, gw - 0.03, 0.03, -0.014, gw, top, 0.014);
      for (let x = 0.055; x < gw - 0.04; x += 0.042) b.box(sg, x, 0.45, -0.006, x + 0.018, top - 0.04, 0.006);
      for (let y = 0.1; y < 0.4; y += 0.05) b.box(sg, 0.03, y, -0.006, gw - 0.03, y + 0.022, 0.006);
      if (numbered) b.quad(new THREE.MeshBasicMaterial({ map: plate }), '-z', gw - 0.17, 1.74, -0.017, 0.2, 0.1, { cast: false });
      b.solid(0, 0, -0.03, gw, 2, 0.03);
    };
    b.push(d.a, 0, -T - 0.02, 0); leaf(true); b.pop();         // west leaf: shut like the door's own narrow leaf, the number on it read from the gallery
    b.push(d.b, 0, -T - 0.02, 276); leaf(false); b.pop();      // east leaf: open, pointing up the gallery
  }, 'gate-507', P.SURVEY);
}
