/* ── The officers: a drawn stand-in until her own picture is there ──
   A bust in her colours on one sheet (120 by 128, her face a little above the middle): skin, hair and its cut, the
   coat of her service, a cap for those who wear one, shoulder boards for the senior. It is made into a picture
   (an <img>), so a stand-in is framed by the very rules her own picture will be: a portrait is cut to its frame from
   a little below the top, a face is the same picture drawn large behind a round window.
   look: [skin, hair, cut, cap, coat]; tone: [behind her, from … to, her shirt]. */
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
const HAIR = {
  bob: ['', 'M-30 4Q-34 -34 0 -36Q34 -34 30 4L26 18Q24 -6 14 -14Q0 -8 -16 -12Q-24 -4 -26 18Z'],
  curls: ['', 'M-34 14Q-44 -6 -32 -22Q-28 -40 -8 -38Q4 -46 20 -36Q38 -30 34 -8Q44 8 32 22Q30 0 18 -12Q0 -6 -18 -12Q-28 0 -34 14Z'],
  long: ['M-29 50Q-40 -6 -26 -24Q-14 -40 4 -37Q30 -34 29 -4Q33 26 27 50Z', 'M-28 40Q-36 -6 -26 -24Q-14 -40 4 -37Q30 -34 29 -4Q30 14 27 40L21 40Q24 6 14 -14Q0 -6 -16 -13Q-23 6 -20 40Z'],
  wave: ['M-31 38Q-42 4 -30 -18Q-18 -40 6 -37Q32 -32 30 -6Q42 12 31 40Z', 'M-30 30Q-40 4 -30 -18Q-18 -40 6 -37Q32 -32 30 -6Q40 10 30 34Q28 8 16 -12Q-2 -4 -18 -13Q-26 2 -30 30Z'],
  updo: ['', 'M-27 6Q-32 -22 -14 -30Q-18 -46 0 -48Q18 -46 14 -30Q32 -22 27 6Q24 -8 14 -15Q0 -8 -16 -13Q-24 -6 -27 6Z'],
  fringe: ['M-29 48Q-38 -6 -25 -25Q-13 -40 4 -37Q29 -34 28 -5Q32 24 27 48Z', 'M-27 36Q-34 -8 -24 -25Q-12 -40 4 -37Q28 -34 27 -6Q29 14 26 36L21 36Q23 8 21 -12Q8 -9 -6 -11Q-16 -12 -21 -13Q-23 8 -21 36Z'],
  crop: ['', 'M-24 -4Q-27 -32 0 -35Q27 -32 24 -4Q21 -17 12 -21Q0 -17 -13 -21Q-21 -15 -24 -4Z'],
  bun: ['M0 -38a11 10 0 1 0 22 0a11 10 0 1 0 -22 0Z', 'M-24 0Q-28 -30 0 -34Q28 -30 24 0Q21 -15 11 -20Q0 -15 -12 -20Q-21 -13 -24 0Z'],
  pony: ['M16 -26Q42 -24 38 8Q36 30 27 42L21 37Q29 20 27 4Q27 -10 14 -16Z', 'M-24 0Q-28 -30 0 -34Q28 -30 24 0Q21 -15 11 -20Q0 -15 -12 -20Q-21 -13 -24 0Z'],
  braid: ['M-31 4a7 8 0 1 0 14 0a7 8 0 1 0 -14 0ZM-33 18a6.500 8 0 1 0 13 0a6.500 8 0 1 0 -13 0ZM-34 32a6 7.500 0 1 0 12 0a6 7.500 0 1 0 -12 0ZM-34 45a5 6 0 1 0 10 0a5 6 0 1 0 -10 0Z', 'M-25 4Q-30 -30 0 -34Q28 -30 24 0Q21 -15 11 -20Q0 -15 -12 -20Q-20 -12 -25 4Z'],
  afro: ['M-38 -14a38 36 0 1 0 76 0a38 36 0 1 0 -76 0Z', 'M-30 -2Q-32 -30 0 -33Q32 -30 30 -2Q24 -14 12 -19Q0 -15 -12 -19Q-24 -14 -30 -2Z'],
  locs: ['M-29 -12Q-35 20 -31 46L-26 48L-23 42L-20 48Q-19 20 -20 -10ZM29 -12Q35 20 31 46L26 48L23 42L20 48Q19 20 20 -10Z', 'M-27 -2Q-30 -32 0 -35Q30 -32 27 -2Q22 -16 12 -20Q0 -16 -12 -20Q-22 -15 -27 -2Z'],
  crown: ['', 'M-27 4Q-31 -22 -16 -30Q-10 -42 0 -42Q10 -42 16 -30Q31 -22 27 4Q24 -8 14 -15Q0 -8 -16 -13Q-24 -6 -27 4ZM-20 -30Q0 -44 20 -30Q0 -36 -20 -30Z'],
};
const COAT = {  // coat, facing (lapels), shirt
  navy: ['#14243a', '#e2b04a', '#fbf5e3'], air: ['#3c5c80', '#c9d6e2', '#e6f1f8'], army: ['#4d603c', '#c8324b', '#e9e0b6'], fort: ['#4a4f5c', '#c8324b', '#e6e2d6'],
  staff: ['#1f4a40', '#e2b04a', '#f4eed6'], general: ['#2f4a34', '#e2b04a', '#f4eed6'], white: ['#f4f1e8', '#e2b04a', '#14243a'],
};
function capArt(kind, coat) {
  if (kind === 'navy' || kind === 'air' || kind === 'army') {
    const top = kind === 'navy' ? '#f6f3ea' : coat, band = kind === 'navy' ? '#14243a' : shade(coat, -.35);
    return `<path d="M-29 -27Q-34 -47 0 -50Q34 -47 29 -27Q0 -33 -29 -27Z" fill="${top}"/><path d="M-29 -27Q0 -33 29 -27L27 -20Q0 -26 -27 -20Z" fill="${band}"/><path d="M-25 -20.500Q0 -26 25 -20.500Q14 -14 0 -13.500Q-14 -14 -25 -20.500Z" fill="#0c1626"/><circle cx="0" cy="-30" r="4.2" fill="#e2b04a"/><circle cx="0" cy="-30" r="1.8" fill="#94681a"/>`;
  }
  if (kind === 'beret') return `<path d="M-27 -22Q-33 -42 -2 -45Q34 -46 30 -27Q14 -31 0 -29Q-14 -28 -27 -22Z" fill="${shade(coat, -.25)}"/><circle cx="-13" cy="-32" r="3.2" fill="#e2b04a"/>`;
  if (kind === 'side') return `<path d="M-24 -25L-18 -41Q6 -47 26 -30Q4 -33 -24 -25Z" fill="${coat}"/><path d="M-24 -25Q4 -33 26 -30L25 -26.500Q4 -29.500 -23 -21.500Z" fill="${shade(coat, -.35)}"/><circle cx="-6" cy="-35" r="2.4" fill="#c9d6e2"/>`;
  return '';
}
const SENIOR = new Set(['Captain', 'Commander', 'Wing Commander', 'Colonel', 'Commodore', 'General', 'Vice Admiral', 'Admiral', 'Fleet Admiral', 'Major']);
/** her stand-in, as SVG */
function bust(w) {
  const [skin, hair, cut, hat, service] = w.look, [a, b] = w.tone, [coat, facing, shirt] = COAT[service], [back, front] = HAIR[cut], senior = SENIOR.has(w.rank);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -64 120 128" width="480" height="512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' + `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>` +
    '<rect x="-60" y="-64" width="120" height="128" fill="url(#g)"/><circle cx="34" cy="-36" r="46" fill="#fff" opacity=".14"/><circle cx="-44" cy="30" r="40" fill="#000" opacity=".1"/>' +
    (back ? `<path d="${back}" fill="${shade(hair, -.18)}"/>` : '') +
    `<path d="M-52 64Q-50 26 -18 20L18 20Q50 26 52 64Z" fill="${coat}"/><path d="M-52 64Q-50 26 -18 20L-6 20Q-34 30 -36 64Z" fill="#000" opacity=".12"/>` +
    (senior ? '<path d="M-44 31l14 -7l2 5l-14 8ZM44 31l-14 -7l-2 5l14 8Z" fill="#e2b04a"/>' : '') +
    `<path d="M-18 20L0 44L18 20" fill="${shirt}"/><path d="M-30 24L-18 20L-8 34ZM30 24L18 20L8 34Z" fill="${facing}"/>` +
    (service === 'air' ? '<path d="M-30 46q6 -5 12 -1q-6 0 -12 1ZM-6 46q-6 -5 -12 -1q6 0 12 1Z" fill="#c9d6e2"/>' : '') +
    (service === 'staff' || w.rank === 'Flag Lieutenant' ? '<path d="M30 28Q22 44 30 56" fill="none" stroke="#e2b04a" stroke-width="2.200"/>' : '') +
    (service === 'white' || service === 'general' ? '<path d="M-30 50h10M-30 54h10" stroke="#c8324b" stroke-width="2.400"/><path d="M-30 46h10" stroke="#e2b04a" stroke-width="2.400"/>' : '') +
    `<rect x="-8" y="6" width="16" height="18" rx="6" fill="${shade(skin, -.14)}"/><ellipse cx="0" cy="-8" rx="21" ry="24" fill="${skin}"/><path d="M0 -32A21 24 0 0 1 0 16A26 24 0 0 0 0 -32Z" fill="#000" opacity=".06"/>` +
    `<path d="${front}" fill="${hair}"/>` + capArt(hat, coat) + '</svg>';
}
const BUSTS = new Map();
/** the stand-in as a picture's address */
function bustURL(w) { if (!BUSTS.has(w.id)) BUSTS.set(w.id, 'data:image/svg+xml,' + encodeURIComponent(bust(w))); return BUSTS.get(w.id); }
/* ── her own picture ──
   An officer's own picture is one she was given at the saves service (the cast, 12-cast.js). It is kept on the hub's
   CDN, which hands it out at a few widths: it is asked for at the width that fits the place it is shown in (px, in
   CSS pixels). Her album there holds the pictures of her three cards, at places 1 to 3; a card that has none shows
   her portrait. A page built to try things out can read pictures from a folder beside it instead (ART.base).
   Whoever has no picture, or one that does not load, has her stand-in. */
/** the address of her own picture for a place px wide, or '' while she has none */
const pictureOf = (w, px) => CAST.photo(w.id, px) || (ART.base ? `${ART.base}${w.id}.jpg` : '');
/** her picture as an <img>. It says whose it is and how wide its place is, so it can be hung again where it is when
 *  the cast changes (hangPictures); data-bust marks a picture of her own, which gives way to the stand-in if it fails. */
const picture = (w, px = 132) => { const own = pictureOf(w, px); return `<img src="${own || bustURL(w)}" alt="" data-who="${w.id}" data-px="${px}"${own ? ` data-bust="${w.id}"` : ''}>`; };
/** her picture in a frame that cuts it to shape */
const portrait = (w, cls = '', px = 132) => `<span class="portrait ${cls}">${picture(w, px)}</span>`;
/** Hangs every picture on the page again where it is: the cast has changed, and someone's picture is no longer the
 *  one shown. Nothing else is drawn again, so a game under way is not disturbed. */
function hangPictures() {
  for (const img of document.querySelectorAll('img[data-who]')) {
    const w = womanById(img.dataset.who); if (!w) continue;
    const own = pictureOf(w, +img.dataset.px || undefined), src = own || bustURL(w);
    if (own) img.dataset.bust = w.id; else delete img.dataset.bust;
    if (img.getAttribute('src') !== src) img.src = src;
  }
  for (const r of document.querySelectorAll('.roster')) r.classList.toggle('own', [...r.querySelectorAll('.d-pic img')].some(i => i.dataset.bust));
}
/** her face as a round token. state: 'won' she has been beaten, 'open' she sits down, 'new' she sits down and has not
 *  been played, 'shut' she does not sit down yet */
const face = (w, state) => `<span class="face ${state}"><span class="face-in">${picture(w, 34)}</span>${state === 'new' ? '<i class="face-new"></i>' : ''}</span>`;
const faceState = w => (!isOpen(w) ? 'shut' : recordOf(w.id).w ? 'won' : isNew(w) ? 'new' : 'open');
/** one of her three cards: won, or still face down */
function cardArt(w, i, won) {
  const stars = '★'.repeat(i + 1);
  if (!won) return `<div class="card back"><div class="card-in"><span class="card-star">${stars}</span><span class="card-lock">Beat ${w.name.split(' ')[0]} ${CARD_WINS[i] === 1 ? 'once' : CARD_WINS[i] + ' times'}</span></div></div>`;
  const own = CAST.plate(w.id, i + 1, 156);                    // the picture this card was given, at its place in her album
  const pic = own ? `<img src="${own}" alt="" onerror="this.remove()">` : '';
  return `<div class="card t${i}"><div class="card-in">${portrait(w, 'card-pic', 156)}${pic}<span class="card-star">${stars}</span><div class="card-cap"><b>${w.name}</b><i>${w.cards[i][0]}</i><p>${w.cards[i][1]}</p></div></div></div>`;
}
