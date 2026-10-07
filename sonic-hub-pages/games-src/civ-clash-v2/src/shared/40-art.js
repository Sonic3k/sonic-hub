/* ── Art drawn in code: symbol badges, heraldic crests ── */
const SYM_STYLE = {
  A: ['#b3261e', '<path d="M6 18L16 8M14 6l4 0 0 4M5 15l4 4M7 17l-2 2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
  W: ['#56657d', '<path d="M5 19V9h3v3h2.5V9h3v3H16V9h3v10z" fill="#fff"/>'],
  H: ['#2e7d32', '<path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>'],
  M: ['#6a3fb0', '<path d="M13.5 3L6 13.5h5L9.5 21 18 10h-5z" fill="#fff"/>'],
  D: ['#3f51b5', '<rect x="7" y="5" width="10" height="14" rx="1.6" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 9v6M9 12h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
  G: ['#b8860b', '<circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 8.5v7M10 10.5h3.4M10 13.5h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  R: ['#7a4a20', '<path d="M5 15l7-7 3 3-7 7zM13 7l2-2 4 4-2 2" fill="#fff"/><path d="M4 20h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
  S: ['#a3306d', '<path d="M8 19v-6l-2-3 1.5-1 2.5 2.5V5.5a1.2 1.2 0 0 1 2.4 0V11V4.5a1.2 1.2 0 0 1 2.4 0V11V5.5a1.2 1.2 0 0 1 2.4 0V12c0 4-2 7-5 7z" fill="#fff"/>'],
  C: ['#6d5bb0', '<circle cx="12" cy="7" r="3.2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 10.5V20M8.5 13.5h7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'],
  K: ['#9b1c1c', '<path d="M6 20c.5-5 2.5-8 5.5-9l1.5-5 2 2 3-1-1 4 2.5 3-1.8 1.8-2.7-1.8c-1 3-2 5-4.5 6z" fill="#fff"/>'],
  E: ['#55626b', '<path d="M4 15c0-5 3.5-8 8-8 4 0 7 2.5 7 6v6h-2.5v-3.5h-2V19H12v-3.5c-1 .6-2.6.7-3.6.2-.4 2-.2 3.3.8 4.3-2.5 0-4.7-1.8-5.2-5z" fill="#fff"/><circle cx="16" cy="11" r=".9" fill="#55626b"/>'],
  L: ['#b07a3c', '<path d="M5 19l1-6c0-2 1.5-3 3-3l1.5-2.5L12 10h1l1.5-3 2 .5 1.5 2 1.5 1-1.5 1-1-.5L16 13v6h-1.6v-4.5l-2 .5-1.4 4H9.5l.6-4.6L7 14.5 6.6 19z" fill="#fff"/>'],
  B: ['#2f6b3a', '<path d="M7 4c7 3 7 13 0 16" fill="none" stroke="#fff" stroke-width="2"/><path d="M7 4v16" stroke="#fff" stroke-width="1"/><path d="M5 12h14M16.5 9.5L19 12l-2.5 2.5" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>'],
  F: ['#d9541a', '<path d="M12 3.5c3.5 3 6 6 6 9.8a6 6 0 0 1-12 0c0-1.9.9-3.5 2-4.8.1 1.6 1 2.8 2.3 3-.5-2.5.3-5.3 1.7-8z" fill="#fff"/>'],
  Y: ['#0f766e', '<path d="M3 10l6 1.5L12 6l3 5.5L21 10l-4 4.5 1 4-6-2.5-6 2.5 1-4z" fill="#fff"/>'],
  N: ['#1f4e79', '<path d="M12 4v11M12 4l6 9h-6M4 16h16l-2.5 3.5h-11z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'],
  T: ['#7c1d12', '<path d="M7 19.5l2.6-12.8L11 10M12.2 19.5V6l1.4 3.2M17.4 19.5L15 7.4l-.9 3.4" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 19.5h15" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  V: ['#2a4b77', '<path d="M4 9.5h9.5a2.8 2.8 0 1 0-2.8-2.8M4 13.5h12.5a2.8 2.8 0 1 1-2.8 2.8M4 17.2h6" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round"/>'],
  /* Flank: two arrows closing in from both sides */
  X: ['#8a3b2a', '<path d="M4.2 6.2c4.6.2 6.9 3 7.3 8.6M19.8 6.2c-4.6.2-6.9 3-7.3 8.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9.1 13.1l2.4 2.9 1.2-3.6M14.9 13.1l-2.4 2.9-1.2-3.6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="18.6" r="1.6" fill="#fff"/>'],
  /* Long Ranged: an arrow arcing over a wall */
  O: ['#2c5e6e', '<path d="M3.8 17.6C5.6 9 12.6 4.6 19.4 9.6" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M16.2 7.9l3.4 1.8-.9 3.6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 20v-5h1.4v1.3h1.4V15h1.4v1.3h1.4V15H18v5z" fill="#fff"/>'],
  /* Catapult: a throwing arm on its frame, the stone in flight */
  P: ['#5a4a3a', '<path d="M4.5 19.5h11M6.5 19.5l3.5-6.5 3.5 6.5M10 13l7.6-7" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.6" cy="5.2" r="2.3" fill="#fff"/><path d="M15 18.2l3.6-3.6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  /* Snipe: a crosshair */
  Z: ['#3c3c46', '<circle cx="12" cy="12" r="6" fill="none" stroke="#fff" stroke-width="1.9"/><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="#fff"/>'],
  /* Raid: a coin carried off */
  J: ['#9a5b18', '<circle cx="14.6" cy="9.4" r="4.8" fill="none" stroke="#fff" stroke-width="1.9"/><path d="M14.6 7.1v4.6M13 8.3h2.6M13 10.5h3" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><path d="M10.6 13.4L5 19M4.8 14.6V19.2h4.6" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
  /* Bodyguard: a heater shield */
  Q: ['#4a5a72', '<path d="M12 3.8l6.6 2.4v5c0 4.4-2.9 7.3-6.6 8.9-3.7-1.6-6.6-4.5-6.6-8.9v-5z" fill="#fff"/><path d="M12 6.4v11.2M8 10.4h8" stroke="#4a5a72" stroke-width="1.6"/>'],
  /* Mantlet: a tall standing pavise on its prop */
  I: ['#6b5a3a', '<path d="M7.6 4.2h8.8l1.2 3.4v12.2H6.4V7.6z" fill="#fff"/><path d="M12 6.4v11.4M8.6 9.4h6.8" stroke="#6b5a3a" stroke-width="1.5"/><path d="M17.6 19.8l2.4 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  /* Countdown: an hourglass */
  U: ['#7a5a12', '<path d="M7 4h10M7 20h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M8.2 4c0 4.6 7.6 4.8 7.6 8s-7.6 3.4-7.6 8M15.8 4c0 4.6-7.6 4.8-7.6 8s7.6 3.4 7.6 8" stroke="#fff" stroke-width="1.7" fill="none"/><path d="M10 18.6h4l-2-2.4z" fill="#fff"/>'],
};
/* painted roundels: pigment disc, gold leaf ring, ink outline, cream glyph */
const SYM_PIG = { T: '#7c1d12', V: '#2a4b77', A: '#a8331f', K: '#861c1f', E: '#5a6164', B: '#3a6b4f', L: '#9c7040', Y: '#2d6a63', F: '#b9501f', N: '#244a74', R: '#6a4224', S: '#7a2c5b', C: '#574789', W: '#666d78', H: '#3b7739', M: '#5a3a8a', D: '#323d79', G: '#a07a1c',
  X: '#86362a', O: '#2a5a6c', P: '#584838', Z: '#3a3a44', J: '#92561a', Q: '#465670', I: '#6a5838', U: '#7a5a12' };
function symBadge(ch, size = 30) {
  const glyph = SYM_STYLE[ch][1].replace(/#fff/g, '#f6ebcf');
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="sym" aria-label="${SYM[ch].name}" role="img"><circle cx="12" cy="12" r="11.4" fill="${SYM_PIG[ch]}" stroke="#24180c" stroke-opacity=".8" stroke-width=".9"/><circle cx="12" cy="12" r="10.15" fill="none" stroke="#d2ad57" stroke-width="1.15"/><circle cx="12" cy="12" r="9.3" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".8"/><path d="M5 9.2a7.8 7.8 0 0 1 10.6-5" stroke="#fff6dc" stroke-opacity=".28" stroke-width="2" fill="none" stroke-linecap="round"/>${glyph}</svg>`;
}
const CHARGES = {
  sun: '<circle cx="20" cy="17" r="5.5" fill="#f2c94c"/>' + Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5; return `<path d="M${20 + Math.cos(a) * 7.5} ${17 + Math.sin(a) * 7.5}L${20 + Math.cos(a) * 10} ${17 + Math.sin(a) * 10}" stroke="#f2c94c" stroke-width="1.8" stroke-linecap="round"/>`; }).join(''),
  disc: '<circle cx="20" cy="17" r="7" fill="#fff"/><circle cx="20" cy="17" r="4.2" fill="currentColor"/>',
  knot: '<path d="M14 11c6 0 6 12 12 12M26 11c-6 0-6 12-12 12M13 17h14" fill="none" stroke="#f2e6c9" stroke-width="2.2"/>',
  axe: '<path d="M20 8v20" stroke="#e8e2d0" stroke-width="2.2"/><path d="M20 10c-6 0-8 4-8 7 3-1 5-1 8 1z" fill="#e8e2d0"/>',
  star: '<path d="M20 7l2.6 7.4H30l-6 4.6 2.3 7.3L20 22l-6.3 4.3 2.3-7.3-6-4.6h7.4z" fill="#f2c94c"/>',
  temple: '<path d="M11 26h18M13 26V18h14v8M15 18v-4h10v4M17 14v-3h6v3M20 11V7" stroke="#f2e6c9" stroke-width="1.8" fill="none"/>',
  wheel: '<circle cx="20" cy="17" r="7.5" fill="none" stroke="#f2e6c9" stroke-width="1.8"/>' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M20 17L${20 + Math.cos(a) * 7.5} ${17 + Math.sin(a) * 7.5}" stroke="#f2e6c9" stroke-width="1.3"/>`; }).join(''),
  crescent: '<path d="M23 9a8.5 8.5 0 1 0 0 16 7 7 0 1 1 0-16z" fill="#f2e6c9"/><path d="M26.5 14l.9 2.4 2.5.1-2 1.5.7 2.4-2.1-1.4-2.1 1.4.7-2.4-2-1.5 2.5-.1z" fill="#f2e6c9"/>',
  cross: '<path d="M20 8v20M12 15h16" stroke="#f2e6c9" stroke-width="3.4"/>',
  horse: '<path d="M13 27c.6-6 3-9.5 6.4-10.5l1.6-5.5 2.2 2.2 3.4-1.1-1.1 4.5 3 3.3-2 2-3.1-2c-1.1 3.4-2.3 5.6-5 7z" fill="#f2e6c9"/>',
  bow: '<path d="M15 8c9 4 9 15 0 19" fill="none" stroke="#f2e6c9" stroke-width="2.2"/><path d="M15 8v19M11 17.5h17" stroke="#f2e6c9" stroke-width="1.6"/>',
  tower: '<path d="M14 27V13h2v-3h2.5v3h3v-3H24v3h2v14z" fill="#f2e6c9"/><path d="M18.6 27v-5h2.8v5" fill="currentColor"/>',
  fleur: '<path d="M20 7c-3 3-3 7 0 10 3-3 3-7 0-10zM20 17c-2-4-8-5-9-1 2-1 5 0 6 3M20 17c2-4 8-5 9-1-2-1-5 0-6 3M15 21h10M20 17v11" fill="#f2c94c" stroke="#f2c94c" stroke-width="1.1" stroke-linejoin="round"/>',
  ship: '<path d="M20 8v12M20 8l7 10h-7M11 21h18l-3 5H14z" fill="#f2e6c9"/>',
  quinas: [[20, 11], [15, 17], [20, 17], [25, 17], [20, 23]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#f2e6c9"/>`).join(''),
  eagle: '<path d="M10 14l7 1.6L20 10l3 5.6 7-1.6-4.8 5 1.2 4.8-6.4-2.8-6.4 2.8 1.2-4.8z" fill="#f2e6c9"/>',
  pyramid: '<path d="M10 27h20M12 27l3-4h10l3 4M15 23l2-4h6l2 4M17 19l2-4h2l2 4" fill="none" stroke="#f2e6c9" stroke-width="1.6"/>',
  palm: '<path d="M20 28.5V15" stroke="#f2e6c9" stroke-width="2.2"/><path d="M20 15c-3-4-8-4.5-10.5-2.2 4.2-.3 7.6.8 10.5 2.2zM20 15c3-4 8-4.5 10.5-2.2-4.2-.3-7.6.8-10.5 2.2zM20 15c-.8-4.3-3.6-7.4-7.2-7.6 3 1.8 5.2 4.3 7.2 7.6zM20 15c.8-4.3 3.6-7.4 7.2-7.6-3 1.8-5.2 4.3-7.2 7.6z" fill="#f2e6c9"/>',
  kris: '<path d="M20 30v-5M16.5 25h7M20 25c-2.2-1.8 2.2-3.8 0-5.8s2.2-3.8 0-5.8 1.2-3 0-5.4c-1.4 2.2-3 3.3-1 5.4s-2.2 3.8 0 5.8-2.2 3.8 0 5.8z" fill="#f2e6c9"/>',
  chalice: '<path d="M13 9h14c0 6-3 9.2-7 9.6S13 15 13 9zM19 18.4h2V25h-2zM15 27.5h10l-1.6-2.6h-6.8z" fill="#f2c94c"/>',
  columns: '<path d="M12 27h16M14 27V16.5h2.5V13h7v3.5H26V27M16.5 16.5h7M18.5 27v-5h3v5" stroke="#f2c94c" stroke-width="2" fill="none"/>',
  crown: '<path d="M11 25h18l1.6-12-5.6 4.6L20 9l-5 8.6L9.4 13z" fill="#f2c94c"/><path d="M11 27h18" stroke="#f2c94c" stroke-width="2"/>',
  trident: '<path d="M20 7v20M13 10v7.5c0 3.2 3 5.5 7 5.5s7-2.3 7-5.5V10" stroke="#f2c94c" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M17 27h6" stroke="#f2c94c" stroke-width="2.2"/>',
  doublecross: '<path d="M20 7v21M15.5 12h9M13 17.5h14" stroke="#f2e6c9" stroke-width="3"/>',
};
function crest(civ, size = 44) {
  const C = CIVS[civ], shield = 'M5 4h30v15c0 10-7.5 15.5-15 18.5C12.5 34.5 5 29 5 19z';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="crest" style="color:${C.color}" aria-hidden="true"><path d="${shield}" fill="${C.color}" stroke="#1e140a" stroke-width="1.8"/><path d="M7.2 6.2h25.6v12.8c0 8.6-6.4 13.4-12.8 16C13.6 32.4 7.2 27.6 7.2 19z" fill="none" stroke="#d6b45f" stroke-width=".9" opacity=".85"/><path d="M7 6h26v5H7z" fill="rgba(255,240,210,.14)"/>${CHARGES[C.charge] || ''}</svg>`;
}
function mercCrest(size = 44) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="crest" aria-hidden="true"><path d="M5 4h30v15c0 10-7.5 15.5-15 18.5C12.5 34.5 5 29 5 19z" fill="#6b5a3a" stroke="#1d1209" stroke-width="1.6"/><circle cx="20" cy="17" r="7" fill="#e6c25a" stroke="#8a6a1a"/><path d="M20 12.5v9M17.5 15h4.5M17.5 18.5h5" stroke="#6b4a10" stroke-width="1.5"/></svg>`;
}

function crownSVG(size = 28) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="sym" aria-label="Imperial Age" role="img"><circle cx="12" cy="12" r="11.4" fill="#6a3fb0" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="M5.5 16.2h13l1.2-8.2-4.2 3.3L12 5.8l-3.5 5.5-4.2-3.3z" fill="#f2c94c"/><path d="M5.5 18.2h13" stroke="#f2c94c" stroke-width="1.6"/></svg>`;
}
