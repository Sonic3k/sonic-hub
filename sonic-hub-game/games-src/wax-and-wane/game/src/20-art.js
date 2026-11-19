/* ── The pictures: a sky at dusk, a chart of that sky in a lacquer frame, and the moons that are played on it ──
   The board is the game's one green thing, as an Othello board is: a deep sea-green wash ruled in gold. A disc is a
   moon: its light face full, its dark face new, and it changes face the way the moon does, a shadow crossing it. */
const PAL = {
  zenith: '#13244f', high: '#213d7c', mid: '#4a66a4', low: '#a898b4', glow: '#efb48c', horizon: '#fbdda8',
  field: '#1b7273', fieldHi: '#2c958b', fieldLo: '#104f57', lacquer: '#1a2150', lacquerHi: '#2b3672', lacquerLo: '#10142f',
  gold: '#e8c36f', goldHi: '#fbe6a8', goldLo: '#a47c35',
  moon: '#f5edd8', moonHi: '#fffbee', moonLo: '#d6c6a0', mare: '#9d9c96', night: '#141c3c', nightHi: '#3a4a8c', nightLo: '#090e22', rim: '#8ea2df',
};

/* ── the sky ── */
/** How the sky's colour runs from the top of the picture (0) to the bottom (1). On an upright screen the board fills
 *  the top and everything to read stands in the lower half, so there the sky stays deep for longer and the light
 *  keeps to the horizon. */
const SKY_WIDE = [[0, PAL.zenith], [0.28, PAL.high], [0.54, PAL.mid], [0.74, PAL.low], [0.88, PAL.glow], [1, PAL.horizon]];
const SKY_TALL = [[0, PAL.zenith], [0.36, PAL.high], [0.7, PAL.mid], [0.87, PAL.low], [0.95, PAL.glow], [1, PAL.horizon]];
function skyAt(stops, t) {
  for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return [stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])];
  return [PAL.horizon, PAL.horizon, 0];
}
/** One bank of cloud across the picture: billows along the top, lit from the horizon behind it. The lit colour is
 *  laid first and the body over it a little lower, which leaves a rim of light along every upper edge. */
function cloudBank(g, w, h, top, size, rand, lit, body, deep) {
  const shape = new Path2D();
  for (let x = -size * 2; x < w + size * 2;) {
    const r = size * (0.5 + rand() * rand() * 1.5), y = top + r * (0.5 + rand() * 0.5);
    shape.moveTo(x + r, y); shape.ellipse(x, y, r * (1.05 + rand() * 0.5), r, 0, 0, TAU);
    if (rand() < 0.45) { const q = r * (0.35 + rand() * 0.3), qx = x + (rand() - 0.5) * r * 1.4, qy = y - r * (0.55 + rand() * 0.3); shape.moveTo(qx + q, qy); shape.ellipse(qx, qy, q * 1.3, q, 0, 0, TAU); }
    x += r * (1.1 + rand() * 0.9);
  }
  shape.rect(-10, top + size * 0.8, w + 20, h - top);
  g.save(); g.clip(shape);
  g.fillStyle = lit; g.fillRect(0, top - size * 2, w, h);
  const fill = g.createLinearGradient(0, top - size * 0.2, 0, Math.min(h, top + size * 3));
  fill.addColorStop(0, tone(lit, body, 0.72)); fill.addColorStop(0.3, body); fill.addColorStop(1, deep);
  const rim = Math.max(1.6, size * 0.085);
  g.save(); g.translate(-rim * 0.25, rim * 0.5); g.fillStyle = tone(lit, body, 0.5); g.fill(shape); g.restore();
  g.save(); g.translate(-rim * 0.5, rim); g.fillStyle = fill; g.fill(shape); g.restore();
  brushOver(g, 0, top, w, size * 3, rand, { count: Math.round(w / 26), tall: 0.2, alpha: 0.13, pick: t => (t < 0.35 ? [body, lit, 0.25 - t * 0.5] : [body, deep, (t - 0.35) * 1.4]) });
  texture(g, 'streak', 0, top - size * 2, w, h, { alpha: 0.16, scale: 1.8, shift: top });
  g.restore();
}
/** A streak of high cloud, thin and long, catching the last light from below. */
function cloudStreak(g, x, y, len, thick, rand, colour, alpha) {
  g.save(); g.globalAlpha = alpha;
  for (let i = 0; i < 5; i++) {
    const lx = x + (rand() - 0.5) * len * 0.5, ly = y + (rand() - 0.5) * thick * 2.2, ll = len * (0.35 + rand() * 0.6), lt = thick * (0.4 + rand() * 0.7);
    const fade = g.createLinearGradient(lx - ll / 2, 0, lx + ll / 2, 0);
    fade.addColorStop(0, ink(colour, 0)); fade.addColorStop(0.3, ink(colour, 0.9)); fade.addColorStop(0.7, ink(colour, 0.9)); fade.addColorStop(1, ink(colour, 0));
    g.fillStyle = fade; g.beginPath(); g.ellipse(lx, ly, ll / 2, lt / 2, 0, 0, TAU); g.fill();
  }
  g.restore();
}
/** The whole sky, painted onto a canvas w × h (in CSS pixels; dpr: how many canvas pixels to one of those). */
function paintSky(canvas, w, h, dpr) {
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d'), rand = rngOf(1883), tall = h > w * 1.1, stops = tall ? SKY_TALL : SKY_WIDE;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const wash = g.createLinearGradient(0, 0, 0, h);
  for (const [at, colour] of stops) wash.addColorStop(at, colour);
  g.fillStyle = wash; g.fillRect(0, 0, w, h);
  brushOver(g, -40, 0, w + 80, h, rand, { count: Math.round(70 + h / 9), tall: 0.07, alpha: 0.12, pick: t => skyAt(stops, t), slant: -0.035 });
  // the last light, low on one side
  const sun = g.createRadialGradient(w * 0.68, h * 1.02, 0, w * 0.68, h * 1.02, Math.max(w, h) * (tall ? 0.36 : 0.62));
  sun.addColorStop(0, ink('#ffe9b8', 0.55)); sun.addColorStop(0.35, ink('#f7b98f', 0.22)); sun.addColorStop(1, ink('#f7b98f', 0));
  g.fillStyle = sun; g.fillRect(0, 0, w, h);
  texture(g, 'mottle', 0, 0, w, h, { alpha: 0.22, scale: Math.max(2.2, w / 420) });

  // stars: thick overhead, thinning out towards the light
  const count = Math.round(w * h / 5200);
  for (let i = 0; i < count; i++) {
    const y = Math.pow(rand(), 1.7) * h * 0.66, x = rand() * w, far = 1 - y / (h * 0.7), r = (0.45 + Math.pow(rand(), 3) * 1.25) * (0.8 + far * 0.4);
    g.fillStyle = ink(rand() < 0.25 ? PAL.goldHi : '#fdf8e8', (0.3 + rand() * 0.65) * clamp01(far + 0.15));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  const bright = Math.max(7, Math.round(w / 110));
  for (let i = 0; i < bright; i++) {
    const x = (i + 0.2 + rand() * 0.6) / bright * w, y = (0.04 + Math.pow(rand(), 1.3) * 0.5) * h, r = 4.5 + rand() * 6.5;
    const halo = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
    halo.addColorStop(0, ink(PAL.goldHi, 0.32)); halo.addColorStop(1, ink(PAL.goldHi, 0));
    g.fillStyle = halo; g.fillRect(x - r * 2.2, y - r * 2.2, r * 4.4, r * 4.4);
    starPath(g, x, y, r, 0.13, 0.62); g.fillStyle = ink(rand() < 0.5 ? PAL.goldHi : '#fffdf2', 0.92); g.fill();
  }

  // high streaks, then three banks of cloud, the nearest darkest
  const unit = Math.max(26, Math.min(w, h) * 0.075);
  const [far, mid, near] = tall ? [0.875, 0.925, 0.968] : [0.805, 0.88, 0.95];
  for (let i = 0; i < 5; i++) cloudStreak(g, rand() * w, h * (tall ? 0.62 + rand() * 0.2 : 0.5 + rand() * 0.22), w * (0.2 + rand() * 0.25), unit * 0.2, rand, i % 2 ? '#f6c9a4' : '#d9a9a8', (tall ? 0.2 : 0.3) + rand() * 0.2);
  cloudBank(g, w, h, h * far, unit * 0.9, rand, '#fde3bd', '#c9a3b3', '#9c8bb0');
  cloudBank(g, w, h, h * mid, unit * 1.2, rand, '#f6c4a8', '#7f7aac', '#565a98');
  cloudBank(g, w, h, h * near, unit * 1.5, rand, '#b9a0c6', '#3a4488', '#1f2a62');
  texture(g, 'grain', 0, 0, w, h, { alpha: 0.2, mode: 'overlay', scale: 1 });
}

/* ── the board ── */
/** Where things are on a board painted `size` across: the frame's width, the field's corner, one square's side. */
function boardPlan(size) {
  const frame = Math.max(14, Math.round(size * 0.06)), cell = (size - frame * 2) / 8;
  return { size, frame, cell, x0: frame, y0: frame, field: cell * 8 };
}
function paintBoard(canvas, size, dpr, fonts) {
  canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
  const g = canvas.getContext('2d'), rand = rngOf(1971), P = boardPlan(size), { frame, cell, x0, y0, field } = P, round = size * 0.016;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const edge = Math.max(2, frame * 0.11);

  // the frame: a gold edge, then dark lacquer lit from the upper left
  g.save();
  g.beginPath(); g.roundRect(0, 0, size, size, round); g.clip();
  const gilt = g.createLinearGradient(0, 0, size, size);
  gilt.addColorStop(0, PAL.goldHi); gilt.addColorStop(0.3, PAL.gold); gilt.addColorStop(0.62, PAL.goldLo); gilt.addColorStop(0.8, PAL.gold); gilt.addColorStop(1, PAL.goldLo);
  g.fillStyle = gilt; g.fillRect(0, 0, size, size);
  texture(g, 'streak', 0, 0, size, size, { alpha: 0.35, scale: 0.8, angle: 0.8 });
  g.beginPath(); g.roundRect(edge, edge, size - edge * 2, size - edge * 2, Math.max(1, round - edge)); g.clip();
  const lac = g.createLinearGradient(0, 0, size, size);
  lac.addColorStop(0, PAL.lacquerHi); lac.addColorStop(0.45, PAL.lacquer); lac.addColorStop(1, PAL.lacquerLo);
  g.fillStyle = lac; g.fillRect(0, 0, size, size);
  texture(g, 'mottle', 0, 0, size, size, { alpha: 0.3, scale: 1.1, shift: 3 });
  texture(g, 'grain', 0, 0, size, size, { alpha: 0.3, mode: 'overlay' });
  g.strokeStyle = 'rgba(5,8,26,.55)'; g.lineWidth = Math.max(1, edge * 0.5); g.beginPath(); g.roundRect(edge, edge, size - edge * 2, size - edge * 2, Math.max(1, round - edge)); g.stroke();
  g.restore();

  // the field: a sea-green wash, brushed on a slant
  g.save();
  g.beginPath(); g.rect(x0, y0, field, field); g.clip();
  const washed = g.createRadialGradient(x0 + field * 0.42, y0 + field * 0.38, field * 0.1, x0 + field / 2, y0 + field / 2, field * 0.78);
  washed.addColorStop(0, tone(PAL.field, PAL.fieldHi, 0.45)); washed.addColorStop(0.6, PAL.field); washed.addColorStop(1, tone(PAL.field, PAL.fieldLo, 0.55));
  g.fillStyle = washed; g.fillRect(x0, y0, field, field);
  brushOver(g, x0 - 20, y0, field + 40, field, rand, { count: 70, tall: 0.11, alpha: 0.1, slant: -0.3, pick: () => { const k = rand(); return k < 0.5 ? [PAL.field, PAL.fieldHi, k * 1.5] : [PAL.field, PAL.fieldLo, (k - 0.5) * 1.5]; } });
  texture(g, 'streak', x0, y0, field, field, { alpha: 0.12, scale: 2.4, angle: -0.3 });
  texture(g, 'mottle', x0, y0, field, field, { alpha: 0.42, scale: Math.max(1.6, field / 260) });
  // the rings of an old star chart, barely there
  g.lineWidth = Math.max(0.8, size * 0.0014);
  for (const [r, a] of [[1.42, 0.12], [2.84, 0.1], [4.3, 0.08]]) { g.strokeStyle = ink(PAL.goldHi, a); handCircle(g, x0 + field / 2, y0 + field / 2, r * cell, rand, 0.004); g.stroke(); }
  texture(g, 'grain', x0, y0, field, field, { alpha: 0.24, mode: 'overlay' });
  // the frame stands a little above the field and shades its upper and left edges
  for (const [gx, gy, gw, gh, x1, y1] of [[x0, y0, field, cell * 0.2, 0, 1], [x0, y0, cell * 0.2, field, 1, 0]]) {
    const sh = g.createLinearGradient(gx, gy, gx + x1 * gw, gy + y1 * gh);
    sh.addColorStop(0, 'rgba(6,28,40,.42)'); sh.addColorStop(1, 'rgba(6,28,40,0)');
    g.fillStyle = sh; g.fillRect(gx, gy, gw, gh);
  }
  g.restore();

  // the ruling: a dark line cut into the wash and a gold one laid in it
  const thick = Math.max(1.1, size * 0.0026);
  for (let i = 1; i < 8; i++) {
    const p = i * cell;
    handLine(g, x0 + p, y0 + 1, x0 + p, y0 + field - 1, 'rgba(8,46,52,.55)', thick * 2.1, rand, { wander: thick * 0.3 });
    handLine(g, x0 + 1, y0 + p, x0 + field - 1, y0 + p, 'rgba(8,46,52,.55)', thick * 2.1, rand, { wander: thick * 0.3 });
  }
  for (let i = 1; i < 8; i++) {
    const p = i * cell;
    handLine(g, x0 + p, y0 + 1, x0 + p, y0 + field - 1, ink(PAL.gold, 0.82), thick, rand, { wander: thick * 0.45 });
    handLine(g, x0 + 1, y0 + p, x0 + field - 1, y0 + p, ink(PAL.gold, 0.82), thick, rand, { wander: thick * 0.45 });
  }
  for (const [cx, cy] of [[2, 2], [6, 2], [2, 6], [6, 6]]) {   // the four marks every Othello board has
    const x = x0 + cx * cell, y = y0 + cy * cell, r = cell * 0.105;
    g.fillStyle = tone(PAL.field, PAL.fieldLo, 0.5); g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.fill();
    starPath(g, x, y, r, 0.3, 1); g.fillStyle = PAL.goldHi; g.fill();
  }

  // gold round the field
  const lip = Math.max(1.6, size * 0.0046), a = x0 - lip * 0.5, b = field + lip;
  handLine(g, a, a, a + b, a, PAL.gold, lip, rand, { wander: 0.3 }); handLine(g, a + b, a, a + b, a + b, PAL.gold, lip, rand, { wander: 0.3 });
  handLine(g, a + b, a + b, a, a + b, PAL.gold, lip, rand, { wander: 0.3 }); handLine(g, a, a + b, a, a, PAL.gold, lip, rand, { wander: 0.3 });
  g.fillStyle = 'rgba(255,246,214,.5)'; g.fillRect(x0 - lip, y0 - lip, field + lip * 2, Math.max(0.7, lip * 0.28));   // the lip's own glint

  // a fan of rays in each corner of the frame
  const inner = frame - edge;
  for (const [cx, cy, a0] of [[x0, y0, Math.PI], [x0 + field, y0, -Math.PI / 2], [x0 + field, y0 + field, 0], [x0, y0 + field, Math.PI / 2]]) {
    for (let k = 0; k < 7; k++) {
      const ang = a0 + (k + 0.5) / 7 * Math.PI / 2, r1 = inner * 0.34, r2 = inner * (k === 3 ? 1.16 : k % 2 ? 0.74 : 0.92);
      handLine(g, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2, ink(PAL.gold, 0.9), Math.max(0.9, frame * 0.045), rand, { wander: 0.2, step: 6 });
    }
    g.strokeStyle = ink(PAL.gold, 0.9); g.lineWidth = Math.max(0.9, frame * 0.045);
    g.beginPath(); g.arc(cx, cy, inner * 0.24, a0, a0 + Math.PI / 2); g.stroke();
  }
  // files along the top, ranks down the left: the way a game of Othello is written down
  const mid = edge + inner * 0.5;
  if (fonts) {
    g.fillStyle = ink(PAL.goldHi, 0.92); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(inner * 0.6)}px Marcellus, Georgia, serif`;
    for (let i = 0; i < 8; i++) {
      g.fillText('abcdefgh'[i], x0 + (i + 0.5) * cell, mid);
      g.fillText(String(i + 1), mid, y0 + (i + 0.5) * cell + inner * 0.03);
    }
  }
  // along the bottom the moon goes through its month, one phase under each file; down the right side, a star to a rank
  const d = inner * 0.56, dark = paintFace(Math.round(d * dpr * 1.5), false, 2), light = paintFace(Math.round(d * dpr * 1.5), true, 2);
  for (let i = 0; i < 8; i++) {
    const x = x0 + (i + 0.5) * cell, y = size - mid, lit = [0, 0.3, 0.5, 0.72, 1, 0.72, 0.5, 0.3][i];
    if (i < 5) drawMoon(g, x, y, d, dark, light, lit, Math.PI); else drawMoon(g, x, y, d, dark, light, lit, 0);
    starPath(g, size - mid, y0 + (i + 0.5) * cell, inner * 0.2, 0.26, 1); g.fillStyle = ink(PAL.gold, 0.8); g.fill();
  }
  return P;
}

/* ── the moons ── */
/** One face of a disc, painted `px` across. light: its full face, else its new one. seed: which of its looks. */
function paintFace(px, light, seed) {
  const c = canvasOf(px, px), g = c.getContext('2d'), rand = rngOf(seed * 977 + (light ? 13 : 7)), R = px * 0.5, r = R * 0.94, cx = R, cy = R;
  // the edge of the disc, seen below and to the right of its face
  handCircle(g, cx + R * 0.022, cy + R * 0.05, r, rand, 0.006); g.fillStyle = light ? '#a8946a' : '#05081a'; g.fill();
  g.save(); handCircle(g, cx, cy, r * 0.985, rand, 0.008); g.clip();
  const body = g.createRadialGradient(cx - r * 0.34, cy - r * 0.38, r * 0.08, cx, cy, r * 1.08);
  if (light) { body.addColorStop(0, PAL.moonHi); body.addColorStop(0.5, PAL.moon); body.addColorStop(1, PAL.moonLo); }
  else { body.addColorStop(0, PAL.nightHi); body.addColorStop(0.42, PAL.night); body.addColorStop(1, PAL.nightLo); }
  g.fillStyle = body; g.fillRect(0, 0, px, px);
  // the seas: soft patches where a field of noise runs high
  const n = px > 180 ? 192 : 96, seas = noiseField(n, 3, 4, seed * 31 + (light ? 5 : 9)), pic = canvasOf(n, n), pg = pic.getContext('2d'), img = pg.createImageData(n, n), [mr, mg, mb] = rgb(light ? PAL.mare : '#060a1c');
  for (let i = 0; i < n * n; i++) { const v = clamp01((seas[i] - 0.52) / 0.16); img.data[i * 4] = mr; img.data[i * 4 + 1] = mg; img.data[i * 4 + 2] = mb; img.data[i * 4 + 3] = Math.round(smooth(v) * (light ? 175 : 170)); }
  pg.putImageData(img, 0, 0);
  g.save(); g.translate(cx, cy); g.rotate(rand() * TAU); g.globalAlpha = light ? 0.62 : 0.7; g.imageSmoothingQuality = 'high';
  g.drawImage(pic, -r * 1.25, -r * 1.25, r * 2.5, r * 2.5); g.restore();
  // a few craters: a pale ring with its shadow inside
  for (let i = 0, k = 2 + Math.floor(rand() * 3); i < k; i++) {
    const a = rand() * TAU, d = Math.sqrt(rand()) * r * 0.72, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, cr = r * (0.045 + rand() * 0.07);
    g.fillStyle = light ? 'rgba(120,112,98,.2)' : 'rgba(3,5,16,.4)'; g.beginPath(); g.arc(x + cr * 0.12, y + cr * 0.14, cr, 0, TAU); g.fill();
    g.strokeStyle = light ? 'rgba(255,253,242,.75)' : 'rgba(150,168,228,.34)'; g.lineWidth = Math.max(0.8, cr * 0.28);
    g.beginPath(); g.arc(x, y, cr, Math.PI * 0.95, Math.PI * 1.8); g.stroke();
  }
  // darker towards the limb, and the tooth of the paper
  const limb = g.createRadialGradient(cx - r * 0.12, cy - r * 0.14, r * 0.55, cx, cy, r * 1.02);
  limb.addColorStop(0, light ? 'rgba(120,96,50,0)' : 'rgba(2,4,14,0)'); limb.addColorStop(1, light ? 'rgba(120,96,50,.36)' : 'rgba(2,4,14,.55)');
  g.fillStyle = limb; g.fillRect(0, 0, px, px);
  texture(g, 'streak', 0, 0, px, px, { alpha: (light ? 0.13 : 0.15) * Math.min(1, 150 / px + 0.25), scale: Math.max(0.5, px / 200), angle: rand() * 3, shift: seed });
  texture(g, 'grain', 0, 0, px, px, { alpha: light ? 0.22 : 0.3, mode: 'overlay', scale: Math.max(0.5, px / 300) });
  g.restore();
  // where the light catches the rim, upper left
  g.lineCap = 'round';
  for (const [w, a] of [[0.085, 0.14], [0.05, 0.22], [0.022, light ? 0.75 : 0.6]]) {
    g.strokeStyle = light ? `rgba(255,255,250,${a})` : ink(PAL.rim, a); g.lineWidth = r * w;
    g.beginPath(); g.arc(cx, cy, r * (0.955 - w * 0.5), Math.PI * 1.02, Math.PI * 1.6); g.stroke();
  }
  g.strokeStyle = light ? 'rgba(128,104,60,.55)' : 'rgba(126,146,214,.5)'; g.lineWidth = Math.max(0.8, r * 0.022);
  handCircle(g, cx, cy, r * 0.985, rand, 0.008); g.stroke();
  return c;
}
/** the shadow a disc lays on the field */
function paintShadow(px) {
  const c = canvasOf(px, px), g = c.getContext('2d'), R = px / 2, s = g.createRadialGradient(R, R, R * 0.3, R, R, R);
  s.addColorStop(0, 'rgba(4,22,32,.6)'); s.addColorStop(0.62, 'rgba(4,22,32,.34)'); s.addColorStop(1, 'rgba(4,22,32,0)');
  g.fillStyle = s; g.fillRect(0, 0, px, px);
  return c;
}
/** The path of the part of a moon of radius R that has changed face, when the change has crossed a share p of it
 *  (0 none, 1 all), coming in from the left. The line between the two parts is half an ellipse, as it is on the moon. */
function phasePath(g, R, p) {
  const k = Math.cos(Math.PI * clamp01(p));
  g.beginPath();
  g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, true);                                   // the left limb, top to bottom
  g.ellipse(0, 0, Math.max(0.001, Math.abs(k) * R), R, 0, Math.PI / 2, -Math.PI / 2, k < 0);   // and back up the terminator
  g.closePath();
}
/** Draws a moon part-way between two faces: `from` everywhere, `to` over the share p that has changed, the change
 *  coming from direction `angle` (0: from the left). size: how wide the faces are drawn. */
function drawMoon(g, x, y, size, from, to, p, angle = 0) {
  if (p <= 0.001 || !to) { g.drawImage(from, x - size / 2, y - size / 2, size, size); return; }
  if (p >= 0.999) { g.drawImage(to, x - size / 2, y - size / 2, size, size); return; }
  g.drawImage(from, x - size / 2, y - size / 2, size, size);
  g.save(); g.translate(x, y); g.rotate(angle); phasePath(g, size * 0.5, p); g.clip(); g.rotate(-angle);
  g.drawImage(to, -size / 2, -size / 2, size, size);
  g.restore();
  // the terminator itself: a soft line of half-light along the edge of the change
  g.save(); g.translate(x, y); g.rotate(angle);
  const k = Math.cos(Math.PI * p);
  g.beginPath(); g.ellipse(0, 0, Math.max(0.001, Math.abs(k) * size * 0.47), size * 0.47, 0, Math.PI / 2, -Math.PI / 2, k < 0);
  g.strokeStyle = 'rgba(40,52,110,.28)'; g.lineWidth = Math.max(1, size * 0.03); g.stroke();
  g.restore();
}
/** The faces every picture of a moon is drawn from: a few looks of each, so that no two neighbours are twins. */
const Moons = {
  px: 0, light: [], dark: [], shadow: null,
  make(px) {
    px = Math.min(320, Math.max(48, Math.round(px)));
    if (Math.abs(px - this.px) < 8 && this.light.length) return;
    this.px = px; this.light = [1, 2, 3, 4].map(s => paintFace(px, true, s)); this.dark = [1, 2, 3, 4].map(s => paintFace(px, false, s));
    this.shadow = paintShadow(Math.round(px * 1.2));
  },
  /** the face that shows for `disc` (1 Dark, 2 Light) on square s */
  face(disc, s) { const look = (s * 7 + (s >> 3) * 3) & 3; return disc === 2 ? this.light[look] : this.dark[look]; },
};
/** A moon by itself as a picture, for a button or a label: `lit` is how much of it is light (0 new … 1 full). */
function moonIcon(px, lit, seed = 1) {
  const c = canvasOf(px, px), g = c.getContext('2d');
  drawMoon(g, px / 2, px / 2, px, paintFace(px, false, seed), paintFace(px, true, seed), lit, Math.PI);
  return c;
}

/* ── the dial: one large moon that is as light as Light's share of the discs, in a ring of sixty-four beads ── */
const Dial = {
  faces: null, px: 0,
  /** px: how wide it is drawn, in canvas pixels */
  ready(px) { if (this.faces && Math.abs(px - this.px) < 12) return; this.px = px; this.faces = { dark: paintFace(Math.round(px * 0.67), false, 5), light: paintFace(Math.round(px * 0.67), true, 5) }; },
  /** dark, light: how many discs each side has (they may be between whole numbers while the picture is moving) */
  paint(canvas, size, dpr, dark, light) {
    const px = Math.round(size * dpr);
    if (canvas.width !== px || canvas.height !== px) { canvas.width = px; canvas.height = px; }
    this.ready(px);
    const g = canvas.getContext('2d'), c = px / 2, R = px * 0.335;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, px, px);
    const halo = g.createRadialGradient(c, c, R * 0.9, c, c, px * 0.5);
    halo.addColorStop(0, 'rgba(255,244,214,.26)'); halo.addColorStop(0.45, 'rgba(255,244,214,.08)'); halo.addColorStop(1, 'rgba(255,244,214,0)');
    g.fillStyle = halo; g.fillRect(0, 0, px, px);
    const all = dark + light, share = all ? light / all : 0.5;
    drawMoon(g, c, c, R * 2, this.faces.dark, this.faces.light, share, Math.PI);
    // the beads on their ring: Dark's go up the left from the bottom, Light's up the right, and the squares still
    // empty are left open at the top
    const ring = px * 0.438, bead = px * 0.0135, step = TAU / 64;
    g.strokeStyle = ink(PAL.gold, 0.3); g.lineWidth = Math.max(1, px * 0.004); g.beginPath(); g.arc(c, c, ring, 0, TAU); g.stroke();
    for (let i = 0; i < 64; i++) {
      const a = Math.PI / 2 + (i + 0.5) * step, x = c + Math.cos(a) * ring, y = c + Math.sin(a) * ring;
      g.beginPath(); g.arc(x, y, bead, 0, TAU);
      if (dark - i > 0.5) { g.fillStyle = PAL.night; g.fill(); g.strokeStyle = ink(PAL.rim, 0.95); g.lineWidth = Math.max(1, bead * 0.42); g.stroke(); }
      else if (light - (63 - i) > 0.5) { g.fillStyle = PAL.moon; g.fill(); g.strokeStyle = 'rgba(120,96,50,.5)'; g.lineWidth = Math.max(0.6, bead * 0.25); g.stroke(); }
      else { g.fillStyle = tone(PAL.high, PAL.mid, 0.5); g.fill(); g.strokeStyle = ink(PAL.gold, 0.6); g.lineWidth = Math.max(0.6, bead * 0.3); g.stroke(); }
    }
    // half-way round, at the top: whoever's beads reach past this mark has the bigger share
    starPath(g, c, c - ring - px * 0.042, px * 0.028, 0.26, 1); g.fillStyle = PAL.goldHi; g.fill();
  },
};
