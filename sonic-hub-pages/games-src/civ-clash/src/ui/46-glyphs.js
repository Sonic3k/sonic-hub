/* ── Glyphs for events and relics, built from the card symbols so a seasoned player reads them at a glance ──
   A plain roundel is something everyone gets now: one green plus per HP healed, one red minus per HP lost, one coin per gold.
   A corner badge changes a kind of effect: +1 / −1, or ↻ for every turn. A red bar across means it is barred this round.
   A red HP tag says who it hits: ▲ the most HP, ▼ the least (or, on a relic, while your HP is low). */
const GLYPH_ART = {
  heal: ['#3b7739', SYM_STYLE.H[1]],
  hurt: ['#8f1f17', '<path d="M6 12h12" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>'],
  gold: ['#a07a1c', SYM_STYLE.G[1]],
  draw: ['#323d79', SYM_STYLE.D[1]],
  wall: ['#666d78', SYM_STYLE.W[1]],
  strike: ['#a8331f', SYM_STYLE.A[1]],
  discard: ['#323d79', '<rect x="7" y="5" width="10" height="14" rx="1.6" fill="none" stroke="#fff" stroke-width="2"/><path d="M9.2 12h5.6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'],
  pass: ['#323d79', '<rect x="4.6" y="6" width="8.6" height="12" rx="1.4" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M11.6 12h7.6M16.4 9.1l2.9 2.9-2.9 2.9" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>'],
  shield: ['#46566b', '<path d="M12 4.6l6 2.2v4.6c0 4-2.6 6.6-6 8.1-3.4-1.5-6-4.1-6-8.1V6.8z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>'],
  market: ['#a07a1c', '<path d="M4.6 12.6L11.6 5.6H18.4V12.4L11.4 19.4z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><circle cx="15.2" cy="8.8" r="1.6" fill="#fff"/><path d="M9.6 13.4l2.2-2.2M11.4 15.2l2.2-2.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>'],
  hpmax: ['#9f2a1c', '<text x="12" y="15.6" text-anchor="middle" font-family="Alegreya,Georgia,serif" font-weight="800" font-size="10" fill="#fff">HP</text>'],
  revive: ['#3b7739', '<path d="M12 19.5V9M7.6 12.8L12 8.4l4.4 4.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 5.4h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'],
};
const GLYPH_NAME = { heal: 'heal', hurt: 'lose HP', gold: 'gold', draw: 'draw', wall: 'structures', strike: 'Strike', discard: 'discard a card', pass: 'pass a card', shield: 'damage taken', market: 'hiring', hpmax: 'max HP', revive: 'rise again' };
const CREAM = '#f6ebcf';
function glyphSVG(g, size) {
  if (g.tag) {
    /* who it hits: a red HP tag with ▲ (the most HP) or ▼ (the least) */
    const up = g.tag === 'most';
    return `<svg class="gl tag" viewBox="0 0 30 26" width="${(size * 30 / 26).toFixed(1)}" height="${size}" aria-hidden="true"><rect x="1" y="5" width="28" height="16" rx="3.5" fill="#9f2a1c" stroke="#55120a" stroke-width="1"/><text x="10.6" y="16.8" text-anchor="middle" font-family="Alegreya,Georgia,serif" font-weight="800" font-size="9.6" fill="#fde9c8">HP</text><path d="${up ? 'M20.6 16.4L24 10.6l3.4 5.8z' : 'M20.6 10.6L24 16.4l3.4-5.8z'}" fill="#fde9c8"/></svg>`;
  }
  const [bg, art] = GLYPH_ART[g.k], wide = g.badge != null || g.turn;
  let s = `<g transform="translate(.5 .5)"><circle cx="12" cy="12" r="11.4" fill="${bg}" stroke="#24180c" stroke-opacity=".8" stroke-width=".9"/><circle cx="12" cy="12" r="10.15" fill="none" stroke="#d2ad57" stroke-width="1.15"/>${art.replace(/#fff/g, CREAM)}`;
  if (g.ban) s += '<circle cx="12" cy="12" r="10.4" fill="none" stroke="#e0412b" stroke-width="1.8"/><path d="M4.9 19.1L19.1 4.9" stroke="#2a0d07" stroke-width="3.8" stroke-linecap="round"/><path d="M4.9 19.1L19.1 4.9" stroke="#e0412b" stroke-width="2.2" stroke-linecap="round"/>';
  s += '</g>';
  if (g.badge != null) {
    const plus = String(g.badge).startsWith('+'), txt = String(g.badge).replace('-', '−');
    s += `<rect x="15.2" y="15.4" width="13.6" height="10.2" rx="5.1" fill="${plus ? '#2e6a2c' : /^\d/.test(txt) ? '#5a4636' : '#8a2412'}" stroke="${CREAM}" stroke-width="1"/><text x="22" y="23.3" text-anchor="middle" font-family="Alegreya,Georgia,serif" font-weight="800" font-size="8.4" fill="#fbefd6">${txt}</text>`;
  } else if (g.turn) {
    s += `<circle cx="22.4" cy="19.6" r="6.3" fill="#5a3a8a" stroke="${CREAM}" stroke-width="1"/><path d="M19.46 17.9A3.4 3.4 0 1 1 21.3 22.9" fill="none" stroke="#fbefd6" stroke-width="1.7" stroke-linecap="round"/><path d="M18.5 21.9l3.6-1.2-.9 3.5z" fill="#fbefd6"/>`;
  }
  const vw = wide ? 29 : 25, vh = wide ? 26 : 25;
  return `<svg class="gl" viewBox="0 0 ${vw} ${vh}" width="${(size * vw / 25).toFixed(1)}" height="${(size * vh / 25).toFixed(1)}" aria-hidden="true">${s}</svg>`;
}
function glyphRow(list, size, cls) { return list && list.length ? `<span class="glyphs${cls ? ' ' + cls : ''}" aria-hidden="true">${list.map(g => glyphSVG(g, size)).join('')}</span>` : ''; }
const EVENT_GLYPHS = {
  plague: [{ k: 'hurt' }],
  harvest: [{ k: 'heal' }],
  silkroad: [{ k: 'gold' }],
  winter: [{ k: 'wall', badge: '-1' }],
  fair: [{ k: 'market', badge: '-1' }],
  feast: [{ k: 'draw' }],
  revolt: [{ tag: 'most' }, { k: 'hurt' }],
  crusade: [{ k: 'strike', badge: '+1' }],
  monsoon: [{ k: 'wall', ban: true }],
  flood: [{ k: 'discard' }],
  eclipse: [{ k: 'pass' }],
  bells: [{ tag: 'least' }, { k: 'heal' }, { k: 'heal' }],
  attrition: [{ k: 'hurt' }],
};
const RELIC_GLYPHS = {
  joyeuse: [{ k: 'strike', badge: '+1' }],
  grail: [{ k: 'heal', badge: '+1' }],
  scone: [{ k: 'wall', badge: '+1' }],
  compass: [{ k: 'draw', turn: true }],
  seal: [{ k: 'market', badge: '-1' }, { k: 'gold' }],
  jade: [{ k: 'hpmax', badge: '+2' }],
  horn: [{ tag: 'least' }, { k: 'strike', badge: '+1' }],
  banner: [{ k: 'revive', badge: '3' }],
  shroud: [{ k: 'shield', badge: '-1' }],
  mint: [{ k: 'gold', turn: true }],
};
function eventGlyphs(id, size, cls) { return glyphRow(EVENT_GLYPHS[id], size, cls); }
function relicGlyphs(id, size, cls) { return glyphRow(RELIC_GLYPHS[id], size, cls); }
/* the key, in the Codex: one line per mark */
const GLYPH_LEGEND = [
  [[{ k: 'heal' }, { k: 'heal' }], 'One green plus per HP healed.'],
  [[{ k: 'hurt' }], 'One red minus per HP lost (not a Strike: walls do not stop it).'],
  [[{ k: 'gold' }, { k: 'draw' }], 'Gain 1 gold; draw 1 card.'],
  [[{ k: 'discard' }, { k: 'pass' }], 'Discard 1 random card; pass 1 random card to the next player.'],
  [[{ k: 'wall', badge: '-1' }, { k: 'strike', badge: '+1' }], 'A badge changes that effect: structures lose 1 durability; each Strike deals 1 extra damage.'],
  [[{ k: 'wall', ban: true }], 'A red bar: not allowed this round (here, building structures).'],
  [[{ k: 'gold', turn: true }], 'Every turn.'],
  [[{ tag: 'most' }, { tag: 'least' }], 'Only whoever has the most HP, or the least (on a relic: while your HP is low).'],
  [[{ k: 'market', badge: '-1' }, { k: 'shield', badge: '-1' }], 'Hiring costs 1 less; attacks against you deal 1 less.'],
  [[{ k: 'hpmax', badge: '+2' }, { k: 'revive', badge: '3' }], 'Max HP 2 higher; rise again with 3 HP.'],
];
