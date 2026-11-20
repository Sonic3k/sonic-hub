/* His studio, upper floor, west face of the north wing: everything inside it, from the photographs of 21/9/2015
   (19:15, four of them: the bed, the dresser and TV, the kitchen past the bed) and the iPhone pictures of 19/8 (his
   breakfast at the counter), 30/8 (crabs at the kitchen sink), 18/9 (the room at night from the bed), 25/9 (the door
   open on the walkway). The frame here: u runs east from the front wall, v south from the north wall, y up from the
   floor (plan.js: IN, ROOM). */
import * as THREE from 'three';
import { M, canvasTex, plateTex, rng } from '../../engine/tex.js';
import { doorLeaf } from '../../engine/walls.js';
import { part } from '../../engine/kit.js';
import { curtain, papers, bottle } from '../../engine/furn.js';
import { X } from './mat.js';
import { ROOM, IN, CEIL, G2, flat, counterEdge } from './plan.js';

const D = () => ROOM.d, Wd = () => ROOM.w;
const BEIGE = '#d6c4a0', GREEN = '#667a3c';

/* ── small drawn things ── */
const printTex = () => plateTex(128, 192, (g, w, h) => {     // the hotel print: a red door frame standing in a garden
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2f4a24'); gr.addColorStop(0.45, '#4f6b3a'); gr.addColorStop(1, '#7c7a6a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const R = rng(5); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '40,80,30' : '120,150,80'},${R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h * 0.6, 2 + R() * 5, 0, 7); g.fill(); }
  g.fillStyle = '#9d8f78'; g.fillRect(0, h * 0.82, w, h * 0.18);
  g.fillStyle = '#c4271d'; g.fillRect(w * 0.26, h * 0.16, w * 0.12, h * 0.68); g.fillRect(w * 0.62, h * 0.16, w * 0.12, h * 0.68); g.fillRect(w * 0.2, h * 0.12, w * 0.6, h * 0.08);
  g.fillStyle = '#5c6b58'; g.fillRect(w * 0.38, h * 0.2, w * 0.24, h * 0.62);
});
const evacTex = () => plateTex(96, 128, (g, w, h) => { g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#a3281f'; g.fillRect(0, 0, w, 16); g.strokeStyle = '#333'; g.lineWidth = 1.2; g.strokeRect(12, 30, w - 24, h - 48); for (let i = 0; i < 6; i++) g.strokeRect(12 + i * (w - 24) / 6, 30, (w - 24) / 6, 26); g.fillStyle = '#c33'; g.beginPath(); g.arc(w * 0.62, 70, 4, 0, 7); g.fill(); });
const clockTex = () => plateTex(64, 24, (g, w, h) => { g.fillStyle = '#101010'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff2a1a'; g.font = 'bold 17px monospace'; g.textBaseline = 'middle'; g.fillText('7:15', 8, 13); });
const screenTex = () => plateTex(256, 160, (g, w, h) => {    // the laptop's lock screen of 2015: a dark field crossed by coloured ribbons
  g.fillStyle = '#16131f'; g.fillRect(0, 0, w, h);
  const cols = ['#e8463a', '#f4a32c', '#3fb06b', '#2d8de0', '#9b4fd1', '#e85a9b'];
  for (let i = 0; i < 6; i++) { g.strokeStyle = cols[i]; g.lineWidth = 7; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(-10, h * (0.2 + i * 0.11)); g.bezierCurveTo(w * 0.3, h * (0.9 - i * 0.08), w * 0.6, h * (0.1 + i * 0.05), w + 10, h * (0.5 + i * 0.06)); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#fff'; g.font = '300 34px sans-serif'; g.fillText('7:15', 16, h - 34); g.font = '12px sans-serif'; g.fillText('Monday, September 21', 18, h - 16);
});
const badgeTex = () => plateTex(96, 140, (g, w, h) => { g.fillStyle = '#f7f7f5'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f5fae'; g.fillRect(0, h - 28, w, 28); g.fillStyle = '#9fb5d4'; g.fillRect(26, 22, 44, 52); g.fillStyle = '#222'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillText('ANH', w / 2, 92); g.fillText('VU', w / 2, 105); g.font = '8px sans-serif'; g.fillText('9/25/2015 6:00 PM', w / 2, 14); });
const mirrorTex = () => plateTex(96, 160, (g, w, h) => {   // what the mirror shows: the green bed wall, a dark frame, a lamp, the nightstand
  g.fillStyle = '#cbb894'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w * 0.45, 0); gr.addColorStop(0, '#53682f'); gr.addColorStop(1, '#6f8540'); g.fillStyle = gr; g.fillRect(0, 0, w * 0.42, h);
  g.fillStyle = '#e8dcc0'; g.fillRect(w * 0.42, 0, w * 0.04, h);
  g.fillStyle = '#231a15'; g.fillRect(w * 0.6, h * 0.12, w * 0.13, h * 0.5); g.fillStyle = '#d9cfbb'; g.fillRect(w * 0.62, h * 0.15, w * 0.09, h * 0.44);
  const lg = g.createRadialGradient(w * 0.2, h * 0.45, 2, w * 0.2, h * 0.45, 22); lg.addColorStop(0, 'rgba(255,250,235,1)'); lg.addColorStop(0.4, 'rgba(255,240,205,0.85)'); lg.addColorStop(1, 'rgba(255,240,205,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f4f0e6'; g.fillRect(w * 0.12, h * 0.38, w * 0.15, h * 0.12);
  g.fillStyle = '#a8763e'; g.fillRect(0, h * 0.78, w * 0.4, h * 0.22); g.fillStyle = '#ece9e0'; g.fillRect(w * 0.08, h * 0.74, w * 0.16, h * 0.05);
  g.fillStyle = '#56585c'; g.fillRect(w * 0.55, h * 0.72, w * 0.28, h * 0.28);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 0, w, h);
});
const louvreIn = () => canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#e4dccb'; g.fillRect(0, 0, w, h); for (let x = 3; x < w; x += 5) { g.fillStyle = 'rgba(60,50,40,0.5)'; g.fillRect(x, 3, 2, h - 6); } }, { repeat: false });

export function buildRoom(scene, shared, ctx) {
  const parts = {};
  // where one walks: the studio's floor and the threshold of its door
  flat(ROOM.x0, ROOM.z0, ROOM.x1, ROOM.z1, G2);
  flat(ROOM.x0 - 0.25, ROOM.z0 + IN.door[0] + 0.05, ROOM.x0 + 0.05, ROOM.z0 + IN.door[1] - 0.05, G2);
  const g = part(scene, shared, (b) => {
    b.push(ROOM.x0, G2, ROOM.z0);
    const d = D(), w = Wd(), bu = IN.bath.u0, bv = IN.bath.v0, kv = IN.kitchen;
    const beige = X.roomWall(BEIGE), green = X.roomWall(GREEN), white = X.laminate(), oak = X.oak(), pine = X.pine();
    const plain = (c, r = 0.6, mt = 0) => M.plain(c, r, mt);

    /* floor, ceiling, the party walls, the bathroom box */
    b.box(X.conc('#9a958c', 4, false), 0, -0.28, 0, d, -0.012, w, {});
    b.box(X.carpet(), 0, -0.012, 0, bu, 0, w, { uv: [1, 1], uvw: true, cast: false });
    b.box(X.vinyl(), bu, -0.012, 0, d, 0.002, kv, { uv: [1.2, 1.2], uvw: true, grain: 'z', cast: false });
    b.box(X.carpet(), 0, -0.012, 0, bu, 0.0005, 0, { cast: false });
    b.box(M.plain('#7b6a52', 0.5), bu - 0.02, 0, 0, bu + 0.02, 0.006, kv, { cast: false });         // the metal strip where carpet meets vinyl
    b.box(X.ceiling(), 0, CEIL, 0, d, CEIL + 0.02, w, { uv: [1, 1], uvw: true, cast: false });
    b.box(beige, 0, 0, -0.16, d, CEIL + 0.3, 0, { solid: true });                                   // north party wall
    b.box(green, 0, 0, w, bu, CEIL + 0.3, w + 0.16, { solid: true });                               // south: the bed wall, green
    b.box(beige, bu, 0, w, d, CEIL + 0.3, w + 0.16, { solid: true });
    // skirting all round the main room
    for (const [u0, v0, u1, v1] of [[0.02, 0, d, 0.012], [0.02, w - 0.012, bu, w], [bu - 0.012, bv, bu, w]]) b.box(plain('#6b5440', 0.6), u0, 0, v0, u1, 0.09, v1, { cast: false });
    // the bathroom box: its west face (with the print) and its north face (with the door), to the ceiling
    b.box(beige, bu, 0, bv + 0.1, bu + 0.1, CEIL, w, { solid: true });
    b.box(beige, bu, 0, bv, IN.bathDoor[0], CEIL, bv + 0.1, { solid: true });
    b.box(beige, IN.bathDoor[1], 0, bv, d, CEIL, bv + 0.1, { solid: true });
    b.box(beige, IN.bathDoor[0], 2.03, bv, IN.bathDoor[1], CEIL, bv + 0.1, {});
    for (const [u0, u1] of [[IN.bathDoor[0] - 0.06, IN.bathDoor[0]], [IN.bathDoor[1], IN.bathDoor[1] + 0.06]]) b.box(plain('#efe8d8', 0.5), u0, 0, bv - 0.015, u1, 2.09, bv + 0.115, { cast: false });
    b.box(plain('#efe8d8', 0.5), IN.bathDoor[0] - 0.06, 2.03, bv - 0.015, IN.bathDoor[1] + 0.06, 2.09, bv + 0.115, { cast: false });
    // the casing of the entry door, inside
    const [dv0, dv1] = IN.door;
    for (const [v0, v1] of [[dv0 - 0.07, dv0], [dv1, dv1 + 0.07]]) b.box(plain('#efe8d8', 0.5), 0, 0, v0, 0.02, IN.doorH + 0.07, v1, { cast: false });
    b.box(plain('#efe8d8', 0.5), 0, IN.doorH, dv0 - 0.07, 0.02, IN.doorH + 0.07, dv1 + 0.07, { cast: false });

    /* the window: glass of the slider, the plaid curtains on their rod, the wall unit under the sill */
    const [wv0, wv1] = IN.win;
    b.box(M.glass('#c9d6dc', 0.18), -0.14, IN.sill + 0.04, wv0 + 0.04, -0.13, IN.head - 0.04, wv1 - 0.04, { cast: false });
    b.box(plain('#f3f2ee', 0.45), -0.13, IN.sill - 0.01, wv0, 0.02, IN.sill + 0.02, wv1, {});                      // the sill
    b.cyl(M.plain('#5a4632', 0.5, 0.4), 0.11, 2.36, wv0 - 0.32, 0.012, wv1 - wv0 + 0.62, { rx: 90, seg: 8, cast: false });
    for (const v of [wv0 - 0.3, wv1 + 0.3]) b.box(M.plain('#5a4632', 0.5, 0.4), 0, 2.33, v - 0.02, 0.13, 2.39, v + 0.02, { cast: false });
    parts.curtainsAt = { u: 0.1, v0: wv0 - 0.28, v1: wv1 + 0.3, y0: 0.78, y1: 2.34 };
    const ac = louvreIn();
    b.box(plain('#e6dfcf', 0.55), 0, 0.06, wv0 + 0.25, 0.25, 0.46, wv0 + 1.3, { solid: true });
    b.box(new THREE.MeshStandardMaterial({ map: ac, roughness: 0.7 }), 0.04, 0.46, wv0 + 0.32, 0.22, 0.465, wv0 + 1.23, { cast: false });
    b.box(plain('#cfc6b2', 0.5), 0.2, 0.25, wv0 + 1.12, 0.252, 0.4, wv0 + 1.25, { cast: false });

    /* the entry door's inside: the evacuation plan, the latch */
    parts.evac = new THREE.MeshBasicMaterial({ map: evacTex(), toneMapped: true });

    /* dresser, its lamp, the TV, the mirror and the wall lamp over the counter */
    const [du0, du1] = IN.dresser, dd = IN.dresserD, dh = IN.dresserH;
    b.box(pine, du0, 0.06, 0, du1, dh - 0.03, dd - 0.02, { uv: [1, 1], solid: true });
    b.box(pine, du0 - 0.015, dh - 0.03, -0.0, du1 + 0.015, dh, dd + 0.01, { uv: [1, 1] });
    b.box(pine, du0 + 0.02, 0, 0.03, du1 - 0.02, 0.06, dd - 0.06, { uv: [1, 1] });
    const dw = (du1 - du0) / 2, rowH = (dh - 0.12) / 2;
    for (let c = 0; c < 2; c++) for (let r = 0; r < 2; r++) {
      const x0 = du0 + c * dw + 0.012, x1 = du0 + (c + 1) * dw - 0.012, y0 = 0.08 + r * rowH + 0.008, y1 = 0.08 + (r + 1) * rowH - 0.008;
      b.box(pine, x0, y0, dd - 0.02, x1, y1, dd + 0.005, { uv: [1, 1], cast: false });
      b.box(pine, x0 + 0.025, y0 + 0.025, dd + 0.005, x1 - 0.025, y1 - 0.025, dd + 0.011, { uv: [1, 1], cast: false });
      for (const f of [0.28, 0.72]) b.sphere(plain('#1c1714', 0.4, 0.5), x0 + (x1 - x0) * f, (y0 + y1) / 2, dd + 0.025, 0.017, { seg: 8, cast: false });
    }
    // the table lamp: a teal glazed jar, a white drum shade
    const lu = du0 + 0.2, lv = 0.24;
    b.cyl(M.plain('#4f7d77', 0.35), lu, dh, lv, 0.07, 0.04, { seg: 16 });
    b.cyl(M.plain('#4f7d77', 0.35), lu, dh + 0.04, lv, 0.08, 0.2, { seg: 16, r2: 0.105 });
    b.cyl(M.plain('#4f7d77', 0.35), lu, dh + 0.24, lv, 0.105, 0.12, { seg: 16, r2: 0.06 });
    b.cyl(M.plain('#c8c8c4', 0.3, 0.8), lu, dh + 0.36, lv, 0.008, 0.12, { seg: 6 });
    b.cyl(ctx.lampMat('#fff1d6', 1.6, 0.97, 0.05), lu, dh + 0.43, lv, 0.2, 0.3, { seg: 24, r2: 0.18, open: true });
    // the TV: an LG of 32 in on a round foot, a little east of the middle
    const tu = du0 + 0.83, tv = 0.22;
    b.cyl(X.black(), tu, dh, tv, 0.13, 0.025, { seg: 20 });
    b.box(X.black(), tu - 0.03, dh + 0.02, tv - 0.02, tu + 0.03, dh + 0.12, tv + 0.02, {});
    b.box(X.black(), tu - 0.395, dh + 0.09, tv - 0.045, tu + 0.395, dh + 0.61, tv + 0.035, { solid: false });
    parts.tvAt = { u: tu, v: tv + 0.036, y: dh + 0.35 };
    b.box(M.plain('#b9bcc0', 0.3, 0.8), tu - 0.02, dh + 0.105, tv + 0.036, tu + 0.02, dh + 0.115, tv + 0.037, { cast: false });
    // things on the dresser: a book or two, papers, the box of rice crackers
    papers(b, du0 + 0.48, dh, 0.3, 0.2, 0.14, 0.03, 3, ['#d33a2a', '#f0d24a', '#ebe7dc']);
    papers(b, du1 - 0.22, dh, 0.33, 0.22, 0.3, 0.025, 5);
    b.box(M.plain('#f1c419', 0.6), du0 + 0.35, dh, 0.36, du0 + 0.55, dh + 0.012, 0.44, { cast: false });
    // the mirror: a pale wooden frame with an arched crown
    const [mu0, mu1] = IN.mirror, my0 = 1.06, my1 = 1.98;
    b.box(oak, mu0, my0, 0, mu1, my1, 0.03, { uv: [1, 1], grain: 'y' });
    b.box(M.plain('#c7d2d6', 0.04, 1), mu0 + 0.055, my0 + 0.055, 0.03, mu1 - 0.055, my1 - 0.055, 0.032, { cast: false });
    b.quad(new THREE.MeshStandardMaterial({ map: mirrorTex(), roughness: 0.08, metalness: 0.15, envMapIntensity: 0.6 }), '+z', (mu0 + mu1) / 2, (my0 + my1) / 2, 0.0345, mu1 - mu0 - 0.11, my1 - my0 - 0.11, { cast: false });
    for (let i = 0; i < 8; i++) { const a0 = mu0 - 0.03 + (mu1 - mu0 + 0.06) * i / 8, a1 = mu0 - 0.03 + (mu1 - mu0 + 0.06) * (i + 1) / 8, t = (i + 0.5) / 8; b.box(oak, a0, my1, -0.005, a1, my1 + 0.03 + Math.sin(t * Math.PI) * 0.07, 0.045, { uv: [1, 1] }); }
    b.box(M.plain('#f2efe6', 0.5), mu0 + 0.24, 2.2, 0, mu0 + 0.36, 2.34, 0.012, { cast: false });                      // the bell of the fire alarm over it
    // swing-arm lamps: one over the counter, two by the bed
    const swing = (u, v, y, dir) => {                                                                                    // dir: which way the wall faces (+1 south, -1 north)
      b.box(M.plain('#4f6650', 0.5, 0.5), u - 0.045, y - 0.12, v, u + 0.045, y + 0.06, v + dir * 0.02, {});
      b.box(M.plain('#4f6650', 0.5, 0.5), u - 0.012, 0.25, v, u + 0.012, y - 0.12, v + dir * 0.014, { cast: false });   // the cord cover down to the outlet
      b.bar(M.plain('#b49447', 0.3, 0.9), u, y, v + dir * 0.03, u + 0.24, y + 0.02, v + dir * 0.3, 0.012, { round: true, seg: 6, cast: false });
      b.cyl(ctx.lampMat('#fff2da', 1.6, 0.97, 0.05), u + 0.24, y - 0.02, v + dir * 0.3, 0.12, 0.2, { seg: 20, r2: 0.11, open: true });
    };
    swing(2.98, 0, 1.55, 1);
    // the thermostat and the panel by the counter
    b.box(M.plain('#f3f1ec', 0.5), 3.42, 1.42, 0, 3.56, 1.54, 0.025, { cast: false });
    b.box(M.plain('#ece8de', 0.6), 3.62, 1.25, 0, 3.92, 1.8, 0.02, { cast: false });

    /* the counter along the north wall, from the mirror to the kitchen: white laminate on an oak edge, deeper at its
       east end where a curved bracket holds it; two high chairs at it, facing the wall */
    const C = IN.counter, N = 14, edge = [];
    for (let i = 0; i <= N; i++) { const u = C.u1 - 0.22 - (C.u1 - 0.22 - C.u0) * i / N; edge.push([u, counterEdge(u)]); }
    const top = new THREE.Shape(); { const r = 0.22; top.moveTo(C.u0, 0); top.lineTo(C.u1, 0); top.lineTo(C.u1, C.v1 - r); top.absarc(C.u1 - r, C.v1 - r, r, 0, Math.PI / 2, false); for (const [u, v] of edge) top.lineTo(u, v); top.lineTo(C.u0, 0); }
    const tg = new THREE.ExtrudeGeometry(top, { depth: 0.035, bevelEnabled: false, curveSegments: 8 }); tg.rotateX(Math.PI / 2); tg.translate(0, C.h, 0);
    b.geo(white, tg);
    for (let i = 0; i < edge.length - 1; i++) { const [ua, va] = edge[i], [ub, vb] = edge[i + 1], len = Math.hypot(ub - ua, vb - va), ang = Math.atan2(vb - va, ub - ua) * 180 / Math.PI; b.rbox(oak, (ua + ub) / 2, C.h - 0.055, (va + vb) / 2 + 0.005, len + 0.01, 0.035, 0.012, ang, { cast: false }); }
    b.box(oak, C.u1 - 0.012, C.h - 0.07, 0.02, C.u1 + 0.002, C.h - 0.035, C.v1 - 0.22, { cast: false });
    b.box(white, C.u0, 0, 0, C.u0 + 0.025, C.h - 0.035, C.v0 - 0.04, { solid: true });                              // its west end panel
    b.box(white, C.u0 + 0.025, C.h - 0.17, C.v0 - 0.06, C.u1 - 0.3, C.h - 0.035, C.v0 - 0.04, { cast: false });      // the apron
    for (let i = 0; i < 7; i++) { const t = i / 7, y = C.h - 0.04 - Math.sin(t * Math.PI / 2) * 0.34; b.box(white, C.u1 - 0.42 + t * 0.02, y - 0.035, 0.02 + t * (C.v1 - 0.3), C.u1 - 0.38 + t * 0.02, y, 0.06 + t * (C.v1 - 0.3), { cast: false }); }
    b.box(white, C.u1 - 0.42, 0.0, 0.0, C.u1 - 0.38, C.h - 0.36, 0.08, {});
    b.solid(C.u0, 0, 0, C.u1, C.h, C.v0); b.solid(C.u0 + 0.6, 0, 0, C.u1, C.h, C.v1 - 0.1);
    const chair = (u, v, face, jacket) => {
      b.push(u, 0, v, face);
      const lg = M.plain('#2a1d16', 0.5), lea = X.leather(), sh = 0.64, bh = 1.08;
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) b.box(lg, x - 0.02, 0, z - 0.02, x + 0.02, sh - 0.04, z + 0.02, {});
      for (const z of [-0.19, 0.19]) b.box(lg, -0.19, 0.24, z - 0.012, 0.19, 0.26, z + 0.012, { cast: false });
      b.box(lg, -0.19, 0.24, -0.19, -0.17, 0.26, 0.19, { cast: false });
      b.box(lea, -0.22, sh - 0.06, -0.22, 0.22, sh + 0.02, 0.22, { uv: [0.5, 0.5] });
      b.box(lea, -0.2, sh + 0.02, 0.18, 0.2, bh, 0.24, { uv: [0.5, 0.5] });
      if (jacket) { b.box(M.plain('#7f8486', 0.95), -0.23, sh - 0.15, 0.17, 0.23, bh + 0.02, 0.26, {}); b.box(M.plain('#7f8486', 0.95), -0.2, bh - 0.08, 0.05, 0.2, bh + 0.03, 0.26, { cast: false }); b.box(M.plain('#e6e7e8', 0.9), -0.05, sh, 0.255, 0.05, bh - 0.1, 0.262, { cast: false }); }
      b.pop();
      b.solid(u - 0.24, 0, v - 0.24, u + 0.24, 0.66, v + 0.24);
    };
    chair(2.72, counterEdge(2.72) + 0.32, 0, true);      // facing the counter (north), his grey jacket over its back
    chair(3.42, counterEdge(3.42) + 0.34, 350, false);
    // on the counter: the laptop (open, facing the chair), the gallon of water, a red flask, bottles, the badge, a mug, papers
    const lu0 = 2.82, lv0 = 0.33;
    b.push(lu0, C.h, lv0, 180);
    b.box(M.plain('#1d1f22', 0.4, 0.3), -0.18, 0, -0.12, 0.18, 0.018, 0.12, {});
    b.box(M.plain('#3b3e43', 0.5), -0.165, 0.018, -0.1, 0.165, 0.02, 0.03, { cast: false });
    b.push(0, 0.018, 0.12, 0); b.rbox(M.plain('#1d1f22', 0.4, 0.3), 0, 0.12, 0.03, 0.36, 0.24, 0.012, 0, { rx: 18 }); b.pop();
    b.pop();
    parts.screenAt = { u: lu0, v: lv0 - 0.135, y: C.h + 0.13, face: 'south' };
    b.cyl(M.glass('#e9f0f2', 0.55), 3.78, C.h, 0.22, 0.08, 0.27, { seg: 14 });
    b.cyl(M.plain('#2f6fd6', 0.4), 3.78, C.h + 0.27, 0.22, 0.025, 0.03, { seg: 10 });
    b.cyl(M.plain('#d8361f', 0.35), 3.9, C.h, 0.45, 0.055, 0.24, { seg: 14 }); b.cyl(M.plain('#f3f1ea', 0.4), 3.9, C.h + 0.24, 0.45, 0.035, 0.05, { seg: 10 });
    bottle(b, '#cfe6f5', 3.25, C.h, 0.12, 0.033, 0.24, '#1d5fb8');
    bottle(b, '#d7ecd9', 3.35, C.h, 0.1, 0.03, 0.2, '#2f8a3e');
    b.cyl(M.plain('#f4f2ec', 0.3), 2.5, C.h, 0.2, 0.04, 0.09, { seg: 12 });
    papers(b, 3.15, C.h, 0.5, 0.28, 0.21, 0.012, 11);
    b.box(M.plain('#e9e3cf', 0.6), 2.48, C.h, 0.36, 2.6, C.h + 0.06, 0.48, {});                                        // the lemon tea box
    parts.badgeAt = { u: 3.45, v: 0.7, y: C.h + 0.005 };
    // the backpack under the mirror, by the counter
    b.push(IN.mirror[0] + 0.1, 0, 0.12, 0); b.box(M.plain('#1c1d20', 0.85), 0, 0, 0, 0.3, 0.46, 0.2, {}); b.box(M.plain('#26282c', 0.85), 0.04, 0.05, 0.2, 0.26, 0.3, 0.27, {}); b.pop();

    /* the bed: queen, head on the green south wall, a dark headboard with two tan panels, white duvet, tan runner */
    const B = IN.bed, bu0 = B.u0, bu1 = B.u0 + B.w, bv1 = w - 0.03, bv0 = bv1 - B.l;
    const esp = X.espresso();
    b.box(esp, bu0 - 0.06, 0, w - 0.05, bu1 + 0.06, 1.42, w - 0.0, { uv: [1, 1] });
    for (const [a0, a1] of [[bu0 + 0.02, bu0 + B.w / 2 - 0.04], [bu0 + B.w / 2 + 0.04, bu1 - 0.02]]) b.box(M.plain('#c4955e', 0.75), a0, 0.68, w - 0.065, a1, 1.34, w - 0.05, { cast: false });
    b.box(M.plain('#4b3a2d', 0.9), bu0, 0.0, bv0, bu1, 0.36, bv1, { solid: true });                                   // the skirt
    b.box(M.plain('#ece9e2', 0.9), bu0 + 0.01, 0.36, bv0 + 0.01, bu1 - 0.01, 0.58, bv1 - 0.01, { cast: false });       // mattress
    const q = X.quilt();
    b.box(q, bu0 - 0.035, 0.52, bv0 - 0.035, bu1 + 0.035, 0.635, bv1 - 0.32, { uv: [0.5, 0.5] });
    b.box(q, bu0 - 0.035, 0.2, bv0 - 0.035, bu1 + 0.035, 0.52, bv0, { uv: [0.5, 0.5], cast: false });                 // the drop at the foot
    for (const u of [bu0 - 0.035, bu1]) b.box(q, u, 0.2, bv0 - 0.035, u + 0.035, 0.6, bv1 - 0.32, { uv: [0.5, 0.5], cast: false });
    const rn = X.runner();
    b.box(rn, bu0 - 0.04, 0.6, bv0 + 0.32, bu1 + 0.04, 0.645, bv0 + 1.0, { uv: [B.w + 0.1, 0.68], cast: false });
    for (const u of [bu0 - 0.045, bu1 + 0.005]) b.box(rn, u, 0.28, bv0 + 0.32, u + 0.04, 0.645, bv0 + 1.0, { uv: [0.68, 0.68], cast: false });
    b.box(q, bu0 + 0.0, 0.6, bv1 - 0.36, bu1, 0.66, bv1 - 0.22, { uv: [0.5, 0.5], cast: false });                     // the fold at the head
    const pil = M.plain('#f6f5f1', 0.9);
    for (const [u, v, s] of [[bu0 + 0.4, bv1 - 0.18, 1], [bu1 - 0.4, bv1 - 0.18, 1], [bu0 + 0.55, bv1 - 0.42, 0.9], [bu1 - 0.45, bv1 - 0.45, 0.9]]) b.sphere(pil, u, 0.7 + (s < 1 ? 0.0 : 0.08), v, 0.5, { sx: 0.62 * s, sy: 0.2, sz: 0.36 * s, seg: 14 });
    b.solid(bu0, 0, bv0, bu1, 0.62, bv1);
    // the nightstand east of the bed: pine, a drawer, a shelf; the phone, the clock, the remote
    const [nu0, nu1] = IN.stand, nv0 = w - 0.5, nh = 0.62;
    b.box(pine, nu0, 0.0, nv0, nu1, nh, w - 0.01, { uv: [1, 1], solid: true });
    b.box(pine, nu0 + 0.02, 0.06, nv0 - 0.01, nu1 - 0.02, 0.36, nv0 + 0.42, { uv: [1, 1], cast: false });
    b.box(M.plain('#2b1b10', 0.9), nu0 + 0.03, 0.07, nv0 - 0.012, nu1 - 0.03, 0.34, nv0 + 0.4, { cast: false });
    papers(b, (nu0 + nu1) / 2, 0.075, nv0 + 0.2, 0.3, 0.22, 0.05, 21, ['#3b4a6a', '#c9b48a', '#8a2f2a']);
    b.box(pine, nu0 + 0.02, 0.38, nv0 - 0.015, nu1 - 0.02, 0.58, nv0, { uv: [1, 1], cast: false });
    b.sphere(M.plain('#3a2416', 0.4), (nu0 + nu1) / 2, 0.48, nv0 - 0.025, 0.02, { seg: 8, cast: false });
    b.box(M.plain('#f1efea', 0.4), nu0 + 0.06, nh, nv0 + 0.06, nu0 + 0.25, nh + 0.06, nv0 + 0.26, {});                  // the phone
    b.box(M.plain('#f1efea', 0.4), nu0 + 0.08, nh + 0.06, nv0 + 0.06, nu0 + 0.11, nh + 0.1, nv0 + 0.26, {});
    b.box(M.plain('#121212', 0.4), nu0 + 0.3, nh, nv0 + 0.12, nu0 + 0.46, nh + 0.07, nv0 + 0.2, {});                    // the clock
    b.quad(M.screen(clockTex()), '-z', nu0 + 0.38, nh + 0.035, nv0 + 0.119, 0.12, 0.045, { cast: false });
    b.box(M.plain('#1a1a1a', 0.5), nu0 + 0.12, nh, nv0 + 0.32, nu0 + 0.32, nh + 0.02, nv0 + 0.36, { cast: false });
    swing(nu0 - 0.04, w, 1.2, -1);
    swing(bu0 - 0.22, w, 1.2, -1);
    // the recliner by the window, turned toward the TV; his shoes and a carton by the wall
    b.push(0.95, 0, 3.45, 30);
    const lea = X.leather();
    b.box(lea, -0.42, 0.08, -0.42, 0.42, 0.46, 0.42, { uv: [0.5, 0.5] });
    b.box(lea, -0.36, 0.46, -0.34, 0.36, 0.55, 0.32, { uv: [0.5, 0.5] });
    b.box(lea, -0.42, 0.08, 0.3, 0.42, 1.02, 0.46, { uv: [0.5, 0.5] });
    for (const x of [-0.44, 0.3]) b.box(lea, x, 0.08, -0.4, x + 0.14, 0.68, 0.42, { uv: [0.5, 0.5] });
    b.box(M.plain('#1d130f', 0.6), -0.4, 0, -0.4, 0.4, 0.08, 0.4, { cast: false });
    b.pop();
    b.solid(0.45, 0, 2.95, 1.45, 0.6, 3.95);
    b.box(M.plain('#a7835a', 0.9), 0.3, 0, 3.75, 0.72, 0.36, 4.07, {});                                                 // the carton
    for (const [u, v, c] of [[1.45, 3.92, '#1e5ba8'], [1.58, 3.95, '#1e5ba8'], [0.9, 2.62, '#26272b'], [1.0, 2.66, '#26272b']]) b.rbox(M.plain(c, 0.7), u, 0.045, v, 0.11, 0.09, 0.28, 12);

    /* the print on the bathroom box */
    const pv = (bv + 0.1 + w) / 2, py = 1.55;
    b.box(M.plain('#1f1712', 0.5), bu - 0.035, py - 0.48, pv - 0.33, bu, py + 0.48, pv + 0.33, {});
    b.box(M.plain('#f1ede2', 0.8), bu - 0.04, py - 0.42, pv - 0.27, bu - 0.035, py + 0.42, pv + 0.27, { cast: false });
    b.quad(new THREE.MeshStandardMaterial({ map: printTex(), roughness: 0.6 }), '-x', bu - 0.042, py + 0.03, pv, 0.34, 0.54, { cast: false });
    b.box(M.plain('#f4f3ee', 0.4), bu - 0.012, 1.15, bv + 0.1 + 0.08, bu, 1.27, bv + 0.1 + 0.15, { cast: false });           // the switch by the bathroom door

    /* the kitchenette in the north-east corner */
    const fr = IN.fridge, fu0 = d - 0.68;
    b.box(M.plain('#f3f3f0', 0.35), fu0, 0.02, fr[0] + 0.02, d - 0.02, 1.47, fr[1], { solid: true });
    b.box(M.plain('#e4e4df', 0.4), fu0 - 0.005, 1.0, fr[0] + 0.03, fu0, 1.012, fr[1] - 0.01, { cast: false });            // the line between freezer and fridge
    for (const [y0, y1] of [[1.08, 1.38], [0.6, 0.94]]) b.box(M.plain('#d8d8d2', 0.35), fu0 - 0.035, y0, fr[1] - 0.06, fu0 - 0.005, y1, fr[1] - 0.035, { cast: false });
    b.box(M.plain('#8f9296', 0.4, 0.5), fu0 - 0.004, 1.38, fr[0] + 0.08, fu0, 1.42, fr[0] + 0.2, { cast: false });
    const k0 = fr[1] + 0.02, k1 = kv, cd = 0.6, ch = 0.91;
    b.box(white, d - cd, 0.1, k0, d, ch - 0.035, k1, { solid: true });
    b.box(M.plain('#2a2522', 0.8), d - cd + 0.06, 0, k0, d, 0.1, k1, { cast: false });
    b.box(white, d - cd - 0.03, ch - 0.035, k0 - 0.0, d, ch, k1, {});                                                   // the top
    const doors = 3, dvw = (k1 - k0) / doors;
    for (let i = 0; i < doors; i++) {
      const v0 = k0 + i * dvw + 0.006, v1 = k0 + (i + 1) * dvw - 0.006;
      if (i === doors - 1) { for (const [y0, y1] of [[0.12, 0.47], [0.49, 0.82]]) { b.box(white, d - cd - 0.02, y0, v0, d - cd, y1, v1, { cast: false }); b.box(oak, d - cd - 0.03, y1 - 0.04, v0 + 0.02, d - cd - 0.02, y1, v1 - 0.02, { cast: false }); } }
      else { b.box(white, d - cd - 0.02, 0.12, v0, d - cd, 0.82, v1, { cast: false }); b.box(oak, d - cd - 0.03, 0.78, v0 + 0.02, d - cd - 0.02, 0.82, v1 - 0.02, { cast: false }); }
    }
    // the sink, its faucet; the two coils; the backsplash, the upper cabinets with the microwave and the hood under them
    const sv = k0 + 0.42;
    b.box(X.steel(), d - cd + 0.06, ch - 0.002, sv - 0.25, d - 0.08, ch + 0.003, sv + 0.25, { cast: false });
    b.box(M.plain('#7d8287', 0.3, 0.8), d - cd + 0.1, ch - 0.16, sv - 0.21, d - 0.12, ch - 0.0, sv + 0.21, { cast: false });
    b.cyl(X.steel(), d - 0.1, ch, sv, 0.02, 0.24, { seg: 10, cast: false }); b.bar(X.steel(), d - 0.1, ch + 0.24, sv, d - 0.3, ch + 0.22, sv, 0.022, { round: true, seg: 8, cast: false });
    b.bar(X.steel(), d - 0.12, ch + 0.25, sv + 0.06, d - 0.2, ch + 0.25, sv + 0.13, 0.012, { round: true, seg: 6, cast: false });
    const hv0 = k1 - 0.5, hv1 = k1 - 0.04;
    b.box(M.plain('#efeee8', 0.3), d - cd + 0.04, ch, hv0, d - 0.04, ch + 0.012, hv1, { cast: false });
    for (const [uu, rr] of [[d - cd + 0.18, 0.085], [d - 0.2, 0.075]]) { b.geo(M.plain('#1a1a1a', 0.5, 0.3), new THREE.TorusGeometry(rr, 0.012, 6, 24).rotateX(Math.PI / 2).translate(uu, ch + 0.018, (hv0 + hv1) / 2), { cast: false }); b.geo(M.plain('#1a1a1a', 0.5, 0.3), new THREE.TorusGeometry(rr * 0.55, 0.01, 6, 18).rotateX(Math.PI / 2).translate(uu, ch + 0.018, (hv0 + hv1) / 2), { cast: false }); }
    for (const vv of [hv0 + 0.12, hv0 + 0.3]) b.cyl(M.plain('#ddd', 0.4), d - cd - 0.005, ch - 0.06, vv, 0.018, 0.02, { rx: 90, seg: 10, cast: false });
    // a pot on the back coil
    b.cyl(X.steel(), d - 0.2, ch + 0.03, (hv0 + hv1) / 2, 0.1, 0.12, { seg: 18 }); b.cyl(M.glass('#d9e4e8', 0.4), d - 0.2, ch + 0.15, (hv0 + hv1) / 2, 0.105, 0.012, { seg: 18 }); b.bar(M.plain('#222', 0.5), d - 0.3, ch + 0.13, (hv0 + hv1) / 2, d - 0.42, ch + 0.13, (hv0 + hv1) / 2, 0.02, { cast: false });
    b.box(M.plain('#f6f5f0', 0.3), d - 0.012, ch, k0, d, 1.78, k1, { cast: false });
    b.box(M.plain('#f1efe9', 0.4), d - 0.014, 1.12, sv + 0.4, d - 0.01, 1.2, sv + 0.47, { cast: false });                 // an outlet
    const uy0 = 1.78, uy1 = 2.45, ud = 0.34;
    b.box(white, d - ud, uy0, k0, d, uy1, k1, { solid: false });
    for (let i = 0; i < 4; i++) { const v0 = k0 + i * (k1 - k0) / 4 + 0.006, v1 = k0 + (i + 1) * (k1 - k0) / 4 - 0.006; b.box(white, d - ud - 0.02, uy0 + 0.01, v0, d - ud, uy1 - 0.01, v1, { cast: false }); b.box(oak, d - ud - 0.03, uy0 + 0.01, v0 + 0.02, d - ud - 0.02, uy0 + 0.05, v1 - 0.02, { cast: false }); }
    b.box(M.plain('#f0efe9', 0.35), d - 0.36, uy0 - 0.3, k0 + 0.06, d - 0.02, uy0 - 0.005, k0 + 0.56, {});                    // microwave
    b.box(M.plain('#2b2e30', 0.15, 0.2), d - 0.365, uy0 - 0.26, k0 + 0.08, d - 0.36, uy0 - 0.05, k0 + 0.4, { cast: false });
    b.box(M.plain('#f0efe9', 0.35), d - 0.48, uy0 - 0.16, hv0 - 0.04, d - 0.02, uy0 - 0.005, hv1 + 0.02, {});                 // the hood
    b.box(M.plain('#c9c9c4', 0.4, 0.4), d - 0.48, uy0 - 0.162, hv0, d - 0.1, uy0 - 0.158, hv1 - 0.02, { cast: false });
    // a rack of drying dishes, a gallon by the sink
    for (let i = 0; i < 4; i++) b.cyl(M.plain('#f4f4f1', 0.3), d - cd + 0.25, ch + 0.03, k0 + 0.1 + i * 0.03, 0.11, 0.012, { rx: 90, seg: 18, cast: false });
    // the fluorescent tube over the kitchen
    b.box(M.plain('#f1efe8', 0.5), 5.36, CEIL - 0.07, 0.42, 5.66, CEIL, 1.68, {});
    b.box(ctx.lampMat('#f4f8ff', 2.4, 0.95, 0.06), 5.38, CEIL - 0.072, 0.44, 5.64, CEIL - 0.068, 1.66, { cast: false });
    // the air diffusers and the smoke alarm in the ceiling
    for (const [u, v] of [[2.05, 2.1], [4.05, 0.85]]) { b.box(M.plain('#e9e6dc', 0.5), u - 0.2, CEIL - 0.015, v - 0.2, u + 0.2, CEIL, v + 0.2, { cast: false }); for (let i = 0; i < 4; i++) b.box(M.plain('#55524b', 0.6), u - 0.15 + i * 0.1, CEIL - 0.017, v - 0.15, u - 0.12 + i * 0.1, CEIL - 0.015, v + 0.15, { cast: false }); }
    b.cyl(M.plain('#f3f2ee', 0.5), 4.3, CEIL - 0.04, 1.9, 0.07, 0.04, { seg: 14, cast: false });

    /* inside the bathroom: a tub against the back wall, the toilet on the south wall, the vanity on the west */
    const iu0 = bu + 0.1, iv0 = bv + 0.1;
    b.box(M.whiteTile(), iu0, -0.01, iv0, d, 0.003, w, { uv: [0.8, 0.8], uvw: true, cast: false });
    b.box(M.plain('#f4f3ef', 0.25), d - 0.78, 0, iv0, d, 0.5, iv0 + 1.52, { solid: true });
    b.box(M.plain('#e9e8e2', 0.2), d - 0.7, 0.2, iv0 + 0.08, d - 0.08, 0.505, iv0 + 1.44, { cast: false });
    b.box(M.whiteTile(), d - 0.012, 0.5, iv0, d, 1.95, iv0 + 1.52, { uv: [0.8, 0.8], uvw: true, cast: false });
    b.cyl(X.steel(), d - 0.8, 1.98, iv0, 0.012, 1.52, { rx: -90, seg: 8, cast: false });
    b.box(M.plain('#e9e4d6', 0.95), d - 0.8, 0.55, iv0 + 0.02, d - 0.79, 1.96, iv0 + 0.62, { cast: false });
    // the toilet
    b.push(5.62, 0, w - 0.02, 180);
    const por = M.plain('#f5f5f2', 0.2);
    b.cyl(por, 0, 0, 0.36, 0.13, 0.38, { seg: 16, r2: 0.17 }); b.sphere(por, 0, 0.38, 0.4, 1, { sx: 0.2, sy: 0.05, sz: 0.26, seg: 16 });
    b.box(por, -0.2, 0.38, 0.0, 0.2, 0.78, 0.2, {}); b.box(por, -0.21, 0.78, -0.01, 0.21, 0.81, 0.21, {});
    b.pop(); b.solid(5.4, 0, w - 0.72, 5.84, 0.8, w);
    // the vanity and its mirror and light
    b.box(M.plain('#e9e2d2', 0.5), iu0, 0, iv0 + 0.75, iu0 + 0.52, 0.82, w - 0.02, { solid: true });
    b.box(M.plain('#f2efe7', 0.25), iu0, 0.82, iv0 + 0.73, iu0 + 0.56, 0.86, w, {});
    b.cyl(M.plain('#fafaf7', 0.15), iu0 + 0.27, 0.8, (iv0 + 0.75 + w) / 2, 0.17, 0.065, { seg: 18, cast: false });
    b.box(M.plain('#cbd5d9', 0.04, 1), iu0, 1.1, iv0 + 0.8, iu0 + 0.012, 1.85, w - 0.08, { cast: false });
    b.box(ctx.lampMat('#fff5e6', 1.8, 0.95, 0.04), iu0 + 0.02, 1.95, iv0 + 0.9, iu0 + 0.1, 2.03, w - 0.18, { cast: false });
    // towels on a bar on the north wall's inside
    b.cyl(X.steel(), 5.6, 1.35, iv0 + 0.02, 0.01, 0.55, { rz: 90, seg: 6, cast: false });
    b.box(M.plain('#f7f6f2', 0.95), 5.62, 0.95, iv0 + 0.0, 6.12, 1.37, iv0 + 0.06, { cast: false });
    b.pop();
  }, 'room');

  /* the doors that open and shut: the entry (hinged at the north jamb, swinging in) and the bathroom's (west jamb, out) */
  const doorMat = M.plain('#4f4842', 0.55);
  const hinge = (x, z, ry, build) => { const pv = new THREE.Group(); pv.position.set(x, G2, z); pv.rotation.y = -ry * Math.PI / 180; const leaf = part(pv, null, build, 'leaf'); scene.add(pv); return pv; };
  const entry = hinge(ROOM.x0 - 0.09, ROOM.z0 + IN.door[0], 90, b => {
    doorLeaf(b, 0.9, IN.doorH - 0.01, doorMat, { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' });
    b.box(M.plain('#2b2b2b', 0.4, 0.6), 0.76, 0.95, -0.035, 0.85, 1.18, 0.035, { cast: false });                     // the card lock
    b.box(M.plain('#c9ccd0', 0.3, 0.9), 0.72, 1.32, -0.045, 0.82, 1.36, -0.03, { cast: false });                     // the swing bar of the latch
    b.quad(parts.evac, '-z', 0.45, 1.45, -0.031, 0.2, 0.27, { cast: false });
    b.cyl(M.plain('#c9ccd0', 0.3, 0.9), 0.45, 1.52, -0.03, 0.008, 0.01, { rx: 90, seg: 8, cast: false });           // the peephole
  });
  const bath = hinge(ROOM.x0 + IN.bathDoor[0], ROOM.z0 + IN.bath.v0 + 0.05, 0, b => doorLeaf(b, IN.bathDoor[1] - IN.bathDoor[0] - 0.01, 2.02, M.plain('#ece4d2', 0.5), { rows: [[0.12, 0.72], [0.82, 1.55], [1.65, 1.93]], cols: 2, handle: 'lever' }));

  /* curtains: open by day, drawn at night (as in every photograph after dark) */
  const ca = parts.curtainsAt, cmat = X.plaid();
  const curtains = { open: part(scene, null, b => { b.push(ROOM.x0, G2, ROOM.z0); curtain(b, cmat, ca.v0, ca.v0 + 0.62, ca.y0, ca.y1, 0, { folds: 9, depth: 0.05 }); curtain(b, cmat, ca.v1 - 0.62, ca.v1, ca.y0, ca.y1, 0, { folds: 9, depth: 0.05 }); b.pop(); }, 'curtainsOpen'), shut: part(scene, null, b => { b.push(ROOM.x0, G2, ROOM.z0); curtain(b, cmat, ca.v0, (ca.v0 + ca.v1) / 2 + 0.02, ca.y0, ca.y1, 0, { folds: 14, depth: 0.035 }); curtain(b, cmat, (ca.v0 + ca.v1) / 2 - 0.02, ca.v1, ca.y0, ca.y1, 0, { folds: 14, depth: 0.035 }); b.pop(); }, 'curtainsShut') };
  fixCurtains(curtains, ca);

  /* the screens: the TV (off unless touched) and the laptop's lock screen */
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.71, 0.4), new THREE.MeshStandardMaterial({ color: '#08090b', roughness: 0.12, metalness: 0.2, emissive: '#000000' }));
  tvScreen.position.set(ROOM.x0 + parts.tvAt.u, G2 + parts.tvAt.y, ROOM.z0 + parts.tvAt.v); scene.add(tvScreen);
  const tvGlow = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 72; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t }; })();
  const laptop = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.19), new THREE.MeshBasicMaterial({ map: screenTex(), toneMapped: false }));
  laptop.position.set(ROOM.x0 + parts.screenAt.u, G2 + parts.screenAt.y, ROOM.z0 + parts.screenAt.v); laptop.rotation.set(-18 * Math.PI / 180, 0, 0); scene.add(laptop);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.055, 0.08), new THREE.MeshStandardMaterial({ map: badgeTex(), roughness: 0.4 }));
  badge.position.set(ROOM.x0 + parts.badgeAt.u, G2 + parts.badgeAt.y, ROOM.z0 + parts.badgeAt.v); badge.rotation.set(-Math.PI / 2, 0, 0.4); scene.add(badge);

  /* bright dots */
  const P = (u, y, v) => [ROOM.x0 + u, G2 + y, ROOM.z0 + v];
  ctx.hot.push({ id: 'tv', pos: P(parts.tvAt.u, parts.tvAt.y + 0.3, parts.tvAt.v + 0.05), r: 0.2 });
  ctx.hot.push({ id: 'bed', pos: P(IN.bed.u0 + IN.bed.w / 2, 0.85, Wd() - 1.0), r: 0.25 });
  ctx.hot.push({ id: 'laptop', pos: P(parts.screenAt.u, parts.screenAt.y + 0.16, parts.screenAt.v), r: 0.16 });
  ctx.hot.push({ id: 'badge', pos: P(parts.badgeAt.u, 0.98, parts.badgeAt.v), r: 0.12 });
  ctx.hot.push({ id: 'kitchen', pos: P(D() - 0.35, 1.25, 1.2), r: 0.22 });
  ctx.hot.push({ id: 'print', pos: P(IN.bath.u0 - 0.06, 2.12, (IN.bath.v0 + 0.1 + Wd()) / 2), r: 0.18 });
  ctx.hot.push({ id: 'door', pos: P(0.25, 1.75, IN.door[0] + 0.45), r: 0.2 });
  ctx.hot.push({ id: 'bathdoor', pos: P(IN.bathDoor[0] + 0.35, 1.8, IN.bath.v0 - 0.12), r: 0.18 });
  ctx.hot.push({ id: 'curtain', pos: P(0.3, 1.9, (IN.win[0] + IN.win[1]) / 2), r: 0.2 });
  ctx.hot.push({ id: 'mirror', pos: P((IN.mirror[0] + IN.mirror[1]) / 2, 2.12, 0.06), r: 0.15 });

  const state = { entry: 1, bath: 0, tv: false, night: false, curtainsShut: null };
  const setDoors = () => { entry.rotation.y = -(90 - 88 * state.entry) * Math.PI / 180; bath.rotation.y = (state.bath ? 72 : 0) * Math.PI / 180; };
  setDoors();
  function setCurtains(shut) { state.curtainsShut = shut; curtains.open.visible = !shut; curtains.shut.visible = shut; }
  function setTv(on) {
    state.tv = on; const m = tvScreen.material;
    if (on) { const g2 = tvGlow.c.getContext('2d'), gr = g2.createLinearGradient(0, 0, 128, 72); gr.addColorStop(0, '#2d6fb0'); gr.addColorStop(0.5, '#8fb7d8'); gr.addColorStop(1, '#c9773e'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 72); g2.fillStyle = 'rgba(255,255,255,0.85)'; g2.fillRect(8, 52, 60, 10); tvGlow.t.needsUpdate = true; m.emissive.set('#ffffff'); m.emissiveMap = tvGlow.t; m.emissiveIntensity = 1.1; m.color.set('#000'); }
    else { m.emissive.set('#000000'); m.emissiveMap = null; m.emissiveIntensity = 0; }
    m.needsUpdate = true;
  }
  return {
    group: g, state, setTv, setCurtains,
    /** whether the doorway of the entry is passable: the walker is stopped by a shut door */
    entryOpen: () => state.entry > 0.5, bathOpen: () => state.bath > 0.5,
    toggle(id) {
      if (id === 'door') { state.entry = state.entry ? 0 : 1; setDoors(); return state.entry ? 'open' : 'shut'; }
      if (id === 'bathdoor') { state.bath = state.bath ? 0 : 1; setDoors(); return state.bath ? 'open' : 'shut'; }
      if (id === 'curtain') { setCurtains(!state.curtainsShut); return state.curtainsShut ? 'shut' : 'open'; }
      if (id === 'tv') { setTv(!state.tv); return state.tv; }
      return undefined;
    },
    setHour(night) { state.night = night; setCurtains(night); },
  };
}

/** curtain() in furn.js hangs a cloth along local x facing +z; the front wall here runs along z and the room is +x */
function fixCurtains(curtains, ca) {
  for (const grp of Object.values(curtains)) {
    grp.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, p = g.attributes.position;
      // the cloth was laid at (x = v along the wall, z = 0) in the room frame: swap to (x = u, z = v)
      g.translate(-ROOM.x0, 0, -ROOM.z0);
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vz = p.getZ(i); p.setXYZ(i, ROOM.x0 + ca.u + vz, p.getY(i), ROOM.z0 + vx); }
      p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
      o.castShadow = false;
    });
  }
}
