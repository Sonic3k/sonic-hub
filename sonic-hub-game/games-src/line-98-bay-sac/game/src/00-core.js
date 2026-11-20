/* ── small things everything else stands on: numbers, colours, what is kept, the two languages ── */
const N = Lines.N, CELLS = Lines.CELLS;
const $ = id => document.getElementById(id);
const stageEl = $('stage'), mapEl = $('map');
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const DPR = () => Math.min(window.devicePixelRatio || 1, 2.5);
const STILL = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

/* the ways a movement can speed up and slow down: each takes 0..1 and gives 0..1 */
const ease = {
  lin: t => t,
  in2: t => t * t,
  out2: t => 1 - (1 - t) * (1 - t),
  io2: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out3: t => 1 - Math.pow(1 - t, 3),
  io3: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in3: t => t * t * t,
  out5: t => 1 - Math.pow(1 - t, 5),
  back: t => { const c = 1.70158 + 1; return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2); },       // goes a little past, then settles
  spring: t => 1 - Math.exp(-6.5 * t) * Math.cos(11 * t),                                                         // past, back, and still
  bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
};

/** numbers that come the same every time for the same seed: what paints a place must not change from one painting to the next */
function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.in = (lo, hi) => lo + (hi - lo) * f();
  f.int = n => Math.floor(f() * n);
  f.pick = list => list[Math.floor(f() * list.length)];
  f.sign = () => (f() < .5 ? -1 : 1);
  return f;
}
/** the game's own dice: any whole number below n */
const dice = n => Math.floor(Math.random() * n);

/* colours: '#rrggbb' in, and out again lighter, darker, mixed or part see-through */
function rgb(hex) { const v = parseInt(hex.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
const hex2 = v => { const n = Math.round(clamp(v, 0, 255)); return (n < 16 ? '0' : '') + n.toString(16); };
const toHex = c => '#' + hex2(c[0]) + hex2(c[1]) + hex2(c[2]);
function mix(a, b, t) { const p = rgb(a), q = rgb(b); return toHex([lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)]); }
const tint = (c, t) => mix(c, '#ffffff', t);
const shade = (c, t) => mix(c, '#000000', t);
function alpha(c, a) { const p = rgb(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }

/* ── what the browser keeps for the game ── */
const KEY = 'line-98-bay-sac.v1';
const STARS = [100, 250, 500];             // the points a place gives its three stars for; the first is the score the program's own table started with
const kept = (() => {
  let k = null;
  try { k = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { k = null; }
  if (!k || typeof k !== 'object' || k.v !== 1) k = { v: 1 };
  if (typeof k.places !== 'object' || !k.places) k.places = {};
  if (typeof k.sound !== 'boolean') k.sound = true;
  if (!['both', 'field', 'top', 'none'].includes(k.show)) k.show = 'both';
  if (typeof k.marks !== 'boolean') k.marks = false;
  if (k.lang !== 'vi' && k.lang !== 'en') k.lang = null;
  return k;
})();
function keep() { try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch (e) { /* a browser that keeps nothing: the game goes on without */ } }
/** what is kept for one place: its best score, how many games were finished there, and the game being played */
function placeKept(id) {
  let p = kept.places[id];
  if (!p || typeof p !== 'object') p = kept.places[id] = {};
  if (!(p.best >= 0)) p.best = 0;
  if (!(p.games >= 0)) p.games = 0;
  if (!p.game || typeof p.game !== 'object' || !validGame(p.game)) p.game = null;
  return p;
}
/** is this a game as the rules make them? (what a browser hands back is never trusted to be well made) */
function validGame(g) {
  const cell = v => Number.isInteger(v) && v >= -1 && v < Lines.COLOURS, three = n => Array.isArray(n) && n.length === 3 && n.every(b => b && Number.isInteger(b.c) && b.c >= 0 && b.c < Lines.COLOURS && Number.isInteger(b.at) && b.at >= 0 && b.at < CELLS);
  if (!Array.isArray(g.board) || g.board.length !== CELLS || !g.board.every(cell) || !three(g.next) || !(g.score >= 0)) return false;
  if (g.back && (!Array.isArray(g.back.board) || g.back.board.length !== CELLS || !g.back.board.every(cell) || !three(g.back.next))) return false;
  return true;
}
const starsFor = points => STARS.filter(s => points >= s).length;

/* ── the two languages ── */
const WORDS = {
  vi: {
    motto: 'Bảy màu bi, bảy miền đất, một luật chơi của năm 1998.',
    how: 'Cách chơi', settings: 'Cài đặt', sound: 'Âm thanh', map: 'Bản đồ', close: 'Đóng',
    best: 'Kỷ lục', score: 'Điểm', next: 'Sắp ra', back: 'Lùi một bước', fresh: 'Ván mới',
    play: 'Chơi', resume: 'Chơi tiếp', again: 'Chơi ván nữa', toMap: 'Về bản đồ',
    stop: n => `Chặng ${n}`, startStop: 'Nơi bắt đầu',
    inPlay: p => `Đang chơi dở ở đây: ${p} điểm`,
    bow: n => `Cầu vồng: ${n} trên 7 sắc đã sáng`,
    bowHint: 'Được 100 điểm ở một miền là sắc của miền ấy sáng lên trên cầu vồng.',
    bowDone: 'Cầu vồng đã đủ bảy sắc!',
    lit: name => `Sắc của ${name} đã sáng trên cầu vồng`,
    newBest: 'Kỷ lục mới', overTitle: 'Hết chỗ rồi', overLead: place => `Bàn chơi ở ${place} đã kín.`, points: 'điểm',
    toNext: (n, s) => `Còn ${n} điểm nữa tới sao thứ ${s}`, allStars: 'Đủ ba sao ở nơi này',
    quit: 'Bỏ ván đang chơi?', quitLead: p => `Ván này đang có ${p} điểm. Bắt đầu ván mới thì ván này mất.`, keepOn: 'Chơi tiếp ván này', yesNew: 'Ván mới',
    cant: 'Không có đường tới ô đó', noBack: 'Chỉ lùi được một bước',
    rulesLead: 'Luật của Lines 98, đúng như chương trình năm 1998 chơi.',
    r1: '<b>Chọn một viên bi</b> rồi chọn ô trống muốn tới. Bi chỉ đi được khi có đường qua các ô trống kề cạnh nhau.',
    r2: 'Xếp <b>năm viên cùng màu trở lên</b> thành hàng ngang, dọc hoặc chéo thì cả hàng biến mất và được điểm.',
    r3: 'Nước đi <b>không ăn được hàng</b> nào thì ba viên bi mới mọc lên, đúng chỗ các viên nhỏ báo trước.',
    r4: 'Bàn <b>hết chỗ</b> cho ba viên mới là hết ván. Hàng càng dài điểm càng cao.',
    pointsLine: 'Điểm cho một hàng:', ballsN: n => `${n} viên`,
    fine: 'Lùi được một bước. Bi mới mọc mà thành hàng thì cũng được ăn và tính điểm. Hai hàng cắt nhau tính chung một lần, viên ở chỗ cắt chỉ đếm một lần.',
    lang: 'Ngôn ngữ', show: 'Ba viên sắp ra', showSub: 'Hiện ở đâu', showBoth: 'Trên bàn và phía trên', showField: 'Chỉ trên bàn', showTop: 'Chỉ phía trên', showNone: 'Không hiện',
    marks: 'Ký hiệu trên bi', marksSub: 'Mỗi màu thêm một hình riêng, cho mắt khó phân biệt màu', on: 'Bật', off: 'Tắt',
    soundSub: 'Tiếng của bi và của từng nơi',
    boardLabel: 'Bàn chơi. Dùng phím mũi tên để chọn ô, Enter để chọn bi hoặc đi.',
    sayBall: (c, r, k) => `Hàng ${r}, cột ${k}: bi ${c}`, sayEmpty: (r, k) => `Hàng ${r}, cột ${k}: ô trống`, sayPicked: c => `Đã chọn bi ${c}`,
    sayScore: (got, total) => `Được ${got} điểm. Tổng ${total}.`, colours: ['đỏ', 'cam', 'vàng', 'lục', 'lam', 'chàm', 'tím'],
    nextLabel: list => `Sắp ra: ${list}`,
  },
  en: {
    motto: 'Seven colours of ball, seven lands, one set of rules from 1998.',
    how: 'How to play', settings: 'Settings', sound: 'Sound', map: 'Map', close: 'Close',
    best: 'Best', score: 'Score', next: 'Next', back: 'Step back', fresh: 'New game',
    play: 'Play', resume: 'Go on', again: 'Play again', toMap: 'Back to the map',
    stop: n => `Stop ${n}`, startStop: 'Where it starts',
    inPlay: p => `A game is waiting here: ${p} points`,
    bow: n => `Rainbow: ${n} of 7 colours lit`,
    bowHint: 'Score 100 in a land and its colour lights up on the rainbow.',
    bowDone: 'The rainbow has all seven colours!',
    lit: name => `The colour of ${name} is lit on the rainbow`,
    newBest: 'New best', overTitle: 'No room left', overLead: place => `The board at ${place} is full.`, points: 'points',
    toNext: (n, s) => `${n} more points to star ${s}`, allStars: 'All three stars here',
    quit: 'Leave this game?', quitLead: p => `This game stands at ${p} points. A new game takes its place.`, keepOn: 'Go on with it', yesNew: 'New game',
    cant: 'There is no way to that square', noBack: 'Only one step back',
    rulesLead: 'The rules of Lines 98, as the program of 1998 plays them.',
    r1: '<b>Pick a ball</b>, then the empty square it should go to. A ball can only go where free squares, side by side, lead.',
    r2: 'Put <b>five or more of one colour</b> in a line, across, down or aslant, and the whole line is taken off for points.',
    r3: 'After a move that <b>takes no line</b>, three new balls come up where the small ones showed.',
    r4: 'When the board has <b>no room</b> for three more, the game is over. The longer the line, the more it is worth.',
    pointsLine: 'Points for a line:', ballsN: n => `${n} balls`,
    fine: 'One step can be taken back. A line made by the new balls is taken and counted too. Two lines that cross count as one, the ball they share once.',
    lang: 'Language', show: 'The three to come', showSub: 'Where they are shown', showBoth: 'Board and top', showField: 'Board only', showTop: 'Top only', showNone: 'Hidden',
    marks: 'Marks on the balls', marksSub: 'A shape of its own for each colour, for eyes that find colours hard to tell apart', on: 'On', off: 'Off',
    soundSub: 'The balls, and each place’s own',
    boardLabel: 'The board. Arrow keys choose a square, Enter picks a ball or moves it.',
    sayBall: (c, r, k) => `Row ${r}, column ${k}: ${c} ball`, sayEmpty: (r, k) => `Row ${r}, column ${k}: empty`, sayPicked: c => `${c} ball picked`,
    sayScore: (got, total) => `${got} points. ${total} in all.`, colours: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'],
    nextLabel: list => `Next: ${list}`,
  },
};
let LANG = kept.lang || ((navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en');
const W = () => WORDS[LANG];
/** a place's name or line, in the language being read */
const tr = pair => pair[LANG] || pair.vi;

/* the few drawings that are not painted: line icons for the buttons */
const ICON = {
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9.2a3.1 3.1 0 1 1 4.6 2.7c-1 .6-1.6 1.2-1.6 2.4"/><circle cx="12" cy="17.6" r=".6" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 5L4 9.5 8.5 14"/><path d="M4 9.5h10.2a5.3 5.3 0 0 1 0 10.6H9"/></svg>',
  fresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4"/><path d="M19.8 4.2v3.9h-3.9"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2 6.2 20.4l1.3-6.5L2.7 9.4l6.5-.8z"/></svg>',
};
