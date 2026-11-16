/* What the windows look out on, five floors up in Ba Đình: tube houses of three to five floors packed along the lanes,
   red tiled roofs just below the sill, steel water tanks, another grey block of the same estate across the yard,
   towers far off. None of it is a portrait of a real neighbour: it is the kind of view the 2013 video shows. */
import * as THREE from 'three';
import { M, facadeTex, roofTex, rng, canvasTex } from './tex.js';
import { Builder } from './kit.js';

const GROUND = -13.4;

export function buildOutside(scene, ctx) {
  const b = new Builder({ solids: [] });
  const R = rng(2013), O = { cast: false, recv: false };
  const lit = [];
  const facade = (base, seed, floors, cols) => {
    const key = `${base}|${seed}|${floors}|${cols}`; let m = facade.cache.get(key);
    if (!m) { m = new THREE.MeshStandardMaterial({ map: facadeTex(base, seed, floors, cols), roughness: 0.92, emissive: '#ffffff', emissiveMap: facadeTex(base, seed, floors, cols, true), emissiveIntensity: 0 }); facade.cache.set(key, m); lit.push(m); }
    return m;
  };
  facade.cache = new Map();
  const roofRed = new THREE.MeshStandardMaterial({ map: roofTex('#a33d2c'), roughness: 0.8 }), roofDark = new THREE.MeshStandardMaterial({ map: roofTex('#8a3a2a'), roughness: 0.85 });
  const conc = M.concrete('#b9b3a4', 41, 1), tank = M.plain('#c9cfd4', 0.25, 0.9), tin = M.plain('#8a4a3a', 0.6, 0.3), green = [M.plain('#3f6f38', 0.95), M.plain('#4f8242', 0.95), M.plain('#2f5a30', 0.95)];
  const cols = ['#e6d58a', '#f1ede2', '#dfe6ea', '#e9c98a', '#c9d8e2', '#d9d2c0'];

  /** a steel water tank lying on its frame, turned so that from the flat it is seen from the side, not end-on */
  const frame = M.plain('#8b9094', 0.55, 0.5);
  function waterTank(x, y, z, r = 0.42, len = 1.25) {
    const alongZ = Math.abs(x - 5) > Math.abs(z - 2), hx = alongZ ? r * 0.75 : len * 0.4, hz = alongZ ? len * 0.4 : r * 0.75, top = y + 0.8;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(frame, x + sx * hx - 0.035, y, z + sz * hz - 0.035, x + sx * hx + 0.035, top, z + sz * hz + 0.035, O);
    b.box(frame, x - hx - 0.05, top - 0.06, z - hz - 0.05, x + hx + 0.05, top, z + hz + 0.05, O);
    if (alongZ) b.cyl(tank, x, top + r, z - len / 2, r, len, { rx: 90, seg: 12, ...O }); else b.cyl(tank, x - len / 2, top + r, z, r, len, { rz: -90, seg: 12, ...O });
  }

  /** a house: its walls (floors of windows on every side), and a roof — hipped red tiles, or flat with a tank and a stair hut */
  function house(x, z, w, d, floors, o = {}) {
    floors = Math.min(6, Math.max(2, floors));
    const h = floors * 3.3 + (o.extra ?? 0), base = o.color ?? cols[(R() * cols.length) | 0], y0 = GROUND, y1 = GROUND + h;
    // a few dozen fronts serve the whole quarter: one per colour, height and width class
    b.box(facade(base, 1, floors, w < 5.5 ? 2 : 3), x, y0, z, x + w, y1, z + d, O);
    const kind = o.roof ?? (R() < 0.45 ? 'hip' : 'flat');
    if (kind === 'hip') {
      const rh = 1.1 + R() * 0.9, g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(w + 0.7, rh, d + 0.7); g.translate(x + w / 2, y1 + rh / 2, z + d / 2);
      b.geo(R() < 0.7 ? roofRed : roofDark, g, O);
    } else {
      b.box(conc, x - 0.1, y1, z - 0.1, x + w + 0.1, y1 + 0.5, z + 0.12, O); b.box(conc, x - 0.1, y1, z + d - 0.12, x + w + 0.1, y1 + 0.5, z + d + 0.1, O);
      b.box(conc, x - 0.1, y1, z, x + 0.12, y1 + 0.5, z + d, O); b.box(conc, x + w - 0.12, y1, z, x + w + 0.1, y1 + 0.5, z + d, O);
      if (R() < 0.75) { const tx = x + w * (0.25 + R() * 0.5), tz = z + d * (0.25 + R() * 0.5); waterTank(tx, y1, tz, 0.4, 1.15); }
      if (R() < 0.6) { const hx = x + (R() < 0.5 ? 0.2 : w - 2.2), hz = z + 0.2; b.box(conc, hx, y1, hz, hx + 2, y1 + 2.5, hz + Math.min(2.6, d - 0.4), O); b.box(tin, hx - 0.3, y1 + 2.5, hz - 0.3, hx + 2.3, y1 + 2.62, hz + Math.min(2.9, d - 0.1), O); }
    }
    if (o.shop) b.box(M.plain(['#c93a2e', '#2a5fa8', '#e8b83a', '#3a8a5a'][(R() * 4) | 0], 0.7), x + 0.3, y0 + 3.0, z - 0.06, x + w - 0.3, y0 + 3.7, z, O);
  }
  const tree = (x, z, s = 1) => { for (let i = 0; i < 3; i++) b.sphere(green[(R() * 3) | 0], x + (R() - 0.5) * 2 * s, GROUND + (4 + R() * 3.5) * s, z + (R() - 0.5) * 2 * s, (1.6 + R() * 1.3) * s, { seg: 8, ...O }); b.cyl(M.plain('#4a3a2a', 1), x, GROUND, z, 0.18, 5 * s, { seg: 6, ...O }); };

  /* the ground: lanes, the street on the east, the yard on the north */
  b.box(M.plain('#5d5a52', 1), -140, GROUND - 0.5, -140, 160, GROUND, 150, O);
  b.box(M.plain('#6f6c66', 1), 14.5, GROUND, -60, 22, GROUND + 0.02, 70, O);
  b.box(M.plain('#7a766c', 1), -40, GROUND, -15.5, 14.5, GROUND + 0.02, -4, O);

  /* east: across the street, a row of shop houses whose fronts take the evening sun */
  { let z = -34; while (z < 46) { const w = 3.6 + R() * 1.8, fl = 3 + ((R() * 3) | 0); house(22, z, 9 + R() * 4, w, fl, { shop: true, roof: R() < 0.35 ? 'hip' : 'flat' }); z += w + 0.05; } }
  { let z = -30; while (z < 44) { const w = 5 + R() * 4; house(36 + R() * 3, z, 10, w, 3 + ((R() * 4) | 0)); z += w + R() * 1.5; } }
  // on this side of the street, north and south of the block: low houses and a villa set back in its garden
  house(11.5, 9.2, 8.5, 6.5, 2, { roof: 'hip', color: '#e6d58a' }); house(12.5, 17.5, 7.5, 6, 3, { roof: 'hip' }); tree(16.5, 8.2, 0.8); tree(12.6, 16.2, 0.9);
  /* south: red roofs right under his window, then taller fronts behind */
  { const rows = [[9.6, 2, 3], [17.5, 3, 4], [26, 3, 5], [35, 4, 6]];
    for (const [z0, f0, f1] of rows) { let x = -30; while (x < 34) { const w = 4 + R() * 3.5, fl = f0 + ((R() * (f1 - f0 + 1)) | 0); if (!(z0 < 12 && x > 9.5 && x < 22)) house(x, z0 + R() * 1.2, w, 6.5 + R() * 1.5, fl, { roof: z0 < 20 ? (R() < 0.75 ? 'hip' : 'flat') : undefined }); x += w + (R() < 0.2 ? 1.5 : 0.08); } }
    // the villa with the roof terrace under a red pavilion (it is in both his 2010 storm photos and the video)
    b.box(facade('#f1ede2', 1, 3, 3), -2, GROUND, 10.4, 6.5, GROUND + 10.4, 16.5, O);
    for (const [px, pz] of [[-1.5, 11], [3.4, 11], [-1.5, 14.6], [3.4, 14.6]]) b.box(M.plain('#f1eee6', 0.8), px, GROUND + 10.4, pz, px + 0.2, GROUND + 13, pz + 0.2, O);
    { const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); g.scale(6.4, 1.5, 5.2); g.translate(1.05, GROUND + 13.75, 12.9); b.geo(roofRed, g, O); }
    for (let i = 0; i < 9; i++) b.box(M.plain('#f1eee6', 0.8), -2 + i * 1.06, GROUND + 10.4, 16.4, -1.9 + i * 1.06, GROUND + 11.3, 16.5, O);
    b.box(M.plain('#f1eee6', 0.8), -2, GROUND + 11.25, 16.38, 6.5, GROUND + 11.35, 16.52, O);
  }
  /* west: what the gallery and the living-room balcony look over — the yard with its sheds, tin roofs and trees, a few low
     houses, and across it the next blocks of the estate: grey render, five floors, caged balconies */
  {
    const grey = new THREE.MeshStandardMaterial({ map: facadeTex('#a9a8a2', 7, 5, 9), roughness: 0.95, emissive: '#ffffff', emissiveMap: facadeTex('#a9a8a2', 7, 5, 9, true), emissiveIntensity: 0 }); lit.push(grey);
    const grey2 = new THREE.MeshStandardMaterial({ map: facadeTex('#b9b6ac', 5, 5, 6), roughness: 0.95, emissive: '#ffffff', emissiveMap: facadeTex('#b9b6ac', 5, 5, 6, true), emissiveIntensity: 0 }); lit.push(grey2);
    for (let i = 0; i < 7; i++) tree(-5.5 - R() * 7, -22 + i * 5.2 + R() * 2, 0.75 + R() * 0.35);
    for (let i = 0; i < 6; i++) { const z = -20 + i * 6 + R() * 2, x = -13 + R() * 4, w = 4 + R() * 2; b.box(conc, x, GROUND, z, x + w, GROUND + 3.2, z + 3.6, O); b.box(i % 2 ? tin : M.plain('#8f8f8a', 0.8), x - 0.2, GROUND + 3.2, z - 0.2, x + w + 0.2, GROUND + 3.4, z + 3.8, O); }
    house(-9.5, 6.5, 6, 4.5, 3, { roof: 'hip', color: '#f1ede2' }); house(-17, 2, 6.5, 5, 2, { roof: 'hip', color: '#e6d58a' }); house(-16, -13, 5.5, 5, 3, { roof: 'hip', color: '#dfe6ea' });
    b.box(grey, -32, GROUND, -34, -23, GROUND + 16.6, -2, O); b.box(conc, -32.2, GROUND + 16.6, -34.2, -22.8, GROUND + 17, -1.8, O);
    b.box(grey2, -33, GROUND, 3, -24, GROUND + 16.6, 30, O); b.box(conc, -33.2, GROUND + 16.6, 2.8, -23.8, GROUND + 17, 30.2, O);
    b.box(grey, -58, GROUND, -30, -49, GROUND + 16.6, 6, O); b.box(grey2, -57, GROUND, 12, -48, GROUND + 19.9, 40, O);
    for (let i = 0; i < 9; i++) { const z = -34 + i * 8; waterTank(-27.5, GROUND + 17, z + 2, 0.45, 1.35); }
    { let z = -40; while (z < 44) { const w = 5 + R() * 4; house(-76 + R() * 6, z, 9, w, 3 + ((R() * 4) | 0)); z += w + R() * 2; } }
  }
  /* north: past the far end of the block */
  { for (let i = 0; i < 5; i++) house(-10 + i * 9, -52 - R() * 5, 8, 7, 3 + ((R() * 3) | 0)); }
  b.build(scene);

  /* far off: towers, flat against the haze (their colour follows the hour) */
  const far = new THREE.MeshBasicMaterial({ color: '#b9a39a' }), far2 = new THREE.MeshBasicMaterial({ color: '#c9b3a6' });
  const fb = new Builder({ solids: [] });
  for (let i = 0; i < 46; i++) { const a = R() * Math.PI * 2, r = 95 + R() * 120, w = 9 + R() * 14, h = 18 + R() * (R() < 0.2 ? 75 : 36); fb.box(R() < 0.5 ? far : far2, Math.cos(a) * r, GROUND, Math.sin(a) * r, Math.cos(a) * r + w, GROUND + h, Math.sin(a) * r + w, O); }
  fb.build(scene);
  const winGlow = new THREE.MeshBasicMaterial({ color: '#000000' });

  return {
    setMode(mode) {
      const night = mode === 'toi';
      for (const m of lit) m.emissiveIntensity = night ? 0.9 : 0;
      far.color.set(night ? '#161a2c' : '#bfa79c'); far2.color.set(night ? '#1b2034' : '#cdb6a8');
      void winGlow;
    },
  };
}
