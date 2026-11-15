/* ── The pieces, drawn from above ──
   A walnut tray lined with felt, and three kinds of turned piece in boxwood (Light) and dark walnut (Dark) with brass
   fittings. Each is shaped by what it does:
     Ram   a low square block, the same on all four sides, because it goes and pushes all four ways
     Gate  a quarter-round leaf on a hinge at the corner of its Keep: the two ways it can lie are its two posts
     Keep  a round tower fixed to the board, with a bell in it
   One square is U units wide in the board's own coordinates. The gradients these drawings use are in the page (#defs). */
const U = 100, NS = 'http://www.w3.org/2000/svg';
const svg = (name, attrs = {}, kids = []) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); for (const c of kids) e.appendChild(c); return e; };
const f1 = v => Math.round(v * 10) / 10;

/** the two woods: [Light, Dark] */
const WOOD = [
  { top: 'url(#wl)', side: 'url(#wls)', rim: '#a07c44', hi: '#fff6dc', hiO: 0.8, court: '#c9a367', courtRim: '#8f6c3a', lo: '#b8935a' },
  { top: 'url(#wd)', side: 'url(#wds)', rim: '#1d110d', hi: '#a98572', hiO: 0.7, court: '#2a1a15', courtRim: '#140b08', lo: '#24140f' },
];
const RAM_H = 7, KEEP_H = 12, GATE_H = 6, KEEP_R = 36, LEAF = 84, LEAF_IN = 6;
const LEAF_PATH = `M0 0H${LEAF}A${LEAF} ${LEAF} 0 0 1 0 ${LEAF}Z`;

/** A Ram, centred on 0,0. */
function ramArt(side) {
  const w = WOOD[side], tri = [0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M0 -23.5L5.6 -15.5H-5.6Z"/>`).join('');
  return `<g class="sh"><rect x="-27" y="-23" width="64" height="67" rx="13"/><rect x="-24" y="-19" width="64" height="67" rx="13"/></g>` +
    `<g class="body"><g class="tilt">` +
    `<rect x="-32" y="${-32 + RAM_H}" width="64" height="64" rx="11" fill="${w.side}"/>` +
    `<rect x="-32" y="-32" width="64" height="64" rx="11" fill="${w.top}" stroke="${w.rim}" stroke-width="1"/>` +
    `<rect x="-26" y="-26" width="52" height="52" rx="6.5" fill="none" stroke="${w.hi}" stroke-opacity="${w.hiO}" stroke-width="1.5"/>` +
    `<g fill="url(#brl)" stroke="#6f5218" stroke-width=".6">${tri}</g>` +
    `<circle r="8" fill="url(#br)" stroke="#6f5218" stroke-width=".8"/><circle cx="-2.6" cy="-2.9" r="2.3" fill="#fffbe6" opacity=".85"/>` +
    `</g></g>`;
}

/** A Keep, centred on 0,0: battlements round the top, the bell in the middle. */
function keepArt(side) {
  const w = WOOD[side], R = KEEP_R;
  return `<g class="sh"><ellipse cx="6" cy="${KEEP_H + 5}" rx="${R + 1}" ry="${R + 1}"/><ellipse cx="9" cy="${KEEP_H + 9}" rx="${R + 1}" ry="${R + 1}"/></g>` +
    `<g class="waves"><circle r="41"/><circle r="41"/></g>` +
    `<g class="body"><g class="tilt">` +
    `<circle cy="${KEEP_H}" r="${R}" fill="${w.side}"/><rect x="${-R}" width="${R * 2}" height="${KEEP_H}" fill="${w.side}"/>` +
    `<circle r="${R}" fill="${w.lo}" stroke="${w.rim}" stroke-width="1"/>` +
    `<circle r="30.5" fill="none" stroke="${w.top}" stroke-width="11" stroke-dasharray="15.4 8.55" transform="rotate(-14.5)"/>` +
    `<circle r="24.5" fill="${w.court}" stroke="${w.courtRim}" stroke-width="1.2"/>` +
    `<circle class="glow" r="24" fill="url(#glow)"/>` +
    `<g class="bell"><circle r="14.5" fill="url(#br)" stroke="#6f5218" stroke-width=".9"/><circle r="9" fill="none" stroke="#8a6a25" stroke-opacity=".55" stroke-width="1.1"/>` +
    `<circle r="3.8" fill="#8a6a25"/><ellipse cx="-5.2" cy="-5.8" rx="3.6" ry="2.4" fill="#fffbe6" opacity=".8" transform="rotate(-40 -5.2 -5.8)"/></g>` +
    `</g></g>`;
}

/** A Gate with its hinge on 0,0, the leaf turned by `angle` (0 lies towards +x +y; a quarter turn is 90). */
function gateArt(side, angle) {
  const w = WOOD[side], t = `translate(${LEAF_IN} ${LEAF_IN})`;
  const studs = r => [18, 45, 72].map(a => { const x = r * Math.cos(a * Math.PI / 180), y = r * Math.sin(a * Math.PI / 180); return `<circle cx="${f1(x)}" cy="${f1(y)}" r="2" fill="#6f5218"/>`; }).join('');
  return `<g class="sh"><g transform="translate(6 8)"><g class="rot" transform="rotate(${angle})"><path transform="${t}" d="${LEAF_PATH}"/></g></g>` +
    `<g transform="translate(9 12)"><g class="rot" transform="rotate(${angle})"><path transform="${t}" d="${LEAF_PATH}"/></g></g></g>` +
    `<g class="body"><g class="tilt">` +
    `<g class="deep" transform="translate(0 ${GATE_H})"><g class="rot" transform="rotate(${angle})"><path transform="${t}" d="${LEAF_PATH}" fill="${w.side}" stroke="${w.side}" stroke-width="1" stroke-linejoin="round"/></g></g>` +
    `<g class="rot" transform="rotate(${angle})"><g transform="${t}">` +
    `<path d="${LEAF_PATH}" fill="${w.top}" stroke="${w.rim}" stroke-width="1" stroke-linejoin="round"/>` +
    `<path d="M5 5H${LEAF - 9}A${LEAF - 9} ${LEAF - 9} 0 0 1 5 ${LEAF - 9}Z" fill="none" stroke="${w.hi}" stroke-opacity="${w.hiO * 0.8}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M0 0L${f1(LEAF * 0.866)} ${f1(LEAF * 0.5)}M0 0L${f1(LEAF * 0.5)} ${f1(LEAF * 0.866)}" stroke="${w.rim}" stroke-opacity=".5" stroke-width="1.2"/>` +
    `<path d="M33 0A33 33 0 0 1 0 33M64 0A64 64 0 0 1 0 64" fill="none" stroke="url(#brl)" stroke-width="6"/>` +
    `<path d="M33 0A33 33 0 0 1 0 33M64 0A64 64 0 0 1 0 64" fill="none" stroke="#fffbe6" stroke-opacity=".35" stroke-width="1" transform="translate(-.8 -.8)"/>` +
    studs(33) + studs(64) +
    `</g></g>` +
    `<circle r="8.5" fill="url(#br)" stroke="#6f5218" stroke-width=".9"/><circle cx="-2.4" cy="-2.6" r="2.3" fill="#fffbe6" opacity=".85"/>` +
    `</g></g>`;
}

/** A piece on its own, for the panel beside the board and the rules: kind and side, in a square box `size` px wide. */
function pieceIcon(kind, side, size) {
  const art = kind === RAM ? ramArt(side) : kind === KEEP ? keepArt(side) : `<g transform="translate(-45 -47)">${gateArt(side, 0)}</g>`;
  return `<svg class="pi k${kind}" viewBox="-52 -52 104 104" width="${size}" height="${size}" aria-hidden="true">${art}</svg>`;
}

/* ── marks laid over the board: where a piece may go, and what will happen there ── */
const dotMark = (x, y) => `<circle class="t-dot" cx="${x}" cy="${y}" r="10.5"/>`;
const ringMark = (x, y, r, cls) => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
const boxMark = (x, y, cls) => `<rect class="${cls}" x="${x - 41}" y="${y - 41}" width="82" height="82" rx="17"/>`;
/** an arrow from one point to another, stopping short at both ends */
function arrowMark(x1, y1, x2, y2, cls, a = 12, b = 12) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
  const sx = x1 + ux * a, sy = y1 + uy * a, ex = x2 - ux * b, ey = y2 - uy * b, h = 11;
  return `<g class="${cls}"><path d="M${f1(sx)} ${f1(sy)}L${f1(ex - ux * 6)} ${f1(ey - uy * 6)}"/>` +
    `<path class="head" d="M${f1(ex)} ${f1(ey)}L${f1(ex - ux * h - uy * h * 0.62)} ${f1(ey - uy * h + ux * h * 0.62)}L${f1(ex - ux * h + uy * h * 0.62)} ${f1(ey - uy * h - ux * h * 0.62)}Z"/></g>`;
}
/** the bar a piece is squeezed against: across the far side of its square */
function anvilMark(x, y, dx, dy) {
  const px = x + dx * 46, py = y + dy * 46;
  return `<path class="t-anvil" d="M${f1(px - dy * 30)} ${f1(py + dx * 30)}L${f1(px + dy * 30)} ${f1(py - dx * 30)}"/>`;
}
const crossMark = (x, y) => `<g class="t-strike"><circle cx="${x}" cy="${y}" r="41"/><path d="M${x} ${y - 49}v16M${x} ${y + 33}v16M${x - 49} ${y}h16M${x + 33} ${y}h16"/></g>`;

/** the tower with its bell, from the side: the emblem on the box */
const CREST = `<svg class="crest" viewBox="0 0 64 84" aria-hidden="true"><path class="c-ink" d="M7 4h10v7h8V4h14v7h8V4h10v19l-4 5v48a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V28l-4-5Z"/>` +
  `<path class="c-win" d="M21 63V46a11 11 0 0 1 22 0v17Z"/><path class="c-bell" d="M32 41.5c-5 0-6.6 4.6-6.9 11.3-.1 1.6-1.1 2.4-2.1 3.2h18c-1-.8-2-1.6-2.1-3.2-.3-6.700-1.900-11.300-6.900-11.300Z"/><circle class="c-bell" cx="32" cy="58.600" r="2.300"/>` +
  `<path class="c-line" d="M11 28h42"/></svg>`;
