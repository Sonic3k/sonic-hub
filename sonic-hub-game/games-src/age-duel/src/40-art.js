/* ── Art drawn in code: the parchment map, ink icons, heraldry ── */
const INK = '#3a2715';
/* borders wander like a hand-drawn map; each shared edge is generated once so neighbours match exactly */
const EDGE_CACHE = {};
function edgePts(a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b), key = lo + '-' + hi;
  if (!EDGE_CACHE[key]) {
    let s = lo * 7919 + hi * 104729;
    const R = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const [p, q] = [PTS[lo], PTS[hi]], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    const n = Math.max(3, Math.round(len / 28)), amp = Math.min(13, len * 0.07), pts = [];
    for (let k = 1; k < n; k++) { const t = k / n, off = (R() * 2 - 1) * amp * Math.sin(Math.PI * t); pts.push([p[0] + dx * t + nx * off, p[1] + dy * t + ny * off]); }
    EDGE_CACHE[key] = pts;
  }
  return a < b ? EDGE_CACHE[key] : EDGE_CACHE[key].slice().reverse();
}
function polyPath(r) {
  const ids = POLY[r];
  let d = `M${PTS[ids[0]][0]} ${PTS[ids[0]][1]}`;
  for (let k = 0; k < ids.length; k++) {
    const a = ids[k], b = ids[(k + 1) % ids.length];
    for (const [x, y] of edgePts(a, b)) d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    d += ` L${PTS[b][0]} ${PTS[b][1]}`;
  }
  return d + ' Z';
}
function crest(civ, size = 40) {
  const C = CIVS[civ];
  const shield = 'M4 3h32v16c0 10-8 16-16 19C12 35 4 29 4 19z';
  const charge = {
    daiviet: `<circle cx="20" cy="15" r="5.2" fill="#f2c94c"/>${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${20 + Math.cos(a) * 7} ${15 + Math.sin(a) * 7}L${20 + Math.cos(a) * 9.6} ${15 + Math.sin(a) * 9.6}" stroke="#f2c94c" stroke-width="1.6" stroke-linecap="round"/>`; }).join('')}<path d="M9 27c2.5-2 5-2 7.5 0s5 2 7.5 0 5-2 7.5 0" fill="none" stroke="#f2c94c" stroke-width="1.5"/>`,
    mongol: `<path d="M20 6v24" stroke="#f4f1e6" stroke-width="1.6"/><circle cx="20" cy="9" r="2.6" fill="#f4f1e6"/>${[-5, -2.5, 0, 2.5, 5].map(d => `<path d="M20 12c${d * 0.4} 4 ${d} 9 ${d * 1.2} 14" fill="none" stroke="#f4f1e6" stroke-width="1.3" stroke-linecap="round"/>`).join('')}`,
    byzantine: `<path d="M20 7v22M11 18h18" stroke="#f2c94c" stroke-width="2.4"/>${[[13.5, 13], [26.5, 13], [13.5, 24], [26.5, 24]].map(([x, y]) => `<text x="${x}" y="${y + 2}" font-family="Alegreya,Georgia,serif" font-weight="700" font-size="7" text-anchor="middle" fill="#f2c94c">Β</text>`).join('')}`,
    frank: `<path d="M20 7c-3 3-3 7 0 10 3-3 3-7 0-10zM20 17c-2-4-8-5-9-1 2-1 5 0 6 3M20 17c2-4 8-5 9-1-2-1-5 0-6 3M15 21h10M20 17v12" fill="#f2c94c" stroke="#f2c94c" stroke-width="1.1" stroke-linejoin="round"/>`,
  }[civ];
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="crest" aria-hidden="true"><path d="${shield}" fill="${C.color}" stroke="#1d1209" stroke-width="1.6"/><path d="${shield}" fill="url(#crestGloss)" opacity=".55"/>${charge}</svg>`;
}
const RES_ICON = {
  food: `<svg viewBox="0 0 20 20" class="ri" aria-hidden="true"><path d="M10 18V7" stroke="#8a6416" stroke-width="1.4"/>${[[7, 0], [5, 3.2], [8.4, 3.6], [3.6, 6.6], [7.2, 7.2]].map(([y, dx]) => `<ellipse cx="${10 - 2.4 - dx * 0.2}" cy="${y + 1}" rx="1.9" ry="3" transform="rotate(-28 ${10 - 2.4} ${y + 1})" fill="#e7b73c" stroke="#8a6416" stroke-width=".7"/><ellipse cx="${10 + 2.4 + dx * 0.2}" cy="${y + 1}" rx="1.9" ry="3" transform="rotate(28 ${10 + 2.4} ${y + 1})" fill="#e7b73c" stroke="#8a6416" stroke-width=".7"/>`).join('')}</svg>`,
  wood: `<svg viewBox="0 0 20 20" class="ri" aria-hidden="true"><rect x="2.5" y="8" width="15" height="7" rx="3.5" fill="#9b6a3b" stroke="#5a3a1c" stroke-width="1"/><ellipse cx="16" cy="11.5" rx="2.6" ry="3.4" fill="#d9b07a" stroke="#5a3a1c" stroke-width="1"/><circle cx="16" cy="11.5" r="1.1" fill="none" stroke="#9b6a3b" stroke-width=".7"/><path d="M5 10.5h7M6 13h5" stroke="#5a3a1c" stroke-width=".7"/></svg>`,
  gold: `<svg viewBox="0 0 20 20" class="ri" aria-hidden="true"><ellipse cx="8" cy="13" rx="5.5" ry="3" fill="#f2c94c" stroke="#8a6416" stroke-width="1"/><ellipse cx="8" cy="11" rx="5.5" ry="3" fill="#ffd966" stroke="#8a6416" stroke-width="1"/><ellipse cx="13" cy="8.5" rx="5" ry="2.8" fill="#ffe08a" stroke="#8a6416" stroke-width="1"/></svg>`,
  pop: `<svg viewBox="0 0 20 20" class="ri" aria-hidden="true"><circle cx="10" cy="6" r="3.2" fill="#d8c3a0" stroke="#5a3a1c"/><path d="M4 18c.5-5 3-7 6-7s5.5 2 6 7z" fill="#d8c3a0" stroke="#5a3a1c"/></svg>`,
};
function unitIcon(t, size = 22) {
  const cls = UNITS[t].cls, s = '#2b1a0d';
  const body = {
    inf: `<path d="M6 21l11-17" stroke="${s}" stroke-width="1.6"/><path d="M15.5 2.5l3.2-.8-.8 3.2z" fill="${s}"/><circle cx="9" cy="8" r="2.4" fill="none" stroke="${s}" stroke-width="1.4"/><path d="M5 20c.5-4 2-7 4-7s3.4 2 4 6" fill="none" stroke="${s}" stroke-width="1.4"/><path d="M11 11.5l5 1.5v5l-5 1.5z" fill="${s}" opacity=".85"/>`,
    rng: `<path d="M7 3c8 4 8 14 0 18" fill="none" stroke="${s}" stroke-width="1.6"/><path d="M7 3v18" stroke="${s}" stroke-width=".8"/><path d="M4 12h15M16.5 10l2.5 2-2.5 2" fill="none" stroke="${s}" stroke-width="1.4"/>`,
    cav: `<path d="M4 20c1-5 3-8 6-9l2-5 2 2 3-1-1 4 3 3-2 2-3-2c-1 3-2 5-5 6z" fill="${s}"/><circle cx="14.5" cy="7.5" r=".9" fill="#f1e4c6"/>`,
    sie: `<rect x="3" y="11" width="15" height="5" rx="1" fill="${s}"/><path d="M18 13.5h3" stroke="${s}" stroke-width="2.4"/><circle cx="7" cy="18.5" r="2.2" fill="none" stroke="${s}" stroke-width="1.4"/><circle cx="14" cy="18.5" r="2.2" fill="none" stroke="${s}" stroke-width="1.4"/><path d="M4 11l3-5h7l3 5" fill="none" stroke="${s}" stroke-width="1.4"/>`,
    hrc: `<path d="M3 21c1-4 3-7 6-8l2-4 2 2 3-1-1 4 3 3-2 2-3-2c-1 3-2 4-5 5z" fill="${s}"/><path d="M13 2c5 2 5 8 0 10" fill="none" stroke="${s}" stroke-width="1.3"/>`,
    hcv: `<path d="M3 21c1-5 3-8 6-9l2-5 2 2 3-1-1 4 3 3-2 2-3-2c-1 3-2 5-5 6z" fill="${s}"/><path d="M8 12h7" stroke="#f2c94c" stroke-width="1.4"/><rect x="9" y="3" width="4" height="4" fill="${s}"/>`,
  }[cls];
  return `<svg viewBox="0 0 22 22" width="${size}" height="${size}" class="ui-ico" aria-hidden="true">${body}</svg>`;
}
/* little ink drawings for each kind of land */
function landArt(r, x, y) {
  const k = REGIONS[r].kind;
  if (k === 'capital') return `<g transform="translate(${x - 26} ${y - 30})" class="ink"><path d="M4 44V18h8v-6h6v6h16v-6h6v6h8v26z" fill="#e9d8ae"/><path d="M4 44V18h8v-6h6v6h16v-6h6v6h8v26z M22 44V32a4 4 0 0 1 8 0v12 M4 18h48 M12 12v-4 M40 12v-4" fill="none"/><path d="M26 12V-4" /><path d="M26 -4h14l-4 4 4 4H26" class="flag" fill="${S ? CIVS[S.sides[r === 'c0' ? 0 : 1].civ].color : '#a22'}"/></g>`;
  if (k === 'farm') return `<g transform="translate(${x - 34} ${y - 8})" class="ink">${[0, 8, 16, 24].map(d => `<path d="M${d} ${14 + d * 0.15}q18 -6 36 0" fill="none"/>`).join('')}${[8, 26, 44].map(d => `<g transform="translate(${d} 2)"><path d="M3 12V0M0 4l3 2 3-2M0 8l3 2 3-2" fill="none"/></g>`).join('')}</g>`;
  if (k === 'forest') return `<g transform="translate(${x - 34} ${y - 22})" class="ink">${[[0, 14], [16, 4], [32, 12], [48, 6], [22, 20]].map(([dx, dy]) => `<g transform="translate(${dx} ${dy})"><path d="M8 0l8 14H0z" fill="#9db28a"/><path d="M8 0l8 14H0z M8 14v6" fill="none"/></g>`).join('')}</g>`;
  if (k === 'gold') return `<g transform="translate(${x - 28} ${y - 18})" class="ink">${REGIONS[r].terrain === 'hill' ? '<path d="M-8 26q18-26 36-6q14-14 30 6" fill="#d8c08c"/><path d="M-8 26q18-26 36-6q14-14 30 6" fill="none"/>' : '<path d="M-14 28q10-6 20 0t20 0 20 0 20 0" fill="none" stroke="#3d6f9a"/>'}<path d="M14 22a10 10 0 0 1 20 0z" fill="#3a2715"/><circle cx="30" cy="16" r="3" fill="#f2c94c"/><circle cx="36" cy="20" r="2.4" fill="#f2c94c"/><path d="M8 10l10 10M18 10l-4 4" fill="none"/></g>`;
  if (k === 'relic') return `<g transform="translate(${x - 24} ${y - 34})" class="ink"><path d="M6 44V22l18-12 18 12v22z" fill="#e9d8ae"/><path d="M6 44V22l18-12 18 12v22z M24 10V-2M19 2h10 M18 44V32a6 6 0 0 1 12 0v12" fill="none"/><circle cx="24" cy="24" r="3" fill="none"/></g>`;
  return '';
}
function mapDefs() {
  return `<defs>
    <radialGradient id="vellum" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#f1e4c2"/><stop offset=".7" stop-color="#e3cf9f"/><stop offset="1" stop-color="#c8ac74"/></radialGradient>
    <filter id="rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .24  0 0 0 0 .12  0 0 0 .09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <pattern id="fog" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="rgba(90,62,30,.13)"/><path d="M0 0v8" stroke="rgba(58,39,21,.34)" stroke-width="1.5"/></pattern>
    <pattern id="haze" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v10" stroke="rgba(58,39,21,.15)" stroke-width="1"/></pattern>
    <marker id="ah0" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--c0)"/></marker>
    <marker id="ah1" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--c1)"/></marker>
    <linearGradient id="crestGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  </defs>`;
}
function compassRose(x, y, s) {
  return `<g transform="translate(${x} ${y}) scale(${s})" class="ink deco"><circle r="26" fill="none"/><circle r="20" fill="none" stroke-dasharray="2 3"/><path d="M0 -34L5 -5 0 0-5 -5zM0 34L5 5 0 0-5 5z" fill="#3a2715"/><path d="M-34 0L-5 5 0 0-5 -5zM34 0L5 5 0 0 5 -5z" fill="#e9d8ae"/><text y="-38" text-anchor="middle" class="ink-text">B</text></g>`;
}
