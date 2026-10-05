/* ── Art made in code: 12×12 pixel avatars, thread-status icons, archetype banners ── */
const AVA_CACHE = new Map();
const AVA_BG = [['#bfe3ff', '#8cc7ff'], ['#ffd6e7', '#ffadd0'], ['#d9f7c9', '#a8e39a'], ['#fff1b8', '#ffd66b'], ['#e3d7ff', '#c3a8ff'], ['#ffe0c2', '#ffbf86'], ['#c9f2ef', '#8fdcd5']];
const AVA_SKIN = ['#ffe3c8', '#f7d0a8', '#ecbb8e', '#d69e6d', '#bb875b'];
const AVA_HAIR = ['#2b1d16', '#4a2f1d', '#6b3e1f', '#1c1c28', '#a8552a', '#e0b04a', '#c23b6e', '#3a6fd8', '#7d4bd8'];
const AVA_SHIRT = ['#e2504c', '#3d7bd9', '#41a85f', '#f0a020', '#8e5bd8', '#2fb3b3', '#ff7eb6', '#4a4f63'];
function cosmeticRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return ((s >>> 8) & 0xffffff) / 0x1000000; }; }
function pixelURL(grid, pal) {
  const c = document.createElement('canvas'); c.width = 12; c.height = 12;
  const x = c.getContext('2d');
  for (let y = 0; y < 12; y++) for (let i = 0; i < 12; i++) { const ch = grid[y][i]; if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } }
  return c.toDataURL();
}
function faceGrid(R, o = {}) {
  const g = Array.from({ length: 12 }, () => Array(12).fill('b'));
  const put = (x, y, ch) => { if (x >= 0 && x < 12 && y >= 0 && y < 12) g[y][x] = ch; };
  for (let y = 9; y < 12; y++) for (let x = 0; x < 12; x++) put(x, y, 'B');
  for (let x = 2; x < 10; x++) { put(x, 10, 'S'); put(x, 11, 'S'); }
  put(1, 11, 'S'); put(10, 11, 'S');
  for (let y = 3; y < 9; y++) for (let x = 3; x < 9; x++) put(x, y, 'F');
  for (let y = 4; y < 8; y++) { put(2, y, 'F'); put(9, y, 'F'); }
  put(5, 9, 'F'); put(6, 9, 'F');
  const style = o.hair != null ? o.hair : Math.floor(R() * 7);
  const H = (x, y) => put(x, y, 'H');
  for (let x = 3; x < 9; x++) { H(x, 1); H(x, 2); }
  for (let x = 2; x < 10; x++) H(x, 2);
  H(2, 3); H(9, 3);
  if (style === 1) for (let y = 3; y < 9; y++) { H(1, y); H(2, y); H(9, y); H(10, y); }
  if (style === 2) { H(3, 0); H(5, 0); H(7, 0); H(4, 1); H(6, 1); H(8, 1); }
  if (style === 3) { for (let x = 2; x < 10; x++) { put(x, 1, 'C'); put(x, 2, 'C'); } for (let x = 0; x < 4; x++) put(x, 3, 'C'); put(3, 0, 'C'); put(4, 0, 'C'); put(5, 0, 'C'); put(6, 0, 'C'); put(7, 0, 'C'); }
  if (style === 4) { for (let x = 3; x < 6; x++) { H(x, 3); H(x, 4); } H(3, 5); H(4, 5); }
  if (style === 5) { H(5, 0); H(6, 0); H(4, 0); H(7, 0); }
  if (style === 6) { for (let x = 2; x < 10; x++) put(x, 1, 'b'); H(2, 3); }
  const eyes = o.eyes != null ? o.eyes : Math.floor(R() * 5);
  if (eyes === 0 || eyes === 3) { if (style !== 4) put(4, 5, 'E'); put(7, 5, 'E'); }
  if (eyes === 1) { if (style !== 4) put(4, 5, 'L'); put(7, 5, 'L'); if (style !== 4) put(4, 4, 'E'); put(7, 4, 'E'); }
  if (eyes === 2) { for (let x = 3; x < 9; x++) put(x, 5, 'G'); put(4, 5, 'W'); put(7, 5, 'W'); }
  if (eyes === 4) { for (let x = 3; x < 9; x++) put(x, 5, 'K'); put(2, 5, 'K'); put(9, 5, 'K'); }
  const mouth = o.mouth != null ? o.mouth : Math.floor(R() * 3);
  if (mouth === 0) { put(5, 7, 'M'); put(6, 7, 'M'); put(4, 6, 'F'); }
  if (mouth === 1) { put(5, 7, 'M'); put(6, 7, 'M'); put(5, 8, 'M'); put(6, 8, 'M'); }
  if (mouth === 2) { put(4, 7, 'M'); put(5, 7, 'M'); put(6, 7, 'M'); put(7, 7, 'M'); }
  if (o.mustache) { for (let x = 4; x < 8; x++) put(x, 6, 'H'); }
  if (R() < 0.4 && eyes !== 4) { put(3, 6, 'P'); put(8, 6, 'P'); }
  if (o.tie) { put(5, 10, 'T'); put(6, 10, 'T'); put(5, 11, 'T'); put(6, 11, 'T'); }
  const acc = o.acc != null ? o.acc : (R() < 0.25 ? Math.floor(R() * 2) + 1 : 0);
  if (acc === 1 && style !== 3) { put(8, 1, 'R'); put(9, 1, 'R'); put(10, 0, 'R'); put(10, 2, 'R'); put(9, 2, 'R'); }
  if (acc === 2) { for (let x = 2; x < 10; x++) put(x, 0, 'K'); put(1, 1, 'K'); put(10, 1, 'K'); for (let y = 4; y < 7; y++) { put(1, y, 'D'); put(10, y, 'D'); } }
  return g;
}
function faceURL(seed, o = {}) {
  const R = cosmeticRng(seed * 2654435761);
  const bg = AVA_BG[Math.floor(R() * AVA_BG.length)];
  const skin = o.skin || AVA_SKIN[Math.floor(R() * AVA_SKIN.length)];
  const hair = o.hairColor || AVA_HAIR[Math.floor(R() * AVA_HAIR.length)];
  const shirt = o.shirt || AVA_SHIRT[Math.floor(R() * AVA_SHIRT.length)];
  const g = faceGrid(R, o);
  return pixelURL(g, { b: o.bg || bg[0], B: o.bg2 || bg[1], S: shirt, F: skin, H: hair, C: o.cap || '#e2504c', E: '#2a2030', L: '#c98d6a', G: '#3a3a4a', W: '#bfe3ff', K: '#1d1d26', M: '#b8403e', P: '#ff9fb4', R: '#ff5d8f', D: '#3a3a4a', T: '#c8102e' });
}
const SYS_ART = {
  system: { grid: ['bbbbbbbbbbbb', 'bbwwwwwwwwbb', 'bwwwwwwwwwwb', 'bwwwwyywwwwb', 'bwwwwyywwwwb', 'bwwwwyywwwwb', 'bwwwwyywwwwb', 'bwwwwwwwwwwb', 'bwwwwyywwwwb', 'bbwwwwwwwwbb', 'bbbbbwwbbbbb', 'bbbbbbwbbbbb'], pal: { b: '#3d6fd0', w: '#ffffff', y: '#f0a020' } },
  hacker: { grid: ['kkkkkkkkkkkk', 'kkkggggggkkk', 'kkggggggggkk', 'kggggggggggk', 'kggkkggkkggk', 'kggkkggkkggk', 'kggggkkggggk', 'kkggggggggkk', 'kkkgkgkgkkkk', 'kkkgkgkgkkkk', 'kkkkkkkkkkkk', 'kkkkkkkkkkkk'], pal: { k: '#0c1110', g: '#39ff7a' } },
  press: { grid: ['yyyyyyyyyyyy', 'ywwwwwwwwwwy', 'ywkkkkkkkkwy', 'ywwwwwwwwwwy', 'ywkkkwwrrrwy', 'ywwwwwwrrrwy', 'ywkkkwwrrrwy', 'ywwwwwwwwwwy', 'ywkkkkkkkkwy', 'ywwwwwwwwwwy', 'yyyyyyyyyyyy', 'yyyyyyyyyyyy'], pal: { y: '#ffd66b', w: '#ffffff', k: '#555b6e', r: '#e2504c' } },
  label: { grid: ['pppppppppppp', 'pppkkkkkkppp', 'ppkkkkkkkkpp', 'pkkkggkkkkkp', 'pkkgkkkkkkkp', 'pkkkkrrkkkkp', 'pkkkkrrkkkkp', 'pkkkkkkkgkkp', 'pkkkkkggkkkp', 'ppkkkkkkkkpp', 'pppkkkkkkppp', 'pppppppppppp'], pal: { p: '#c3a8ff', k: '#1d1d26', g: '#6a6a7a', r: '#e2504c' } },
  host: { grid: ['tttttttttttt', 'tssssssssstt', 'tsggsssssstt', 'tssssssssstt', 'tttttttttttt', 'tssssssssstt', 'tsggssssrstt', 'tssssssssstt', 'tttttttttttt', 'tssssssssstt', 'tsggsssssstt', 'tssssssssstt'], pal: { t: '#2fb3b3', s: '#3a4256', g: '#39ff7a', r: '#ff5d5d' } },
  shop: { grid: ['pppppppppppp', 'ppppkkkkpppp', 'pppkppppkppp', 'pppkppppkppp', 'pwwwwwwwwwwp', 'pwwwwwwwwwwp', 'pwwwrrrrwwwp', 'pwwrwwwwrwwp', 'pwwwrwwrwwwp', 'pwwwwrrwwwwp', 'pwwwwwwwwwwp', 'pppppppppppp'], pal: { p: '#ffadd0', k: '#8a5a70', w: '#ffffff', r: '#ff5d8f' } },
  rival: { grid: ['nnnnnnnnnnnn', 'nnkrrrrrrnnn', 'nnkrrrrrrrnn', 'nnkrrwrrrrnn', 'nnkrrrrrrnnn', 'nnkrrrrrnnnn', 'nnknnnnnnnnn', 'nnknnnnnnnnn', 'nnknnnnnnnnn', 'nnknnnnnnnnn', 'nkkknnnnnnnn', 'nnnnnnnnnnnn'], pal: { n: '#2a2f45', k: '#c9ced9', r: '#e2504c', w: '#ffd66b' } },
  anon: { grid: ['cccccccccccc', 'cccccccccccc', 'cccciiiicccc', 'ccciiiiiiccc', 'ccciiiiiiccc', 'ccciiiiiiccc', 'cccciiiicccc', 'cccccccccccc', 'cciiiiiiiicc', 'ciiiiiiiiiic', 'ciiiiiiiiiic', 'ciiiiiiiiiic'], pal: { c: '#d7deea', i: '#9aa7bd' } },
};
function avatarURL(seed, sys) {
  const key = sys ? 'sys:' + sys : 'n:' + seed;
  if (AVA_CACHE.has(key)) return AVA_CACHE.get(key);
  let url;
  if (sys === 'dad') url = faceURL(77, { hair: 6, eyes: 2, mouth: 2, mustache: true, acc: 0, shirt: '#4a4f63', hairColor: '#3a3a3a', bg: '#d7deea', bg2: '#b9c4d6' });
  else if (sys === 'boss') url = faceURL(91, { hair: 0, eyes: 2, mouth: 2, tie: true, acc: 0, shirt: '#ffffff', hairColor: '#1c1c28', bg: '#e9eef6', bg2: '#c9d3e3' });
  else if (sys && SYS_ART[sys]) url = pixelURL(SYS_ART[sys].grid, SYS_ART[sys].pal);
  else if (sys) url = pixelURL(SYS_ART.anon.grid, SYS_ART.anon.pal);
  else url = faceURL(seed);
  AVA_CACHE.set(key, url);
  return url;
}

/* thread status icons (20×20). Gradients live once in the page's <svg> sprite. */
const FOLDER = fill => `<path d="M1.5 5.2c0-.7.5-1.2 1.2-1.2h4.6l1.8 1.8h8.2c.7 0 1.2.5 1.2 1.2v9.3c0 .7-.5 1.2-1.2 1.2H2.7c-.7 0-1.2-.5-1.2-1.2z" fill="url(#${fill})" stroke="rgba(20,40,80,.55)" stroke-width=".8"/><path d="M2.4 8h15.2" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>`;
const OVER = {
  flame: `<path class="flick" d="M10 6.6c1.8 1.6 3.4 3.3 3.4 5.6a3.4 3.4 0 0 1-6.8 0c0-1 .4-1.8 1-2.6.1.9.6 1.5 1.3 1.6-.3-1.6.2-3.2 1.1-4.6z" fill="#ffe27a" stroke="#c2410c" stroke-width=".8"/>`,
  q: `<text x="10" y="15.3" text-anchor="middle" font-size="9" font-weight="bold" font-family="Tahoma,Verdana,sans-serif" fill="#fff" stroke="rgba(20,40,80,.45)" stroke-width=".4">?</text>`,
  star: `<path d="M10 7.2l1.3 2.6 2.9.4-2.1 2 .5 2.9L10 13.8l-2.6 1.3.5-2.9-2.1-2 2.9-.4z" fill="#fff" stroke="rgba(120,70,0,.55)" stroke-width=".6"/>`,
  news: `<rect x="5.6" y="8.2" width="8.8" height="7" rx=".6" fill="#fff"/><path d="M7 10h6M7 11.8h6M7 13.6h4" stroke="#8e44ad" stroke-width=".9"/>`,
  chat: `<path d="M6 8.6h8c.6 0 1 .4 1 1v3.6c0 .6-.4 1-1 1H9.5L7.4 16v-1.8H6c-.6 0-1-.4-1-1V9.6c0-.6.4-1 1-1z" fill="#fff"/>`,
  bang: `<circle cx="10" cy="11.8" r="3.6" fill="#e2504c" stroke="#fff" stroke-width=".8"/><path d="M10 9.6v2.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/><circle cx="10" cy="13.9" r=".75" fill="#fff"/>`,
  pin: `<g transform="translate(12.4 .6) rotate(28)"><circle cx="2.6" cy="2.6" r="2.4" fill="#e2504c" stroke="#8a1c1c" stroke-width=".6"/><path d="M2.6 5v4" stroke="#6b7280" stroke-width="1.1"/></g>`,
  lock: `<g transform="translate(11.6 10.6)"><path d="M1.6 3V2a2 2 0 0 1 4 0v1" fill="none" stroke="#5b6475" stroke-width="1.2"/><rect x=".4" y="3" width="6.4" height="5" rx="1" fill="#f6c343" stroke="#8a6a12" stroke-width=".6"/></g>`,
};
function tIcon(t) {
  if (t.type === 'ann') return `<svg viewBox="0 0 20 20" class="ico" aria-hidden="true"><path d="M3 8.2h3l7-3.6v10.8L6 11.8H3z" fill="url(#gOrange)" stroke="rgba(120,60,0,.6)" stroke-width=".8"/><path d="M6 11.8l1.2 4" stroke="#8a5a20" stroke-width="1.4" stroke-linecap="round"/><path d="M15.2 7.6a4 4 0 0 1 0 5" fill="none" stroke="#f0a020" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  const map = { normal: ['gBlue', ''], chat: ['gGreen', OVER.chat], request: ['gBlue', OVER.q], quality: ['gGold', OVER.star], hot: ['gOrange', OVER.flame], news: ['gPurple', OVER.news], drama: ['gRed', OVER.flame], spam: ['gGrey', OVER.bang] };
  const [fill, over] = map[t.type] || map.normal;
  return `<svg viewBox="0 0 20 20" class="ico${t.type === 'drama' && !t.locked ? ' burning' : ''}" aria-hidden="true">${FOLDER(t.locked ? 'gGrey' : fill)}${over}${t.sticky ? OVER.pin : ''}${t.locked ? OVER.lock : ''}</svg>`;
}
function boxIcon(fresh) {
  return `<svg viewBox="0 0 20 20" class="ico big" aria-hidden="true">${FOLDER(fresh ? 'gOrange' : 'gBlue')}${fresh ? '<circle cx="15.6" cy="5" r="3" fill="#e2504c" stroke="#fff" stroke-width=".9"/>' : ''}</svg>`;
}
const I = {
  flame: `<svg viewBox="0 0 12 14" class="i" aria-hidden="true"><path d="M6 .8c2.6 2.3 4.8 4.6 4.8 7.6a4.8 4.8 0 0 1-9.6 0c0-1.4.6-2.6 1.4-3.6.1 1.2.8 2.1 1.8 2.2C4 5 4.7 2.8 6 .8z" fill="#ff8a1f" stroke="#c2410c" stroke-width=".8"/></svg>`,
  heart: on => `<svg viewBox="0 0 12 11" class="i" aria-hidden="true"><path d="M6 10.2S.8 7 .8 3.6A2.7 2.7 0 0 1 6 2.4a2.7 2.7 0 0 1 5.2 1.2C11.2 7 6 10.2 6 10.2z" fill="${on ? '#e2504c' : '#e2e7f0'}" stroke="${on ? '#a31f1c' : '#b8c3d6'}" stroke-width=".8"/></svg>`,
  star: on => `<svg viewBox="0 0 12 12" class="i" aria-hidden="true"><path d="M6 .9l1.6 3.2 3.5.5-2.5 2.4.6 3.5L6 8.8 2.8 10.5l.6-3.5L.9 4.6l3.5-.5z" fill="${on ? '#f6c343' : '#e2e7f0'}" stroke="${on ? '#a7780c' : '#b8c3d6'}" stroke-width=".7"/></svg>`,
  clock: `<svg viewBox="0 0 12 12" class="i" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#fff" stroke="#5d6a83" stroke-width="1"/><path d="M6 3v3.2l2 1.3" fill="none" stroke="#5d6a83" stroke-width="1.1" stroke-linecap="round"/></svg>`,
  check: `<svg viewBox="0 0 12 12" class="i" aria-hidden="true"><circle cx="6" cy="6" r="5.4" fill="#41a85f"/><path d="M3.4 6.2l1.8 1.8 3.6-3.8" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  smile: `<svg viewBox="0 0 16 16" class="i" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#ffd400" stroke="#b58900" stroke-width="1"/><circle cx="5.6" cy="6.4" r="1" fill="#3a2a00"/><circle cx="10.4" cy="6.4" r="1" fill="#3a2a00"/><path d="M4.6 9.4c1.6 2.4 5.2 2.4 6.8 0" fill="none" stroke="#3a2a00" stroke-width="1.1" stroke-linecap="round"/></svg>`,
  mail: `<svg viewBox="0 0 16 12" class="i" aria-hidden="true"><rect x=".7" y=".7" width="14.6" height="10.6" rx="1.4" fill="#fff6d6" stroke="#b97400"/><path d="M1.2 1.4L8 6.6l6.8-5.2" fill="none" stroke="#b97400" stroke-width="1"/></svg>`,
  sound: on => `<svg viewBox="0 0 16 14" class="i" aria-hidden="true"><path d="M1.5 4.8h3l4-3.3v11l-4-3.3h-3z" fill="currentColor"/>${on ? '<path d="M11 4.2a4 4 0 0 1 0 5.6M12.8 2.4a6.6 6.6 0 0 1 0 9.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' : '<path d="M11 4.6l4 4.8M15 4.6l-4 4.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'}</svg>`,
  lock: `<svg viewBox="0 0 12 14" class="i" aria-hidden="true"><path d="M3 6V4.2a3 3 0 0 1 6 0V6" fill="none" stroke="#5b6475" stroke-width="1.4"/><rect x="1.4" y="6" width="9.2" height="7" rx="1.4" fill="#f6c343" stroke="#8a6a12" stroke-width=".8"/></svg>`,
};

/* banners: each forum type gets its own sky, drawn as SVG behind the glossy logo */
function bannerArt(arch) {
  const R = cosmeticRng({ fan: 11, teen: 23, photo: 37, game: 51 }[arch] || 5);
  let deco = '';
  if (arch === 'fan') {
    for (let i = 0; i < 4; i++) { const x = 560 + i * 150; deco += `<polygon points="${x},-10 ${x - 120 + i * 30},160 ${x + 40 + i * 20},160" fill="url(#beam)" opacity=".5"/>`; }
    for (let i = 0; i < 40; i++) deco += `<circle cx="${R() * 1200}" cy="${R() * 140}" r="${R() * 1.6 + .4}" fill="#fff" opacity="${.3 + R() * .6}"/>`;
    for (let i = 0; i < 7; i++) { const x = 420 + R() * 740, y = 30 + R() * 90, s = .7 + R() * .8; deco += `<g transform="translate(${x} ${y}) scale(${s})" opacity=".35" fill="#fff"><ellipse cx="0" cy="12" rx="5" ry="3.6" transform="rotate(-20)"/><rect x="3.6" y="-10" width="1.6" height="21"/><path d="M5 -10c4 2 7 4 6 9-1-3-3-4-6-4z"/></g>`; }
    deco += `<g opacity=".28" fill="#0b0f2a">${[0, 1, 2, 3].map(i => `<g transform="translate(${930 + i * 46} 70)"><circle cx="0" cy="0" r="9"/><path d="M-14 70v-44c0-10 6-16 14-16s14 6 14 16v44z"/></g>`).join('')}</g>`;
    return { bg: 'linear-gradient(118deg,#101a4d 0%,#2e2380 42%,#7a3aa0 74%,#d0609e 100%)', deco };
  }
  if (arch === 'teen') {
    for (let i = 0; i < 14; i++) { const x = 380 + R() * 800, y = 10 + R() * 120, s = .5 + R() * 1.1; deco += `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 0-12 4-9 10s9 9 9 9 6-3 9-9-3-10-9-4z" fill="#fff" opacity="${.18 + R() * .3}"/>`; }
    for (let i = 0; i < 22; i++) { const x = R() * 1200, y = R() * 140, s = 2 + R() * 4; deco += `<path transform="translate(${x} ${y})" d="M0 -${s}L${s * .3} -${s * .3} ${s} 0 ${s * .3} ${s * .3} 0 ${s} -${s * .3} ${s * .3} -${s} 0 -${s * .3} -${s * .3}z" fill="#fff" opacity="${.4 + R() * .5}"/>`; }
    deco += `<g fill="#fff" opacity=".35"><circle cx="1010" cy="118" r="34"/><circle cx="1060" cy="104" r="42"/><circle cx="1118" cy="122" r="30"/><circle cx="880" cy="128" r="22"/><circle cx="910" cy="118" r="26"/></g>`;
    return { bg: 'linear-gradient(118deg,#ff7fbf 0%,#c77dff 48%,#6fc3ff 100%)', deco };
  }
  if (arch === 'photo') {
    for (let i = 0; i < 26; i++) { const r = 6 + R() * 34; deco += `<circle cx="${380 + R() * 820}" cy="${R() * 150}" r="${r}" fill="${R() < .5 ? '#ffe2a8' : '#ffffff'}" opacity="${.08 + R() * .18}"/>`; }
    deco += `<g transform="translate(1060 70)" opacity=".3" fill="none" stroke="#fff" stroke-width="3"><circle r="46"/>${[0, 60, 120, 180, 240, 300].map(a => `<path d="M0 -46L22 -10" transform="rotate(${a})"/>`).join('')}<circle r="16"/></g>`;
    return { bg: 'linear-gradient(118deg,#0e3640 0%,#1c6670 46%,#b9874a 82%,#efb766 100%)', deco };
  }
  for (let i = 0; i < 30; i++) { const x = 380 + R() * 820, y = R() * 140, s = 2 + Math.floor(R() * 3) * 2; deco += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${R() < .5 ? '#ffd66b' : '#fff'}" opacity="${.25 + R() * .5}"/>`; }
  deco += `<g transform="translate(1050 18) rotate(35)" opacity=".4"><rect x="0" y="0" width="8" height="70" fill="#dfe6f3"/><rect x="-10" y="70" width="28" height="7" fill="#ffd66b"/><rect x="1" y="77" width="6" height="18" fill="#8a5a20"/></g>`;
  return { bg: 'linear-gradient(118deg,#1b0f30 0%,#4a1035 50%,#b8381f 85%,#f08a24 100%)', deco };
}
