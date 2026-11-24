/* ── The game on the page: the ticket that settles a game, whose turn it is, what is said about it, and the stamps ──
   KIT is set by the build. The game's own page seats a person against the house bot or against a friend, on either
   board. The kit's board (KIT) carries no bot: a person sits on each side unless a bot's file is loaded for it. */
const STORE = KIT ? 'lantern-line-kit.v1' : 'lantern-line.v1';
/** The house bot's levels, weakest first, as stops on the Pingxi line from the cat village to the end of the line:
 *  each with its name, and how that level plays. Beating the computer at a stop, on a board, presses that stop's
 *  stamp for that board. */
const STOPS = [
  { level: 'easy', zh: '猴硐', en: 'Houtong', line: 'The cat village, where nobody hurries. It takes any square it is handed, and otherwise draws more or less anywhere.' },
  { level: 'casual', zh: '大華', en: 'Dahua', line: 'A quiet halt by the river. It takes every square it can and keeps to safe lines, but never leaves one on purpose.' },
  { level: 'steady', zh: '十分', en: 'Shifen', line: 'Lanterns go up from the tracks here. It plays the end exactly: which chain to open, and when to hand the last two back.' },
  { level: 'sharp', zh: '平溪', en: 'Pingxi', line: 'The heart of the festival. It counts the safe lines before they run out, so that you are the one left to open a chain.' },
  { level: 'master', zh: '菁桐', en: 'Jingtong', line: 'The end of the line, wishes hung on bamboo. It reckons the end from the first line, and gives a square away early to win it.' },
];
const stopOf = level => STOPS.find(s => s.level === level) || STOPS[2];
const G = {
  screen: 'setup', S: newGame(5), token: 0, note: '', armed: 0, forfeit: null, run: 0,
  cfg: { size: 5, vs: 'bot', level: 'steady', side: RED },  // what the ticket has settled on the game's page
  seat: [{ kind: 'human' }, { kind: 'human' }],             // who plays Red and who Gold in the game on the board: { kind, bot, level, name, label }
  house: [], stamps: {}, wins: {},                          // the house bot's levels; the stamps pressed, and the wins at each stop, by 'level:size'
  kit: [{ bot: '', info: null, level: '', file: '', error: '' }, { bot: '', info: null, level: '', file: '', error: '' }],
};
const Store = {
  read() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } },
  write(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* nowhere to keep it: the game goes on */ } },
};
function save() {
  const live = G.screen === 'play' && !G.S.over && !G.forfeit && G.seat.every(s => s.kind === 'human' || s.bot === 'house');
  Store.write({ cfg: G.cfg, sound: SFX.on, stamps: G.stamps, wins: G.wins, game: live ? { size: G.S.n, moves: G.S.history.slice(), seat: G.seat } : null });
}
const dims = n => `${n}\u00a0×\u00a0${n}`;   // a board's size, never broken across two lines
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

/* ── names, and the grammar that goes with "You" ── */
function names() {
  const people = G.seat.filter(s => s.kind === 'human').length;
  return G.seat.map((s, side) => (s.kind === 'human' ? (people === 1 ? 'You' : SIDE[side]) : s.name));
}
const wins = n => (n === 'You' ? 'You win' : n + ' wins');
function say(status, sub) { $('#status').textContent = status; G.note = sub === undefined ? G.note : sub; $('#sub').textContent = G.note; }
let toastTimer = 0;
function toast(text, gold, ms = 1500) { const t = $('#toast'); t.textContent = text; t.classList.toggle('gold', !!gold); t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }
const snd = (name, k) => SFX.play(name, k);

/* ── small pictures: the two lanterns, the meter, the boards on the ticket ── */
function paintLamps() {
  for (const c of document.querySelectorAll('canvas.lamp')) {
    const w = c.clientWidth, h = c.clientHeight; if (!w) continue;
    // the body four fifths of the box's height, its middle at the box's middle, where the number sits; the glow is the page's
    const dpr = pixelRatio(2.5), side = +c.dataset.side, body = Math.min(h * 0.8, w / 0.84) * dpr, L = skyLantern(body, side, 11 + side, 0);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.getContext('2d').drawImage(L.c, c.width / 2 - L.cx, c.height / 2 - L.cy);
  }
}
/** The race: squares taken by Red from the left, by Gold from the right, the unlit between, and a mark at the middle:
 *  whoever passes it has won. */
function paintMeter() {
  const c = $('#meter'), w = c.clientWidth, h = c.clientHeight, S = G.S; if (!w) return;
  const dpr = pixelRatio(2.5); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const all = S.n * S.n, gap = all > 30 ? 1 : 2, cell = (w - gap * (all - 1)) / all, y = h * 0.18, ch = h * 0.64;
  for (let i = 0; i < all; i++) {
    const x = i * (cell + gap), side = i < S.score[0] ? 0 : i >= all - S.score[1] ? 1 : -1;
    if (side < 0) { g.fillStyle = 'rgba(30, 40, 84, 0.85)'; g.fillRect(x, y, cell, ch); g.fillStyle = 'rgba(200, 210, 255, 0.12)'; g.fillRect(x, y, cell, 1); continue; }
    const gr = g.createLinearGradient(0, y, 0, y + ch); gr.addColorStop(0, LAMP[side].core); gr.addColorStop(0.45, LAMP[side].glow); gr.addColorStop(1, LAMP[side].paper);
    g.fillStyle = gr; g.fillRect(x, y, cell, ch);
  }
  const mid = w / 2;
  g.fillStyle = '#ffe7a3'; g.fillRect(mid - 1, 0, 2, h);
  g.beginPath(); g.moveTo(mid - 5, 0); g.lineTo(mid + 5, 0); g.lineTo(mid, 6); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(mid - 5, h); g.lineTo(mid + 5, h); g.lineTo(mid, h - 6); g.closePath(); g.fill();
}
function paintIcons() {
  for (const c of document.querySelectorAll('canvas.grid')) { const px = Math.round(26 * pixelRatio(2.5)), icon = gridIcon(px, +c.dataset.n, c.dataset.on === '1'); c.width = c.height = px; c.getContext('2d').drawImage(icon, 0, 0); }
  for (const c of document.querySelectorAll('canvas.mini-lamp')) { const dpr = pixelRatio(2.5), L = skyLantern(24 * dpr, +c.dataset.side, 4, 0.35); c.width = Math.round(22 * dpr); c.height = Math.round(28 * dpr); const g = c.getContext('2d'), k = Math.min(c.width / L.c.width, c.height / L.c.height) * 1.25; g.drawImage(L.c, c.width / 2 - L.cx * k, c.height / 2 - L.cy * k, L.c.width * k, L.c.height * k); }
  for (const c of document.querySelectorAll('canvas.stamp')) { const px = Math.round((c.clientWidth || 64) * pixelRatio(2.5)), st = stopOf(c.dataset.level), s = stampOf(px, st.zh, `${dims(c.dataset.n)}`, c.dataset.won !== '1', 3 + STOPS.indexOf(st)); c.width = c.height = px; c.getContext('2d').drawImage(s, 0, 0); }
}

/* ── the ticket ── */
const chip = (act, value, label, on, more = '') => `<button type="button" class="chip" data-act="${act}" data-v="${value}" aria-pressed="${on}"${more}>${label}</button>`;
function ticketHead() {
  const d = new Date(), no = String((d.getMonth() + 1) * 100 + d.getDate()).padStart(4, '0') + String(d.getHours() * 60 + d.getMinutes()).padStart(4, '0');
  return `<div class="ticket-head"><span class="line" lang="zh-Hant">平溪線<small>Pingxi Line</small></span><span class="no">No. ${no}</span></div>`;
}
function boardsChoice() {
  const n = G.cfg.size;
  return `<fieldset class="opt"><legend>Board</legend><div class="seg">${[5, 7].map(k => chip('size', k, `<canvas class="grid" data-n="${k}" data-on="${n === k ? 1 : 0}" style="width:26px;height:26px"></canvas><span class="two">${dims(k)}<small>${k === 5 ? 'quick' : 'long'}</small></span>`, n === k)).join('')}</div></fieldset>`;
}
function renderSetup() {
  const c = G.cfg; let h = ticketHead() + boardsChoice();
  if (KIT) {
    for (const side of [RED, GOLD]) {
      const k = G.kit[side];
      h += `<div class="seat"><div class="seat-top"><span>${SIDE[side]}${side === RED ? ', drawing first' : ''}</span>`
        + `<button type="button" class="chip" data-act="pick" data-v="${side}" aria-pressed="false">${k.bot ? 'Another file' : 'Load a bot'}</button></div>`;
      if (k.bot) {
        h += `<p class="who-bot"><b>${esc(k.info.name)}</b> by ${esc(k.info.author)}, from ${esc(k.file)}</p><div class="levels">`
          + k.info.levels.map(l => `<button type="button" class="chip" data-act="kit-level" data-side="${side}" data-v="${esc(l)}" aria-pressed="${l === k.level}">${esc(l)}</button>`).join('')
          + `<button type="button" class="chip" data-act="unseat" data-v="${side}" aria-pressed="false">A person instead</button></div>`;
      } else h += '<p class="who-bot">A person plays this side.</p>';
      if (k.error) h += `<p class="err">${esc(k.error)}</p>`;
      h += '</div>';
    }
  } else {
    h += `<fieldset class="opt"><legend>Play against</legend><div class="seg">${chip('vs', 'bot', 'The computer', c.vs === 'bot')}${chip('vs', 'friend', 'A friend', c.vs === 'friend')}</div></fieldset>`;
    if (c.vs === 'bot') {
      const levels = STOPS.filter(s => G.house.includes(s.level)), st = stopOf(c.level), i = levels.indexOf(st), won = !!G.stamps[`${st.level}:${c.size}`];
      h += `<fieldset class="opt"><legend>Ride to</legend><div class="stops">`
        + levels.map(s => `<button type="button" class="stop" data-act="level" data-v="${s.level}" aria-pressed="${s === st}" aria-label="${s.en}"><span class="dot"></span><span class="zh" lang="zh-Hant">${s.zh}</span>${G.stamps[`${s.level}:${c.size}`] ? '<span class="won" lang="zh-Hant" title="Stamp pressed">章</span>' : ''}</button>`).join('')
        + `</div><div class="sign"><span class="name" lang="zh-Hant">${st.zh}</span><span class="en">${st.en}</span>`
        + `<canvas class="stamp" data-level="${st.level}" data-n="${c.size}" data-won="${won ? 1 : 0}" aria-label="${won ? 'Its stamp, pressed' : 'Its stamp, not pressed yet'}"></canvas>`
        + `<span class="by"><span>${i > 0 ? '‹ ' + levels[i - 1].en : ''}</span><span>${i < levels.length - 1 ? levels[i + 1].en + ' ›' : 'End of the line'}</span></span></div>`
        + `<p class="cap">${esc(st.line)}</p></fieldset>`;
      h += `<fieldset class="opt"><legend>You light</legend><div class="seg">${chip('side', RED, '<canvas class="mini-lamp" data-side="0" style="width:22px;height:28px"></canvas><span class="two">Red<small>draws first</small></span>', c.side === RED)}${chip('side', GOLD, '<canvas class="mini-lamp" data-side="1" style="width:22px;height:28px"></canvas><span class="two">Gold<small>draws second</small></span>', c.side === GOLD)}</div></fieldset>`;
    } else h += '<p class="cap">Two players at this screen, turn and turn about. Red draws first.</p>';
  }
  h += '<button type="button" class="go" data-act="start">Start</button>';
  $('#setup').innerHTML = `<div class="ticket">${h}</div>`;
  paintIcons();
}
/** on the kit's board: a bot's file chosen for a side */
async function takeFile(side, file) {
  const k = G.kit[side], bot = 'file' + side;
  let src;
  try { src = await file.text(); } catch (e) { k.error = file.name + ' could not be read.'; return renderSetup(); }
  Bots.load(bot, src);
  const info = await Bots.info(bot);
  if (info.error) { Object.assign(k, { bot: '', info: null, level: '', error: file.name + ': ' + info.error }); Bots.files.delete(bot); }
  else Object.assign(k, { bot, info, level: info.levels[0], file: file.name, error: '' });
  renderSetup();
}
/** who will sit down, from what the ticket has settled */
function seats() {
  if (KIT) return G.kit.map(k => (k.bot ? { kind: 'bot', bot: k.bot, level: k.level, name: k.info.levels.length > 1 ? `${k.info.name} (${k.level})` : k.info.name } : { kind: 'human' }));
  if (G.cfg.vs === 'friend') return [{ kind: 'human' }, { kind: 'human' }];
  const bot = { kind: 'bot', bot: 'house', level: G.cfg.level, name: 'The computer', label: 'Computer' };
  return G.cfg.side === RED ? [{ kind: 'human' }, bot] : [bot, { kind: 'human' }];
}

/* ── the game ── */
function renderHud() {
  const S = G.S, n = names(), all = S.n * S.n;
  for (const side of [RED, GOLD]) {
    $('#num' + side).textContent = S.score[side]; $('#name' + side).textContent = G.seat[side].label || n[side];
    $('#who' + side).classList.toggle('turn', !S.over && !G.forfeit && S.turn === side);
  }
  $('#left').textContent = all - S.score[0] - S.score[1];
  const bot = G.seat.find(s => s.bot === 'house'), st = bot && stopOf(bot.level);
  $('#plate').innerHTML = st ? `<span class="zh" lang="zh-Hant">${st.zh}</span><span class="en">${st.en}</span><span class="bd">${dims(S.n)}</span>`
    : `<span class="zh" lang="zh-Hant">平溪線</span><span class="en">${G.seat.some(s => s.kind === 'bot') ? 'Pingxi Line' : 'Two players'}</span><span class="bd">${dims(S.n)}</span>`;
  $('#meter').setAttribute('aria-label', `${n[0]} ${S.score[0]}, ${n[1]} ${S.score[1]}, ${all - S.score[0] - S.score[1]} still to light; ${(all + 1) / 2} wins`);
  paintMeter();
  const done = S.over || G.forfeit;
  $('#btns').innerHTML = (done ? '<button type="button" class="tag hot" data-act="again">Play again</button>'
    : `<button type="button" class="tag" data-act="undo"${canUndo() ? '' : ' disabled'}>Take back</button>`)
    + `<button type="button" class="tag" data-act="new">${G.armed ? 'Leave this game?' : 'New game'}</button>`;
}
/** the squares the side to move has taken in the turn it is in */
function runOf(S) { const T = newGame(S.n); let run = 0; for (const m of S.history) { const got = make(T, m); run = got ? run + got : 0; } return run; }
/** is there a line of a person's to take back? */
function canUndo() {
  if (G.forfeit || G.S.over) return false;
  const T = newGame(G.S.n);
  for (const m of G.S.history) { if (G.seat[T.turn].kind === 'human') return true; make(T, m); }
  return false;
}
function startGame(kept) {
  G.token++; G.screen = 'play'; G.forfeit = null; G.armed = 0; G.note = ''; G.run = 0; clearTimeout(toastTimer); $('#toast').classList.remove('on');
  G.seat = kept ? kept.seat : seats(); G.S = (kept && replay(kept.size, kept.moves)) || newGame(G.cfg.size); G.run = runOf(G.S);
  View.quiet = false; View.input = null; View.runs = 0;
  document.body.classList.add('playing'); $('#setup').hidden = true; $('#hud').hidden = false; $('#prize').hidden = true;
  View.fit(G.S.n); View.set(G.S);
  Scene.letGo(); for (let s = 0; s < G.S.owner.length; s++) if (G.S.owner[s] >= 0) Scene.keep(G.S.owner[s]);
  paintLamps(); renderHud();
  if (!kept) snd('start');
  save(); turn(G.token);
}
function toSetup() {
  G.token++; G.screen = 'setup'; G.forfeit = null; G.armed = 0;
  Bots.dropAll('the game was left'); View.input = null; clearTimeout(toastTimer); $('#toast').classList.remove('on');
  document.body.classList.remove('playing'); $('#hud').hidden = true; $('#setup').hidden = false;
  renderSetup(); View.fit(G.cfg.size); save(); demo(G.token);
}
/** While nothing is being played, the board plays by itself, slowly and without a sound, and its lanterns go up. */
async function demo(token) {
  View.quiet = true;
  for (;;) {
    const S = newGame(G.cfg.size);
    View.fit(S.n); View.set(S); Scene.letGo();
    await sleep(900);
    while (!S.over) {
      if (token !== G.token) return;
      const ms = legalMoves(S), take = ms.filter(m => takes(S, m)), safe = ms.filter(m => isSafe(S, m));
      const m = take.length && Math.random() < 0.9 ? take[0] : safe.length ? safe[Math.floor(Math.random() * safe.length)] : ms[Math.floor(Math.random() * ms.length)];
      const ev = playMove(S, m);
      await View.show(ev, S);
      if (token !== G.token) return;
      await sleep(ev.took.length ? 420 : 900);
    }
    await sleep(4200);
    if (token !== G.token) return;
  }
}

/** Whoever is to move, moves: a person is shown the board is theirs, a bot is asked. */
async function turn(token) {
  if (token !== G.token) return;
  const S = G.S, n = names();
  if (S.over) return finish();
  const me = S.turn, seat = G.seat[me], again = G.run > 0;
  renderHud();
  if (seat.kind === 'human') {
    const people = G.seat.filter(s => s.kind === 'human').length, who = people === 1 ? 'You' : SIDE[me];
    if (again) say(people === 1 ? 'Again' : `${who} again`, G.run > 1 ? `${G.run} squares this turn. Draw another line.` : 'A square taken: draw another line.');
    else say(people === 1 ? 'Your move' : `${who} to draw`, G.note || (S.history.length < 2 ? 'Draw a line between two dots next to each other, across or down.' : ''));
    View.input = m => personMoves(m, token);
    return;
  }
  View.input = null;
  say(again ? `${seat.name} goes on` : `${seat.name} is drawing…`, G.note);
  const t0 = performance.now(), a = await Bots.move(S, seat.bot, seat.level);
  if (token !== G.token) return;
  let m = a.move;
  if (m === undefined) {
    // on the kit's board a bot that breaks has lost, as it would have in the arena; the game's own bot is helped over the move
    if (KIT) { G.forfeit = { side: me, why: a.error }; say(`${seat.name} has lost`, `Its side forfeits: ${a.error}.`); snd('no'); renderHud(); save(); return; }
    const ms = legalMoves(S); m = ms.find(x => takes(S, x)) ?? ms[Math.floor(Math.random() * ms.length)];
  }
  const rest = (again ? 300 : G.seat[1 - me].kind === 'bot' ? 420 : 650) - (performance.now() - t0);
  if (rest > 0) await sleep(rest);
  if (token !== G.token) return;
  await made(m, token);
}
async function personMoves(m, token) {
  if (token !== G.token) return;
  G.armed = 0;
  await made(m, token);
}
/** A line is drawn: shown, counted, and the turn goes on or passes. */
async function made(m, token) {
  const S = G.S, side = S.turn, ev = playMove(S, m);
  if (!ev) return turn(token);
  View.input = null;
  G.run = ev.took.length && !S.over ? G.run + ev.took.length : 0;
  G.note = '';
  await View.show(ev, S);
  if (token !== G.token) return;
  if (ev.took.length) {
    $('#who' + side).classList.remove('bump'); void $('#who' + side).offsetWidth; $('#who' + side).classList.add('bump');
    if (ev.took.length > 1) toast('Two at once', side === GOLD);
    else if (G.run >= 4 && G.run % 2 === 0) toast(`${G.run} in a row`, side === GOLD, 1100);
  }
  save(); turn(token);
}
function finish() {
  const S = G.S, o = S.over, n = names(), [red, gold] = o.score, people = G.seat.filter(s => s.kind === 'human').length;
  View.input = null; G.run = 0;
  const vsBot = !KIT && people === 1, mine = G.seat.findIndex(s => s.kind === 'human'), won = o.winner === mine;
  say(`${wins(n[o.winner])}, ${Math.max(red, gold)} to ${Math.min(red, gold)}`, vsBot ? (won ? 'Every square lit, and more of them yours.' : 'Every square lit, and more of them the computer’s.') : 'Every square is lit.');
  renderHud();
  const prize = $('#prize');
  if (vsBot) {
    const level = G.seat[1 - mine].level, st = stopOf(level), key = `${level}:${S.n}`, first = won && !G.stamps[key];
    if (won) { G.stamps[key] = true; G.wins[key] = (G.wins[key] || 0) + 1; }
    const count = G.wins[key] || 0;
    prize.innerHTML = `<canvas class="stamp" data-level="${level}" data-n="${S.n}" data-won="${won ? 1 : 0}"></canvas><div>`
      + (won ? `<b>${first ? 'Stamp pressed' : 'Stamped again'}: ${esc(st.en)}</b><span>${first ? `The stamp of ${esc(st.en)} station, ${dims(S.n)}, is in your book.` : `You have beaten ${esc(st.en)} on ${dims(S.n)} ${count} times.`}</span>`
        : `<b>${esc(st.en)} keeps its stamp</b><span>Beat the computer at ${esc(st.en)} on ${dims(S.n)} and its stamp is yours.</span>`) + '</div>';
    prize.hidden = false; paintIcons();
    const c = prize.querySelector('canvas');
    if (won) { c.classList.add('slam'); setTimeout(() => snd('stamp'), 260); } else c.style.rotate = '-9deg';
  }
  snd(vsBot && !won ? 'lose' : 'win');
  toast(wins(n[o.winner]), o.winner === GOLD, 2400);
  save();
}
function undo() {
  if (G.screen !== 'play' || !canUndo()) return;
  const S = G.S, T = newGame(S.n), whose = [];
  for (const m of S.history) { whose.push(T.turn); make(T, m); }
  G.token++; Bots.dropAll('the line was taken back');
  // back to before the last line a person drew, with whatever the computer drew after it
  for (let i = S.history.length - 1; i >= 0; i--) {
    const owned = Array.from(S.owner); undoMove(S);
    for (let s = 0; s < owned.length; s++) if (owned[s] >= 0 && S.owner[s] < 0) Scene.unkeep(owned[s]);
    if (G.seat[whose[i]].kind === 'human') break;
  }
  G.note = ''; G.armed = 0; G.run = runOf(S); $('#toast').classList.remove('on');
  View.input = null; View.set(S); snd('draw');
  save(); turn(G.token);
}

/* ── the rules, each with a small board ── */
/** A corner of a board, w × h squares, for the rules: lines drawn (h: across, v: down, by dot), squares lit (by side),
 *  and a line being drawn now, ghosted. */
function paintMini(cv, w, h, spec) {
  const css = cv.clientWidth || 128, dpr = pixelRatio(2.5), W = Math.round(css * dpr), H = Math.round(W * 100 / 128);
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), c = Math.min((W * 0.86) / w, (H * 0.84) / h), ox = (W - c * w) / 2, oy = (H - c * h) / 2, sw = Math.max(2, c * 0.14);
  g.drawImage(paperSheet(W, H, ['#1d2a5c', '#4b5d9c', '#0e1838'], 9, 1.4), 0, 0);
  const lit = [litSquare(Math.ceil(c), 0, 2), litSquare(Math.ceil(c), 1, 3)];
  for (const [x, y, side] of spec.lit || []) { g.drawImage(lit[side], ox + x * c, oy + y * c, c, c); }
  const strip = bambooStrip(c - sw * 0.4, sw, 5), down = turned(strip);
  const lineAt = ([kind, x, y], alpha = 1) => { g.globalAlpha = alpha; const s = kind === 'h' ? strip : down; if (kind === 'h') g.drawImage(s.c, ox + x * c + sw * 0.2 - s.pad, oy + y * c - sw / 2 - s.pad); else g.drawImage(s.c, ox + x * c - sw / 2 - s.pad, oy + y * c + sw * 0.2 - s.pad); g.globalAlpha = 1; };
  for (const l of spec.lines || []) lineAt(l);
  if (spec.ghost) {
    const [kind, x, y] = spec.ghost, gx = ox + (kind === 'h' ? x + 0.5 : x) * c, gy = oy + (kind === 'h' ? y : y + 0.5) * c, gl = g.createRadialGradient(gx, gy, 0, gx, gy, c * 0.6);
    gl.addColorStop(0, 'rgba(255, 220, 140, 0.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gl; g.fillRect(gx - c, gy - c, c * 2, c * 2);
    lineAt(spec.ghost, 0.9);
  }
  const k = knot(Math.max(2, c * 0.09));
  for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) g.drawImage(k, ox + x * c - k.width / 2, oy + y * c - k.width / 2);
}
function buildHelp() {
  if ($('#steps').childElementCount) return;
  const R0 = 0, G1 = 1, steps = [
    [3, 2, { lines: [['h', 0, 0], ['v', 2, 0]], ghost: ['h', 1, 1] },
      '<b>Red draws first.</b> On your turn you draw one line between two dots next to each other, across or down.'],
    [3, 2, { lines: [['h', 1, 0], ['h', 1, 1], ['v', 1, 0], ['v', 2, 0]], lit: [[1, 0, R0]] },
      'Draw the <b>fourth side of a square</b> and it is yours: its lantern lights in your colour, and you <b>draw again</b>.'],
    [3, 2, { lines: [['h', 0, 0], ['h', 1, 0], ['h', 0, 1], ['h', 1, 1], ['v', 0, 0], ['v', 2, 0], ['v', 1, 0]], lit: [[0, 0, G1], [1, 0, G1]] },
      'One line can close <b>two squares</b> at once. Both are yours, and you draw again once.'],
    [3, 2, { lines: [['h', 0, 0], ['h', 0, 1], ['v', 0, 0], ['h', 2, 1], ['v', 3, 1]], ghost: ['h', 2, 2] },
      'A line that gives a square its <b>third side</b> hands it over: whoever draws next can take it. Taking is never forced.'],
    [3, 2, { lines: [['h', 0, 1], ['h', 1, 1], ['h', 2, 1], ['h', 0, 2], ['h', 1, 2], ['h', 2, 2]] },
      'Squares in a row make a <b>chain</b>: open one end and all of it can be taken, one square after another.'],
    [3, 2, { lines: [['h', 0, 0], ['h', 1, 0], ['h', 2, 0], ['h', 0, 1], ['h', 1, 1], ['h', 2, 1], ['h', 0, 2], ['h', 1, 2], ['h', 2, 2], ['v', 0, 0], ['v', 1, 0], ['v', 2, 0], ['v', 3, 0], ['v', 0, 1], ['v', 1, 1], ['v', 2, 1], ['v', 3, 1]], lit: [[0, 0, R0], [1, 0, G1], [2, 0, R0], [0, 1, R0], [1, 1, G1], [2, 1, R0]] },
      'When every line is drawn, <b>more lanterns wins</b>: 13 of the 25 squares on 5 × 5, 25 of the 49 on 7 × 7.'],
  ];
  $('#steps').innerHTML = steps.map(s => `<div class="step"><canvas aria-hidden="true"></canvas><p>${s[3]}</p></div>`).join('');
  document.querySelectorAll('#steps canvas').forEach((c, i) => paintMini(c, steps[i][0], steps[i][1], steps[i][2]));
}
function openHelp() { $('#help').hidden = false; buildHelp(); $('[data-act=help-close]').focus({ preventScroll: true }); $('#help').scrollTop = 0; }
function closeHelp() { $('#help').hidden = true; }

/* ── wiring ── */
function renderSound() { $('#sound').textContent = SFX.on ? 'Sound on' : 'Sound off'; $('#sound').setAttribute('aria-pressed', SFX.on); }
/** The valley is painted for the window as it is. A window that only grows or shrinks a little in height (a phone's
 *  address bar coming and going) keeps the painting it has: painting it again each time would stutter. */
const Paint = { w: 0, h: 0, all(force) {
  const w = window.innerWidth, h = window.innerHeight;
  if (force || w !== this.w || Math.abs(h - this.h) > 140) { this.w = w; this.h = h; Scene.paint(); }
  View.fit(G.screen === 'play' ? G.S.n : G.cfg.size);
  if (G.screen === 'play') { paintLamps(); paintMeter(); }
} };
function wire() {
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) { if (ev.target.id === 'help') closeHelp(); return; }
    const act = b.dataset.act, v = b.dataset.v;
    SFX.init();
    if (act === 'sound') { SFX.on = !SFX.on; renderSound(); snd('draw'); save(); return; }
    if (act === 'help') return openHelp();
    if (act === 'help-close') return closeHelp();
    if (act === 'size') { if (G.cfg.size !== +v) { G.cfg.size = +v; renderSetup(); save(); toSetup(); } return; }
    if (act === 'vs') { G.cfg.vs = v; snd('draw'); renderSetup(); return save(); }
    if (act === 'level') { G.cfg.level = v; snd('draw'); renderSetup(); return save(); }
    if (act === 'side') { G.cfg.side = +v; snd('draw'); renderSetup(); return save(); }
    if (act === 'pick') { const p = $('#pick'); p.dataset.side = v; p.value = ''; return p.click(); }
    if (act === 'kit-level') { G.kit[+b.dataset.side].level = v; return renderSetup(); }
    if (act === 'unseat') { Object.assign(G.kit[+v], { bot: '', info: null, level: '', file: '', error: '' }); Bots.drop('file' + v, 'the seat was given up'); return renderSetup(); }
    if (act === 'start') return startGame();
    if (act === 'again') return startGame();
    if (act === 'undo') return undo();
    if (act === 'new') {
      // one press too many should not cost a game that is under way
      if (G.S.history.length && !G.S.over && !G.forfeit && !G.armed) { G.armed = setTimeout(() => { G.armed = 0; if (G.screen === 'play') renderHud(); }, 3200); return renderHud(); }
      clearTimeout(G.armed); return toSetup();
    }
  });
  $('#pick').addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; if (f) takeFile(+ev.target.dataset.side, f); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#help').hidden) closeHelp(); });
  let again = 0;
  window.addEventListener('resize', () => { clearTimeout(again); again = setTimeout(() => Paint.all(), 140); });
  document.addEventListener('visibilitychange', () => Scene.pause(document.hidden));
}
async function boot() {
  const kept = Store.read();
  if (kept.sound === false) SFX.on = false;
  if (kept.cfg) Object.assign(G.cfg, { size: kept.cfg.size === 7 ? 7 : 5, vs: kept.cfg.vs === 'friend' ? 'friend' : 'bot', level: String(kept.cfg.level || 'steady'), side: kept.cfg.side === GOLD ? GOLD : RED });
  if (!KIT && kept.stamps && typeof kept.stamps === 'object') for (const k in kept.stamps) if (/^[a-z]+:[57]$/.test(k) && kept.stamps[k] === true) G.stamps[k] = true;
  if (!KIT && kept.wins && typeof kept.wins === 'object') for (const k in kept.wins) if (/^[a-z]+:[57]$/.test(k) && Number.isInteger(kept.wins[k]) && kept.wins[k] > 0) G.wins[k] = kept.wins[k];
  wire(); renderSound();
  const grain = paperGrain(220, 11); document.documentElement.style.setProperty('--paper-tex', `url(${grain.toDataURL()})`);
  try { await Promise.race([Promise.all([document.fonts.load('italic 800 20px Alegreya'), document.fonts.load('700 20px "Lantern Kai"', '安福'), document.fonts.load('500 16px "Alegreya Sans"')]), sleep(1500)]); } catch (e) { /* the fallback faces will do */ }
  Paint.all(true); Scene.wake();
  if (!KIT) {
    const info = await Bots.info('house');
    G.house = info.levels || [];
    if (!G.house.includes(G.cfg.level)) G.cfg.level = G.house[Math.min(2, G.house.length - 1)] || '';
  }
  const game = kept.game, S = game && Array.isArray(game.moves) && [5, 7].includes(game.size) ? replay(game.size, game.moves) : null;
  const fits = S && !S.over && Array.isArray(game.seat) && game.seat.length === 2 && game.seat.every(s => s && (s.kind === 'human' || (s.kind === 'bot' && s.bot === 'house' && G.house.includes(s.level))));
  if (fits && !KIT) startGame(game); else toSetup();
}
boot();
