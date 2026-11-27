/* The women at the light table, each in a glass medallion: a round window behind her head as the old poster artists
   drew them, her hair in long leaded sweeps, her face painted on pale glass. Her look comes from content/cast.json;
   a form (Radiant, Wool, Healer…) dresses her for it. Units: centre of the pane, one unit half its height. */

const FORM_LOOK = {
  Radiant: { halo: '#ffd86a', glow: 0.7, sparkle: true }, 'Radiant Healer': { halo: '#ffd86a', glow: 0.7, sparkle: true, outfit: '#f4f1ea', cross: true },
  'Radiant Midnight': { halo: '#ffd86a', glow: 0.7, sparkle: true, night: true }, Healer: { outfit: '#f4f1ea', cross: true }, Midnight: { night: true },
  Wool: { knit: true }, Ghost: { ghost: true }, Mirror: { mirror: true }, Sweetheart: { hearts: true }, 'Gold Mask': { mask: '#e0b447' }, 'Black Mask': { mask: '#26232c' },
};

function portrait(p, person, form, look) {
  const L = person.look, F = FORM_LOOK[form] || {}, r = p.rand;
  const skin = F.ghost ? mix(L.skin, '#e8f0ff', 0.55) : L.skin, hairC = F.ghost ? mix(L.hairColor, '#e8f0ff', 0.5) : L.hairColor;
  let outfit = F.outfit || L.outfit;
  if (F.mirror) outfit = tint(outfit, 150);
  const W = p.w, H = p.h, op = F.ghost ? { alpha: 0.86 } : {};
  /* the field: the realm's glass, and the round window behind her */
  const sky = F.night ? ['#2a2f5a', '#3a3f72', '#232650', '#46407a'] : look.sky;
  for (const q of Shape.shatter([[0, 0], [W, 0], [W, H], [0, H]], r, H * 0.2, 0, 1.6)) p.glass(q, jitter(sky[Math.floor(r() * sky.length)], r, 0.7), { tex: 'streak', texAlpha: 0.45, edge: 0.16 });
  p.frame(W / 2, H * 0.6, H * 0.62);
  const ring = F.halo || look.main, hy = -0.18;
  for (let i = 0; i < 24; i++) p.glass(p.A(0, hy, 0.62, 0.76, i * 15, (i + 1) * 15), i % 2 ? ring : shade(ring, 0.12), { tex: 'mottle', glow: F.glow ? 0.3 : 0 });
  for (let i = 0; i < 12; i++) p.glass(p.A(0, hy, 0.0, 0.62, i * 30, (i + 1) * 30), mix(look.sky[i % look.sky.length], ring, i % 2 ? 0.3 : 0.18), { tex: 'ripple', texAlpha: 0.45, glow: F.glow ? 0.35 : 0.08, edge: 0.14 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; p.glass(p.E(Math.cos(a) * 0.69, hy + Math.sin(a) * 0.69, 0.05), look.accent, { tex: 'mottle' }); }
  if (F.night) for (let i = 0; i < 14; i++) p.dot((r() - 0.5) * 1.9, -0.95 + r() * 0.5, 0.008 + r() * 0.01, '#fff6d0', 0.9);
  /* hair that falls behind her */
  const back = {
    long: [[-0.3, -0.36], [-0.25, -0.55], [0, -0.62], [0.25, -0.55], [0.3, -0.36], [0.34, -0.1], [0.3, 0.12], [0.4, 0.34], [0.36, 0.56], [0.2, 0.5], [-0.2, 0.5], [-0.36, 0.56], [-0.4, 0.34], [-0.3, 0.12], [-0.34, -0.1]],
    waves: [[-0.3, -0.36], [-0.25, -0.55], [0, -0.62], [0.25, -0.55], [0.32, -0.3], [0.4, -0.05], [0.34, 0.15], [0.46, 0.38], [0.38, 0.62], [0.12, 0.6], [-0.12, 0.6], [-0.38, 0.62], [-0.46, 0.38], [-0.34, 0.15], [-0.4, -0.05], [-0.32, -0.3]],
    wild: [[-0.32, -0.4], [-0.4, -0.62], [-0.12, -0.7], [0.1, -0.74], [0.36, -0.6], [0.48, -0.3], [0.56, 0.05], [0.5, 0.42], [0.3, 0.5], [0.2, 0.3], [-0.2, 0.3], [-0.3, 0.5], [-0.5, 0.42], [-0.56, 0.05], [-0.48, -0.3]],
    curls: null, bob: [[-0.29, -0.36], [-0.24, -0.55], [0, -0.62], [0.24, -0.55], [0.29, -0.36], [0.32, -0.05], [0.28, 0.06], [-0.28, 0.06], [-0.32, -0.05]],
    braid: [[-0.29, -0.36], [-0.24, -0.55], [0, -0.62], [0.24, -0.55], [0.29, -0.36], [0.3, -0.05], [-0.3, -0.05]],
  }[L.hair];
  if (back) {
    const hairPoly = p.S(back, 5);
    p.pieces(hairPoly, hairC, p.s * 0.38, { tex: 'streak', vary: 0.45, lean: 0, spread: 0.9, ...op });
    const g = p.g; g.save(); p.path(hairPoly); g.clip();   // strands, painted in long S-curves
    for (let i = 0; i < 9; i++) { const x = -0.34 + i * 0.085, w = (r() - 0.5) * 0.08; p.stroke([[x, -0.5], [x + w + 0.04, -0.2], [x - w, 0.1], [x + w + 0.03, 0.4], [x, 0.62]], 0.008, shade(hairC, -0.3), 0.45); }
    g.restore();
  }
  if (L.hair === 'curls') for (const [x, y, rr] of [[-0.3, -0.3, 0.14], [0.3, -0.3, 0.14], [-0.34, -0.05, 0.13], [0.34, -0.05, 0.13], [-0.18, -0.5, 0.15], [0.18, -0.5, 0.15], [0, -0.58, 0.14], [-0.3, 0.15, 0.11], [0.3, 0.15, 0.11]]) p.glass(p.E(x, y, rr), jitter(hairC, r, 0.6), { tex: 'streak', ...op });
  if (L.hair === 'ponytail') p.glass(p.S([[0.16, -0.4], [0.3, -0.38], [0.36, -0.12], [0.32, 0.2], [0.26, 0.3], [0.24, 0.0], [0.2, -0.22]], 5), hairC, { tex: 'streak', ...op });
  if (L.hair === 'bun') p.glass(p.E(0, -0.5, 0.12, 0.1), shade(hairC, 0.04), { tex: 'streak', ...op });
  if (L.hair === 'updo') p.glass(p.S([[-0.26, -0.3], [-0.3, -0.48], [-0.14, -0.6], [0, -0.62], [0.14, -0.6], [0.3, -0.48], [0.26, -0.3]], 5), shade(hairC, 0.04), { tex: 'streak', ...op });
  /* shoulders and what she wears */
  const bust = p.S([[-0.62, 1.02], [-0.6, 0.62], [-0.48, 0.42], [-0.2, 0.32], [0.2, 0.32], [0.48, 0.42], [0.6, 0.62], [0.62, 1.02]], 5);
  p.pieces(bust, outfit, p.s * 0.32, { tex: F.knit ? 'mottle' : 'streak', vary: 0.55, ...op });
  if (F.knit) for (let y = 0.5; y < 1.0; y += 0.07) for (let x = -0.55; x < 0.56; x += 0.07) p.stroke([[x - 0.02, y], [x, y + 0.03], [x + 0.02, y]], 0.008, shade(outfit, -0.25), 0.45);
  p.glass(p.C(0, 0.04, 0, 0.32, 0.092), shade(skin, -0.04), op);
  p.glass(p.S([[-0.14, 0.3], [0.14, 0.3], [0.0, 0.44]], 3), shade(skin, -0.02), { tex: 'mottle', texAlpha: 0.3, ...op });
  if (F.cross) { p.glass(p.R(0.28, 0.6, 0.12, 0.04, 0.01), '#d0303a'); p.glass(p.R(0.32, 0.56, 0.04, 0.12, 0.01), '#d0303a'); }
  if (L.extra === 'scarf' || F.knit) {
    const sc = F.knit ? look.accent : shade(L.outfit, 0.18);
    p.glass(p.S([[0.06, 0.38], [0.2, 0.4], [0.26, 0.78], [0.12, 0.8]], 4), shade(sc, -0.06), { tex: 'mottle' });
    p.glass(p.S([[-0.27, 0.27], [0, 0.35], [0.27, 0.27], [0.3, 0.38], [0, 0.48], [-0.3, 0.38]], 5), sc, { tex: 'mottle' });
    if (F.knit) for (let x = -0.24; x <= 0.24; x += 0.06) p.stroke([[x, 0.33], [x + 0.01, 0.42]], 0.008, shade(sc, -0.3), 0.5, false);
  }
  if (L.extra === 'collar') p.glass(p.S([[-0.32, 0.34], [-0.1, 0.3], [0, 0.45], [0.1, 0.3], [0.32, 0.34], [0.2, 0.46], [0, 0.5], [-0.2, 0.46]], 3), '#f6f1e6', { tex: 'mottle' });
  if (L.extra === 'necklace') { for (let i = -4; i <= 4; i++) p.glass(p.E(i * 0.045, 0.36 + (16 - i * i) * 0.004, 0.022), '#f4ecdc'); p.glass(p.E(0, 0.46, 0.04), look.accent, { glow: 0.4 }); }
  /* the face */
  const fy = -0.12, frx = 0.2, fry = 0.26;
  const faceP = p.S([[0, fy - fry], [frx * 0.85, fy - fry * 0.72], [frx, fy - fry * 0.1], [frx * 0.78, fy + fry * 0.55], [0, fy + fry], [-frx * 0.78, fy + fry * 0.55], [-frx, fy - fry * 0.1], [-frx * 0.85, fy - fry * 0.72]], 6);
  for (const s of [-1, 1]) p.glass(p.E(s * frx * 0.98, fy + 0.0, 0.035, 0.06), shade(skin, -0.05), op);
  p.glass(faceP, skin, { tex: 'mottle', texAlpha: 0.22, rise: 0.08, fall: 0.06, edge: 0.14, ...op });
  p.matte(faceP, 0, fy + 0.2, 0.25, 0.12, '#7a3a3a');
  /* her features, painted */
  const ink = '#3a2420', ey = fy - 0.015, ex = 0.085;
  for (const s of [-1, 1]) {
    p.stroke([[s * (ex - 0.05), ey - 0.075], [s * ex, ey - 0.092], [s * (ex + 0.055), ey - 0.07]], 0.011, ink, 0.75);
    if (L.extra === 'mask' || F.mask) continue;
    p.fill(p.S([[s * (ex - 0.05), ey], [s * ex, ey - 0.028], [s * (ex + 0.05), ey - 0.004], [s * ex, ey + 0.018]], 4), '#fbf6f0', 0.9);
    p.dot(s * ex, ey - 0.004, 0.019, F.ghost ? '#6a8ad0' : '#4a3a5a', 0.95); p.dot(s * ex - 0.006, ey - 0.012, 0.006, '#ffffff', 0.9);
    p.stroke([[s * (ex - 0.055), ey + 0.002], [s * ex, ey - 0.03], [s * (ex + 0.058), ey - 0.006], [s * (ex + 0.07), ey - 0.018]], 0.012, ink, 0.9);
  }
  p.stroke([[0.012, fy + 0.02], [0.022, fy + 0.085], [0.0, fy + 0.095]], 0.008, shade(skin, -0.3), 0.7);
  p.fill(p.S([[-0.05, fy + 0.15], [-0.015, fy + 0.138], [0, fy + 0.145], [0.015, fy + 0.138], [0.05, fy + 0.15], [0, fy + 0.172]], 3), '#c24a5e', 0.85);
  for (const s of [-1, 1]) p.dot(s * 0.12, fy + 0.07, 0.04, '#e0606a', 0.16);
  if (L.extra === 'freckles') for (let i = 0; i < 9; i++) p.dot((r() - 0.5) * 0.2, fy + 0.04 + r() * 0.05, 0.005, '#8a4a2a', 0.6);
  if (L.extra === 'scar') p.stroke([[0.09, fy - 0.12], [0.13, fy + 0.04]], 0.008, '#8a3a3a', 0.6, false);
  if (L.extra === 'mask' || F.mask || L.head === 'mask') {
    const mc = F.mask || L.outfit;
    p.glass(p.S([[-0.2, fy - 0.06], [-0.1, fy - 0.11], [0, fy - 0.07], [0.1, fy - 0.11], [0.2, fy - 0.06], [0.16, fy + 0.04], [0.04, fy + 0.03], [0, fy + 0.0], [-0.04, fy + 0.03], [-0.16, fy + 0.04]], 3), mc, { tex: 'mottle' });
    for (const s of [-1, 1]) { p.fill(p.E(s * ex, ey - 0.01, 0.035, 0.018), '#140c10', 0.95); p.dot(s * ex, ey - 0.01, 0.007, '#fff', 0.8); }
  }
  /* the hair over her brow */
  const fringe = {
    bob: [[-0.24, -0.27], [-0.18, -0.42], [0.05, -0.44], [0.22, -0.36], [0.24, -0.2], [0.12, -0.3], [-0.02, -0.25], [-0.14, -0.3]],
    braid: [[-0.22, -0.28], [-0.12, -0.42], [0.12, -0.42], [0.22, -0.28], [0.1, -0.34], [-0.1, -0.34]],
    long: [[-0.24, -0.15], [-0.2, -0.4], [0, -0.44], [0.2, -0.4], [0.24, -0.15], [0.17, -0.3], [0.03, -0.33], [-0.15, -0.3]],
    waves: [[-0.25, -0.12], [-0.2, -0.4], [0, -0.45], [0.2, -0.4], [0.25, -0.12], [0.18, -0.28], [-0.06, -0.33], [-0.18, -0.28]],
    curls: [[-0.22, -0.26], [-0.12, -0.42], [0.12, -0.42], [0.22, -0.26], [0.12, -0.32], [0, -0.28], [-0.12, -0.32]],
    updo: [[-0.22, -0.24], [-0.16, -0.42], [0.16, -0.42], [0.22, -0.24], [0.14, -0.34], [-0.14, -0.34]],
    twin: [[-0.23, -0.24], [-0.14, -0.42], [0.14, -0.42], [0.23, -0.24], [0.1, -0.3], [0, -0.26], [-0.1, -0.3]],
    cropped: [[-0.22, -0.22], [-0.16, -0.42], [0.16, -0.42], [0.22, -0.22], [0.18, -0.32], [-0.18, -0.32]],
    wild: [[-0.26, -0.18], [-0.24, -0.44], [0.0, -0.48], [0.24, -0.44], [0.26, -0.18], [0.16, -0.3], [0.06, -0.24], [-0.06, -0.3], [-0.16, -0.24]],
    pixie: [[-0.22, -0.2], [-0.18, -0.42], [0.1, -0.44], [0.22, -0.32], [0.08, -0.32], [-0.1, -0.24]],
    bun: [[-0.22, -0.24], [-0.16, -0.42], [0.16, -0.42], [0.22, -0.24], [0.14, -0.34], [-0.14, -0.34]],
    ponytail: [[-0.22, -0.24], [-0.16, -0.42], [0.16, -0.42], [0.22, -0.24], [0.14, -0.34], [-0.14, -0.34]],
  }[L.hair] || [[-0.22, -0.24], [-0.16, -0.42], [0.16, -0.42], [0.22, -0.24], [0.14, -0.34], [-0.14, -0.34]];
  p.glass(p.S(fringe, 5), hairC, { tex: 'streak', ...op });
  if (L.hair === 'twin') for (const s of [-1, 1]) p.glass(p.S([[s * 0.2, -0.3], [s * 0.36, -0.2], [s * 0.42, 0.15], [s * 0.34, 0.42], [s * 0.26, 0.15], [s * 0.24, -0.1]], 5), shade(hairC, 0.04), { tex: 'streak', ...op });
  if (L.hair === 'braid') for (let i = 0; i < 6; i++) p.glass(p.E(0.22 + i * 0.015, -0.02 + i * 0.1, 0.055, 0.06), shade(hairC, i % 2 ? 0.05 : -0.03), { tex: 'streak' });
  if (L.hair === 'long' || L.hair === 'waves') for (const s of [-1, 1]) p.glass(p.S([[s * 0.2, -0.32], [s * 0.27, -0.2], [s * 0.3, 0.15], [s * 0.36, 0.45], [s * 0.24, 0.3], [s * 0.2, 0.0]], 5), shade(hairC, 0.05), { tex: 'streak', ...op });
  /* what is on her head */
  const head = L.head;
  if (head === 'tiara' || head === 'circlet' || head === 'crown') {
    if (head === 'crown') hat(p, { gold: '#e0b447', accent: look.accent }, 'crown', 0, -0.36, 0.2);
    else { p.glass(p.A(0, -0.06, 0.29, 0.32, -55, 55), '#e0b447', { tex: 'mottle' }); p.glass(head === 'tiara' ? p.map(Shape.star(0, -0.4, 0.06, 0.03, 5)) : p.E(0, -0.37, 0.03), head === 'tiara' ? '#f6e8a8' : look.accent, { glow: 0.5 }); }
  } else if (head === 'cap') hat(p, { second: shade(L.outfit, -0.05) }, 'cap', 0, -0.2, 0.24);
  else if (head === 'wide') hat(p, {}, 'wide', 0, -0.22, 0.24);
  else if (head === 'goggles') { p.glass(p.R(-0.24, -0.38, 0.48, 0.05, 0.02), '#5a3a2a'); for (const s of [-1, 1]) { p.glass(p.E(s * 0.09, -0.38, 0.065), '#c08a3a'); p.glass(p.E(s * 0.09, -0.38, 0.045), '#8fd0e0', { tex: 'ripple', glow: 0.4 }); } }
  else if (head === 'horns') hat(p, {}, 'horns', 0, -0.2, 0.22);
  else if (head === 'beanie' || head === 'nightcap') { p.glass(p.S([[-0.25, -0.3], [-0.2, -0.48], [0, -0.55], [0.2, -0.48], [0.25, -0.3]], 4), head === 'nightcap' ? '#7a86c8' : look.accent, { tex: 'mottle' }); p.glass(p.R(-0.26, -0.33, 0.52, 0.07, 0.03), shade(head === 'nightcap' ? '#7a86c8' : look.accent, -0.1)); if (head === 'nightcap') p.glass(p.E(0.32, -0.42, 0.05), '#f6f1e6'); }
  else if (head === 'headlamp') { p.glass(p.A(0, -0.12, 0.3, 0.33, -60, 60), '#5a4a3a'); p.glass(p.E(0, -0.42, 0.055), '#fff3b0', { glow: 0.9 }); }
  else if (head === 'helm') hat(p, { metal: '#b8c2cc', accent: look.accent }, 'helm', 0, -0.22, 0.25);
  else if (head === 'wizard') hat(p, { second: shade(L.outfit, -0.05), gold: '#e0b447' }, 'wizard', 0, -0.18, 0.25);
  else if (head === 'ears') for (const s of [-1, 1]) p.glass(p.P([[s * 0.1, -0.4], [s * 0.26, -0.32], [s * 0.24, -0.6]]), shade(hairC, -0.04), op);
  else if (head === 'kerchief') p.glass(p.S([[-0.25, -0.28], [-0.2, -0.46], [0, -0.5], [0.2, -0.46], [0.25, -0.28], [0, -0.36]], 4), look.accent, { tex: 'mottle' });
  else if (head === 'wreath') for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; p.glass(p.E(Math.cos(a) * 0.25, -0.16 + Math.sin(a) * 0.28, 0.05, 0.03, a), i % 3 ? '#5a8a3a' : '#c8304a'); }
  else if (head === 'hood') p.glass(p.S([[-0.32, 0.25], [-0.34, -0.3], [0, -0.58], [0.34, -0.3], [0.32, 0.25], [0.24, -0.2], [0, -0.42], [-0.24, -0.2]], 5), shade(L.outfit, -0.06), { tex: 'streak' });
  else if (head === 'bow') for (const s of [-1, 1]) p.glass(p.S([[s * 0.02, -0.42], [s * 0.2, -0.56], [s * 0.22, -0.38]], 3), look.accent);
  if (L.extra === 'glasses') { for (const s of [-1, 1]) p.stroke(Shape.ellipse(s * ex, ey, 0.055, 0.042, 0, 18).concat([[s * ex + 0.055, ey]]), 0.008, '#3a3036', 0.9, false); p.stroke([[-ex + 0.055, ey], [ex - 0.055, ey]], 0.008, '#3a3036', 0.9, false); }
  if (L.extra === 'monocle') { p.stroke(Shape.ellipse(ex, ey, 0.058, 0.058, 0, 18).concat([[ex + 0.058, ey]]), 0.01, '#c09a3a', 0.95, false); p.stroke([[ex + 0.04, ey + 0.05], [ex + 0.1, ey + 0.3]], 0.005, '#c09a3a', 0.8, false); }
  if (L.extra === 'earrings') for (const s of [-1, 1]) p.glass(p.S([[s * 0.2, fy + 0.04], [s * 0.225, fy + 0.1], [s * 0.2, fy + 0.13], [s * 0.175, fy + 0.1]], 3), look.accent, { glow: 0.4 });
  if (F.hearts) for (const [x, y] of [[-0.55, -0.6], [0.6, -0.4], [-0.62, 0.1]]) spellIconAt(p, 'heart', x, y, 0.14);
  if (F.sparkle) for (let i = 0; i < 6; i++) { const a = r() * TAU, d = 0.5 + r() * 0.35; p.glass(p.map(Shape.star(Math.cos(a) * d, hy + Math.sin(a) * d, 0.045, 0.015, 4)), '#fff3c0', { glow: 0.9, leadW: p.leadW * 0.6 }); }
}
/** a spell's emblem drawn small at a place, in units */
function spellIconAt(p, icon, x, y, k) { p.at(x, y, k, () => spellIcon(p, { main: '#d83a5a', accent: '#f0c060', metal: '#b8c2cc', gold: '#e0b447', wood: '#8a5a32' }, icon)); }
