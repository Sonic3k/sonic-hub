/* The creatures in glass. A card's art line names a body plan and its flags ("hum outfit:coat hat:straw hold:bow");
   each plan draws on a Pane whose units are centred on the figure, with the ground at y GROUND. c is the palette
   (see 25-pictures.js): main, second, accent, dark, light, skin, hair, metal, gold, wood, white, glow. */

const GROUND = 0.93;

/** draws fn with the figure k times its size, standing on the same ground */
function scaled(p, k, fn, dx = 0) {
  const { cx, cy, s } = p;
  p.frame(cx + dx * s, cy + (1 - k) * GROUND * s, s * k);
  try { fn(); } finally { p.frame(cx, cy, s); }
}
/** a face in grisaille: two eyes (or one), a mouth */
function face(p, x, y, r, o = {}) {
  const eyes = o.eyes || 2, gap = o.gap || 0.42, er = r * (o.eye || 0.13);
  if (eyes === 1) p.eye(x, y, er * 1.7, { white: o.white || '#f4efe2', color: o.iris, look: o.look });
  else for (const s of [-1, 1]) p.eye(x + s * r * gap, y, er, { white: o.white, color: o.iris, look: o.look, lid: o.lid });
  const my = y + r * (o.mouthAt || 0.5), mw = r * (o.mouthW || 0.3);
  switch (o.mouth || 'smile') {
    case 'smile': p.stroke([[x - mw, my - r * 0.05], [x, my + r * 0.08], [x + mw, my - r * 0.05]], r * 0.07); break;
    case 'flat': p.stroke([[x - mw, my], [x + mw, my]], r * 0.07, undefined, 0.85, false); break;
    case 'frown': p.stroke([[x - mw, my + r * 0.06], [x, my - r * 0.06], [x + mw, my + r * 0.06]], r * 0.07); break;
    case 'o': p.dot(x, my, r * 0.11); break;
    case 'grin': {
      const m = p.S([[x - mw * 1.3, my - r * 0.08], [x + mw * 1.3, my - r * 0.08], [x + mw * 0.8, my + r * 0.16], [x - mw * 0.8, my + r * 0.16]]);
      p.fill(m, '#2a1418', 0.92);
      for (let i = -2; i <= 2; i++) p.fill(p.P([[x + i * mw * 0.45 - mw * 0.12, my - r * 0.08], [x + i * mw * 0.45 + mw * 0.12, my - r * 0.08], [x + i * mw * 0.45, my + r * 0.04]]), '#fff6e0', 0.95);
      break;
    }
    case 'fangs': {
      p.stroke([[x - mw * 1.2, my], [x, my + r * 0.07], [x + mw * 1.2, my]], r * 0.07);
      for (const s of [-1, 1]) p.fill(p.P([[x + s * mw * 0.55 - r * 0.05, my + r * 0.02], [x + s * mw * 0.55 + r * 0.05, my + r * 0.03], [x + s * mw * 0.55, my + r * 0.24]]), '#fffaf0', 0.95);
      break;
    }
  }
  if (o.cheeks) for (const s of [-1, 1]) p.dot(x + s * r * 0.6, y + r * 0.32, r * 0.13, o.cheeks, 0.25);
  if (o.brows) for (const s of [-1, 1]) p.stroke([[x + s * r * (gap - 0.17), y - r * 0.3 + (o.brows === 'cross' ? -s * 0 : 0)], [x + s * r * (gap + 0.17), y - r * (o.brows === 'cross' ? 0.18 : 0.33)]], r * 0.07, '#2a1d1a', 0.8, false);
}
/** wings behind a figure: feathered (an angel's), a bat's, or a fairy's */
function wings(p, c, x, y, span, kind = 'feather', color) {
  const col = color || (kind === 'bat' ? c.dark : kind === 'fairy' ? c.glow : c.white);
  for (const s of [-1, 1]) {
    if (kind === 'bat') {
      const w = p.P([[x + s * 0.05, y - 0.05], [x + s * span * 0.55, y - span * 0.5], [x + s * span, y - span * 0.22], [x + s * span * 0.86, y + span * 0.05], [x + s * span * 0.66, y - span * 0.02], [x + s * span * 0.52, y + span * 0.16], [x + s * span * 0.34, y + span * 0.04], [x + s * 0.12, y + span * 0.18]]);
      p.glass(w, col, { tex: 'streak' });
      for (const t of [0.34, 0.52, 0.66]) p.stroke([[x + s * span * 0.5, y - span * 0.4], [x + s * span * t, y + span * 0.08 * (t > 0.5 ? 0 : 1)]], 0.012, '#1a1214', 0.6);
    } else if (kind === 'fairy') {
      p.glass(p.E(x + s * span * 0.5, y - span * 0.28, span * 0.5, span * 0.26, s * -0.5), col, { tex: 'ripple', alpha: 0.8, glow: 0.3 });
      p.glass(p.E(x + s * span * 0.38, y + span * 0.16, span * 0.34, span * 0.18, s * 0.4), tint(col, 20), { tex: 'ripple', alpha: 0.8 });
    } else {
      const pts = [[x + s * 0.04, y + span * 0.12], [x + s * span * 0.25, y - span * 0.55], [x + s * span * 0.7, y - span * 0.72], [x + s * span * 1.02, y - span * 0.42], [x + s * span * 0.86, y - span * 0.12], [x + s * span * 0.9, y + span * 0.12], [x + s * span * 0.62, y + span * 0.1], [x + s * span * 0.6, y + span * 0.36], [x + s * span * 0.32, y + span * 0.36]];
      const wing = p.S(pts, 5);
      for (const piece of Shape.shatter(wing, p.rand, p.s * span * 0.42, s * 0.9, 0.7)) p.glass(piece, jitter(col, p.rand, 0.7), { tex: 'streak' });
    }
  }
}
/** a pole or haft, in units */
function pole(p, c, x1, y1, x2, y2, r = 0.024, color) { p.glass(p.C(x1, y1, x2, y2, r), color || c.wood, { tex: 'streak', edge: 0.15 }); }

/** what a figure holds in its hand at (x, y) */
function holding(p, c, what, x, y, behind) {
  const long = ['staff', 'fork', 'scythe', 'spear', 'broom', 'crook'];
  if (behind !== long.includes(what)) return;
  switch (what) {
    case 'sword': {
      p.glass(p.P([[x - 0.028, y - 0.06], [x + 0.028, y - 0.06], [x + 0.03, y - 0.6], [x, y - 0.7], [x - 0.03, y - 0.6]]), c.metal, { tex: 'streak', rise: 0.25 });
      p.glass(p.R(x - 0.1, y - 0.085, 0.2, 0.04, 0.015), c.gold, { tex: 'mottle' });
      p.glass(p.C(x, y + 0.1, x, y - 0.06, 0.022), c.wood); break;
    }
    case 'dagger': {
      p.glass(p.P([[x - 0.024, y - 0.05], [x + 0.024, y - 0.05], [x, y - 0.3]]), c.metal, { rise: 0.25 });
      p.glass(p.R(x - 0.07, y - 0.065, 0.14, 0.03, 0.01), c.gold); break;
    }
    case 'staff': pole(p, c, x, GROUND - 0.02, x, -0.72, 0.026); p.glass(p.E(x, -0.78, 0.085), c.glow, { tex: 'mottle', glow: 0.5 }); break;
    case 'fork': {
      pole(p, c, x, GROUND - 0.02, x, -0.52, 0.022);
      p.glass(p.S([[x - 0.12, -0.5], [x + 0.12, -0.5], [x + 0.12, -0.46], [x - 0.12, -0.46]], 2), c.metal);
      for (const dx of [-0.11, 0, 0.11]) p.glass(p.P([[x + dx - 0.016, -0.49], [x + dx + 0.016, -0.49], [x + dx, -0.74]]), c.metal, { rise: 0.25 });
      break;
    }
    case 'scythe': pole(p, c, x, GROUND - 0.02, x, -0.7, 0.022); p.glass(p.S([[x, -0.72], [x - 0.5, -0.66], [x - 0.62, -0.5], [x - 0.42, -0.6], [x - 0.02, -0.62]], 6), c.metal, { rise: 0.28 }); break;
    case 'spear': pole(p, c, x, GROUND - 0.02, x, -0.6, 0.02); p.glass(p.S([[x, -0.86], [x + 0.06, -0.68], [x, -0.58], [x - 0.06, -0.68]], 5), c.metal, { rise: 0.3 }); break;
    case 'broom': pole(p, c, x, -0.7, x, 0.62, 0.02); p.glass(p.P([[x - 0.03, 0.58], [x + 0.03, 0.58], [x + 0.13, 0.92], [x - 0.13, 0.92]]), '#c9a25a', { tex: 'streak', grain: 90 }); break;
    case 'crook': pole(p, c, x, GROUND - 0.02, x, -0.55, 0.022); p.glass(p.A(x - 0.11, -0.55, 0.088, 0.132, -90, 90), c.wood); break;
    case 'axe': pole(p, c, x, y + 0.12, x, y - 0.45, 0.022); p.glass(p.S([[x + 0.01, y - 0.46], [x + 0.22, y - 0.56], [x + 0.24, y - 0.3], [x + 0.01, y - 0.36]], 4), c.metal, { rise: 0.25 }); break;
    case 'mace': pole(p, c, x, y + 0.1, x, y - 0.4, 0.022); p.glass(p.map(Shape.star(x, y - 0.47, 0.14, 0.09, 9)), c.metal); p.glass(p.E(x, y - 0.47, 0.09), shade(c.metal, -0.1)); break;
    case 'cleaver': pole(p, c, x, y + 0.1, x, y - 0.1, 0.024); p.glass(p.S([[x - 0.02, y - 0.1], [x + 0.06, y - 0.1], [x + 0.08, y - 0.42], [x - 0.2, y - 0.42], [x - 0.2, y - 0.2]], 2), c.metal, { rise: 0.25 }); break;
    case 'bow': {
      const bow = p.S([[x + 0.02, y - 0.5], [x + 0.18, y - 0.3], [x + 0.22, y], [x + 0.18, y + 0.3], [x + 0.02, y + 0.5], [x + 0.13, y + 0.3], [x + 0.17, y], [x + 0.13, y - 0.3]], 5);
      p.leadLine([[p.X(x + 0.03), p.Y(y - 0.49)], [p.X(x - 0.04), p.Y(y)], [p.X(x + 0.03), p.Y(y + 0.49)]], p.leadW * 0.6);
      p.glass(bow, c.wood, { tex: 'streak' }); break;
    }
    case 'shield': p.glass(p.S([[x - 0.2, y - 0.24], [x + 0.2, y - 0.24], [x + 0.19, y + 0.08], [x, y + 0.3], [x - 0.19, y + 0.08]], 4), c.second, { tex: 'mottle' }); p.glass(p.E(x, y - 0.02, 0.06), c.gold); break;
    case 'lute': p.glass(p.C(x - 0.02, y, x - 0.32, y - 0.42, 0.03), c.wood); p.glass(p.E(x + 0.02, y + 0.06, 0.16, 0.2, -0.6), shade(c.wood, 0.08), { tex: 'streak' }); p.dot(x - 0.01, y + 0.03, 0.045, '#2a1d1a'); break;
    case 'book': p.glass(p.P([[x - 0.16, y - 0.16], [x, y - 0.12], [x, y + 0.06], [x - 0.16, y + 0.02]]), '#f3ead5', { tex: 'mottle' }); p.glass(p.P([[x, y - 0.12], [x + 0.16, y - 0.16], [x + 0.16, y + 0.02], [x, y + 0.06]]), '#efe3c8', { tex: 'mottle' }); for (const d of [0.04, 0.08]) { p.stroke([[x - 0.13, y - 0.12 + d], [x - 0.03, y - 0.09 + d]], 0.008, '#5a4a3a', 0.6, false); p.stroke([[x + 0.03, y - 0.09 + d], [x + 0.13, y - 0.12 + d]], 0.008, '#5a4a3a', 0.6, false); } break;
    case 'lens': pole(p, c, x, y + 0.05, x + 0.08, y - 0.22, 0.02); p.glass(p.E(x + 0.12, y - 0.32, 0.12), '#bfe3ef', { tex: 'ripple', glow: 0.4, rise: 0.3 }); break;
    case 'scroll': p.glass(p.R(x - 0.06, y - 0.2, 0.12, 0.3, 0.02), '#f1e4c2', { tex: 'mottle' }); p.glass(p.C(x - 0.09, y - 0.2, x + 0.09, y - 0.2, 0.03), '#d9c49a'); p.glass(p.C(x - 0.09, y + 0.1, x + 0.09, y + 0.1, 0.03), '#d9c49a'); break;
    case 'wand': pole(p, c, x, y + 0.05, x + 0.1, y - 0.36, 0.014, c.dark); p.glass(p.map(Shape.star(x + 0.1, y - 0.42, 0.09, 0.04, 5)), c.gold, { glow: 0.6 }); break;
    case 'globe': p.glass(p.E(x, y - 0.13, 0.13), '#cdb8f0', { tex: 'ripple', glow: 0.55, rise: 0.3 }); p.glass(p.R(x - 0.08, y - 0.02, 0.16, 0.05, 0.02), c.gold); break;
    case 'fan': p.glass(p.A(x, y, 0.02, 0.26, -70, 50), c.accent, { tex: 'streak' }); for (let a = -55; a <= 40; a += 19) { const k = Math.PI / 180 * (a - 90); p.stroke([[x, y], [x + Math.cos(k) * 0.25, y + Math.sin(k) * 0.25]], 0.008, '#3a2a2a', 0.6, false); } break;
    case 'basket': p.glass(p.S([[x - 0.14, y - 0.02], [x + 0.14, y - 0.02], [x + 0.11, y + 0.16], [x - 0.11, y + 0.16]], 3), '#b98a4a', { tex: 'streak', grain: 90 }); p.glass(p.E(x - 0.05, y - 0.06, 0.06), '#d94a4a'); p.glass(p.E(x + 0.06, y - 0.05, 0.055), '#e8b03a'); break;
    case 'disc': p.glass(p.E(x + 0.05, y - 0.12, 0.17), '#26222a', { tex: 'ripple', rise: 0.2 }); p.glass(p.E(x + 0.05, y - 0.12, 0.06), c.accent); break;
  }
}

/* ---------------------------------------------------------------- people-shaped */

function figHum(p, c, f) {
  const k = f.small ? 0.76 : 1, tall = f.tall ? 1.1 : 1;
  scaled(p, k, () => {
    const hr = f.small ? 0.25 : f.bigbrain ? 0.25 : 0.19, hy = (f.small ? -0.46 : -0.6) * tall, sh = hy + hr + 0.06, hip = 0.22;
    const outfit = f.outfit || 'coat', robe = ['robe', 'gown', 'wrap'].includes(outfit), armour = outfit === 'armor' || outfit === 'mail';
    const cloth = outfit === 'armor' ? c.metal : outfit === 'mail' ? tint(c.metal, 0, 0, -0.08) : outfit === 'wrap' ? '#e9dfc6' : outfit === 'bones' ? '#efe6d2' : outfit === 'fleece' ? '#f4efe4' : c.main;
    const trim = outfit === 'armor' ? c.gold : c.accent, legs = armour ? shade(c.metal, -0.08) : outfit === 'bones' ? '#efe6d2' : c.dark;
    const hx = 0.43, hyy = hip - 0.1;
    /* behind the figure */
    if (f.halo) p.glass(p.E(0, hy - 0.02, hr + 0.15), c.gold, { tex: 'mottle', glow: 0.45 });
    if (f.wings) wings(p, c, 0, sh + 0.1, 0.62, f.small ? 'fairy' : 'feather');
    if (f.cape) p.glass(p.S([[-0.24, sh - 0.02], [0.24, sh - 0.02], [0.42, 0.86], [0.1, 0.8], [-0.1, 0.86], [-0.42, 0.8]], 4), c.second, { tex: 'streak' });
    holding(p, c, f.hold, hx, hyy, true);
    if (f.arms === '4') for (const s of [-1, 1]) { p.glass(p.C(s * 0.2, sh + 0.2, s * 0.5, hip + 0.02, 0.06), cloth); p.glass(p.E(s * 0.52, hip + 0.04, 0.06), c.skin); }
    /* legs, or what covers them */
    if (f.wheel) {
      p.glass(p.E(0, 0.72, 0.2), '#2c2a30', { tex: 'ripple' }); p.glass(p.E(0, 0.72, 0.14), c.light, { tex: 'mottle' });
      for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3; p.stroke([[0, 0.72], [Math.cos(t) * 0.14, 0.72 + Math.sin(t) * 0.14]], 0.012, '#2a2a2a', 0.8, false); }
      p.glass(p.C(0, hip, 0, 0.6, 0.04), c.metal);
    } else if (!robe) {
      for (const s of [-1, 1]) {
        if (outfit === 'bones') { p.glass(p.C(s * 0.1, hip, s * 0.1, 0.86, 0.035), legs, { tex: 'mottle' }); p.glass(p.E(s * 0.1, 0.55, 0.05), legs); }
        else p.glass(p.C(s * 0.1, hip, s * 0.11, 0.86, 0.075, 0.065), legs, { tex: 'streak' });
        p.glass(p.E(s * 0.14, 0.9, 0.1, 0.05), '#3a2a24');
      }
    }
    /* body */
    if (robe) {
      const flare = outfit === 'gown' ? 0.44 : 0.36;
      p.pieces(p.S([[-0.25, sh], [0.25, sh], [0.22, hip - 0.05], [flare, GROUND - 0.02], [0, GROUND + 0.01], [-flare, GROUND - 0.02], [-0.22, hip - 0.05]], 4), cloth, p.s * 0.3, { tex: 'streak', vary: 0.6, lean: Math.PI / 2, spread: 0.5 });
      if (outfit === 'wrap') for (let i = 0; i < 6; i++) p.stroke([[-0.3, sh + 0.12 + i * 0.13], [0.3, sh + 0.05 + i * 0.13]], 0.012, '#8a7a5a', 0.55, false);
      else p.glass(p.R(-0.21, hip - 0.08, 0.42, 0.06, 0.02), trim, { tex: 'mottle' });
    } else if (outfit === 'fleece') {
      for (const [x, y, r] of [[-0.16, sh + 0.08, 0.13], [0.16, sh + 0.08, 0.13], [-0.18, 0.04, 0.14], [0.18, 0.04, 0.14], [0, sh + 0.12, 0.14], [0, 0.1, 0.16]]) p.glass(p.E(x, y, r), jitter(cloth, p.rand, 0.5), { tex: 'mottle' });
    } else if (outfit === 'bones') {
      p.glass(p.S([[-0.18, sh], [0.18, sh], [0.15, hip - 0.04], [-0.15, hip - 0.04]], 3), '#2b2731', { tex: 'mottle', edge: 0 });
      p.glass(p.C(0, sh, 0, hip, 0.03), cloth);
      for (let i = 0; i < 4; i++) p.glass(p.C(-0.15, sh + 0.06 + i * 0.065, 0.15, sh + 0.06 + i * 0.065, 0.022), cloth);
      p.glass(p.E(0, hip, 0.13, 0.06), cloth);
    } else {
      const coatHem = outfit === 'coat' ? 0.46 : hip + 0.02, rag = outfit === 'rags';
      const torso = [[-0.27, sh], [0.27, sh], [0.23, (sh + hip) / 2], [0.25, coatHem]];
      if (rag) torso.push([0.15, coatHem - 0.06], [0.08, coatHem + 0.02], [-0.04, coatHem - 0.07], [-0.12, coatHem + 0.01], [-0.19, coatHem - 0.05]);
      torso.push([-0.25, coatHem], [-0.23, (sh + hip) / 2]);
      const t = p.S(torso, rag ? 2 : 4);
      p.pieces(t, cloth, p.s * 0.26, { tex: armour ? 'streak' : 'mottle', vary: 0.7 });
      if (outfit === 'coat') { p.glass(p.P([[-0.08, sh], [0.08, sh], [0, sh + 0.2]]), c.light, { tex: 'mottle' }); for (let i = 0; i < 3; i++) p.dot(0, sh + 0.26 + i * 0.08, 0.018, c.gold, 0.95); }
      if (outfit === 'armor') { for (const s of [-1, 1]) p.glass(p.E(s * 0.27, sh + 0.03, 0.11, 0.075), shade(c.metal, 0.06)); p.glass(p.R(-0.24, hip - 0.06, 0.48, 0.06, 0.02), trim); }
      if (outfit === 'mail') { for (let y = sh + 0.08; y < hip - 0.02; y += 0.06) for (let x = -0.2; x <= 0.2; x += 0.07) p.stroke([[x - 0.03, y], [x, y + 0.025], [x + 0.03, y]], 0.008, '#2a2a33', 0.45); p.glass(p.R(-0.23, hip - 0.06, 0.46, 0.05, 0.02), c.wood); }
      if (rag) { p.glass(p.R(0.06, sh + 0.12, 0.09, 0.09), c.second, { tex: 'mottle' }); p.stroke([[0.06, sh + 0.12], [0.15, sh + 0.21]], 0.008, '#3a2a2a', 0.6, false); }
    }
    /* arms */
    const sleeve = robe && outfit !== 'wrap' ? cloth : outfit === 'fleece' ? '#e9e2d4' : cloth;
    if (f.hold === 'shield') { p.glass(p.C(-0.26, sh + 0.04, -0.34, hip - 0.02, 0.068), sleeve); }
    else { p.glass(p.C(-0.26, sh + 0.04, -0.38, hip, 0.066, 0.06), sleeve, { tex: 'streak' }); p.glass(p.E(-0.39, hip + 0.03, 0.06), outfit === 'bones' ? cloth : c.skin); }
    p.glass(p.C(0.26, sh + 0.04, hx - 0.01, hyy + 0.02, 0.066, 0.06), sleeve, { tex: 'streak' });
    holding(p, c, f.hold, hx, hyy, false);
    p.glass(p.E(hx, hyy + 0.02, 0.062), outfit === 'bones' ? cloth : c.skin);
    if (f.hold === 'shield') holding(p, c, 'shield', -0.36, hip - 0.12, false);
    /* head */
    const skin = outfit === 'bones' ? cloth : outfit === 'wrap' ? '#e9dfc6' : c.skin;
    if (f.hat === 'hood') p.glass(p.S([[-hr * 1.3, hy + hr * 1.15], [-hr * 1.32, hy - hr * 0.5], [0, hy - hr * 1.5], [hr * 1.32, hy - hr * 0.5], [hr * 1.3, hy + hr * 1.15]], 5), c.second, { tex: 'streak' });
    if (f.hat === 'ears') for (const s of [-1, 1]) p.glass(p.E(s * hr * 1.0, hy + hr * 0.2, hr * 0.32, hr * 0.62, s * -0.25), c.wood, { tex: 'streak' });
    p.glass(p.C(0, hy + hr * 0.7, 0, sh, 0.05), skin);
    if (f.lenshead) {
      p.glass(p.R(-hr * 1.05, hy - hr * 0.8, hr * 2.1, hr * 1.6, 0.03), '#3c3a44', { tex: 'mottle' });
      p.glass(p.E(0, hy, hr * 0.62), '#8fc4e8', { tex: 'ripple', glow: 0.5, rise: 0.3 }); p.glass(p.E(0, hy, hr * 0.3), '#1f3a5a');
      p.glass(p.R(hr * 0.4, hy - hr * 1.1, hr * 0.5, hr * 0.3, 0.01), '#3c3a44');
    } else {
      const head = p.E(0, hy, hr * 0.92, hr * 1.04);
      p.glass(head, skin, { tex: 'mottle', texAlpha: 0.35, rise: 0.1, fall: 0.08 });
      if (f.bigbrain) { p.glass(p.S([[-hr * 0.95, hy - hr * 0.3], [-hr * 0.7, hy - hr * 1.35], [0, hy - hr * 1.6], [hr * 0.7, hy - hr * 1.35], [hr * 0.95, hy - hr * 0.3], [0, hy - hr * 0.55]], 5), '#e59ab0', { tex: 'mottle' }); for (const [a, b] of [[-0.5, -1.0], [0.1, -1.3], [0.45, -0.9], [-0.2, -0.75]]) p.stroke([[a * hr, hy + b * hr], [(a + 0.25) * hr, hy + (b - 0.15) * hr], [(a + 0.4) * hr, hy + (b + 0.1) * hr]], 0.01, '#8a3a52', 0.6); }
      if (outfit === 'wrap') for (let i = 0; i < 4; i++) p.stroke([[-hr * 0.9, hy - hr * 0.7 + i * hr * 0.45], [hr * 0.9, hy - hr * 0.5 + i * hr * 0.45]], 0.01, '#8a7a5a', 0.55, false);
      if (f.mask === 'beak') {
        for (const s of [-1, 1]) p.glass(p.E(s * hr * 0.4, hy - hr * 0.1, hr * 0.26), '#30343a', { tex: 'ripple', glow: 0.2 });
        p.glass(p.S([[-hr * 0.3, hy + hr * 0.15], [hr * 0.3, hy + hr * 0.15], [hr * 0.1, hy + hr * 1.35], [0, hy + hr * 1.6], [-hr * 0.06, hy + hr * 1.3]], 4), '#ece1c4', { tex: 'mottle' });
      } else if (outfit === 'bones') {
        for (const s of [-1, 1]) p.fill(p.E(s * hr * 0.36, hy - hr * 0.05, hr * 0.24, hr * 0.28), '#241c22', 0.92);
        p.fill(p.P([[-hr * 0.08, hy + hr * 0.3], [hr * 0.08, hy + hr * 0.3], [0, hy + hr * 0.16]]), '#241c22', 0.9);
        for (let i = -2; i <= 2; i++) p.stroke([[i * hr * 0.12, hy + hr * 0.55], [i * hr * 0.12, hy + hr * 0.75]], 0.008, '#241c22', 0.7, false);
      } else face(p, 0, hy + hr * 0.08, hr, { mouth: f.mouth || (outfit === 'wrap' ? 'flat' : 'smile'), cheeks: '#d9606a', brows: f.brows });
      if (f.mirror) { const gg = p.g; gg.save(); p.path(head); gg.clip(); gg.fillStyle = 'rgba(220,235,255,0.35)'; gg.fillRect(p.X(-hr), p.Y(hy - hr * 1.1), p.s * hr * 2, p.s * hr * 2.2); gg.restore(); }
      /* hair */
      if (!f.bald && !['hood', 'helm', 'wizard', 'top', 'veil'].includes(f.hat) && outfit !== 'bones' && outfit !== 'wrap' && !f.bigbrain && !f.mask)
        p.glass(p.S([[-hr * 0.98, hy + hr * 0.15], [-hr * 0.92, hy - hr * 0.72], [0, hy - hr * 1.1], [hr * 0.92, hy - hr * 0.72], [hr * 0.98, hy + hr * 0.15], [hr * 0.72, hy - hr * 0.42], [0.1 * hr, hy - hr * 0.6], [-hr * 0.72, hy - hr * 0.42]], 4), c.hair, { tex: 'streak' });
      if (f.bald) p.dot(-hr * 0.35, hy - hr * 0.6, hr * 0.15, '#ffffff', 0.35);
    }
    if (f.cape && f.hat !== 'hood') p.glass(p.S([[-0.24, sh - 0.03], [0, sh + 0.06], [0.24, sh - 0.03], [0.18, sh - 0.12], [-0.18, sh - 0.12]], 3), shade(c.second, -0.05));
    hat(p, c, f.hat, 0, hy, hr);
  });
}

/** what is on a head of radius r at (x, y) */
function hat(p, c, kind, x, y, r) {
  switch (kind) {
    case 'straw':
      p.glass(p.E(x, y - r * 0.9, r * 0.78, r * 0.52), '#e6c56c', { tex: 'streak', grain: 90 });
      p.glass(p.E(x, y - r * 0.58, r * 1.75, r * 0.3), '#efd27c', { tex: 'streak', grain: 0 });
      p.glass(p.R(x - r * 0.78, y - r * 0.82, r * 1.56, r * 0.16, 0.01), c.accent); break;
    case 'bicorne':
      p.glass(p.S([[x - r * 1.7, y - r * 0.45], [x - r * 0.6, y - r * 1.25], [x, y - r * 1.55], [x + r * 0.6, y - r * 1.25], [x + r * 1.7, y - r * 0.45], [x, y - r * 0.72]], 5), '#2a2a3a', { tex: 'mottle' });
      p.glass(p.E(x + r * 0.5, y - r * 1.0, r * 0.18), c.gold); break;
    case 'wide':
      p.glass(p.R(x - r * 0.7, y - r * 1.55, r * 1.4, r * 0.95, r * 0.25), '#3a2a24', { tex: 'mottle' });
      p.glass(p.E(x, y - r * 0.62, r * 2.0, r * 0.3), '#4a3528', { tex: 'streak', grain: 0 }); break;
    case 'crown': {
      const base = y - r * 0.68, pts = [[x - r * 0.82, base + r * 0.18], [x + r * 0.82, base + r * 0.18]];
      for (let i = 4; i >= 0; i--) { const px = x - r * 0.82 + i * r * 0.41; pts.push([px, base - (i % 2 ? r * 0.38 : r * 0.72)]); if (i) pts.push([px - r * 0.2, base - r * 0.18]); }
      p.glass(p.P(pts), c.gold, { tex: 'mottle', glow: 0.3 });
      for (const i of [-1, 0, 1]) p.glass(p.E(x + i * r * 0.4, base + r * 0.02, r * 0.09), i ? '#3a6ad0' : '#d03a4a'); break;
    }
    case 'helm':
      p.glass(p.S([[x - r * 1.0, y + r * 0.35], [x - r * 1.02, y - r * 0.5], [x, y - r * 1.15], [x + r * 1.02, y - r * 0.5], [x + r * 1.0, y + r * 0.35], [x + r * 0.6, y + r * 0.1], [x + r * 0.6, y - r * 0.1], [x - r * 0.6, y - r * 0.1], [x - r * 0.6, y + r * 0.1]], 3), c.metal, { tex: 'streak', rise: 0.25 });
      p.fill(p.R(x - r * 0.55, y - r * 0.22, r * 1.1, r * 0.12, 0.01), '#1d1a22', 0.85);
      p.glass(p.S([[x - r * 0.12, y - r * 1.1], [x + r * 0.1, y - r * 1.1], [x + r * 0.5, y - r * 1.75], [x - r * 0.1, y - r * 1.55]], 4), c.accent, { tex: 'streak' }); break;
    case 'wizard':
      p.glass(p.S([[x - r * 1.0, y - r * 0.55], [x + r * 1.0, y - r * 0.55], [x + r * 0.45, y - r * 1.6], [x + r * 0.55, y - r * 2.5], [x - r * 0.2, y - r * 1.9]], 5), c.second, { tex: 'streak' });
      p.glass(p.E(x, y - r * 0.55, r * 1.45, r * 0.25), shade(c.second, -0.06), { tex: 'streak', grain: 0 });
      p.glass(p.map(Shape.star(x - r * 0.05, y - r * 1.25, r * 0.22, r * 0.09, 5)), c.gold, { glow: 0.4 }); break;
    case 'cap':
      p.glass(p.S([[x - r * 0.95, y - r * 0.35], [x - r * 0.8, y - r * 0.95], [x, y - r * 1.12], [x + r * 0.8, y - r * 0.95], [x + r * 0.95, y - r * 0.35]], 4), c.second, { tex: 'mottle' });
      p.glass(p.S([[x + r * 0.2, y - r * 0.42], [x + r * 1.5, y - r * 0.38], [x + r * 1.45, y - r * 0.25], [x + r * 0.2, y - r * 0.26]], 2), shade(c.second, -0.08)); break;
    case 'cone':
      p.glass(p.S([[x - r * 0.95, y - r * 0.45], [x + r * 0.95, y - r * 0.45], [x + r * 0.2, y - r * 2.2], [x - r * 0.1, y - r * 2.3]], 4), '#c8343c', { tex: 'streak' }); break;
    case 'horns':
      for (const s of [-1, 1]) p.glass(p.S([[x + s * r * 0.45, y - r * 0.8], [x + s * r * 0.78, y - r * 0.6], [x + s * r * 1.25, y - r * 1.35], [x + s * r * 1.0, y - r * 1.75], [x + s * r * 0.95, y - r * 1.3]], 4), '#e8dcc0', { tex: 'mottle' }); break;
    case 'top':
      p.glass(p.R(x - r * 0.62, y - r * 2.0, r * 1.24, r * 1.42, 0.01), '#26232c', { tex: 'mottle' });
      p.glass(p.R(x - r * 0.62, y - r * 0.95, r * 1.24, r * 0.2, 0.01), c.accent);
      p.glass(p.E(x, y - r * 0.6, r * 1.2, r * 0.2), '#2e2a34', { tex: 'streak', grain: 0 }); break;
    case 'veil':
      p.glass(p.S([[x - r * 1.0, y - r * 0.4], [x - r * 0.5, y - r * 1.15], [x + r * 0.5, y - r * 1.15], [x + r * 1.0, y - r * 0.4], [x + r * 1.5, y + r * 2.4], [x - r * 1.5, y + r * 2.4]], 4), c.light, { tex: 'ripple', alpha: 0.55, edge: 0.1 });
      p.glass(p.E(x, y - r * 1.0, r * 0.3, r * 0.14), c.gold); break;
    case 'party':
      p.glass(p.P([[x - r * 0.6, y - r * 0.7], [x + r * 0.6, y - r * 0.7], [x + r * 0.1, y - r * 2.2]]), c.accent, { tex: 'mottle' });
      p.glass(p.E(x + r * 0.1, y - r * 2.25, r * 0.16), c.gold); break;
    case 'bun':
      p.glass(p.E(x, y - r * 1.05, r * 0.45, r * 0.38), c.hair, { tex: 'streak' }); break;
    case 'earmuffs':
      p.glass(p.A(x, y, r * 1.0, r * 1.12, -80, 80), c.metal);
      for (const s of [-1, 1]) p.glass(p.E(x + s * r * 1.02, y, r * 0.3, r * 0.36), c.accent, { tex: 'mottle' }); break;
  }
}

/* ---------------------------------------------------------------- four-legged, and the like */

function figBeast(p, c, f) {
  const kind = f.kind || 'hound';
  if (kind === 'rex') return figRex(p, c, f);
  if (kind === 'frog') return figFrog(p, c, f);
  const P = {
    bull: { body: [0.58, 0.32], head: [0.24, 0.21], legs: 0.085, low: 0 }, cow: { body: [0.6, 0.3], head: [0.22, 0.19], legs: 0.075, low: 0 },
    hound: { body: [0.5, 0.24], head: [0.2, 0.17], legs: 0.06, low: 0.04 }, cat: { body: [0.48, 0.22], head: [0.19, 0.17], legs: 0.055, low: 0.06 },
    bear: { body: [0.6, 0.4], head: [0.25, 0.22], legs: 0.11, low: -0.04 }, croc: { body: [0.72, 0.18], head: [0.3, 0.12], legs: 0.06, low: 0.25 },
    jackal: { body: [0.46, 0.2], head: [0.18, 0.15], legs: 0.05, low: 0.02 }, goat: { body: [0.5, 0.26], head: [0.18, 0.16], legs: 0.055, low: 0.02 },
    sheep: { body: [0.56, 0.36], head: [0.16, 0.16], legs: 0.055, low: 0.04 }, wolf: { body: [0.52, 0.25], head: [0.2, 0.17], legs: 0.06, low: 0.03 },
    pig: { body: [0.56, 0.34], head: [0.22, 0.2], legs: 0.07, low: 0.12 }, tiger: { body: [0.56, 0.26], head: [0.22, 0.2], legs: 0.07, low: 0.04 },
  }[kind] || { body: [0.5, 0.25], head: [0.2, 0.17], legs: 0.06, low: 0.04 };
  const ghost = f.ghost, coat = ghost ? mix(c.main, '#eef4ff', 0.65) : c.main, op = ghost ? { alpha: 0.82, glow: 0.35 } : {};
  const by = 0.28 + P.low, bx = -0.08, [brx, bry] = P.body, legTop = by + bry * 0.4, legY = GROUND - 0.03;
  const hx = bx + brx * 0.95, hy = by - bry * (kind === 'croc' ? 0.1 : 0.75);
  const dark = shade(coat, -0.12);
  /* tail */
  const tx = bx - brx * 0.92;
  if (kind === 'cat') p.glass(p.S([[tx, by - 0.05], [tx - 0.2, by - 0.25], [tx - 0.18, by - 0.62], [tx - 0.1, by - 0.66], [tx - 0.1, by - 0.28], [tx + 0.04, by + 0.05]], 4), dark, op);
  else if (kind === 'croc') p.glass(p.S([[tx + 0.05, by - 0.1], [tx - 0.55, by + 0.12], [tx - 0.7, by + 0.22], [tx - 0.4, by + 0.2], [tx + 0.05, by + 0.12]], 4), dark, op);
  else if (kind === 'pig') p.stroke([[tx, by - 0.05], [tx - 0.08, by - 0.12], [tx - 0.03, by - 0.18], [tx - 0.1, by - 0.2]], 0.018, '#8a3a4a', 0.8);
  else if (['jackal', 'wolf', 'hound'].includes(kind)) p.glass(p.S([[tx + 0.04, by - 0.06], [tx - 0.24, by - 0.3], [tx - 0.3, by - 0.18], [tx - 0.05, by + 0.06]], 4), dark, op);
  else if (kind !== 'sheep' && kind !== 'bear') p.glass(p.C(tx, by - 0.02, tx - 0.12, by + 0.32, 0.02), dark, op);
  /* far legs, then body, then near legs */
  const legs = [[bx - brx * 0.62, -0.03], [bx + brx * 0.55, -0.03], [bx - brx * 0.45, 0.03], [bx + brx * 0.72, 0.03]];
  const legColor = kind === 'sheep' ? '#2c2628' : ghost ? coat : kind === 'cow' ? '#f2ece0' : coat;
  const leg = (x, d) => {
    const top = legTop + d;
    if (ghost) { p.glass(p.C(x, top, x + 0.02, legY - 0.16, P.legs, P.legs * 0.4), shade(legColor, d < 0 ? -0.08 : 0), { alpha: 0.6 }); return; }
    p.glass(p.C(x, top, x + 0.01, legY, P.legs, P.legs * 0.85), shade(legColor, d < 0 ? -0.1 : 0), { tex: 'streak' });
    p.glass(p.E(x + 0.02, legY + 0.01, P.legs * 1.25, P.legs * 0.55), kind === 'cat' || kind === 'tiger' || kind === 'bear' || kind === 'croc' ? shade(legColor, -0.18) : '#2e2624');
  };
  leg(...legs[0]); leg(...legs[1]);
  if (kind === 'sheep') {
    for (const [x, y, r] of [[-0.42, 0.18, 0.2], [-0.15, 0.08, 0.22], [0.15, 0.1, 0.21], [0.36, 0.2, 0.18], [-0.38, 0.4, 0.19], [-0.08, 0.42, 0.22], [0.22, 0.4, 0.2]]) p.glass(p.E(bx + x + 0.08, by + y - 0.24, r), jitter(f.fleece || '#f3eee4', p.rand, 0.4), { tex: 'mottle', ...op });
  } else {
    const body = p.E(bx, by, brx, bry, kind === 'bull' ? -0.08 : 0);
    p.pieces(body, coat, p.s * (brx * 0.75), { tex: kind === 'croc' ? 'seedy' : 'streak', vary: 0.5, lean: Math.PI / 2, spread: 0.8, ...op });
    if (kind === 'cow') for (const [x, y, r] of [[-0.22, -0.05, 0.13], [0.12, 0.08, 0.1], [-0.38, 0.12, 0.08]]) p.glass(p.S([[bx + x - r, by + y], [bx + x - r * 0.3, by + y - r * 0.9], [bx + x + r, by + y - r * 0.4], [bx + x + r * 0.7, by + y + r * 0.8], [bx + x - r * 0.3, by + y + r * 0.7]], 4), f.spots || '#2c2830');
    if (kind === 'tiger') for (let i = 0; i < 6; i++) p.stroke([[bx - brx * 0.7 + i * 0.16, by - bry * 0.95], [bx - brx * 0.66 + i * 0.16 + 0.04, by - bry * 0.3], [bx - brx * 0.72 + i * 0.16, by + bry * 0.1]], 0.03, '#241a1a', 0.85);
    if (kind === 'croc') for (let i = 0; i < 7; i++) p.glass(p.P([[bx - brx * 0.7 + i * 0.2, by - bry * 0.85], [bx - brx * 0.62 + i * 0.2, by - bry * 1.35], [bx - brx * 0.54 + i * 0.2, by - bry * 0.85]]), shade(coat, -0.15));
    if (kind === 'bull' || kind === 'bear') p.glass(p.E(bx + brx * 0.5, by - bry * 0.15, brx * 0.42, bry * 0.85), shade(coat, -0.06), { tex: 'streak', ...op });
  }
  leg(...legs[2]); leg(...legs[3]);
  /* head */
  const [hrx, hry] = P.head, headCol = kind === 'sheep' ? '#2e2a2e' : coat;
  if (['cat', 'tiger', 'wolf', 'jackal', 'fox'].includes(kind)) for (const d of [-0.5, 0.35]) p.glass(p.P([[hx + hrx * d - 0.07, hy - hry * 0.6], [hx + hrx * d + 0.07, hy - hry * 0.6], [hx + hrx * d + (kind === 'jackal' ? 0.02 : 0.01), hy - hry * (kind === 'jackal' ? 2.3 : 1.65)]]), shade(headCol, d < 0 ? -0.1 : 0), op);
  if (kind === 'hound') p.glass(p.E(hx - hrx * 0.6, hy + hry * 0.2, hrx * 0.32, hry * 0.8, 0.3), shade(headCol, -0.15), op);
  if (kind === 'bear') for (const d of [-0.6, 0.4]) p.glass(p.E(hx + hrx * d, hy - hry * 0.85, hrx * 0.28), shade(headCol, -0.08), op);
  if (kind === 'pig' || kind === 'sheep' || kind === 'goat' || kind === 'cow') p.glass(p.E(hx - hrx * 0.7, hy - hry * 0.4, hrx * 0.38, hry * 0.2, -0.5), shade(headCol, -0.1), op);
  const snout = kind === 'croc' ? [hrx * 1.4, hry * 0.6] : kind === 'pig' ? [hrx * 0.42, hry * 0.42] : kind === 'cat' ? [hrx * 0.4, hry * 0.36] : [hrx * 0.62, hry * 0.5];
  p.glass(p.E(hx, hy, hrx, hry), headCol, { tex: 'mottle', ...op });
  if (kind === 'bull' || kind === 'cow') for (const d of [-1, 1]) p.glass(p.S([[hx + d * hrx * 0.35, hy - hry * 0.75], [hx + d * hrx * 0.55, hy - hry * 0.95], [hx + d * hrx * (kind === 'bull' ? 1.4 : 0.9), hy - hry * (kind === 'bull' ? 1.9 : 1.5)], [hx + d * hrx * 0.45, hy - hry * 1.1]], 4), '#efe3c6', { tex: 'mottle' });
  if (kind === 'goat') p.glass(p.S([[hx - hrx * 0.1, hy - hry * 0.8], [hx - hrx * 0.9, hy - hry * 1.8], [hx - hrx * 1.5, hy - hry * 1.2], [hx - hrx * 1.0, hy - hry * 1.1]], 4), '#b9a27a', { tex: 'streak' });
  const sx = hx + hrx * (kind === 'croc' ? 1.3 : 0.85), sy = hy + hry * (kind === 'croc' ? 0.15 : 0.32);
  const snoutCol = kind === 'pig' ? shade(coat, 0.06) : kind === 'cow' || kind === 'bull' ? '#e9b4a8' : kind === 'tiger' || kind === 'cat' ? '#f1e8da' : kind === 'sheep' ? '#3a3236' : shade(headCol, 0.08);
  p.glass(p.E(sx, sy, snout[0], snout[1]), snoutCol, { tex: 'mottle', ...op });
  if (kind === 'croc') { for (let i = 0; i < 6; i++) p.fill(p.P([[sx - snout[0] * 0.8 + i * snout[0] * 0.3, sy], [sx - snout[0] * 0.7 + i * snout[0] * 0.3, sy], [sx - snout[0] * 0.75 + i * snout[0] * 0.3, sy + 0.05]]), '#fffaf0', 0.95); p.stroke([[sx - snout[0], sy], [sx + snout[0] * 0.9, sy]], 0.012); }
  if (kind === 'pig') { for (const d of [-1, 1]) p.dot(sx + d * snout[0] * 0.35, sy, snout[0] * 0.15, '#6a2a3a'); }
  else if (kind !== 'croc') p.dot(sx + snout[0] * 0.55, sy - snout[1] * 0.3, snout[1] * 0.28, '#241a1c');
  if (kind === 'bull') p.glass(p.A(sx + snout[0] * 0.3, sy + snout[1] * 0.3, snout[1] * 0.45, snout[1] * 0.62, 90, 270), c.gold);
  if (kind === 'cat' || kind === 'tiger') for (const d of [-1, 0, 1]) p.stroke([[sx + snout[0] * 0.2, sy + d * 0.02], [sx + snout[0] * 2.4, sy - 0.03 + d * 0.05]], 0.006, '#2a1d1a', 0.6, false);
  p.eye(hx + hrx * (kind === 'croc' ? 0.1 : 0.25), hy - hry * (kind === 'croc' ? 0.5 : 0.25), hry * 0.2, { white: kind === 'croc' || kind === 'cat' ? '#e9d66a' : undefined, color: kind === 'croc' || kind === 'cat' ? '#1a1a14' : undefined, look: 1 });
  if (kind === 'sheep') { p.glass(p.E(hx - hrx * 0.4, hy - hry * 0.85, hrx * 0.75, hry * 0.5), '#f6f1e6', { tex: 'mottle' }); }
  if (kind === 'goat') p.glass(p.P([[sx - 0.03, sy + snout[1] * 0.6], [sx + 0.05, sy + snout[1] * 0.6], [sx, sy + snout[1] * 2.2]]), '#d8cfbe');
  if (f.spikes) for (let i = 0; i < 5; i++) p.glass(p.P([[hx - hrx * 0.6 + i * hrx * 0.25, hy - hry * 0.8], [hx - hrx * 0.45 + i * hrx * 0.25, hy - hry * 0.8], [hx - hrx * 0.62 + i * hrx * 0.28, hy - hry * (1.8 + (i % 2) * 0.35)]]), c.accent);
  if (f.hat === 'top') hat(p, c, 'top', hx - hrx * 0.1, hy - hry * 0.4, hry * 0.75);
  if (f.wings) wings(p, c, bx, by - bry, 0.45, 'bat');
}

function figRex(p, c, f) {
  const coat = c.main, dark = shade(coat, -0.12);
  if (f.wings) wings(p, c, -0.15, -0.25, 0.7, 'bat', shade(c.second, -0.05));
  p.glass(p.S([[-0.25, 0.25], [-0.8, 0.55], [-1.05, 0.62], [-0.75, 0.42], [-0.2, 0.05]], 4), dark, { tex: 'streak' });
  for (const [x, d] of [[-0.2, -0.08], [0.05, 0]]) { p.glass(p.C(x, 0.25, x + 0.05, 0.62, 0.12, 0.09), shade(coat, d), { tex: 'streak' }); p.glass(p.C(x + 0.05, 0.62, x + 0.02, GROUND - 0.03, 0.08, 0.06), shade(coat, d - 0.04)); p.glass(p.E(x + 0.08, GROUND, 0.12, 0.045), shade(coat, -0.2)); }
  p.pieces(p.E(-0.08, 0.05, 0.36, 0.34, -0.5), coat, p.s * 0.3, { tex: 'streak', vary: 0.5 });
  p.glass(p.S([[-0.05, -0.15], [0.16, -0.05], [0.22, 0.2], [0.08, 0.36], [-0.08, 0.3], [-0.1, 0.05]], 4), mix(coat, '#f3e6c0', 0.55), { tex: 'mottle' });
  p.glass(p.C(0.18, -0.08, 0.38, 0.02, 0.04), coat); p.glass(p.C(0.38, 0.02, 0.44, 0.1, 0.03), coat);
  p.glass(p.C(0.06, -0.22, 0.2, -0.45, 0.13), coat);
  p.glass(p.S([[0.05, -0.62], [0.35, -0.72], [0.72, -0.6], [0.74, -0.47], [0.42, -0.42], [0.1, -0.38]], 4), coat, { tex: 'mottle' });
  p.glass(p.S([[0.14, -0.4], [0.66, -0.42], [0.62, -0.32], [0.2, -0.28]], 3), shade(coat, -0.1));
  for (let i = 0; i < 5; i++) p.fill(p.P([[0.28 + i * 0.08, -0.42], [0.33 + i * 0.08, -0.42], [0.305 + i * 0.08, -0.36]]), '#fffaf0', 0.95);
  p.eye(0.36, -0.58, 0.035, { white: '#f0dc72', color: '#1a1a14', look: 1 });
  for (let i = 0; i < 5; i++) p.glass(p.P([[-0.35 + i * 0.12, -0.18 + i * -0.06], [-0.28 + i * 0.12, -0.2 + i * -0.06], [-0.36 + i * 0.12, -0.34 + i * -0.06]]), c.accent);
}
function figFrog(p, c, f) {
  const coat = c.main;
  for (const s of [-1, 1]) p.glass(p.E(s * 0.42, 0.62, 0.3, 0.22, s * 0.4), shade(coat, -0.08), { tex: 'streak' });
  p.pieces(p.E(0, 0.32, 0.5, 0.45), coat, p.s * 0.35, { tex: 'seedy', vary: 0.5 });
  p.glass(p.E(0, 0.45, 0.32, 0.3), mix(coat, '#f3e6b0', 0.5), { tex: 'mottle' });
  for (const s of [-1, 1]) { p.glass(p.C(s * 0.2, 0.55, s * 0.24, GROUND - 0.04, 0.06), coat); p.glass(p.E(s * 0.26, GROUND - 0.02, 0.1, 0.04), shade(coat, -0.12)); }
  for (const s of [-1, 1]) { p.glass(p.E(s * 0.24, -0.12, 0.14), coat); p.eye(s * 0.24, -0.13, 0.085, { white: '#f2e9a0', color: '#1a1a14' }); }
  p.stroke([[-0.3, 0.06], [0, 0.14], [0.3, 0.06]], 0.018);
  if (f.fuse || true) { p.glass(p.C(0.05, -0.12, 0.12, -0.42, 0.02), '#5a4a3a'); p.glass(p.map(Shape.star(0.13, -0.47, 0.07, 0.03, 7)), '#ffd24a', { glow: 0.8 }); }
}

/* ---------------------------------------------------------------- birds */

function figBird(p, c, f) {
  const kind = f.kind || 'hen', ghost = f.ghost, op = ghost ? { alpha: 0.85, glow: 0.3 } : {};
  const col = ghost ? mix(c.main, '#eef3ff', 0.6) : c.main, beakCol = kind === 'crow' ? '#3a3a44' : '#eca23a';
  if (kind === 'owl') {
    for (const s of [-1, 1]) p.glass(p.E(s * 0.13, GROUND - 0.03, 0.08, 0.035), beakCol);
    p.pieces(p.E(0, 0.28, 0.42, 0.56), col, p.s * 0.36, { tex: 'streak', vary: 0.5, ...op });
    p.glass(p.E(0, 0.36, 0.27, 0.38), mix(col, '#f6ead0', 0.55), { tex: 'mottle', ...op });
    for (let y = 0.1; y < 0.66; y += 0.1) for (const x of [-0.12, 0, 0.12]) p.stroke([[x - 0.035, y], [x, y + 0.03], [x + 0.035, y]], 0.01, shade(col, -0.3), 0.6);
    for (const s of [-1, 1]) p.glass(p.E(s * 0.36, 0.28, 0.13, 0.36, s * 0.15), shade(col, -0.1), { tex: 'streak', ...op });
    for (const s of [-1, 1]) p.glass(p.P([[s * 0.16, -0.58], [s * 0.36, -0.55], [s * 0.36, -0.84]]), shade(col, -0.06), op);
    p.glass(p.E(0, -0.36, 0.4, 0.32), col, { tex: 'streak', ...op });
    for (const s of [-1, 1]) { p.glass(p.E(s * 0.16, -0.36, 0.15), mix(col, '#f6ead0', 0.6), { tex: 'mottle' }); p.eye(s * 0.16, -0.36, 0.075, { white: '#f4d24a', color: '#1a1a14' }); }
    p.glass(p.P([[-0.05, -0.27], [0.05, -0.27], [0, -0.14]]), beakCol);
    if (f.hold) holding(p, c, f.hold, 0.08, 0.5, false);
    return;
  }
  if (kind === 'swan') {
    p.glass(p.E(0, GROUND - 0.02, 0.8, 0.1), '#9ccbe0', { tex: 'ripple', glow: 0.3 });
    p.pieces(p.S([[-0.62, 0.42], [-0.3, 0.18], [0.2, 0.2], [0.45, 0.38], [0.3, 0.7], [-0.4, 0.72]], 5), '#f6f4ef', p.s * 0.32, { tex: 'mottle', vary: 0.4, ...op });
    p.glass(p.S([[-0.45, 0.4], [-0.1, 0.28], [0.15, 0.35], [-0.1, 0.55]], 5), '#e6e8ee', { tex: 'streak' });
    const neck = [[0.32, 0.32], [0.42, 0.0], [0.3, -0.3], [0.32, -0.52]], left = [], right = [];
    const pts = Shape.curve(neck, 6);
    pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, rr = 0.07 - i * 0.0012; left.push([q[0] + Math.cos(ang) * rr, q[1] + Math.sin(ang) * rr]); right.push([q[0] - Math.cos(ang) * rr, q[1] - Math.sin(ang) * rr]); });
    p.glass(p.map(left.concat(right.reverse())), '#f6f4ef', { tex: 'mottle', ...op });
    p.glass(p.E(0.38, -0.56, 0.12, 0.09), '#f6f4ef', op);
    p.glass(p.P([[0.46, -0.6], [0.66, -0.52], [0.46, -0.5]]), beakCol); p.dot(0.4, -0.58, 0.022, '#1a1418');
    return;
  }
  const k = kind === 'chick' ? 0.7 : 1;
  scaled(p, k, () => {
    for (const s of [-0.1, 0.12]) { p.stroke([[s, 0.5], [s + 0.02, GROUND - 0.02]], 0.02, '#d88a2a', 0.95, false); p.stroke([[s - 0.07, GROUND - 0.01], [s + 0.02, GROUND - 0.03], [s + 0.1, GROUND - 0.01]], 0.016, '#d88a2a', 0.95); }
    if (kind === 'rooster') for (let i = 0; i < 4; i++) p.glass(p.S([[-0.4, 0.2], [-0.55 - i * 0.05, -0.15 - i * 0.12], [-0.8 - i * 0.03, -0.05 - i * 0.08], [-0.72 - i * 0.02, 0.25], [-0.45, 0.32]], 4), i % 2 ? '#2a4a3a' : '#3a2a4a', { tex: 'ripple' });
    else if (kind === 'jay') p.glass(p.S([[-0.4, 0.25], [-0.85, 0.05], [-0.88, 0.15], [-0.45, 0.4]], 3), shade(col, -0.08), op);
    else if (kind !== 'chick') p.glass(p.S([[-0.38, 0.2], [-0.64, -0.08], [-0.66, 0.12], [-0.5, 0.36]], 4), shade(col, -0.1), op);
    p.pieces(p.E(-0.05, 0.28, 0.44, 0.34, 0.1), col, p.s * 0.34, { tex: 'streak', vary: 0.5, ...op });
    p.glass(p.E(-0.1, 0.25, 0.28, 0.17, -0.2), shade(col, kind === 'mallard' ? -0.25 : -0.09), { tex: 'streak', ...op });
    for (let i = 0; i < 3; i++) p.stroke([[-0.3 + i * 0.1, 0.24], [-0.2 + i * 0.1, 0.34]], 0.01, shade(col, -0.3), 0.55, false);
    const hx = 0.3, hy = -0.12, head = kind === 'mallard' ? '#2f7a52' : col;
    if (kind === 'jay') p.glass(p.P([[hx - 0.18, hy - 0.08], [hx - 0.02, hy - 0.16], [hx - 0.28, hy - 0.38]]), shade(col, -0.06));
    if (kind === 'hen' || kind === 'rooster') for (const [x, y, r] of [[hx - 0.08, hy - 0.2, 0.06], [hx, hy - 0.23, 0.07], [hx + 0.08, hy - 0.2, 0.06]]) p.glass(p.E(x, y, r), '#d82a32');
    p.glass(p.E(hx, hy, 0.2, 0.19), head, { tex: 'mottle', ...op });
    if (kind === 'mallard') p.glass(p.A(hx - 0.02, hy + 0.15, 0.04, 0.07, 120, 240), '#f6f4ef');
    p.glass(kind === 'mallard' ? p.S([[hx + 0.16, hy + 0.0], [hx + 0.36, hy + 0.02], [hx + 0.36, hy + 0.08], [hx + 0.16, hy + 0.08]], 2) : p.P([[hx + 0.17, hy - 0.04], [hx + (kind === 'crow' ? 0.42 : 0.32), hy + 0.03], [hx + 0.17, hy + 0.08]]), kind === 'mallard' ? '#e8c43a' : beakCol);
    if (kind === 'hen' || kind === 'rooster') p.glass(p.S([[hx + 0.14, hy + 0.08], [hx + 0.2, hy + 0.12], [hx + 0.17, hy + 0.24], [hx + 0.12, hy + 0.14]], 3), '#d82a32');
    p.eye(hx + 0.05, hy - 0.04, 0.035, { look: 1 });
    if (f.brows || kind === 'crow' || /fierce|spite/i.test(f.name || '')) p.stroke([[hx - 0.02, hy - 0.12], [hx + 0.12, hy - 0.07]], 0.02, '#1a1214', 0.9, false);
  });
}

/* ---------------------------------------------------------------- round things with faces */

function figOrb(p, c, f) {
  if (f.crowd) {
    for (const [x, k] of [[-0.62, 0.5], [0.62, 0.5], [-0.32, 0.58], [0.34, 0.58], [0, 0.7]]) scaled(p, k, () => figOrb(p, { ...c, main: jitter(c.main, p.rand, 1.5) }, { ...f, crowd: false }), x);
    return;
  }
  const cy = 0.32, shape = f.shape || 'round';
  const body = shape === 'squat' ? p.E(0, cy + 0.1, 0.62, 0.46) : shape === 'drop' ? p.S([[0, cy - 0.68], [0.36, cy - 0.12], [0.5, cy + 0.25], [0.3, cy + 0.55], [0, cy + 0.6], [-0.3, cy + 0.55], [-0.5, cy + 0.25], [-0.36, cy - 0.12]], 5) : p.E(0, cy, 0.56, 0.56);
  if (f.wings) wings(p, c, 0, cy - 0.15, 0.6, f.wings === 'bat' ? 'bat' : 'feather');
  if (f.glow) { const g = p.g, rg = g.createRadialGradient(p.X(0), p.Y(cy), 0, p.X(0), p.Y(cy), p.s * 0.95); rg.addColorStop(0, 'rgba(255,214,120,0.75)'); rg.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = rg; g.fillRect(0, 0, p.w, p.h); }
  if (f.top === 'ears') for (const s of [-1, 1]) p.glass(p.P([[s * 0.2, cy - 0.45], [s * 0.48, cy - 0.3], [s * 0.5, cy - 0.9]]), shade(c.main, -0.1));
  for (const s of [-1, 1]) p.glass(p.E(s * 0.22, GROUND - 0.02, 0.12, 0.05), shade(c.main, -0.25));
  p.pieces(body, c.main, p.s * 0.42, { tex: f.glow ? 'mottle' : 'streak', vary: 0.55, glow: f.glow ? 0.45 : 0 });
  if (shape === 'squat' && f.top === 'crust') { p.glass(p.S([[-0.62, cy + 0.02], [-0.5, cy - 0.26], [0, cy - 0.38], [0.5, cy - 0.26], [0.62, cy + 0.02], [0, cy - 0.12]], 4), '#e2b66a', { tex: 'mottle' }); for (let i = -2; i <= 2; i++) p.stroke([[i * 0.2, cy - 0.3], [i * 0.24, cy - 0.12]], 0.012, '#8a5a2a', 0.6, false); }
  if (f.glow) for (let i = 0; i < 5; i++) p.stroke([[-0.4 + i * 0.2, cy - 0.45], [-0.42 + i * 0.21, cy + 0.5]], 0.012, shade(c.main, -0.25), 0.55);
  switch (f.top) {
    case 'husk': for (const s of [-1, 0, 1]) p.glass(p.S([[s * 0.15, cy - 0.45], [s * 0.15 + 0.08, cy - 0.5], [s * 0.4, cy - 0.95 + Math.abs(s) * 0.2], [s * 0.15 - 0.05, cy - 0.52]], 4), tint('#6fa04a', s * 6), { tex: 'streak' }); break;
    case 'stem': p.glass(p.S([[-0.04, cy - 0.5], [0.06, cy - 0.5], [0.12, cy - 0.78], [0.02, cy - 0.8]], 3), '#5a7a3a'); p.glass(p.E(0.2, cy - 0.72, 0.13, 0.06, -0.4), '#6fa04a'); break;
    case 'spikes': for (let a = -80; a <= 80; a += 32) { const k = (a - 90) * Math.PI / 180; p.glass(p.P([[Math.cos(k - 0.12) * 0.5, cy + Math.sin(k - 0.12) * 0.5], [Math.cos(k + 0.12) * 0.5, cy + Math.sin(k + 0.12) * 0.5], [Math.cos(k) * 0.78, cy + Math.sin(k) * 0.78]]), shade(c.main, -0.15)); } break;
    case 'earmuffs': hat(p, c, 'earmuffs', 0, cy, 0.52); break;
    case 'bow': for (const s of [-1, 1]) p.glass(p.S([[0, cy - 0.5], [s * 0.3, cy - 0.72], [s * 0.34, cy - 0.45]], 3), c.accent); p.glass(p.E(0, cy - 0.55, 0.07), shade(c.accent, -0.1)); break;
  }
  const ey = shape === 'drop' ? cy + 0.05 : cy - 0.06;
  face(p, 0, ey, 0.5, { eyes: f.eyes === '1' ? 1 : 2, mouth: f.mouth === 'big' ? 'grin' : f.mouth || 'smile', eye: f.eyes === '1' ? 0.16 : 0.13, white: '#f6f1e4', cheeks: '#d9606a', mouthAt: 0.45 });
  if (f.mouth === 'big') p.fill(p.S([[-0.32, cy + 0.12], [0.32, cy + 0.12], [0.2, cy + 0.38], [-0.2, cy + 0.38]], 3), '#3a1218', 0.9);
}

function figGhost(p, c, f) {
  const col = mix(c.main, '#f1f5ff', 0.6), op = { alpha: 0.86, tex: 'ripple', glow: 0.35 };
  if (f.wings) wings(p, c, 0, -0.25, 0.65, 'feather', mix(col, '#ffffff', 0.4));
  const pts = [[0, -0.85], [0.42, -0.62], [0.5, -0.1], [0.55, 0.55], [0.4, 0.78], [0.28, 0.62], [0.13, 0.82], [0, 0.65], [-0.13, 0.82], [-0.28, 0.62], [-0.4, 0.78], [-0.55, 0.55], [-0.5, -0.1], [-0.42, -0.62]];
  p.pieces(p.S(pts, 6), col, p.s * 0.45, { ...op, vary: 0.5 });
  for (const s of [-1, 1]) p.glass(p.S([[s * 0.45, -0.15], [s * 0.78, -0.02], [s * 0.85, 0.12], [s * 0.7, 0.08], [s * 0.45, 0.08]], 4), shade(col, -0.05), op);
  if (f.hold) holding(p, c, f.hold, 0.8, 0.05, false);
  if (f.hold) holding(p, c, f.hold, 0.8, 0.05, true);
  if (f.clock) { p.glass(p.E(0, 0.25, 0.22), '#f6ecd0', { tex: 'mottle' }); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; p.dot(Math.cos(a) * 0.17, 0.25 + Math.sin(a) * 0.17, 0.012, '#3a2a2a'); } p.stroke([[0, 0.25], [0.08, 0.15]], 0.016, '#3a2a2a', 0.9, false); p.stroke([[0, 0.25], [-0.1, 0.27]], 0.012, '#3a2a2a', 0.9, false); }
  if (f.hat === 'hood') p.glass(p.S([[-0.5, -0.1], [-0.46, -0.7], [0, -0.98], [0.46, -0.7], [0.5, -0.1], [0.3, -0.45], [0, -0.55], [-0.3, -0.45]], 4), shade(c.second, -0.1), { tex: 'streak', alpha: 0.9 });
  face(p, 0, -0.35, 0.45, { eyes: f.eyes === '1' ? 1 : 2, mouth: 'o', eye: f.eyes === '1' ? 0.17 : 0.16, gap: 0.38 });
  if (f.hat === 'crown') hat(p, c, 'crown', 0, -0.72, 0.3);
}

function figSlime(p, c, f) {
  const col = c.main;
  p.pieces(p.S([[0, -0.42], [0.34, -0.3], [0.5, 0.15], [0.72, 0.62], [0.8, GROUND - 0.02], [0.3, GROUND + 0.02], [0.12, 0.84], [-0.08, GROUND + 0.02], [-0.78, GROUND - 0.02], [-0.66, 0.6], [-0.5, 0.15], [-0.34, -0.3]], 6), col, p.s * 0.45, { tex: 'ripple', vary: 0.45, glow: 0.3, alpha: 0.95 });
  for (const [x, y, r] of [[-0.35, 0.45, 0.07], [0.42, 0.55, 0.05], [0.1, 0.62, 0.06], [-0.1, 0.2, 0.04]]) p.glass(p.E(x, y, r), shade(col, 0.15), { tex: 'mottle', glow: 0.4 });
  p.glass(p.E(-0.2, -0.18, 0.08, 0.13, 0.5), mix(col, '#ffffff', 0.6), { tex: 'mottle', glow: 0.5 });
  if (f.brain) for (const [a, b] of [[-0.3, -0.1], [0.05, -0.25], [0.25, 0.0]]) p.stroke([[a, b], [a + 0.12, b - 0.08], [a + 0.2, b + 0.06], [a + 0.3, b - 0.02]], 0.02, shade(col, -0.3), 0.6);
  face(p, 0, 0.18, 0.45, { mouth: 'grin', white: '#f6f1e4', gap: 0.4, eye: 0.15 });
}

function figEye(p, c, f) {
  if (f.many) {
    for (const [x, y, r] of [[-0.42, 0.42, 0.3], [0.4, 0.35, 0.34], [0, -0.12, 0.42]]) eyeball(p, c, x, y, r);
    return;
  }
  if (f.arms) for (const s of [-1, 1]) {
    p.glass(p.C(s * 0.45, 0.2, s * 0.85, 0.02, 0.1), c.second, { tex: 'streak' });
    p.glass(p.C(s * 0.85, 0.02, s * 0.78, -0.42, 0.11, 0.09), c.second, { tex: 'streak' });
    p.glass(p.E(s * 0.78, -0.5, 0.11), c.second);
    for (const sx of [-1, 1]) { p.glass(p.C(sx * 0.16, 0.55, sx * 0.2, GROUND - 0.03, 0.07), c.second); p.glass(p.E(sx * 0.22, GROUND - 0.01, 0.1, 0.04), shade(c.second, -0.2)); }
  } else for (const s of [-1, 1]) { p.glass(p.C(s * 0.15, 0.45, s * 0.2, GROUND - 0.03, 0.04), c.second); p.glass(p.E(s * 0.23, GROUND - 0.01, 0.08, 0.035), shade(c.second, -0.2)); }
  eyeball(p, c, 0, 0.05, f.arms ? 0.5 : 0.56);
}
function eyeball(p, c, x, y, r) {
  p.glass(p.E(x, y, r * 1.08), c.second, { tex: 'streak' });
  const white = p.E(x, y, r * 0.92);
  p.glass(white, '#f4eee0', { tex: 'mottle', texAlpha: 0.35 });
  for (let i = 0; i < 6; i++) { const a = p.rand() * TAU; p.stroke([[x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9], [x + Math.cos(a + 0.2) * r * 0.65, y + Math.sin(a + 0.2) * r * 0.65], [x + Math.cos(a - 0.1) * r * 0.5, y + Math.sin(a - 0.1) * r * 0.5]], r * 0.025, '#c0303a', 0.5); }
  p.glass(p.E(x + r * 0.1, y, r * 0.42), c.main, { tex: 'ripple', glow: 0.3 });
  p.dot(x + r * 0.12, y, r * 0.2, '#160f12', 0.95); p.dot(x - r * 0.05, y - r * 0.14, r * 0.08, '#ffffff', 0.85);
  p.glass(p.S([[x - r * 1.08, y - r * 0.05], [x - r * 0.6, y - r * 0.92], [x + r * 0.6, y - r * 0.92], [x + r * 1.08, y - r * 0.05], [x, y - r * 0.6]], 4), shade(c.second, -0.06), { tex: 'streak' });
}
function figEyewing(p, c, f) {
  wings(p, c, 0, -0.05, 0.85, 'bat', c.second);
  for (const s of [-1, 1]) p.glass(p.C(s * 0.12, 0.35, s * 0.18, 0.62, 0.03), c.second);
  eyeball(p, c, 0, 0.02, 0.4);
}

function figJinn(p, c, f) {
  const col = c.main, skin = c.jinnSkin || col;
  const smoke = mix(col, '#ffffff', 0.35);
  p.pieces(p.S([[-0.32, 0.1], [0.32, 0.1], [0.28, 0.4], [0.05, 0.6], [0.3, 0.75], [0.15, GROUND], [-0.25, 0.8], [-0.1, 0.62], [-0.3, 0.4]], 6), smoke, p.s * 0.3, { tex: 'ripple', alpha: 0.85, glow: 0.3 });
  p.glass(p.S([[-0.38, -0.42], [0.38, -0.42], [0.3, 0.15], [-0.3, 0.15]], 4), skin, { tex: 'mottle' });
  p.glass(p.R(-0.3, 0.05, 0.6, 0.08, 0.02), c.gold);
  for (const s of [-1, 1]) p.glass(p.C(s * 0.36, -0.38, s * 0.5, -0.05, 0.09), skin);
  p.glass(p.C(-0.48, -0.08, 0.48, -0.08, 0.075), shade(skin, -0.05));
  p.glass(p.C(0, -0.5, 0, -0.42, 0.06), skin);
  p.glass(p.E(0, -0.66, 0.17, 0.2), skin, { tex: 'mottle' });
  p.glass(p.S([[-0.18, -0.74], [0.18, -0.74], [0.1, -0.86], [0.02, -1.02], [-0.02, -0.9], [-0.12, -0.86]], 3), c.hair || '#2a2632');
  for (const s of [-1, 1]) p.glass(p.A(s * 0.18, -0.6, 0.02, 0.045, 0, 360), c.gold);
  face(p, 0, -0.64, 0.17, { mouth: 'smile', brows: true });
}

function figTree(p, c, f) {
  const wood = c.wood, leaf = f.leaf || c.main, ghost = f.ghost, op = ghost ? { alpha: 0.82, glow: 0.3 } : {};
  const trunkCol = ghost ? mix(wood, '#e8eef8', 0.55) : wood, leafCol = ghost ? mix(leaf, '#e8eef8', 0.55) : leaf;
  if (f.kind === 'stump') {
    p.pieces(p.S([[-0.42, GROUND], [-0.36, 0.0], [0.36, 0.0], [0.42, GROUND], [0.6, GROUND + 0.02], [-0.6, GROUND + 0.02]], 3), trunkCol, p.s * 0.32, { tex: 'streak', grain: 90, vary: 0.5, ...op });
    p.glass(p.E(0, 0.0, 0.36, 0.1), '#d9b97a', { tex: 'ripple', ...op });
    p.stroke([[-0.2, 0.0], [0, -0.04], [0.2, 0.0]], 0.01, '#8a6a3a', 0.6);
    face(p, 0, 0.42, 0.36, { mouth: 'frown', brows: 'cross', eye: 0.14 });
    if (f.hold) { p.glass(p.C(0.38, 0.4, 0.62, 0.15, 0.05), trunkCol); holding(p, c, f.hold, 0.62, 0.15, false); }
    return;
  }
  const trunk = p.S([[-0.12, -0.2], [0.12, -0.2], [0.16, 0.6], [0.34, GROUND], [0.08, 0.85], [0, GROUND + 0.01], [-0.08, 0.85], [-0.34, GROUND], [-0.16, 0.6]], 4);
  p.pieces(trunk, trunkCol, p.s * 0.3, { tex: 'streak', grain: 90, vary: 0.5, ...op });
  if (f.kind === 'willow') {
    p.pieces(p.E(0, -0.42, 0.62, 0.36), leafCol, p.s * 0.3, { tex: 'streak', vary: 0.8, ...op });
    for (let i = -5; i <= 5; i++) p.glass(p.C(i * 0.12, -0.3, i * 0.13 + (p.rand() - 0.5) * 0.06, 0.25 + Math.abs(i % 3) * 0.12, 0.045, 0.02), jitter(leafCol, p.rand, 1.2), { tex: 'streak', ...op });
  } else {
    const blobs = [[-0.36, -0.38, 0.3], [0.34, -0.4, 0.3], [0, -0.62, 0.34], [-0.18, -0.2, 0.26], [0.2, -0.2, 0.26]];
    for (const [x, y, r] of blobs) p.glass(p.E(x, y, r), jitter(leafCol, p.rand, 1.4), { tex: 'streak', ...op });
    if (f.kind === 'apple') for (const [x, y] of [[-0.35, -0.42], [0.1, -0.68], [0.36, -0.3], [-0.1, -0.24], [0.22, -0.52]]) p.glass(p.E(x, y, 0.065), '#d23a3a', { tex: 'mottle', glow: 0.3 });
  }
  face(p, 0, 0.28, 0.24, { mouth: f.kind === 'elm' ? 'frown' : 'smile', eye: 0.16, brows: f.kind === 'elm' ? 'cross' : false });
  if (f.hold) holding(p, c, f.hold, 0.45, 0.1, false);
}

function figPlant(p, c, f) {
  const kind = f.kind || 'fang';
  p.glass(p.C(0, GROUND, 0, 0.2, 0.04), '#4a7a3a', { tex: 'streak' });
  for (const s of [-1, 1]) p.glass(p.S([[0, 0.62], [s * 0.3, 0.45], [s * 0.5, 0.52], [s * 0.28, 0.66]], 4), tint('#5a9a45', s * 8), { tex: 'streak' });
  if (kind === 'flame') {
    for (const [k, col] of [[1, '#e2502a'], [0.72, '#f0902e'], [0.45, '#ffd25a']]) p.glass(p.S([[0, -0.75 * k + 0.25], [0.34 * k, -0.2 * k + 0.22], [0.42 * k, 0.12 + 0.12], [0.2 * k, 0.4], [-0.2 * k, 0.4], [-0.42 * k, 0.24], [-0.32 * k, -0.1 * k + 0.2], [-0.12 * k, -0.35 * k + 0.2]], 5), col, { tex: 'ripple', glow: 0.5 });
    face(p, 0, 0.12, 0.3, { mouth: 'grin', white: '#fff6d8' });
  } else if (kind === 'fang') {
    const leaf = p.S([[0, -0.6], [0.48, -0.25], [0.55, 0.15], [0.3, 0.38], [0, 0.42], [-0.3, 0.38], [-0.55, 0.15], [-0.48, -0.25]], 5);
    p.pieces(leaf, c.main, p.s * 0.4, { tex: 'streak', vary: 0.5 });
    p.fill(p.S([[-0.36, 0.0], [0.36, 0.0], [0.2, 0.22], [-0.2, 0.22]], 3), '#2a1018', 0.92);
    for (let i = -3; i <= 3; i++) { p.fill(p.P([[i * 0.1 - 0.04, 0.0], [i * 0.1 + 0.04, 0.0], [i * 0.1, 0.09]]), '#fffaf0', 0.95); }
    p.eye(0, -0.25, 0.08, { white: '#f2e6a0', color: '#1a1a14' });
  } else if (kind === 'cactus') {
    for (const s of [-1, 1]) { p.glass(p.C(s * 0.2, 0.1, s * 0.42, 0.1, 0.09), c.main); p.glass(p.C(s * 0.42, 0.12, s * 0.42, -0.25, 0.09), shade(c.main, 0.04)); }
    p.pieces(p.C(0, GROUND - 0.03, 0, -0.45, 0.22, 0.2), c.main, p.s * 0.32, { tex: 'streak', grain: 90, vary: 0.4 });
    for (let i = 0; i < 14; i++) { const x = (p.rand() - 0.5) * 0.36, y = -0.4 + p.rand() * 1.2; p.stroke([[x, y], [x + 0.04, y - 0.03]], 0.008, '#f6f0d0', 0.8, false); }
    face(p, 0, -0.18, 0.2, { mouth: 'smile', brows: true });
    if (f.hat === 'top') hat(p, c, 'top', 0, -0.4, 0.16);
  } else if (kind === 'rose') {
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; p.glass(p.E(Math.cos(a) * 0.22, -0.1 + Math.sin(a) * 0.2, 0.24, 0.2, a), tint(c.main, i * 3), { tex: 'streak' }); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; p.glass(p.E(Math.cos(a) * 0.1, -0.1 + Math.sin(a) * 0.09, 0.15, 0.13, a), shade(c.main, 0.06), { tex: 'streak' }); }
    p.glass(p.E(0, -0.1, 0.1), shade(c.main, -0.1));
    for (const y of [0.3, 0.5, 0.72]) p.glass(p.P([[0.03, y], [0.03, y + 0.06], [0.14, y + 0.0]]), '#3a5a2a');
    face(p, 0, -0.08, 0.2, { mouth: 'frown', brows: 'cross', eye: 0.16 });
  }
}

function figSerpent(p, c, f) {
  const kind = f.kind || 'snake', n = kind === 'caterpillar' ? 7 : kind === 'worm' ? 8 : 14;
  const pts = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); pts.push([-0.8 + t * 1.4, 0.72 - Math.sin(t * Math.PI * 1.1) * 0.35 - t * 0.55]); }
  const rOf = i => kind === 'caterpillar' ? 0.18 : kind === 'worm' ? 0.15 + (i / n) * 0.04 : 0.06 + (i / n) * 0.09;
  if (kind === 'snake') {
    const left = [], right = [];
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2, r = rOf(i); left.push([pts[i][0] + Math.cos(ang) * r, pts[i][1] + Math.sin(ang) * r]); right.push([pts[i][0] - Math.cos(ang) * r, pts[i][1] - Math.sin(ang) * r]); }
    const body = p.map(Shape.curve(left).concat(Shape.curve(right).reverse()));
    for (const piece of Shape.shatter(body, p.rand, p.s * 0.22, 0, 1.6)) p.glass(piece, jitter(c.main, p.rand, 0.6), { tex: 'seedy' });
    for (let i = 2; i < n - 1; i += 2) p.dot(pts[i][0], pts[i][1], rOf(i) * 0.4, c.accent, 0.7);
  } else for (let i = 0; i < n; i++) {
    const [x, y] = pts[i], r = rOf(i);
    if (kind === 'caterpillar') { p.glass(p.C(x, y + r * 0.6, x, GROUND - 0.02, 0.025), shade(c.main, -0.2)); }
    p.glass(p.E(x, y, r, r * (kind === 'worm' ? 1.0 : 0.95)), jitter(i % 2 ? c.main : shade(c.main, 0.06), p.rand, 0.4), { tex: kind === 'caterpillar' ? 'mottle' : 'streak' });
  }
  const [hx, hy] = pts[n - 1], hr = kind === 'snake' ? 0.16 : rOf(n - 1) * 1.25;
  if (kind === 'caterpillar') for (const s of [-1, 1]) { p.stroke([[hx + s * 0.06, hy - hr * 0.8], [hx + s * 0.14, hy - hr * 1.6]], 0.014, '#2a1d1a', 0.9); p.dot(hx + s * 0.14, hy - hr * 1.65, 0.03, c.accent); }
  p.glass(p.E(hx + 0.04, hy - 0.02, hr * 1.1, hr * (kind === 'snake' ? 0.8 : 1.0)), kind === 'worm' ? shade(c.main, 0.05) : c.main, { tex: 'mottle' });
  if (kind === 'snake') { p.stroke([[hx + hr * 1.05, hy + 0.02], [hx + hr * 1.5, hy + 0.04], [hx + hr * 1.62, hy - 0.01]], 0.012, '#d0303a', 0.9); p.stroke([[hx + hr * 1.5, hy + 0.04], [hx + hr * 1.62, hy + 0.09]], 0.012, '#d0303a', 0.9); }
  face(p, hx + 0.06, hy - 0.03, hr * 0.95, { mouth: kind === 'worm' ? 'fangs' : 'smile', gap: 0.42, eye: 0.17, white: kind === 'snake' ? '#f0e070' : undefined });
}

function figBrute(p, c, f) {
  const skin = c.main, ghost = f.ghost, op = ghost ? { alpha: 0.85, glow: 0.3 } : {};
  const body = ghost ? mix(skin, '#eef3ff', 0.55) : skin;
  const hx = 0.62, hyy = 0.45;
  if (f.hold) holding(p, c, f.hold, hx, hyy, true);
  for (const s of [-1, 1]) { p.glass(p.C(s * 0.2, 0.3, s * 0.22, GROUND - 0.04, 0.13, 0.11), shade(body, -0.06), { tex: 'streak', ...op }); p.glass(p.E(s * 0.25, GROUND - 0.01, 0.16, 0.06), shade(body, -0.25), op); }
  const torso = p.S([[-0.52, -0.38], [-0.2, -0.5], [0.2, -0.5], [0.52, -0.38], [0.4, 0.1], [0.3, 0.38], [-0.3, 0.38], [-0.4, 0.1]], 4);
  const parts = p.pieces(torso, body, p.s * 0.36, { tex: f.skin === 'crystal' ? 'ripple' : 'streak', vary: f.skin === 'crystal' ? 2 : 0.6, ...op });
  if (f.rainbow) { const cols = ['#e0453a', '#f0a03a', '#f0d84a', '#5ab04a', '#3a7ad0', '#8a5ac0']; cols.forEach((col, i) => p.glass(p.P([[-0.45, -0.3 + i * 0.11], [0.45, -0.3 + i * 0.11], [0.42, -0.19 + i * 0.11], [-0.42, -0.19 + i * 0.11]]), col, { tex: 'streak' })); }
  if (f.skin === 'straw') for (let i = 0; i < 14; i++) { const x = -0.4 + p.rand() * 0.8, y = -0.35 + p.rand() * 0.65; p.stroke([[x, y], [x + 0.06, y + 0.12]], 0.008, '#8a6a2a', 0.6, false); }
  if (f.skin === 'stitched') { p.stroke([[-0.1, -0.45], [0.05, -0.1], [-0.05, 0.3]], 0.012, '#2a1d1a', 0.8); for (let i = 0; i < 6; i++) p.stroke([[-0.12 + i * 0.03, -0.38 + i * 0.12], [-0.02 + i * 0.03, -0.36 + i * 0.12]], 0.01, '#2a1d1a', 0.8, false); }
  if (f.skin === 'cactus') for (let i = 0; i < 16; i++) { const x = -0.4 + p.rand() * 0.8, y = -0.35 + p.rand() * 0.65; p.stroke([[x, y], [x + 0.04, y - 0.04]], 0.008, '#f6f0d0', 0.85, false); }
  if (f.skin === 'mud') for (const x of [-0.3, 0.05, 0.28]) p.glass(p.C(x, 0.3, x, 0.45 + p.rand() * 0.1, 0.04, 0.025), shade(body, -0.1));
  for (const s of [-1, 1]) {
    p.glass(p.E(s * 0.5, -0.32, 0.17, 0.15), shade(body, 0.04), op);
    p.glass(p.C(s * 0.55, -0.25, s * 0.66, 0.3, 0.12, 0.1), body, { tex: 'streak', ...op });
    if (!(s > 0 && f.hold)) p.glass(p.E(s * 0.66, 0.42, 0.14), shade(body, -0.04), op);
  }
  if (f.hold) { holding(p, c, f.hold, hx, hyy, false); p.glass(p.E(hx, hyy - 0.02, 0.14), shade(body, -0.04), op); }
  const hr = 0.17, hy = -0.6;
  p.glass(p.E(0, hy, hr, hr * 1.05), body, { tex: 'mottle', ...op });
  if (f.horn) p.glass(p.P([[-0.05, hy - hr * 0.8], [0.05, hy - hr * 0.8], [0.0, hy - hr * 2.0]]), '#efe3c6');
  face(p, 0, hy + 0.02, hr, { eyes: f.eyes === '1' ? 1 : 2, mouth: f.mouth || 'frown', brows: 'cross', eye: f.eyes === '1' ? 0.2 : 0.15 });
  if (f.hat === 'party') hat(p, c, 'party', 0, hy, hr);
}

function figFish(p, c, f) {
  if (f.kind === 'merfolk') {
    p.glass(p.S([[-0.18, 0.15], [0.2, 0.15], [0.25, 0.5], [0.05, 0.75], [-0.35, 0.82], [-0.6, 0.7], [-0.4, 0.66], [-0.15, 0.58], [-0.18, 0.35]], 5), c.main, { tex: 'seedy' });
    for (let i = 0; i < 5; i++) p.stroke([[-0.12 + i * 0.05, 0.25 + i * 0.1], [-0.02 + i * 0.05, 0.3 + i * 0.1], [0.08 + i * 0.03, 0.25 + i * 0.1]], 0.01, shade(c.main, -0.3), 0.5);
    p.glass(p.S([[-0.6, 0.7], [-0.9, 0.52], [-0.85, 0.72], [-0.92, 0.92], [-0.58, 0.8]], 3), shade(c.main, 0.08), { tex: 'ripple' });
    if (f.hold) holding(p, c, f.hold, 0.38, 0.0, true);
    p.glass(p.S([[-0.22, -0.4], [0.22, -0.4], [0.2, 0.18], [-0.2, 0.18]], 3), c.skin, { tex: 'mottle' });
    for (const s of [-1, 1]) p.glass(p.C(s * 0.22, -0.36, s * 0.38, 0.0, 0.055), c.skin);
    if (f.hold) holding(p, c, f.hold, 0.38, 0.0, false);
    p.glass(p.S([[-0.2, -0.6], [-0.15, -0.8], [0.0, -0.84], [0.15, -0.8], [0.2, -0.6], [0.3, -0.12], [0.18, -0.2], [-0.18, -0.2], [-0.3, -0.12]], 4), c.hair, { tex: 'streak' });
    p.glass(p.E(0, -0.6, 0.15, 0.17), c.skin, { tex: 'mottle' });
    p.glass(p.S([[-0.16, -0.62], [-0.12, -0.77], [0.06, -0.8], [0.16, -0.66], [0.04, -0.7]], 4), c.hair, { tex: 'streak' });
    face(p, 0, -0.57, 0.15, { mouth: 'smile', cheeks: '#d9606a' });
    for (const s of [-1, 1]) p.glass(p.E(s * 0.1, -0.22, 0.08, 0.06), c.accent, { tex: 'ripple' });
    return;
  }
  // angler: a round fish with a lantern
  p.glass(p.S([[-0.55, 0.15], [-0.95, -0.15], [-0.9, 0.45], [-0.55, 0.3]], 3), shade(c.main, -0.1), { tex: 'ripple' });
  p.pieces(p.E(-0.05, 0.15, 0.62, 0.48), c.main, p.s * 0.4, { tex: 'seedy', vary: 0.5 });
  p.fill(p.S([[0.1, 0.25], [0.56, 0.1], [0.6, 0.32], [0.3, 0.45]], 3), '#2a1018', 0.9);
  for (let i = 0; i < 6; i++) p.fill(p.P([[0.18 + i * 0.07, 0.25 - i * 0.025], [0.23 + i * 0.07, 0.24 - i * 0.025], [0.2 + i * 0.07, 0.33 - i * 0.025]]), '#fffaf0', 0.95);
  p.eye(0.2, -0.08, 0.06, { white: '#f0e6a0', color: '#1a1a14' });
  p.stroke([[0.05, -0.3], [0.15, -0.7], [0.45, -0.72], [0.55, -0.5]], 0.016, '#2a1d1a', 0.9);
  p.glass(p.E(0.55, -0.45, 0.1), '#ffe27a', { glow: 0.9, tex: 'mottle' });
  for (let i = 0; i < 3; i++) p.glass(p.E(-0.3 + i * 0.15, 0.7 + (i % 2) * 0.1, 0.035), '#cfe8f6', { tex: 'mottle', alpha: 0.7 });
}

function figSpider(p, c, f) {
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = -0.5 + i * 0.32, kx = s * (0.42 + i * 0.05), ky = -0.2 + i * 0.12;
    p.glass(p.C(s * 0.15, 0.15 + i * 0.05, kx, ky, 0.035), shade(c.main, -0.15));
    p.glass(p.C(kx, ky, s * (0.6 + i * 0.08), GROUND - 0.04 - (3 - i) * 0.04, 0.03, 0.02), shade(c.main, -0.2));
  }
  p.pieces(p.E(-0.05, 0.42, 0.42, 0.36), c.main, p.s * 0.35, { tex: 'seedy', vary: 0.4 });
  p.glass(p.S([[-0.05, 0.25], [0.12, 0.42], [-0.05, 0.6], [-0.22, 0.42]], 2), c.accent, { glow: 0.3 });
  p.glass(p.E(0.05, 0.05, 0.24, 0.2), shade(c.main, 0.05), { tex: 'mottle' });
  for (const [x, y, r] of [[-0.04, 0.0, 0.045], [0.12, 0.0, 0.045], [0.0, 0.08, 0.03], [0.09, 0.08, 0.03]]) p.eye(x, y, r, { white: '#f6d0d0', color: '#1a0a10' });
}

function figMush(p, c, f) {
  for (const s of [-1, 1]) { p.glass(p.C(s * 0.1, 0.55, s * 0.12, GROUND - 0.04, 0.06), '#e9dcc0'); p.glass(p.E(s * 0.14, GROUND - 0.01, 0.1, 0.045), '#4a3a30'); }
  p.glass(p.S([[-0.22, -0.05], [0.22, -0.05], [0.25, 0.6], [-0.25, 0.6]], 3), '#f2e8d2', { tex: 'mottle' });
  for (const s of [-1, 1]) p.glass(p.C(s * 0.22, 0.12, s * 0.4, 0.3, 0.05), '#f2e8d2');
  if (f.hold) { holding(p, c, f.hold, 0.42, 0.28, true); holding(p, c, f.hold, 0.42, 0.28, false); }
  face(p, 0, 0.2, 0.22, { mouth: 'flat', brows: 'cross' });
  p.pieces(p.S([[-0.62, -0.02], [-0.5, -0.42], [0, -0.62], [0.5, -0.42], [0.62, -0.02], [0, 0.02]], 5), c.main, p.s * 0.42, { tex: 'mottle', vary: 0.5 });
  for (const [x, y, r] of [[-0.3, -0.25, 0.08], [0.05, -0.42, 0.1], [0.34, -0.2, 0.07]]) p.glass(p.E(x, y, r), '#f6efe0', { tex: 'mottle' });
}

function figSnowman(p, c, f) {
  const snow = '#f3f6fb';
  p.glass(p.E(0, 0.62, 0.42, 0.34), snow, { tex: 'mottle', glow: 0.2 });
  for (const s of [-1, 1]) p.leadLine([[p.X(s * 0.25), p.Y(0.15)], [p.X(s * 0.62), p.Y(-0.12)], [p.X(s * 0.7), p.Y(-0.25)]], p.leadW * 1.4);
  p.glass(p.E(0, 0.12, 0.3, 0.25), snow, { tex: 'mottle' });
  for (let i = 0; i < 3; i++) p.dot(0, 0.0 + i * 0.1, 0.025, '#2a2a30');
  p.glass(p.E(0, -0.3, 0.21, 0.2), snow, { tex: 'mottle' });
  p.glass(p.S([[-0.24, -0.16], [0.24, -0.16], [0.26, -0.06], [0.12, -0.08], [0.18, 0.18], [0.06, 0.18], [0.0, -0.06], [-0.24, -0.06]], 2), c.accent, { tex: 'streak' });
  p.glass(p.P([[0.0, -0.3], [0.0, -0.24], [0.2, -0.28]]), '#ef8a2a');
  face(p, -0.02, -0.33, 0.2, { mouth: 'smile', gap: 0.4 });
  hat(p, c, f.hat || 'top', 0, -0.33, 0.19);
}

/* objects that have come alive */
function figObject(p, c, f) {
  switch (f.kind) {
    case 'wall': {
      const col = mix(c.stone || c.main, c.main, 0.35);
      for (let row = 0; row < 6; row++) for (let i = 0; i < 4; i++) {
        const off = row % 2 ? 0.12 : 0, x = -0.62 + i * 0.32 + off, y = -0.5 + row * 0.24;
        if (x + 0.3 > 0.7) continue;
        p.glass(p.R(x, y, 0.3, 0.22, 0.02), jitter(col, p.rand, 1.3), { tex: 'mottle' });
      }
      if (f.top === 'husk') for (let i = 0; i < 5; i++) p.glass(p.S([[-0.55 + i * 0.27, -0.5], [-0.48 + i * 0.27, -0.5], [-0.5 + i * 0.27, -0.78]], 3), '#6fa04a');
      face(p, 0.04, 0.05, 0.32, { mouth: 'frown', brows: 'cross' });
      break;
    }
    case 'chest': {
      p.glass(p.R(-0.55, 0.15, 1.1, 0.72, 0.04), c.wood, { tex: 'streak', grain: 0 });
      for (const x of [-0.5, 0.4]) p.glass(p.R(x, 0.15, 0.1, 0.72), c.gold);
      p.fill(p.S([[-0.52, 0.15], [0.52, 0.15], [0.45, -0.25], [-0.45, -0.25]], 2), '#3a0e18', 0.95);
      p.glass(p.S([[-0.25, 0.15], [0.25, 0.15], [0.15, -0.05], [-0.15, -0.05]], 3), '#d0506a', { tex: 'mottle' });
      for (let i = 0; i < 7; i++) p.fill(p.P([[-0.48 + i * 0.15, -0.25], [-0.4 + i * 0.15, -0.25], [-0.44 + i * 0.15, -0.12]]), '#fffaf0', 0.95);
      p.glass(p.S([[-0.58, -0.25], [0.58, -0.25], [0.5, -0.62], [-0.5, -0.62]], 3), shade(c.wood, 0.05), { tex: 'streak', grain: 0 });
      for (const s of [-1, 1]) p.eye(s * 0.2, -0.45, 0.06, { white: '#f0e070', color: '#1a1a14' });
      break;
    }
    case 'throne': {
      p.pieces(p.S([[-0.42, -0.8], [0, -0.95], [0.42, -0.8], [0.42, 0.2], [-0.42, 0.2]], 3), c.main, p.s * 0.35, { tex: 'streak', vary: 0.5 });
      p.glass(p.R(-0.52, 0.05, 1.04, 0.22, 0.03), c.gold, { tex: 'mottle' });
      p.glass(p.R(-0.36, -0.12, 0.72, 0.2, 0.06), c.accent, { tex: 'mottle' });
      for (const s of [-1, 1]) { p.glass(p.R(s * 0.48 - 0.07, -0.15, 0.14, 0.42, 0.03), c.gold); p.glass(p.R(s * 0.4 - 0.05, 0.27, 0.1, 0.62, 0.02), shade(c.gold, -0.1)); }
      p.glass(p.E(0, -0.55, 0.12), '#d03a4a', { glow: 0.4 });
      break;
    }
    case 'swatter': {
      p.glass(p.C(0.1, GROUND - 0.05, 0.0, -0.05, 0.035), c.wood);
      const head = p.R(-0.32, -0.72, 0.64, 0.68, 0.08);
      p.glass(head, c.main, { tex: 'mottle' });
      for (let i = 1; i < 6; i++) { p.stroke([[-0.32 + i * 0.107, -0.72], [-0.32 + i * 0.107, -0.04]], 0.008, '#2a2a30', 0.6, false); p.stroke([[-0.32, -0.72 + i * 0.113], [0.32, -0.72 + i * 0.113]], 0.008, '#2a2a30', 0.6, false); }
      face(p, 0, -0.4, 0.26, { mouth: f.cracked ? 'frown' : 'grin', brows: 'cross', white: '#f6f1e4' });
      break;
    }
    case 'hand': {
      const col = c.main, wrap = /wrap/.test(f.skin || '');
      p.glass(p.S([[-0.25, GROUND], [-0.24, 0.3], [0.24, 0.3], [0.25, GROUND]], 2), col, { tex: 'streak' });
      p.glass(p.S([[-0.32, 0.35], [-0.34, -0.15], [0.3, -0.15], [0.34, 0.35]], 3), col, { tex: 'mottle' });
      for (let i = 0; i < 4; i++) p.glass(p.C(-0.26 + i * 0.17, -0.12, -0.28 + i * 0.18, -0.62 - (i === 1 || i === 2 ? 0.12 : 0), 0.07, 0.06), shade(col, i % 2 ? 0.04 : -0.02), { tex: 'streak' });
      p.glass(p.C(0.3, 0.2, 0.55, -0.15, 0.075, 0.065), shade(col, -0.04));
      if (f.fire) for (let i = 0; i < 5; i++) p.glass(p.S([[-0.3 + i * 0.15, -0.65], [-0.22 + i * 0.15, -0.85 - (i % 2) * 0.12], [-0.15 + i * 0.15, -0.65]], 3), i % 2 ? '#ffd25a' : '#f0702e', { glow: 0.6 });
      break;
    }
    case 'sack': {
      p.pieces(p.S([[-0.12, -0.45], [0.12, -0.45], [0.48, 0.2], [0.45, 0.7], [0, GROUND], [-0.45, 0.7], [-0.48, 0.2]], 5), '#b9935a', p.s * 0.4, { tex: 'streak', vary: 0.4 });
      p.glass(p.S([[-0.18, -0.55], [0.18, -0.55], [0.1, -0.42], [-0.1, -0.42]], 2), '#8a6a3a');
      for (let i = 0; i < 9; i++) { const a = p.rand() * TAU, r = 0.35 + p.rand() * 0.1; p.glass(p.P([[Math.cos(a) * r * 0.9, 0.25 + Math.sin(a) * r * 0.9], [Math.cos(a + 0.12) * r * 0.9, 0.25 + Math.sin(a + 0.12) * r * 0.9], [Math.cos(a + 0.06) * (r + 0.14), 0.25 + Math.sin(a + 0.06) * (r + 0.14)]]), '#5a8a3a'); }
      face(p, 0, 0.15, 0.3, { mouth: 'frown', brows: 'cross' });
      break;
    }
    case 'catapult': {
      p.glass(p.R(-0.6, 0.62, 1.2, 0.14, 0.02), c.wood); for (const x of [-0.45, 0.45]) p.glass(p.E(x, 0.82, 0.12), shade(c.wood, -0.15));
      p.glass(p.P([[-0.1, 0.62], [0.1, 0.62], [0.05, 0.1], [-0.05, 0.1]]), c.wood);
      p.glass(p.C(0.0, 0.3, -0.5, -0.4, 0.035), shade(c.wood, 0.06));
      for (const [x, y, r] of [[-0.55, -0.5, 0.16], [-0.42, -0.6, 0.14], [-0.66, -0.62, 0.13], [-0.52, -0.72, 0.13]]) p.glass(p.E(x, y, r), jitter('#f6f1ea', p.rand, 0.5), { tex: 'mottle' });
      break;
    }
  }
}
