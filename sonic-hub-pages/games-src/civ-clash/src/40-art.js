/* ── Art drawn in code: symbol badges, heraldic crests ── */
const SYM_STYLE = {
  A: ['#b3261e', '<path d="M6 18L16 8M14 6l4 0 0 4M5 15l4 4M7 17l-2 2" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'],
  W: ['#56657d', '<path d="M5 19V9h3v3h2.5V9h3v3H16V9h3v10z" fill="#fff"/>'],
  H: ['#2e7d32', '<path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>'],
  M: ['#c99512', '<path d="M13.5 3L6 13.5h5L9.5 21 18 10h-5z" fill="#fff"/>'],
  D: ['#3f51b5', '<rect x="7" y="5" width="10" height="14" rx="1.6" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 9v6M9 12h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
  G: ['#b8860b', '<circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M12 8.5v7M10 10.5h3.4M10 13.5h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'],
  R: ['#7a4a20', '<path d="M5 15l7-7 3 3-7 7zM13 7l2-2 4 4-2 2" fill="#fff"/><path d="M4 20h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
  S: ['#7b3fa0', '<path d="M8 19v-6l-2-3 1.5-1 2.5 2.5V5.5a1.2 1.2 0 0 1 2.4 0V11V4.5a1.2 1.2 0 0 1 2.4 0V11V5.5a1.2 1.2 0 0 1 2.4 0V12c0 4-2 7-5 7z" fill="#fff"/>'],
  C: ['#6d5bb0', '<circle cx="12" cy="7" r="3.2" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 10.5V20M8.5 13.5h7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'],
  K: ['#9b1c1c', '<path d="M6 20c.5-5 2.5-8 5.5-9l1.5-5 2 2 3-1-1 4 2.5 3-1.8 1.8-2.7-1.8c-1 3-2 5-4.5 6z" fill="#fff"/>'],
  E: ['#55626b', '<path d="M4 15c0-5 3.5-8 8-8 4 0 7 2.5 7 6v6h-2.5v-3.5h-2V19H12v-3.5c-1 .6-2.6.7-3.6.2-.4 2-.2 3.3.8 4.3-2.5 0-4.7-1.8-5.2-5z" fill="#fff"/><circle cx="16" cy="11" r=".9" fill="#55626b"/>'],
  L: ['#b07a3c', '<path d="M5 19l1-6c0-2 1.5-3 3-3l1.5-2.5L12 10h1l1.5-3 2 .5 1.5 2 1.5 1-1.5 1-1-.5L16 13v6h-1.6v-4.5l-2 .5-1.4 4H9.5l.6-4.6L7 14.5 6.6 19z" fill="#fff"/>'],
  B: ['#2f6b3a', '<path d="M7 4c7 3 7 13 0 16" fill="none" stroke="#fff" stroke-width="2"/><path d="M7 4v16" stroke="#fff" stroke-width="1"/><path d="M5 12h14M16.5 9.5L19 12l-2.5 2.5" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>'],
  F: ['#d9541a', '<path d="M12 3.5c3.5 3 6 6 6 9.8a6 6 0 0 1-12 0c0-1.9.9-3.5 2-4.8.1 1.6 1 2.8 2.3 3-.5-2.5.3-5.3 1.7-8z" fill="#fff"/>'],
  Y: ['#0f766e', '<path d="M3 10l6 1.5L12 6l3 5.5L21 10l-4 4.5 1 4-6-2.5-6 2.5 1-4z" fill="#fff"/>'],
  N: ['#1f4e79', '<path d="M12 4v11M12 4l6 9h-6M4 16h16l-2.5 3.5h-11z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>'],
};
function symBadge(ch, size = 30) {
  const [bg, glyph] = SYM_STYLE[ch];
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="sym" aria-label="${SYM[ch].name}" role="img"><circle cx="12" cy="12" r="11.4" fill="${bg}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,.35)" stroke-width=".8"/>${glyph}</svg>`;
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
};
function crest(civ, size = 44) {
  const C = CIVS[civ];
  const shield = 'M5 4h30v15c0 10-7.5 15.5-15 18.5C12.5 34.5 5 29 5 19z';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="crest" style="color:${C.color}" aria-hidden="true"><path d="${shield}" fill="${C.color}" stroke="#1d1209" stroke-width="1.6"/><path d="M7 6h26v6H7z" fill="rgba(255,255,255,.14)"/>${CHARGES[C.charge] || ''}</svg>`;
}
function mercCrest(size = 44) {
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}" class="crest" aria-hidden="true"><path d="M5 4h30v15c0 10-7.5 15.5-15 18.5C12.5 34.5 5 29 5 19z" fill="#6b5a3a" stroke="#1d1209" stroke-width="1.6"/><circle cx="20" cy="17" r="7" fill="#e6c25a" stroke="#8a6a1a"/><path d="M20 12.5v9M17.5 15h4.5M17.5 18.5h5" stroke="#6b4a10" stroke-width="1.5"/></svg>`;
}
