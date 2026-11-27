/* Buildings and the emblems of spells, in glass. Units as for the creatures: the ground at GROUND. */

function windowLit(p, x, y, w, h, arch = true) {
  p.glass(arch ? p.map(Shape.arched(x, y, w, h, 0.5)) : p.R(x, y, w, h, 0.01), '#ffd970', { tex: 'mottle', glow: 0.7, edge: 0.1 });
}
function crenels(p, color, x0, x1, y, h, n) {
  const w = (x1 - x0) / (n * 2 - 1);
  for (let i = 0; i < n; i++) p.glass(p.R(x0 + i * 2 * w, y - h, w, h + 0.01), jitter(color, p.rand, 0.6), { tex: 'mottle' });
}
function blocks(p, poly, color, size) { return p.pieces(poly, color, p.s * Math.max(0.24, size * 1.5), { tex: 'mottle', vary: 0.9, lean: 0, spread: 0.2, leadW: p.leadW * 0.8 }); }

function figBuilding(p, c, kind) {
  const stone = c.stone, roof = c.main, trim = c.accent;
  switch (kind) {
    case 'castle': {
      for (const s of [-1, 1]) {
        blocks(p, p.R(s * 0.55 - 0.16, -0.4, 0.32, 1.33), stone, 0.16);
        p.glass(p.P([[s * 0.55 - 0.21, -0.4], [s * 0.55 + 0.21, -0.4], [s * 0.55, -0.92]]), roof, { tex: 'streak' });
        p.glass(p.P([[s * 0.55, -0.92], [s * 0.55, -1.08], [s * 0.55 + 0.14, -1.02]]), trim);
        windowLit(p, s * 0.55 - 0.05, -0.15, 0.1, 0.18);
      }
      blocks(p, p.R(-0.36, -0.15, 0.72, 1.08), shade(stone, 0.04), 0.18);
      crenels(p, stone, -0.36, 0.36, -0.15, 0.1, 5);
      p.glass(p.map(Shape.arched(-0.14, 0.45, 0.28, 0.48, 0.5)), '#2a2230', { tex: 'streak' });
      windowLit(p, -0.21, 0.08, 0.1, 0.18); windowLit(p, 0.11, 0.08, 0.1, 0.18);
      break;
    }
    case 'cave': {
      const rock = p.S([[-0.95, GROUND], [-0.85, 0.2], [-0.55, -0.35], [-0.1, -0.55], [0.4, -0.48], [0.78, -0.1], [0.95, GROUND]], 5);
      p.pieces(rock, stone, p.s * 0.3, { tex: 'mottle', vary: 1.2 });
      p.glass(p.S([[-0.45, GROUND], [-0.4, 0.3], [-0.15, 0.0], [0.15, 0.0], [0.4, 0.3], [0.45, GROUND]], 5), '#241c26', { tex: 'ripple' });
      const g = p.g, rg = g.createRadialGradient(p.X(0), p.Y(0.6), 0, p.X(0), p.Y(0.6), p.s * 0.45); rg.addColorStop(0, 'rgba(255,200,110,0.7)'); rg.addColorStop(1, 'rgba(255,200,110,0)'); g.fillStyle = rg; g.fillRect(0, 0, p.w, p.h);
      p.glass(p.R(-0.06, 0.45, 0.12, 0.16, 0.02), '#ffd56a', { glow: 0.8 });
      if (c.snug) p.glass(p.E(0.25, 0.78, 0.18, 0.1), trim, { tex: 'mottle' });
      break;
    }
    case 'tent': {
      const t = p.P([[0, -0.85], [0.78, GROUND], [-0.78, GROUND]]).reverse();
      const parts = []; for (let i = 0; i < 6; i++) parts.push(Shape.clipTo(p.P([[-1 + i * 0.34, GROUND + 0.1], [-0.66 + i * 0.34, GROUND + 0.1], [0.08, -0.9], [-0.08, -0.9]]), t));
      parts.forEach((q, i) => p.glass(q, i % 2 ? roof : c.light, { tex: 'streak', grain: 80 }));
      p.glass(p.P([[0, 0.25], [0.2, GROUND], [-0.2, GROUND]]), '#2a2230');
      p.glass(p.C(0, -0.85, 0, -1.08, 0.015), c.wood); p.glass(p.P([[0, -1.08], [0.22, -1.02], [0, -0.96]]), trim);
      break;
    }
    case 'tower': case 'spire': {
      const w = kind === 'spire' ? 0.2 : 0.3, top = kind === 'spire' ? -0.4 : -0.5;
      blocks(p, p.R(-w, top, w * 2, GROUND - top), stone, 0.16);
      p.glass(p.P([[-w - 0.06, top], [w + 0.06, top], [0, kind === 'spire' ? -1.1 : -1.0]]), roof, { tex: 'streak' });
      for (let i = 0; i < 3; i++) windowLit(p, -0.05, top + 0.15 + i * 0.4, 0.1, 0.2);
      if (kind === 'spire') p.glass(p.E(0, -1.1, 0.07), c.glow, { glow: 0.9 });
      break;
    }
    case 'obelisk': {
      p.glass(p.R(-0.4, 0.75, 0.8, 0.18, 0.01), shade(stone, -0.05));
      blocks(p, p.P([[-0.2, 0.75], [0.2, 0.75], [0.13, -0.6], [-0.13, -0.6]]), stone, 0.2);
      p.glass(p.P([[-0.13, -0.6], [0.13, -0.6], [0, -0.85]]), c.gold, { glow: 0.4 });
      p.eye(0, -0.2, 0.05, { white: '#ffe080', color: '#3a0a10' });
      for (let i = 0; i < 4; i++) p.stroke([[-0.06, 0.05 + i * 0.15], [0.06, 0.08 + i * 0.15]], 0.012, '#3a2a2a', 0.6, false);
      break;
    }
    case 'palace': {
      blocks(p, p.R(-0.75, 0.05, 1.5, 0.88), stone, 0.2);
      for (const x of [-0.45, 0.45]) { p.glass(p.E(x, -0.05, 0.2, 0.22), roof, { tex: 'streak' }); p.glass(p.P([[x, -0.27], [x, -0.42], [x + 0.08, -0.38]]), trim); }
      p.glass(p.S([[-0.32, 0.05], [-0.3, -0.35], [0, -0.7], [0.3, -0.35], [0.32, 0.05]], 5), roof, { tex: 'streak' });
      for (let i = 0; i < 5; i++) p.glass(p.R(-0.58 + i * 0.27, 0.22, 0.07, 0.62, 0.01), c.light);
      p.glass(p.map(Shape.arched(-0.12, 0.42, 0.24, 0.5, 0.5)), '#2a2230');
      if (c.bones) for (const x of [-0.6, 0.6]) { p.glass(p.E(x, 0.12, 0.08, 0.07), '#f1eadb'); p.dot(x - 0.03, 0.12, 0.018, '#241c22'); p.dot(x + 0.03, 0.12, 0.018, '#241c22'); }
      break;
    }
    case 'pyramid': {
      const pyr = p.P([[0, -0.8], [0.95, GROUND], [-0.95, GROUND]]);
      const rows = 6;
      for (let i = 0; i < rows; i++) {
        const y0 = -0.8 + (i / rows) * (GROUND + 0.8), y1 = -0.8 + ((i + 1) / rows) * (GROUND + 0.8), hw0 = (i / rows) * 0.95, hw1 = ((i + 1) / rows) * 0.95;
        const n = i + 1;
        for (let j = 0; j < n; j++) {
          const a0 = -hw0 + (2 * hw0 * j) / n, a1 = -hw0 + (2 * hw0 * (j + 1)) / n, b0 = -hw1 + (2 * hw1 * j) / n, b1 = -hw1 + (2 * hw1 * (j + 1)) / n;
          const q = i === 0 ? p.P([[0, y0], [b1, y1], [b0, y1]]) : p.P([[a0, y0], [a1, y0], [b1, y1], [b0, y1]]);
          p.glass(q, jitter(j < n / 2 ? stone : shade(stone, -0.08), p.rand, 0.7), { tex: 'mottle' });
        }
      }
      p.glass(p.P([[0, -0.8], [0.14, -0.55], [-0.14, -0.55]]), c.gold, { glow: 0.6 });
      if (c.eye) p.eye(0, 0.25, 0.07, { white: '#ffe080', color: '#3a0a10' });
      p.glass(p.map(Shape.arched(-0.1, 0.62, 0.2, 0.31, 0.5)), '#2a2230');
      break;
    }
    case 'dome': {
      blocks(p, p.R(-0.62, 0.2, 1.24, 0.73), stone, 0.2);
      p.glass(p.R(-0.68, 0.12, 1.36, 0.1, 0.01), trim);
      p.pieces(p.S([[-0.55, 0.12], [-0.5, -0.3], [0, -0.62], [0.5, -0.3], [0.55, 0.12]], 6), roof, p.s * 0.3, { tex: 'streak', vary: 0.6 });
      p.glass(p.R(-0.04, -0.82, 0.08, 0.22), trim);
      for (let i = 0; i < 4; i++) windowLit(p, -0.48 + i * 0.28, 0.35, 0.13, 0.3);
      break;
    }
    case 'temple': case 'mausoleum': {
      const w = kind === 'temple' ? 0.85 : 0.6;
      p.glass(p.R(-w - 0.08, 0.78, (w + 0.08) * 2, 0.15, 0.01), shade(stone, -0.05)); p.glass(p.R(-w, 0.68, w * 2, 0.11, 0.01), stone);
      const cols = kind === 'temple' ? 6 : 4;
      if (kind === 'mausoleum') blocks(p, p.R(-w + 0.05, -0.12, (w - 0.05) * 2, 0.8), shade(stone, -0.06), 0.2);
      for (let i = 0; i < cols; i++) { const x = -w + 0.08 + (i * (2 * w - 0.24)) / (cols - 1); p.glass(p.R(x, -0.12, 0.09, 0.8, 0.01), c.light, { tex: 'streak', grain: 90 }); }
      p.glass(p.R(-w - 0.04, -0.24, (w + 0.04) * 2, 0.13, 0.01), stone);
      p.glass(p.P([[-w - 0.06, -0.24], [w + 0.06, -0.24], [0, -0.68]]), roof, { tex: 'streak' });
      p.glass(p.E(0, -0.4, 0.07), trim, { glow: 0.4 });
      if (kind === 'mausoleum') p.glass(p.map(Shape.arched(-0.13, 0.18, 0.26, 0.5, 0.5)), '#2a2230');
      break;
    }
    case 'house': {
      blocks(p, p.R(-0.62, -0.05, 1.24, 0.98), c.second, 0.22);
      p.glass(p.P([[-0.72, -0.05], [0.72, -0.05], [0, -0.55]]), roof, { tex: 'streak' });
      blocks(p, p.R(-0.14, -0.8, 0.28, 0.4), c.second, 0.2);
      p.glass(p.P([[-0.2, -0.8], [0.2, -0.8], [0, -1.02]]), roof);
      p.glass(p.E(0, -0.62, 0.07), c.gold, { glow: 0.3 });
      for (const x of [-0.45, 0.25]) windowLit(p, x, 0.15, 0.2, 0.25, false);
      p.glass(p.R(-0.1, 0.48, 0.2, 0.45, 0.02), '#5a3a2a');
      break;
    }
    case 'silo': {
      blocks(p, p.R(-0.85, 0.15, 0.85, 0.78), roof, 0.2);
      p.glass(p.P([[-0.92, 0.15], [0.02, 0.15], [-0.45, -0.25]]), shade(roof, -0.1));
      blocks(p, p.R(0.05, -0.5, 0.5, 1.43), stone, 0.18);
      p.glass(p.S([[0.05, -0.5], [0.1, -0.75], [0.3, -0.85], [0.5, -0.75], [0.55, -0.5]], 4), c.metal, { tex: 'streak' });
      p.eye(0.3, -0.25, 0.05, { white: '#ffe080', color: '#3a0a10' });
      p.glass(p.R(-0.55, 0.45, 0.25, 0.48, 0.01), '#5a3a2a');
      break;
    }
    case 'sphinx': {
      p.pieces(p.S([[-0.9, GROUND], [-0.85, 0.35], [-0.3, 0.2], [0.35, 0.3], [0.85, 0.55], [0.9, GROUND]], 4), stone, p.s * 0.3, { tex: 'mottle' });
      for (const x of [0.42, 0.7]) p.glass(p.R(x, 0.6, 0.25, 0.33, 0.04), shade(stone, 0.05));
      p.glass(p.S([[0.05, 0.35], [0.0, -0.3], [0.25, -0.55], [0.55, -0.3], [0.5, 0.35]], 4), roof, { tex: 'streak' });
      for (let i = 0; i < 4; i++) p.stroke([[0.04 + i * 0.03, -0.2 + i * 0.12], [0.5 - i * 0.02, -0.2 + i * 0.12]], 0.012, shade(roof, -0.3), 0.5, false);
      p.glass(p.E(0.27, -0.12, 0.15, 0.2), shade(stone, 0.06), { tex: 'mottle' });
      face(p, 0.27, -0.12, 0.15, { mouth: 'flat' });
      break;
    }
    case 'stones': {
      for (const [x, h, w] of [[-0.62, 1.2, 0.26], [-0.18, 1.35, 0.3], [0.28, 1.3, 0.28], [0.7, 1.05, 0.24]]) blocks(p, p.R(x - w / 2, GROUND - h, w, h, 0.05), jitter(stone, p.rand), 0.3);
      blocks(p, p.R(-0.36, -0.55, 0.82, 0.16, 0.03), shade(stone, 0.05), 0.35);
      p.glass(p.E(0.05, -0.85, 0.12), c.glow, { glow: 0.9 });
      break;
    }
    case 'windmill': {
      blocks(p, p.P([[-0.3, GROUND], [0.3, GROUND], [0.2, -0.3], [-0.2, -0.3]]), stone, 0.2);
      p.glass(p.P([[-0.26, -0.3], [0.26, -0.3], [0, -0.58]]), roof);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.5, ex = Math.cos(a) * 0.78, ey = -0.4 + Math.sin(a) * 0.78, nx = Math.cos(a + 0.18) * 0.7, ny = -0.4 + Math.sin(a + 0.18) * 0.7; p.glass(p.P([[0, -0.4], [ex, ey], [nx, ny]]), c.light, { tex: 'streak', alpha: c.haunted ? 0.75 : 1 }); }
      p.glass(p.E(0, -0.4, 0.06), c.wood);
      windowLit(p, -0.07, 0.2, 0.14, 0.24);
      break;
    }
    case 'igloo': {
      const dome = p.S([[-0.8, GROUND], [-0.72, 0.2], [-0.35, -0.3], [0, -0.42], [0.35, -0.3], [0.72, 0.2], [0.8, GROUND]], 5);
      for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
        const y0 = -0.42 + row * 0.27, x0 = -0.9 + i * 0.32 + (row % 2) * 0.16, q = Shape.clipTo(p.R(x0, y0, 0.32, 0.27), dome.slice().reverse());
        if (q.length > 2) p.glass(q, jitter(c.ice || '#eaf4fb', p.rand, 0.6), { tex: 'mottle' });
      }
      p.glass(p.S([[-0.25, GROUND], [-0.22, 0.55], [0, 0.42], [0.22, 0.55], [0.25, GROUND]], 4), '#2a3448');
      if (c.candy) for (let i = 0; i < 6; i++) p.dot(-0.5 + i * 0.2, -0.05 + (i % 2) * 0.25, 0.04, ['#e0405a', '#4ab0e0', '#f0c040'][i % 3]);
      break;
    }
    case 'engine': {
      blocks(p, p.R(-0.65, -0.05, 1.3, 0.98, 0.04), c.metal, 0.22);
      for (const [x, y, r] of [[-0.35, 0.35, 0.22], [0.3, 0.25, 0.16], [0.4, 0.62, 0.12]]) { p.glass(p.map(Shape.star(x, y, r, r * 0.78, 10)), c.gold, { tex: 'mottle' }); p.glass(p.E(x, y, r * 0.35), shade(c.metal, -0.1)); }
      p.glass(p.R(-0.15, -0.6, 0.18, 0.58, 0.01), shade(c.metal, -0.1));
      for (const [x, y, r] of [[-0.06, -0.72, 0.12], [0.08, -0.88, 0.15], [-0.1, -1.02, 0.1]]) p.glass(p.E(x, y, r), '#eef0f4', { tex: 'mottle', alpha: 0.8 });
      for (let i = 0; i < 5; i++) p.glass(p.E(-0.5 + i * 0.25, 0.85, 0.05), '#f6f1ea');
      break;
    }
    case 'cake': {
      for (const [y, w, h, col] of [[0.5, 0.75, 0.43, c.second], [0.12, 0.55, 0.4, c.main], [-0.22, 0.36, 0.36, c.second]]) {
        p.glass(p.R(-w, y, w * 2, h, 0.04), col, { tex: 'mottle' });
        const drip = [[-w, y], [w, y], [w, y + 0.08]]; for (let i = 6; i >= 0; i--) drip.push([-w + (2 * w * i) / 6, y + (i % 2 ? 0.15 : 0.06)]);
        p.glass(p.P(drip), '#fbf6ee', { tex: 'mottle' });
      }
      for (const x of [-0.18, 0, 0.18]) { p.glass(p.R(x - 0.025, -0.42, 0.05, 0.2, 0.01), '#f6d0e0'); p.glass(p.S([[x, -0.58], [x + 0.04, -0.47], [x, -0.42], [x - 0.04, -0.47]], 3), '#ffd25a', { glow: 0.8 }); }
      for (let i = 0; i < 4; i++) p.glass(p.E(-0.5 + i * 0.33, 0.25 + (i % 2) * 0.4, 0.05), '#d0303a', { glow: 0.3 });
      break;
    }
  }
}

/* ---------------------------------------------------------------- the emblems of spells, in a disc of radius ~0.55 */

function spellIcon(p, c, icon) {
  const G = c.main, A = c.accent, M = c.metal, W = '#f6f1e4';
  switch (icon) {
    case 'dagger': case 'daggers': {
      const one = (dx, rot) => { const k = Math.cos(rot), s = Math.sin(rot), T = ([x, y]) => [dx + x * k - y * s, y * k + x * s];
        p.glass(p.P([[-0.05, 0.1], [0.05, 0.1], [0.05, -0.5], [0, -0.65], [-0.05, -0.5]].map(T)), M, { rise: 0.3, tex: 'streak' });
        p.glass(p.P([[-0.16, 0.1], [0.16, 0.1], [0.16, 0.17], [-0.16, 0.17]].map(T)), c.gold);
        p.glass(p.P([[-0.04, 0.17], [0.04, 0.17], [0.04, 0.42], [-0.04, 0.42]].map(T)), c.wood); };
      if (icon === 'daggers') { one(-0.15, -0.35); one(0.15, 0.35); } else one(0, 0);
      break;
    }
    case 'pendant': p.stroke([[-0.3, -0.55], [0, -0.15], [0.3, -0.55]], 0.02, c.gold, 0.9); p.glass(p.E(0, 0.1, 0.25), '#1a1426', { tex: 'ripple', glow: 0.2 }); p.glass(p.A(0, 0.1, 0.25, 0.32, 0, 360), c.gold); p.dot(0.05, 0.05, 0.06, '#8a6ae0', 0.7); break;
    case 'vial': case 'flask': case 'potion': {
      const neck = icon === 'vial' ? 0.07 : 0.1, body = icon === 'flask' ? p.P([[-neck, -0.25], [neck, -0.25], [0.35, 0.4], [-0.35, 0.4]]) : p.E(0, 0.15, icon === 'vial' ? 0.2 : 0.3, icon === 'vial' ? 0.32 : 0.3);
      p.glass(p.R(-neck, -0.55, neck * 2, 0.35, 0.01), '#dfeaf0', { tex: 'ripple', alpha: 0.9 });
      p.glass(p.R(-neck - 0.03, -0.6, neck * 2 + 0.06, 0.08, 0.02), c.wood);
      p.glass(body, icon === 'vial' ? '#c8303a' : G, { tex: 'ripple', glow: 0.5 });
      p.dot(-0.1, 0.05, 0.04, '#ffffff', 0.6);
      break;
    }
    case 'wand': p.glass(p.C(-0.35, 0.45, 0.2, -0.25, 0.04), c.wood); p.glass(p.map(Shape.star(0.25, -0.32, 0.25, 0.1, 5)), c.gold, { glow: 0.7 }); break;
    case 'hourglass': p.glass(p.R(-0.32, -0.6, 0.64, 0.08, 0.02), c.wood); p.glass(p.R(-0.32, 0.52, 0.64, 0.08, 0.02), c.wood); p.glass(p.P([[-0.25, -0.52], [0.25, -0.52], [0.03, 0], [0.25, 0.52], [-0.25, 0.52], [-0.03, 0]]), '#e6f0f4', { tex: 'ripple', alpha: 0.85 }); p.glass(p.P([[-0.18, 0.52], [0.18, 0.52], [0, 0.25]]), '#e8c060'); p.glass(p.P([[-0.12, -0.3], [0.12, -0.3], [0, -0.1]]), '#e8c060'); break;
    case 'pages': for (const [x, r] of [[-0.12, -0.2], [0.12, 0.15]]) p.glass(p.map(Shape.rect(-0.22, -0.32, 0.44, 0.6).map(([a, b]) => [a * Math.cos(r) - b * Math.sin(r) + x, a * Math.sin(r) + b * Math.cos(r)])), W, { tex: 'mottle' }); for (let i = 0; i < 4; i++) p.stroke([[0.0, -0.15 + i * 0.1], [0.24, -0.11 + i * 0.1]], 0.012, '#6a5a4a', 0.5, false); break;
    case 'mirror': p.glass(p.C(0, 0.25, 0, 0.6, 0.06), c.gold); p.glass(p.E(0, -0.1, 0.3, 0.38), c.gold); p.glass(p.E(0, -0.1, 0.24, 0.31), '#cfe0ee', { tex: 'ripple', glow: 0.5, rise: 0.35 }); p.stroke([[-0.12, -0.3], [0.08, 0.08]], 0.02, '#ffffff', 0.5, false); break;
    case 'scepter': p.glass(p.C(0, 0.6, 0, -0.25, 0.05), c.gold); p.glass(p.map(Shape.star(0, -0.38, 0.22, 0.12, 6)), G, { glow: 0.5 }); p.glass(p.E(0, -0.38, 0.09), A, { glow: 0.6 }); break;
    case 'globe': p.glass(p.E(0, -0.08, 0.38), '#cdb8f0', { tex: 'ripple', glow: 0.6, rise: 0.3 }); p.glass(p.P([[-0.25, 0.3], [0.25, 0.3], [0.32, 0.5], [-0.32, 0.5]]), c.gold); p.dot(-0.12, -0.2, 0.06, '#ffffff', 0.6); break;
    case 'door': p.glass(p.map(Shape.arched(-0.3, -0.55, 0.6, 1.1, 0.5)), '#2a2236', { tex: 'ripple', glow: 0.2 }); p.glass(p.map(Shape.arched(-0.3, -0.55, 0.6, 1.1, 0.5)).map(([x, y]) => [x, y]), '#4a2a6a', { tex: 'ripple', alpha: 0.6 }); p.glass(p.E(0, 0, 0.12), '#c0a0ff', { glow: 0.9 }); break;
    case 'gate': p.glass(p.map(Shape.arched(-0.38, -0.55, 0.76, 1.1, 0.5)), c.wood, { tex: 'streak', grain: 90 }); for (const y of [-0.1, 0.25]) p.glass(p.R(-0.4, y, 0.8, 0.08, 0.01), M); p.glass(p.R(-0.05, -0.2, 0.1, 0.6), M); break;
    case 'star': p.glass(p.map(Shape.star(0.08, -0.12, 0.42, 0.18, 5)), c.gold, { glow: 0.7, tex: 'mottle' }); for (let i = 0; i < 3; i++) p.glass(p.C(-0.15 - i * 0.12, 0.12 + i * 0.1, -0.45 - i * 0.05, 0.42 + i * 0.05, 0.03, 0.01), '#ffe9a0', { glow: 0.4 }); break;
    case 'eye': p.glass(p.S([[-0.5, 0], [0, -0.32], [0.5, 0], [0, 0.32]], 4), W, { tex: 'mottle' }); p.glass(p.E(0, 0, 0.2), G, { tex: 'ripple', glow: 0.3 }); p.dot(0, 0, 0.09, '#140c10'); p.dot(-0.05, -0.05, 0.035, '#ffffff', 0.9); break;
    case 'fountain': p.glass(p.S([[-0.5, 0.3], [0.5, 0.3], [0.35, 0.5], [-0.35, 0.5]], 3), M); p.glass(p.R(-0.06, -0.2, 0.12, 0.5), M); p.glass(p.E(0, -0.22, 0.25, 0.07), M); for (const s of [-1, 1]) p.glass(p.S([[0, -0.3], [s * 0.3, -0.55], [s * 0.42, 0.25], [s * 0.36, 0.25], [s * 0.25, -0.4]], 4), '#8fd0f0', { tex: 'ripple', alpha: 0.85, glow: 0.4 }); break;
    case 'hammer': p.glass(p.C(-0.3, 0.5, 0.15, -0.15, 0.045), c.wood); p.glass(p.map(Shape.rect(-0.28, -0.15, 0.56, 0.22, 0.03).map(([x, y]) => [x * 0.8 - y * 0.6 + 0.15, x * 0.6 + y * 0.8 - 0.18])), M, { rise: 0.25 }); break;
    case 'hail': case 'rain': {
      p.glass(p.S([[-0.5, -0.2], [-0.4, -0.45], [-0.1, -0.55], [0.15, -0.5], [0.42, -0.42], [0.52, -0.2]], 5), icon === 'hail' ? '#8a8aa0' : '#e6eef6', { tex: 'mottle' });
      for (let i = 0; i < 6; i++) { const x = -0.38 + i * 0.15, y = 0.0 + (i % 2) * 0.22; if (icon === 'hail') p.glass(p.E(x, y, 0.07), '#d06a3a', { glow: 0.3 }); else p.glass(p.S([[x, y - 0.1], [x + 0.05, y + 0.04], [x, y + 0.08], [x - 0.05, y + 0.04]], 3), '#ffd0e0'); }
      break;
    }
    case 'egg': p.glass(p.S([[0, -0.55], [0.32, -0.15], [0.35, 0.25], [0, 0.5], [-0.35, 0.25], [-0.32, -0.15]], 5), '#f4ecd8', { tex: 'mottle', glow: 0.3 }); for (const [x, y] of [[-0.12, -0.15], [0.15, 0.05], [-0.05, 0.25]]) p.dot(x, y, 0.06, A, 0.7); p.stroke([[-0.32, -0.05], [-0.15, 0.05], [0, -0.08], [0.15, 0.05], [0.33, -0.05]], 0.018, '#5a4a3a', 0.7, false); break;
    case 'wave': for (let i = 0; i < 3; i++) p.glass(p.S([[-0.55, 0.1 + i * 0.16], [-0.25, -0.25 + i * 0.16], [0.05, -0.05 + i * 0.16], [0.15, -0.3 + i * 0.16], [0.55, -0.05 + i * 0.16], [0.55, 0.15 + i * 0.16], [-0.55, 0.25 + i * 0.16]], 4), tint(G, i * 12, 0, i * 0.05), { tex: 'ripple' }); break;
    case 'burst': p.glass(p.map(Shape.star(0, -0.05, 0.55, 0.22, 9)), A, { glow: 0.5 }); p.glass(p.map(Shape.star(0, -0.05, 0.3, 0.14, 7)), c.gold, { glow: 0.8 }); break;
    case 'arch': p.glass(p.A(0, 0.3, 0.32, 0.5, -90, 90), M, { tex: 'mottle' }); p.glass(p.map(Shape.arched(-0.3, -0.18, 0.6, 0.62, 0.5)), '#7ad0f0', { tex: 'ripple', glow: 0.6 }); break;
    case 'storm': p.glass(p.S([[-0.5, -0.1], [-0.4, -0.42], [-0.05, -0.55], [0.3, -0.48], [0.5, -0.15], [0, -0.05]], 5), '#5a5a78', { tex: 'mottle' }); p.glass(p.P([[0.05, -0.1], [-0.15, 0.25], [0.02, 0.22], [-0.1, 0.55], [0.22, 0.12], [0.06, 0.14], [0.18, -0.1]]), '#ffe066', { glow: 0.8 }); break;
    case 'claw': for (let i = 0; i < 3; i++) p.glass(p.S([[-0.32 + i * 0.25, -0.45], [-0.22 + i * 0.25, -0.45], [-0.1 + i * 0.25, 0.4], [-0.2 + i * 0.25, 0.48]], 3), i === 1 ? '#f2ead8' : shade('#f2ead8', -0.06)); break;
    case 'scroll': p.glass(p.R(-0.3, -0.35, 0.6, 0.7, 0.02), '#f1e4c2', { tex: 'mottle' }); for (const y of [-0.4, 0.35]) p.glass(p.C(-0.38, y, 0.38, y, 0.06), '#d9c49a'); for (let i = 0; i < 4; i++) p.stroke([[-0.2, -0.2 + i * 0.12], [0.2, -0.2 + i * 0.12]], 0.012, '#6a5a4a', 0.55, false); p.glass(p.E(0.18, 0.18, 0.07), c.accent); break;
    case 'ring': p.glass(p.A(0, 0.08, 0.24, 0.34, 0, 360), c.gold, { tex: 'mottle' }); p.glass(p.S([[0, -0.42], [0.12, -0.3], [0, -0.18], [-0.12, -0.3]], 2), '#40c070', { glow: 0.5 }); break;
    case 'torch': p.glass(p.P([[-0.08, -0.05], [0.08, -0.05], [0.04, 0.55], [-0.04, 0.55]]), c.wood); p.glass(p.R(-0.12, -0.12, 0.24, 0.1, 0.02), M); p.glass(p.S([[0, -0.6], [0.18, -0.3], [0.12, -0.12], [-0.12, -0.12], [-0.18, -0.3]], 4), '#f08a2a', { glow: 0.7 }); p.glass(p.S([[0, -0.4], [0.08, -0.22], [0, -0.15], [-0.08, -0.22]], 3), '#ffe066', { glow: 0.9 }); break;
    case 'heart': case 'brokenheart': {
      const h = p.S([[0, -0.2], [0.2, -0.45], [0.45, -0.35], [0.45, -0.05], [0, 0.45], [-0.45, -0.05], [-0.45, -0.35], [-0.2, -0.45]], 5);
      if (icon === 'heart') p.glass(h, '#d83a5a', { tex: 'mottle', glow: 0.4 });
      else for (const [i, q] of Shape.cut(h, p.X(0), p.Y(0), Math.PI / 2 + 0.25).entries()) p.glass(Shape.translate(q, (i ? 1 : -1) * p.s * 0.05, 0), '#b8304a', { tex: 'mottle' });
      break;
    }
    case 'coin': p.glass(p.E(0, 0, 0.38), c.gold, { tex: 'mottle', glow: 0.4 }); p.glass(p.E(0, 0, 0.28), shade(c.gold, -0.06)); p.glass(p.map(Shape.star(0, 0, 0.16, 0.07, 4)), '#fff0b0', { glow: 0.7 }); break;
    case 'feather': p.glass(p.S([[0.35, -0.55], [0.2, 0.0], [-0.3, 0.45], [-0.05, -0.1]], 4), '#f6f1e8', { tex: 'streak' }); p.stroke([[0.32, -0.5], [-0.35, 0.52]], 0.018, '#6a5a4a', 0.8, false); break;
    case 'throne': figObject(p, Object.assign({}, c, { main: c.main }), { kind: 'throne' }); break;
    case 'tome': p.glass(p.R(-0.38, -0.42, 0.76, 0.82, 0.04), G, { tex: 'streak' }); p.glass(p.R(-0.3, -0.35, 0.6, 0.68, 0.02), shade(G, 0.06)); p.glass(p.map(Shape.star(0, -0.02, 0.18, 0.08, 4)), c.gold, { glow: 0.5 }); p.glass(p.R(0.38, -0.38, 0.06, 0.74, 0.01), '#f1e4c2'); break;
    case 'lift': p.glass(p.S([[-0.4, -0.4], [-0.2, -0.55], [0.2, -0.55], [0.4, -0.4], [0, -0.3]], 4), '#8a9ab0', { tex: 'mottle' }); p.glass(p.P([[-0.15, -0.32], [0.15, -0.32], [0.35, 0.45], [-0.35, 0.45]]), '#f6f0a0', { alpha: 0.6, glow: 0.6 }); p.glass(p.R(-0.12, 0.05, 0.24, 0.22, 0.02), c.wood); break;
    case 'hands': for (const s of [-1, 1]) { p.glass(p.S([[s * 0.06, 0.5], [s * 0.42, 0.45], [s * 0.45, -0.05], [s * 0.22, -0.4], [s * 0.1, -0.2]], 4), '#f0c8a8', { tex: 'mottle' }); } p.glass(p.E(0, -0.45, 0.15), '#c0a0ff', { glow: 0.9 }); break;
    case 'coffin': p.glass(p.P([[-0.18, -0.55], [0.18, -0.55], [0.3, -0.25], [0.2, 0.55], [-0.2, 0.55], [-0.3, -0.25]]), c.wood, { tex: 'streak', grain: 90 }); p.glass(p.R(-0.03, -0.35, 0.06, 0.4), c.gold); p.glass(p.R(-0.13, -0.22, 0.26, 0.06), c.gold); break;
    case 'volcano': p.glass(p.P([[-0.6, 0.5], [-0.15, -0.3], [0.15, -0.3], [0.6, 0.5]]), '#5a4a48', { tex: 'mottle' }); p.glass(p.S([[-0.15, -0.3], [0.15, -0.3], [0.3, -0.55], [0, -0.7], [-0.3, -0.55]], 4), '#f06a2a', { glow: 0.8 }); p.glass(p.S([[-0.08, -0.3], [0.08, -0.3], [0.05, 0.2], [-0.05, 0.2]], 3), '#ffb03a', { glow: 0.8 }); break;
    case 'signpost': p.glass(p.R(-0.04, -0.5, 0.08, 1.0), c.wood); p.glass(p.P([[-0.4, -0.42], [0.3, -0.42], [0.42, -0.32], [0.3, -0.22], [-0.4, -0.22]]), shade(c.wood, 0.08)); p.glass(p.P([[0.4, -0.12], [-0.3, -0.12], [-0.42, -0.02], [-0.3, 0.08], [0.4, 0.08]]), shade(c.wood, 0.02)); break;
    case 'fist': p.glass(p.C(0, 0.6, 0, 0.15, 0.13), '#e8b890'); p.glass(p.R(-0.28, -0.3, 0.56, 0.5, 0.12), '#f0c8a0', { tex: 'mottle' }); for (let i = 0; i < 3; i++) p.stroke([[-0.12 + i * 0.12, -0.3], [-0.12 + i * 0.12, -0.12]], 0.014, '#7a4a3a', 0.6, false); p.glass(p.map(Shape.star(0, -0.05, 0.62, 0.48, 12)), c.accent, { alpha: 0.35, lead: false }); break;
    case 'pie': p.glass(p.S([[-0.5, 0.0], [0.5, 0.0], [0.4, 0.3], [-0.4, 0.3]], 3), '#c08a4a'); p.glass(p.E(0, 0.0, 0.5, 0.18), '#e9c88a', { tex: 'mottle' }); for (let i = 0; i < 5; i++) p.glass(p.E(-0.3 + i * 0.15, -0.02, 0.05), ['#5a8ad8', '#d84a5a'][i % 2]); for (const [x, y, r] of [[-0.15, -0.4, 0.12], [0.1, -0.5, 0.1]]) p.glass(p.E(x, y, r), '#f2f2f6', { alpha: 0.7, tex: 'mottle' }); break;
    case 'seeds': for (const [x, y, a] of [[-0.25, 0.1, -0.4], [0.05, -0.15, 0.2], [0.28, 0.15, 0.6], [-0.05, 0.3, 0], [0.2, -0.42, -0.2]]) p.glass(p.E(x, y, 0.08, 0.13, a), '#c8a050', { tex: 'mottle' }); p.glass(p.C(0.05, -0.15, 0.0, -0.48, 0.02), '#5aa03a'); p.glass(p.E(0.1, -0.5, 0.08, 0.04, -0.4), '#6fc04a'); break;
    default: p.glass(p.map(Shape.star(0, -0.05, 0.4, 0.18, 8)), c.gold, { glow: 0.6 });
  }
}
