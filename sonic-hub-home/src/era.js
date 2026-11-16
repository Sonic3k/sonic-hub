/* What changes with the year: the machines. Their dates are the ones kept in Sonic Hub's desk (/api/desk/at, read for
   15 June of each year): the big office tower with Windows XP until autumn 2005, the Fujitsu FMV from 10/2005 to
   9/2008 (the old tower still in the house), the HP Pavilion after that — Vista, then Windows 7 from 2010 —
   and a Nokia from 2006. Where the old tower stood once the Fujitsu came, and when the flat TV replaced the tube,
   nobody wrote down: those two are guesses, and the page says so. */
import * as THREE from 'three';
import { M, canvasTex, plateTex, rng } from './tex.js';
import { part } from './kit.js';
import { BUS27 } from './photos.js';

export const HUB = 'https://sonic-hub-web-production.up.railway.app';

const XP = { os: 'Windows XP', web: 'Internet Explorer 6' };
export const YEARS = {
  2005: { pc: { key: 'xp', name: 'PC Win XP', model: 'thùng máy to kiểu văn phòng, màn hình CRT', ...XP, ym: 'Yahoo! Messenger 8', used: '2004 – 9/2008' }, phone: null, tv: 'crt' },
  2006: { pc: { key: 'fmv', name: 'Fujitsu FMV', model: 'màn hình 15 inch', ...XP, ym: 'Yahoo! Messenger 8', used: '10/2005 – 9/2008' }, phone: 'a', tv: 'crt' },
  2007: { pc: { key: 'fmv', name: 'Fujitsu FMV', model: 'màn hình 15 inch', ...XP, ym: 'Yahoo! Messenger 8', used: '10/2005 – 9/2008' }, phone: 'a', tv: 'crt' },
  2008: { pc: { key: 'fmv', name: 'Fujitsu FMV', model: 'màn hình 15 inch', ...XP, ym: 'Yahoo! Messenger 8', used: '10/2005 – 9/2008' }, phone: 'a', tv: 'crt' },
  2009: { pc: { key: 'hp', name: 'HP Pavilion', model: 'laptop', os: 'Windows Vista', web: 'Firefox', ym: 'Yahoo! Messenger 9', used: '9/2008 – 2014' }, phone: 'b', tv: 'crt' },
  2010: { pc: { key: 'hp', name: 'HP Pavilion', model: 'laptop', os: 'Windows 7', web: 'Firefox', ym: 'Yahoo! Messenger 9', used: '9/2008 – 2014' }, phone: 'b', tv: 'lcd' },
  2011: { pc: { key: 'hp', name: 'HP Pavilion', model: 'laptop', os: 'Windows 7', web: 'Firefox', ym: 'Yahoo! Messenger 10', used: '9/2008 – 2014' }, phone: 'b', tv: 'lcd' },
  2012: { pc: { key: 'hp', name: 'HP Pavilion', model: 'laptop', os: 'Windows 7', web: 'Chrome', ym: 'Yahoo! Messenger 11', used: '9/2008 – 2014' }, phone: 'b', tv: 'lcd' },
};
/** the wallpaper the hub's desk records for 15 June of the year, and whether the screen here shows it or a stand-in */
export const WALL = {
  2005: 'ảnh Stonehenge có sẵn của Windows XP', 2006: 'đồi cỏ Bliss của Windows XP', 2007: 'nền trò Bejeweled 2 (trái đất nhìn từ quỹ đạo)', 2008: 'ảnh vịnh hẹp Geiranger',
  2009: 'rừng cây có sẵn của Windows Vista', 2010: 'nền mặc định của Windows 7', 2011: 'ảnh xe buýt 27 tự chụp', 2012: 'ảnh xe buýt 27 tự chụp',
};
export const atOf = (year, mode) => `${year}-06-15T${mode === 'toi' ? '21:00' : '18:05'}`;

/* ── screens, drawn ──────────────────────────────────────────────────── */
function icons(g, x, y, n, R, size = 22, gap = 46) {
  const cols = ['#f2c23a', '#3a8fd8', '#e8e8ee', '#6fbf4a', '#e8663a', '#9a7fd0', '#f0f0f0', '#3ab0c0'];
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(R() * cols.length) | 0]; g.fillRect(x, y + i * gap, size, size); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y + i * gap, size, size * 0.35);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x - 6, y + i * gap + size + 4, size + 12, 3); if (R() < 0.6) g.fillRect(x - 2, y + i * gap + size + 9, size + 4, 3);
  }
}
function chatWindow(g, x, y, w, h, bar) {
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 3, y + 3, w, h);
  g.fillStyle = '#f3f2f7'; g.fillRect(x, y, w, h); const gr = g.createLinearGradient(0, y, 0, y + 20); gr.addColorStop(0, bar[0]); gr.addColorStop(1, bar[1]); g.fillStyle = gr; g.fillRect(x, y, w, 20);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + 8, y + 8, w * 0.45, 4); g.fillStyle = '#e25a4a'; g.fillRect(x + w - 16, y + 5, 11, 10);
  g.fillStyle = '#e4e2ee'; g.fillRect(x + 4, y + 24, w - 8, 26); g.fillStyle = '#f2c62e'; g.beginPath(); g.arc(x + 20, y + 37, 9, 0, 7); g.fill(); g.fillStyle = '#6a6880'; g.fillRect(x + 36, y + 31, w * 0.4, 4); g.fillRect(x + 36, y + 40, w * 0.3, 3);
  for (let i = 0; i < 8; i++) { const yy = y + 60 + i * 19; g.fillStyle = i < 5 ? '#f2c62e' : '#c9c9d2'; g.beginPath(); g.arc(x + 14, yy + 5, 5, 0, 7); g.fill(); g.fillStyle = i < 5 ? '#3a3a55' : '#a9a9b6'; g.fillRect(x + 26, yy + 2, w * (0.3 + ((i * 37) % 30) / 100), 5); }
}
function xpScreen(wall, time) {
  return canvasTex(512, 384, (g, w, h) => {
    const R = rng(wall.length * 7 + 3);
    if (wall === 'space') {                // the wallpaper on his photo of the Fujitsu: the earth's rim from orbit
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#04050c'); bg.addColorStop(1, '#0a1836'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; g.fillRect(R() * w, R() * h * 0.75, 1 + R(), 1 + R()); }
      const neb = g.createRadialGradient(w * 0.75, h * 0.35, 5, w * 0.75, h * 0.35, 120); neb.addColorStop(0, 'rgba(60,110,220,0.5)'); neb.addColorStop(1, 'rgba(60,110,220,0)'); g.fillStyle = neb; g.fillRect(0, 0, w, h);
      const cx = w * 0.18, cy = h * 2.05, r = h * 1.5, rim = g.createRadialGradient(cx, cy, r - 46, cx, cy, r + 10); rim.addColorStop(0, '#0c2c66'); rim.addColorStop(0.72, '#3f8fe0'); rim.addColorStop(0.9, '#dff2ff'); rim.addColorStop(1, 'rgba(160,210,255,0)');
      g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, r + 10, 0, 7); g.fill(); g.fillStyle = '#0a2452'; g.beginPath(); g.arc(cx, cy, r - 46, 0, 7); g.fill();
    } else {                               // a plain field for the old tower
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#3f6fa8'); bg.addColorStop(0.6, '#7fa6c8'); bg.addColorStop(0.61, '#6f8a4a'); bg.addColorStop(1, '#4a6a34'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#8a8f8a'; g.fillRect(150 + i * 44, h * 0.6 - 46 - (i % 2) * 8, 16, 48 + (i % 2) * 8); } g.fillStyle = '#7a7f7a'; g.fillRect(146, h * 0.6 - 58, 150, 10);
    }
    icons(g, 16, 14, 6, R); icons(g, 70, 14, 3, R);
    chatWindow(g, w - 178, 28, 158, 232, ['#5a2fa0', '#8a5fd0']);
    const tb = g.createLinearGradient(0, h - 30, 0, h); tb.addColorStop(0, '#3a80f0'); tb.addColorStop(0.12, '#245edb'); tb.addColorStop(1, '#1941a5'); g.fillStyle = tb; g.fillRect(0, h - 30, w, 30);
    const sb = g.createLinearGradient(0, h - 30, 0, h); sb.addColorStop(0, '#5fbf5a'); sb.addColorStop(1, '#2f8a2f'); g.fillStyle = sb; g.beginPath(); g.moveTo(0, h - 30); g.lineTo(82, h - 30); g.quadraticCurveTo(100, h - 15, 82, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#ffffff'; g.font = 'italic 700 15px Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('start', 30, h - 14);
    g.fillStyle = '#3a78e8'; g.fillRect(108, h - 26, 120, 22); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(132, h - 17, 70, 4); g.fillStyle = '#f2c62e'; g.beginPath(); g.arc(120, h - 15, 6, 0, 7); g.fill();
    g.fillStyle = '#0f8fe8'; g.fillRect(w - 92, h - 30, 92, 30); g.fillStyle = '#fff'; g.font = '12px Arial, sans-serif'; g.textAlign = 'right'; g.fillText(time, w - 10, h - 14);
  }, { repeat: false });
}
function sevenScreen(vista, time, browser, photo) {
  /* with `photo` (a picture of his own, as a data: address) the desktop wears it as its wallpaper, the way the hub's
     desk records it, and the browser window stays shut so that it can be seen */
  const draw = (g, w, h, img) => {
    const R = rng(vista ? 5 : 9);
    g.textAlign = 'left';
    if (img) { const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); for (let i = 0; i < 7; i++) R(); }
    else {
      const bg = g.createLinearGradient(0, 0, w, h);
      if (vista) { bg.addColorStop(0, '#0d3a34'); bg.addColorStop(0.5, '#1f7a5a'); bg.addColorStop(1, '#0a2a3a'); } else { bg.addColorStop(0, '#1560b8'); bg.addColorStop(0.55, '#3f9fe8'); bg.addColorStop(1, '#1a6fc8'); }
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) { g.strokeStyle = `rgba(255,255,255,${0.05 + R() * 0.1})`; g.lineWidth = 8 + R() * 26; g.beginPath(); g.arc(w * (0.2 + R() * 0.7), h * 1.5, h * (0.9 + R() * 0.6), 3.6 + R() * 0.5, 5.6 + R() * 0.4); g.stroke(); }
    }
    icons(g, 18, 16, 6, R, 24, 50); icons(g, 80, 16, 4, R, 24, 50);
    if (!photo) {
      // a browser window, the social page of those years suggested by its blocks
      const x = 190, y = 22, ww = 410, hh = 300;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 4, y + 4, ww, hh); g.fillStyle = vista ? 'rgba(190,215,225,0.95)' : 'rgba(200,222,245,0.95)'; g.fillRect(x, y, ww, hh);
      g.fillStyle = '#fff'; g.fillRect(x + 6, y + 46, ww - 12, hh - 52); g.fillStyle = '#f4f4f6'; g.fillRect(x + 6, y + 24, ww - 12, 22); g.fillStyle = '#fff'; g.fillRect(x + 70, y + 27, ww - 150, 16);
      g.fillStyle = browser === 'Chrome' ? '#dfe3ea' : '#e9e2d2'; g.fillRect(x + 8, y + 5, 120, 18); g.fillStyle = '#e25a4a'; g.fillRect(x + ww - 40, y + 4, 32, 14);
      g.fillStyle = '#3b5a9a'; g.fillRect(x + 6, y + 46, ww - 12, 26); g.fillStyle = '#fff'; g.fillRect(x + 16, y + 55, 70, 8);
      for (let i = 0; i < 4; i++) { const yy = y + 84 + i * 52; g.fillStyle = '#c9d2e6'; g.fillRect(x + 96, yy, 34, 34); g.fillStyle = '#3b5a9a'; g.fillRect(x + 138, yy + 2, 90 + (i * 23) % 60, 6); g.fillStyle = '#8a8f9a'; g.fillRect(x + 138, yy + 14, 200 - (i * 31) % 70, 5); g.fillRect(x + 138, yy + 24, 150 + (i * 17) % 50, 5); }
      g.fillStyle = '#eef0f5'; g.fillRect(x + 12, y + 80, 72, hh - 92); for (let i = 0; i < 7; i++) { g.fillStyle = '#6a7a9a'; g.fillRect(x + 18, y + 90 + i * 18, 40 + (i * 13) % 20, 5); }
      chatWindow(g, 30, h - 300, 130, 220, vista ? ['#5a2fa0', '#8a5fd0'] : ['#4a2a90', '#7a55c8']);
    } else chatWindow(g, 150, h - 290, 128, 214, ['#4a2a90', '#7a55c8']);
    // taskbar
    g.fillStyle = vista ? 'rgba(10,18,24,0.88)' : 'rgba(40,70,110,0.82)'; g.fillRect(0, h - 36, w, 36); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, h - 36, w, 14);
    const orb = g.createRadialGradient(22, h - 20, 2, 22, h - 18, 17); orb.addColorStop(0, '#cfeaff'); orb.addColorStop(0.5, '#3a8fe0'); orb.addColorStop(1, '#0d3f8a'); g.fillStyle = orb; g.beginPath(); g.arc(22, h - 18, 16, 0, 7); g.fill();
    const tc = ['#f29a3a', '#3a8fd8', '#f2c62e', '#8a5fd0']; for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(52 + i * 52, h - 33, 46, 30); g.fillStyle = tc[i]; g.fillRect(64 + i * 52, h - 28, 22, 20); }
    g.fillStyle = '#fff'; g.font = '12px Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(time, w - 12, h - 24); g.fillText('15/6', w - 12, h - 10);
  };
  const tex = canvasTex(640, 400, (g, w, h) => draw(g, w, h, null), { repeat: false });
  if (photo) {
    const im = new Image();
    im.onload = () => { const c = tex.image; draw(c.getContext('2d'), c.width, c.height, im); tex.needsUpdate = true; };
    im.src = photo;
  }
  return tex;
}
function tvScreen() {
  return canvasTex(320, 240, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#2a5fa8'); bg.addColorStop(1, '#0f2f6a'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7fb0e0'; g.fillRect(20, 24, 150, 110); g.fillStyle = '#d9b89a'; g.beginPath(); g.arc(95, 70, 24, 0, 7); g.fill(); g.fillStyle = '#2a3a5a'; g.fillRect(58, 96, 74, 38);
    g.fillStyle = '#e8eef8'; for (let i = 0; i < 5; i++) g.fillRect(186, 34 + i * 20, 110 - (i * 23) % 40, 8);
    g.fillStyle = '#c9342c'; g.fillRect(0, h - 62, w, 6); g.fillStyle = '#12244a'; g.fillRect(0, h - 56, w, 34); g.fillStyle = '#fff'; g.fillRect(16, h - 46, 200, 8); g.fillRect(16, h - 34, 140, 5);
    g.fillStyle = '#e8c23a'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#12244a'; for (let i = 0; i < 5; i++) g.fillRect(12 + i * 64, h - 14, 46, 6);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '700 14px Arial, sans-serif'; g.textAlign = 'right'; g.fillText('19:00', w - 12, 18);
  }, { repeat: false });
}
function keysTex(dark) {
  return canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = dark ? '#151517' : '#ddd5c0'; g.fillRect(0, 0, w, h);
    const key = (x, y, kw, kh) => { g.fillStyle = dark ? '#232327' : '#efe9d8'; g.fillRect(x, y, kw - 2.5, kh - 2.5); g.fillStyle = dark ? 'rgba(255,255,255,0.5)' : 'rgba(40,40,40,0.55)'; g.fillRect(x + 3, y + 3, 4, 5); };
    for (let r = 0; r < 6; r++) { const kh = r === 0 ? 20 : 27, y = 8 + (r === 0 ? 0 : 26 + (r - 1) * 27); let x = 8; const n = r === 5 ? 9 : 14; for (let i = 0; i < n; i++) { const kw = r === 5 && i === 3 ? 150 : (i === n - 1 ? 42 - r * 2 : (i === 0 ? 24 + r * 5 : 24)); if (x + kw > 372) break; key(x, y, kw, kh); x += kw; } }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) key(380 + c * 24, 8 + 26 + r * 27, 24, 27);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) if (!dark) key(456 - 48 + 8 + c * 24 + 4, 8 + 26 + r * 27, 24, 27);
  }, { repeat: false });
}
function laptopDeck() {
  return canvasTex(512, 352, (g, w, h) => {
    g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1.2; for (const [x, y, r] of [[70, 290, 26], [108, 316, 15], [52, 322, 10], [150, 300, 20], [176, 330, 9], [420, 318, 12]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.stroke(); }
    g.fillStyle = '#1b1b1f'; g.fillRect(26, 22, w - 52, 206);
    for (let r = 0; r < 6; r++) { let x = 30; const kh = r === 0 ? 22 : 34, y = 26 + (r === 0 ? 0 : 24 + (r - 1) * 35); const n = r === 5 ? 10 : 15; for (let i = 0; i < n; i++) { const kw = r === 5 && i === 3 ? 160 : (i === 0 ? 30 + r * 6 : 30); if (x + kw > w - 28) break; g.fillStyle = '#2a2a30'; g.fillRect(x, y, kw - 3, kh - 3); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x + 4, y + 4, 5, 6); x += kw; } }
    const tp = g.createLinearGradient(0, 252, 0, 330); tp.addColorStop(0, '#9a9da2'); tp.addColorStop(1, '#6f7278'); g.fillStyle = tp; g.fillRect(196, 250, 120, 66); g.fillStyle = '#c9ccd0'; g.fillRect(196, 320, 58, 14); g.fillRect(258, 320, 58, 14);
    g.fillStyle = '#3a6fd8'; g.fillRect(430, 252, 22, 16); g.fillStyle = '#4fa0e0'; g.fillRect(456, 252, 22, 16);
  }, { repeat: false });
}
function calendarTex(year) {
  return canvasTex(384, 512, (g, w, h) => {
    g.fillStyle = '#1c2a24'; g.fillRect(0, 0, w, h);
    // a picture on top: hills at dusk
    const sky = g.createLinearGradient(0, 0, 0, 190); sky.addColorStop(0, '#e9b06a'); sky.addColorStop(1, '#f2dcc0'); g.fillStyle = sky; g.fillRect(14, 14, w - 28, 180);
    g.fillStyle = '#7a8a7a'; g.beginPath(); g.moveTo(14, 150); g.lineTo(110, 92); g.lineTo(190, 140); g.lineTo(270, 80); g.lineTo(w - 14, 136); g.lineTo(w - 14, 194); g.lineTo(14, 194); g.fill();
    g.fillStyle = '#4a5f4a'; g.beginPath(); g.moveTo(14, 176); g.lineTo(150, 128); g.lineTo(250, 170); g.lineTo(w - 14, 150); g.lineTo(w - 14, 194); g.lineTo(14, 194); g.fill();
    g.fillStyle = '#e9c46a'; g.font = '700 46px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(year), w / 2, 226);
    const month = (m, x0) => {
      g.fillStyle = '#f2efe6'; g.font = '700 15px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('THÁNG ' + m, x0 + 84, 262);
      const first = new Date(year, m - 1, 1).getDay(), days = new Date(year, m, 0).getDate(), names = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      g.font = '10px Arial, sans-serif'; names.forEach((n, i) => { g.fillStyle = i === 0 ? '#f26a5a' : '#b9c2b6'; g.fillText(n, x0 + 12 + i * 24, 284); });
      g.font = '13px Arial, sans-serif';
      for (let d = 1; d <= days; d++) { const k = first + d - 1, c = k % 7, r = (k / 7) | 0; g.fillStyle = c === 0 ? '#f26a5a' : '#f2efe6'; g.fillText(String(d), x0 + 12 + c * 24, 306 + r * 22); }
    };
    month(6, 14); month(7, 200);
    g.fillStyle = '#f2efe6'; g.fillRect(14, h - 62, w - 28, 46); g.fillStyle = '#c9342c'; g.fillRect(14, h - 62, w - 28, 5); g.fillStyle = '#5a6a5f'; g.fillRect(40, h - 44, 190, 7); g.fillRect(40, h - 30, 130, 5); g.fillStyle = '#e9a53a'; g.fillRect(w - 84, h - 48, 46, 22);
  }, { repeat: false });
}

/* ── the machines ────────────────────────────────────────────────────── */
const cream = () => M.plain('#e4dcc8', 0.55), creamDk = () => M.plain('#cdc5ae', 0.6), blk = () => M.plain('#121214', 0.4), gloss = () => M.plain('#0b0b0d', 0.14);
const screenQuad = (b, mat, x, y, z, w, h, rx = 0) => b.geo(mat, new THREE.PlaneGeometry(w, h).rotateX(rx * Math.PI / 180).translate(x, y, z), { cast: false, recv: false });

function keyboard(b, x, z, dark) {
  const m = dark ? blk() : cream();
  b.box(m, x, 0, z, x + 0.45, 0.02, z + 0.165, {}); b.box(m, x, 0.018, z, x + 0.45, 0.03, z + 0.03, {});
  b.geo(new THREE.MeshStandardMaterial({ map: keysTex(dark), roughness: 0.6 }), new THREE.PlaneGeometry(0.44, 0.15).rotateX(-Math.PI / 2 + 0.06).translate(x + 0.225, 0.0245, z + 0.09), { cast: false });
}
function crt(b, x, z, scr, size = 0.4) {
  const c = cream(), s = size;
  b.box(c, x - s / 2, 0.06, z - s * 0.12, x + s / 2, 0.06 + s * 0.92, z + s * 0.14, {});            // the front
  b.box(c, x - s * 0.42, 0.1, z - s * 0.72, x + s * 0.42, s * 0.9, z - s * 0.12, {}); b.box(creamDk(), x - s * 0.3, 0.14, z - s * 0.95, x + s * 0.3, s * 0.78, z - s * 0.72, {});
  b.cyl(c, x, 0, z - s * 0.2, s * 0.3, 0.06, { seg: 18, r2: s * 0.22 });
  b.box(M.plain('#0a0c10', 0.2), x - s * 0.42, 0.06 + s * 0.14, z + s * 0.14, x + s * 0.42, 0.06 + s * 0.86, z + s * 0.146, { cast: false });
  screenQuad(b, scr, x, 0.06 + s * 0.5, z + s * 0.149, s * 0.8, s * 0.6);
  b.box(M.glow('#58e06a', 1.2), x + s * 0.36, 0.06 + s * 0.05, z + s * 0.14, x + s * 0.39, 0.06 + s * 0.075, z + s * 0.143, { cast: false });
}
function tower(b, x0, y, z0, w = 0.19, h = 0.43, d = 0.45) {
  const c = cream();
  b.box(c, x0, y, z0, x0 + w, y + h, z0 + d, {});
  for (let i = 0; i < 3; i++) b.box(creamDk(), x0 + 0.015, y + h - 0.06 - i * 0.05, z0 + d, x0 + w - 0.015, y + h - 0.02 - i * 0.05, z0 + d + 0.004, { cast: false });
  b.box(M.plain('#1c1c1f', 0.4), x0 + 0.03, y + h - 0.2, z0 + d, x0 + w - 0.03, y + h - 0.185, z0 + d + 0.005, { cast: false });
  b.cyl(M.plain('#b9b4a2', 0.4), x0 + w / 2, y + h * 0.42, z0 + d, 0.018, 0.006, { rx: 90, seg: 12 }); b.box(M.glow('#58e06a', 1.2), x0 + w / 2 - 0.03, y + h * 0.33, z0 + d, x0 + w / 2 - 0.018, y + h * 0.34, z0 + d + 0.003, { cast: false });
  for (let i = 0; i < 6; i++) b.box(creamDk(), x0 + 0.03, y + 0.04 + i * 0.016, z0 + d, x0 + w - 0.03, y + 0.046 + i * 0.016, z0 + d + 0.003, { cast: false });
}
const mouse = (b, x, z, dark) => b.sphere(dark ? gloss() : cream(), x, 0.014, z, 0.5, { sx: 0.06, sy: 0.036, sz: 0.105, seg: 12 });
function speakers(b, xs, z, h = 0.17) { for (const x of xs) { b.box(blk(), x, 0, z, x + 0.07, h, z + 0.085, {}); b.cyl(M.plain('#2c2c30', 0.6), x + 0.035, h * 0.3, z + 0.085, 0.024, 0.004, { rx: 90, seg: 12 }); b.cyl(M.plain('#2c2c30', 0.6), x + 0.035, h * 0.72, z + 0.085, 0.016, 0.004, { rx: 90, seg: 12 }); } }
function powerStrip(b, x, z) { b.box(blk(), x, 0, z, x + 0.06, 0.035, z + 0.3, {}); b.box(M.glow('#ff3a20', 1.3), x + 0.02, 0.035, z + 0.27, x + 0.04, 0.038, z + 0.29, { cast: false }); b.box(M.plain('#f1efe8', 0.5), x - 0.02, 0.035, z + 0.06, x + 0.07, 0.085, z + 0.14, {}); b.box(blk(), x + 0.005, 0.035, z + 0.17, x + 0.055, 0.075, z + 0.23, {}); }

function nokia(b, x, z, ry, kind, scr) {
  b.push(x, 0, z, ry);
  const body = kind === 'a' ? M.plain('#5f6f86', 0.4) : M.plain('#c9ccd0', 0.3, 0.6), w = 0.046, l = kind === 'a' ? 0.104 : 0.11;
  b.box(body, 0, 0, 0, w, 0.014, l, {}); b.box(blk(), 0.004, 0.014, 0.004, w - 0.004, 0.0155, l - 0.004, { cast: false });
  b.geo(scr, new THREE.PlaneGeometry(w - 0.012, kind === 'a' ? 0.03 : 0.044).rotateX(-Math.PI / 2).translate(w / 2, 0.0162, kind === 'a' ? 0.03 : 0.034), { cast: false });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) b.box(M.plain(kind === 'a' ? '#c9d2e0' : '#2a2a2e', 0.5), 0.007 + c * 0.0112, 0.0155, l - 0.05 + r * 0.011, 0.0162 + c * 0.0112, 0.0165, l - 0.042 + r * 0.011, { cast: false });
  b.pop();
}
function phoneScreen(kind) {
  return canvasTex(64, 64, (g, w, h) => { const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, kind === 'a' ? '#6fa8ff' : '#3a7fe8'); bg.addColorStop(1, '#0f3fa0'); g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '700 16px Arial'; g.textAlign = 'center'; g.fillText('21:00', w / 2, 30); g.fillRect(4, 4, 10, 4); g.fillRect(w - 16, 4, 12, 4); g.fillRect(8, h - 10, 16, 3); g.fillRect(w - 24, h - 10, 16, 3); }, { repeat: false });
}

/** Builds every variant once, hidden, and shows the ones of the chosen year. */
export function buildEra(scene, shared, ctx) {
  const noSolid = { solids: [] };
  const screens = new Map();
  const scr = (key, make) => { let m = screens.get(key); if (!m) { m = new THREE.MeshBasicMaterial({ map: make(), toneMapped: false }); m.userData.noCast = true; m.userData.screen = true; screens.set(key, m); } return m; };
  const groups = {};
  const mk = (name, spotM, fn) => { groups[name] = part(scene, noSolid, b => { b.pushM(spotM); fn(b); b.pop(); }, name); groups[name].visible = false; };
  const D = ctx.spots.nookDesk, F = ctx.spots.nookFloor, PD = ctx.spots.parDesk;
  const time = () => (ctx.mode === 'toi' ? '9:00 PM' : '6:05 PM');

  /* his desk — 2005: the old tower and its tube monitor */
  mk('nook-xp', D, b => {
    crt(b, 0.46, 0.27, scr('xp-plain', () => xpScreen('plain', '9:00 PM')), 0.4);
    tower(b, 0.82, 0, 0.06, 0.19, 0.43, 0.44); keyboard(b, 0.22, 0.385, false); mouse(b, 0.745, 0.47, false); speakers(b, [0.12], 0.12); powerStrip(b, 1.03, 0.1);
  });
  /* 2006–2008: the Fujitsu FMV, as on his photograph of it: the flat cream screen with its own speakers in the chin,
     two small black speakers beside it, the Mitsumi-style keyboard, a cream mouse, the black power strip at the right */
  mk('nook-fmv', D, b => {
    const c = cream();
    b.box(c, 0.39, 0, 0.13, 0.65, 0.022, 0.33, {}); b.box(c, 0.44, 0.02, 0.2, 0.6, 0.035, 0.31, {}); b.box(c, 0.47, 0.02, 0.17, 0.57, 0.13, 0.215, {});
    b.box(c, 0.335, 0.105, 0.2, 0.705, 0.455, 0.255, {}); b.box(creamDk(), 0.37, 0.14, 0.12, 0.67, 0.42, 0.2, {});
    b.box(M.plain('#0a0c10', 0.2), 0.36, 0.19, 0.255, 0.68, 0.44, 0.258, { cast: false });
    screenQuad(b, scr('xp-space', () => xpScreen('space', '9:00 PM')), 0.52, 0.315, 0.2595, 0.305, 0.232);
    for (const x of [0.355, 0.615]) for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) b.box(creamDk(), x + i * 0.008, 0.125 + j * 0.012, 0.255, x + i * 0.008 + 0.004, 0.131 + j * 0.012, 0.2565, { cast: false });
    b.box(M.plain('#3a4a8a', 0.4), 0.5, 0.128, 0.255, 0.54, 0.15, 0.257, { cast: false }); b.box(M.glow('#58e06a', 1.2), 0.47, 0.135, 0.255, 0.478, 0.142, 0.2572, { cast: false });
    for (const x of [0.56, 0.58]) b.cyl(M.plain('#b9b4a2', 0.4), x, 0.139, 0.255, 0.006, 0.003, { rx: 90, seg: 8 });
    speakers(b, [0.235, 0.725], 0.14, 0.165); keyboard(b, 0.2, 0.37, false); mouse(b, 0.78, 0.46, false); powerStrip(b, 1.0, 0.16);
    b.box(M.plain('#f1efe8', 0.5), 0.86, 0, 0.1, 0.99, 0.045, 0.19, {});
  });
  mk('nook-fmv-case', F, b => { tower(b, 0.06, 0.0, 0.08, 0.1, 0.34, 0.4); });
  /* 2009–2012: the HP Pavilion — black, glossy, the pale swirls pressed into its deck — between two tall black speakers */
  mk('nook-hp', D, b => {
    b.box(gloss(), 0.32, 0, 0.2, 0.68, 0.026, 0.445, {}); b.box(M.plain('#b9bcc0', 0.3, 0.7), 0.318, 0.004, 0.198, 0.682, 0.01, 0.447, { cast: false });
    b.geo(new THREE.MeshStandardMaterial({ map: laptopDeck(), roughness: 0.22 }), new THREE.PlaneGeometry(0.36, 0.245).rotateX(-Math.PI / 2).translate(0.5, 0.0265, 0.3225), { cast: false });
    b.rbox(gloss(), 0.5, 0.026 + 0.116, 0.2 - 0.037, 0.36, 0.244, 0.008, 0, { rx: -18 });
    b.cyl(blk(), 0.34, 0.012, 0.2, 0.012, 0.32, { rz: -90, seg: 8 });
    speakers(b, [0.16, 0.775], 0.1, 0.2); b.box(M.plain('#2a6fd0', 0.6), 0.72, 0, 0.36, 0.95, 0.004, 0.545, { cast: false }); mouse(b, 0.83, 0.45, true);
  });
  mk('nook-hp-vista', D, b => screenQuad(b, scr('vista', () => sevenScreen(true, '9:00 PM', 'Firefox')), 0.5, 0.026 + 0.118, 0.2 - 0.0325, 0.322, 0.2, -18));
  mk('nook-hp-7', D, b => screenQuad(b, scr('seven', () => sevenScreen(false, '9:00 PM', 'Firefox')), 0.5, 0.026 + 0.118, 0.2 - 0.0325, 0.322, 0.2, -18));
  /* 2011–2012: the desk records his own photograph of bus 27 as the wallpaper — the one picture here that is not drawn */
  mk('nook-hp-7b', D, b => screenQuad(b, scr('seven-bus', () => sevenScreen(false, '9:00 PM', 'Chrome', BUS27)), 0.5, 0.026 + 0.118, 0.2 - 0.0325, 0.322, 0.2, -18));
  mk('nook-2010', D, b => {            // the router and the pocket drives came with the last years
    b.box(M.plain('#f1f0ec', 0.4), 0.8, 0, 0.08, 1.0, 0.032, 0.21, {}); for (const x of [0.83, 0.97]) b.bar(blk(), x, 0.02, 0.085, x, 0.19, 0.07, 0.01, { round: true });
    for (let i = 0; i < 5; i++) b.box(M.glow('#58e06a', 1.1), 0.83 + i * 0.025, 0.012, 0.21, 0.836 + i * 0.025, 0.018, 0.2105, { cast: false });
    b.box(blk(), 0.05, 0, 0.36, 0.17, 0.018, 0.53, {}); b.rbox(blk(), 0.2, 0.012, 0.47, 0.085, 0.016, 0.13, 8, {}); b.rbox(M.plain('#3a55b8', 0.5), 1.02, 0.01, 0.34, 0.08, 0.02, 0.125, -12, {});
  });
  /* the phone and the music player, lying on the desk */
  const ph = k => scr('phone-' + k, () => phoneScreen(k));
  mk('phone-a', D, b => nokia(b, 0.25, 0.56 - 0.13, 14, 'a', ph('a')));
  mk('phone-b', D, b => nokia(b, 0.235, 0.56 - 0.135, 10, 'b', ph('b')));
  mk('player', D, b => { b.rbox(M.plain('#c9ccd0', 0.3, 0.7), 0.3, 0.007, 0.52, 0.09, 0.014, 0.028, -8, {}); b.rbox(M.plain('#8fa0a8', 0.3), 0.292, 0.0145, 0.52, 0.04, 0.001, 0.016, -8, { cast: false }); });
  /* the calendar over the desk: the year, June and July as they fell */
  const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.533), new THREE.MeshStandardMaterial({ roughness: 0.8 }));
  cal.applyMatrix4(ctx.spots.calendar); cal.receiveShadow = true; scene.add(cal);
  const calTex = new Map();

  /* the television: the tube set until 2009, the flat one after (the year of the change is a guess) */
  const tvOn = scr('tv-on', tvScreen), tvOff = M.solid('#07080a', 0.12);
  const tvScreens = [];
  mk('tv-crt', ctx.tvSpot, b => {
    const s = M.plain('#565a60', 0.45, 0.3), w = 0.62, h = 0.5;
    b.box(s, -w / 2, 0.02, -0.12, w / 2, h, 0.05, {}); b.box(blk(), -w * 0.44, 0.06, -0.36, w * 0.44, h - 0.05, -0.12, {}); b.box(s, -w / 2, 0, -0.1, w / 2, 0.03, 0.04, {});
    b.box(M.plain('#2a2c30', 0.4), -w / 2 + 0.03, 0.09, 0.05, w / 2 - 0.03, h - 0.03, 0.053, { cast: false });
    for (let i = 0; i < 5; i++) b.cyl(M.plain('#8a8d92', 0.4), -0.16 + i * 0.04, 0.05, 0.05, 0.008, 0.004, { rx: 90, seg: 8 });
    b.box(M.glow('#ff3a20', 1.2), 0.2, 0.045, 0.05, 0.212, 0.055, 0.0525, { cast: false });
  });
  mk('tv-lcd', ctx.tvSpot, b => {
    b.box(gloss(), -0.4, 0.07, -0.02, 0.4, 0.55, 0.025, {}); b.box(gloss(), -0.2, 0, -0.1, 0.2, 0.014, 0.1, {}); b.box(gloss(), -0.04, 0.012, -0.03, 0.04, 0.08, 0.0, {});
    b.box(M.plain('#b9bcc0', 0.3, 0.7), -0.4, 0.07, 0.025, 0.4, 0.085, 0.027, { cast: false });
  });
  const mkTv = (name, w, h, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tvOff); m.position.set(0, y, z); const g = new THREE.Group(); g.applyMatrix4(ctx.tvSpot); g.add(m); scene.add(g); g.visible = false; groups[name] = g; tvScreens.push(m); };
  mkTv('tv-crt-s', 0.5, 0.375, 0.275, 0.0545); mkTv('tv-lcd-s', 0.76, 0.43, 0.32, 0.0265);

  /* the parents' desk: the old tower once the Fujitsu had his desk (a guess), a flat monitor later (it is there in 2013) */
  mk('par-xp', PD, b => { crt(b, 0.42, 0.27, scr('xp-plain', () => xpScreen('plain', '9:00 PM')), 0.4); tower(b, 0.8, 0, 0.05, 0.19, 0.43, 0.44); keyboard(b, 0.19, 0.385, false); mouse(b, 0.72, 0.47, false); });
  mk('par-lcd', PD, b => {
    b.box(gloss(), 0.2, 0.1, 0.2, 0.64, 0.42, 0.225, {}); b.box(gloss(), 0.33, 0, 0.14, 0.51, 0.012, 0.3, {}); b.box(gloss(), 0.4, 0.01, 0.19, 0.44, 0.14, 0.21, {});
    screenQuad(b, scr('seven-par', () => sevenScreen(false, '9:00 PM', 'Chrome')), 0.42, 0.265, 0.2265, 0.41, 0.28);
    speakers(b, [0.1, 0.67], 0.14, 0.16); keyboard(b, 0.19, 0.385, true); mouse(b, 0.72, 0.47, true);
  });
  mk('par-empty', PD, b => { b.box(M.plain('#f3f1ea', 0.8), 0.3, 0, 0.2, 0.52, 0.03, 0.42, {}); b.box(M.books(3, 'mixed'), 0.56, 0, 0.08, 0.86, 0.2, 0.26, { uv: [0.5, 0.2], cast: false }); });

  const state = { year: 2007, tv: false };
  function setYear(y) {
    const Y = YEARS[y]; if (!Y) return;
    state.year = y;
    const on = n => { if (groups[n]) groups[n].visible = true; };
    for (const g of Object.values(groups)) g.visible = false;
    if (Y.pc.key === 'xp') on('nook-xp');
    if (Y.pc.key === 'fmv') { on('nook-fmv'); on('nook-fmv-case'); }
    if (Y.pc.key === 'hp') { on('nook-hp'); on(Y.pc.os === 'Windows Vista' ? 'nook-hp-vista' : y >= 2011 ? 'nook-hp-7b' : 'nook-hp-7'); if (y >= 2010) on('nook-2010'); }
    if (Y.phone) on('phone-' + Y.phone); if (y >= 2007) on('player');
    on('tv-' + Y.tv); on('tv-' + Y.tv + '-s');
    on(y <= 2005 ? 'par-empty' : y <= 2008 ? 'par-xp' : 'par-lcd');
    let t = calTex.get(y); if (!t) calTex.set(y, t = calendarTex(y)); cal.material.map = t; cal.material.needsUpdate = true;
  }
  function setTv(on) { state.tv = on; for (const m of tvScreens) m.material = on ? tvOn : tvOff; }
  function setMode(mode) { const k = mode === 'toi' ? 1 : 0.82; for (const m of screens.values()) m.color.setScalar(k); }
  return { setYear, setTv, setMode, state, toggleTv: () => { setTv(!state.tv); return state.tv; } };
}
