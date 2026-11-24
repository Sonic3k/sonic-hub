/* ── The game on the page: who sits where, whose turn it is, and what is said about it ──
   KIT is set by the build. The game's own page opens on the campaign (70-campaign.js), which seats one of its
   opponents across the board; beside it a person can still sit down against the house bot or against a friend,
   with nothing at stake. The kit's board (KIT) carries no bot and no campaign: a person sits on each side unless
   a bot's file is loaded for it. */
const STORE = KIT ? 'wax-and-wane-kit.v1' : 'wax-and-wane.v1';
/** what the page calls each level of the house bot, weakest first, and how that level plays */
const LEVELS = {
  new: ['New moon', 'Still finding its way. It plays whatever looks good at the moment.'],
  crescent: ['Crescent', 'It knows a corner when it sees one, and not much more.'],
  quarter: ['Half moon', 'It thinks about your answer before it moves, and keeps off the squares beside a corner.'],
  gibbous: ['Gibbous', 'It looks several moves ahead and leaves you as few moves as it can.'],
  full: ['Full moon', 'It reads deep, and plays the last moves of a game without a mistake.'],
};
const G = {
  screen: 'setup', S: newGame(), token: 0, note: '', armed: 0, forfeit: null,
  cfg: { vs: 'bot', level: '', side: DARK },                 // what the setup has settled on the game's page
  seat: [{ kind: 'human' }, { kind: 'human' }],              // who plays Dark and who Light in the game on the board: { kind, bot, level, name, label }
  house: [],                                                 // the house bot's levels
  kit: [{ bot: '', info: null, level: '', file: '', error: '' }, { bot: '', info: null, level: '', file: '', error: '' }],
  shown: [2, 2], dialRaf: 0,
  camp: null,                                                // in a game of the campaign: who sits across, and what is at stake (70-campaign.js)
};
const Store = {
  read() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } },
  write(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* nowhere to keep it: the game goes on */ } },
};
function save() {
  const live = !G.camp && G.screen === 'play' && !G.S.over && !G.forfeit && G.seat.every(s => s.kind === 'human' || s.bot === 'house');
  Store.write({ cfg: G.cfg, sound: SFX.on, game: live ? { moves: G.S.history.slice(), seat: G.seat } : null });
  if (G.camp) Camp.keep();                                   // a game of the campaign is kept with the player's points
}
/** Which of the page's screens is in sight: the table (setup, play), or one of the campaign's (who, world, face). */
function show(screen) {
  G.screen = screen;
  const table = screen === 'setup' || screen === 'play';
  for (const [id, on] of [['who', screen === 'who'], ['world', screen === 'world'], ['face', screen === 'face'], ['table', table]]) { const el = document.getElementById(id); if (el) el.hidden = !on; }
  document.body.dataset.screen = screen;
  document.body.classList.toggle('playing', screen === 'play');
  document.body.classList.toggle('match', screen === 'play' && !!G.camp);
  if (!KIT) Camp.top();
  window.scrollTo(0, 0);
}
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);

/* ── names, and the grammar that goes with "You" ── */
function names() {
  const people = G.seat.filter(s => s.kind === 'human').length;
  return G.seat.map((s, side) => (s.kind === 'human' ? (people === 1 ? 'You' : SIDE[side]) : s.name));
}
const has = n => (n === 'You' ? 'You have' : n + ' has'), plays = n => (n === 'You' ? 'You play' : n + ' plays'), wins = n => (n === 'You' ? 'You win' : n + ' wins');
function say(status, sub) { $('#status').textContent = status; G.note = sub === undefined ? G.note : sub; $('#sub').textContent = G.note; }
let toastTimer = 0;
function toast(text, ms = 1500) { const t = $('#toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }

/* ── small pictures of moons, wherever one stands for a side or a level ── */
function drawDiscs() {
  for (const c of document.querySelectorAll('canvas.disc')) {
    if (c.dataset.done) continue;
    const size = c.clientWidth || 24, px = Math.round(size * Math.min(2.5, window.devicePixelRatio || 1)), face = paintFace(px, c.dataset.side === '1', 2);
    c.width = c.height = px; c.getContext('2d').drawImage(face, 0, 0); c.dataset.done = '1';
  }
  for (const c of document.querySelectorAll('canvas.phase')) {
    if (c.dataset.done) continue;
    const px = Math.round((c.clientWidth || 38) * Math.min(2.5, window.devicePixelRatio || 1)), icon = moonIcon(px, +c.dataset.lit, 2);
    c.width = c.height = px; c.getContext('2d').drawImage(icon, 0, 0); c.dataset.done = '1';
  }
}
function paintEmblem() {
  const c = $('#emblem'), w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1), g = c.getContext('2d');
  c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const px = Math.round(h * dpr), dark = paintFace(px, false, 2), light = paintFace(px, true, 2);
  // the moon filling and emptying: a crescent, a half, the full moon, a half, a crescent
  [[0.3, Math.PI, 0.68], [0.5, Math.PI, 0.82], [1, 0, 1], [0.5, 0, 0.82], [0.3, 0, 0.68]].forEach(([lit, from, size], i) => drawMoon(g, w / 2 + (i - 2) * w * 0.215, h / 2, h * size, dark, light, lit, from));
}
/** the dial moves to where the count stands, rather than jumping there */
function dialTo(dark, light, now) {
  const c = $('#dial'), size = c.clientWidth;
  if (!size) return;
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  cancelAnimationFrame(G.dialRaf);
  if (now || REDUCED) { G.shown = [dark, light]; Dial.paint(c, size, dpr, dark, light); return; }
  const from = G.shown.slice(), t0 = performance.now();
  const step = t => {
    const k = easeIO(clamp01((t - t0) / 650));
    G.shown = [lerp(from[0], dark, k), lerp(from[1], light, k)];
    Dial.paint(c, size, dpr, G.shown[0], G.shown[1]);
    if (k < 1) G.dialRaf = requestAnimationFrame(step);
  };
  G.dialRaf = requestAnimationFrame(step);
}

/* ── the setup ── */
const plate = (act, value, label, on, more = '') => `<button type="button" class="plate" data-act="${act}" data-v="${value}" aria-pressed="${on}"${more}>${label}</button>`;
function renderSetup() {
  const c = G.cfg; let h = '';
  if (KIT) {
    for (const side of [DARK, LIGHT]) {
      const k = G.kit[side];
      h += `<div class="seat"><div class="seat-top"><span><canvas class="disc" data-side="${side}"></canvas>${SIDE[side]}${side === DARK ? ', moving first' : ''}</span>`
        + `<button type="button" class="plate small" data-act="pick" data-v="${side}">${k.bot ? 'Another file' : 'Load a bot'}</button></div>`;
      if (k.bot) {
        h += `<p class="who-bot"><b>${esc(k.info.name)}</b> by ${esc(k.info.author)}, from ${esc(k.file)}</p><div class="levels">`
          + k.info.levels.map(l => `<button type="button" class="plate" data-act="kit-level" data-side="${side}" data-v="${esc(l)}" aria-pressed="${l === k.level}">${esc(l)}</button>`).join('')
          + `<button type="button" class="plate" data-act="unseat" data-v="${side}" aria-pressed="false">A person instead</button></div>`;
      } else h += '<p class="who-bot">A person plays this side.</p>';
      if (k.error) h += `<p class="err">${esc(k.error)}</p>`;
      h += '</div>';
    }
  } else {
    h += `<fieldset class="opt"><legend>Play against</legend><div class="seg">${plate('vs', 'bot', 'The computer', c.vs === 'bot')}${plate('vs', 'friend', 'A friend', c.vs === 'friend')}</div></fieldset>`;
    if (c.vs === 'bot') {
      h += '<fieldset class="opt"><legend>How strong</legend><div class="phases">'
        + G.house.map((l, i) => plate('level', l, `<canvas class="phase" data-lit="${G.house.length > 1 ? i / (G.house.length - 1) : 1}"></canvas>`, l === c.level, ` aria-label="${esc((LEVELS[l] || [l])[0])}"`)).join('')
        + `</div><p class="cap"><b>${esc((LEVELS[c.level] || [c.level])[0])}</b><br>${esc((LEVELS[c.level] || ['', ''])[1])}</p></fieldset>`;
      h += `<fieldset class="opt"><legend>You play (Dark moves first)</legend><div class="seg">${plate('side', DARK, '<canvas class="disc" data-side="0"></canvas>Dark', c.side === DARK)}${plate('side', LIGHT, '<canvas class="disc" data-side="1"></canvas>Light', c.side === LIGHT)}</div></fieldset>`;
    } else h += '<p class="cap">Two players at this screen, turn and turn about.<br>Dark moves first.</p>';
  }
  h += '<button type="button" class="go" data-act="start">Start</button>';
  $('#setup').innerHTML = h;
  drawDiscs();
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
/** who will sit down, from what the setup has settled */
function seats() {
  if (KIT) return G.kit.map(k => (k.bot ? { kind: 'bot', bot: k.bot, level: k.level, name: k.info.levels.length > 1 || k.level !== k.info.name.toLowerCase() ? `${k.info.name} (${k.level})` : k.info.name } : { kind: 'human' }));
  if (G.cfg.vs === 'friend') return [{ kind: 'human' }, { kind: 'human' }];
  // a level is named for a phase of the moon and a side for a face of it, so in a game the house bot goes by neither
  const bot = { kind: 'bot', bot: 'house', level: G.cfg.level, name: 'The computer', label: 'Computer' };
  return G.cfg.side === DARK ? [{ kind: 'human' }, bot] : [bot, { kind: 'human' }];
}

/* ── the game ── */
function renderHud() {
  const S = G.S, n = names();
  for (const side of [DARK, LIGHT]) {
    $('#num' + side).textContent = S.count[side]; $('#name' + side).textContent = G.seat[side].label || n[side];
    $('#who' + side).classList.toggle('turn', !S.over && !G.forfeit && S.turn === side);
  }
  $('#dial').setAttribute('aria-label', `${n[0]} ${S.count[0]}, ${n[1]} ${S.count[1]}`);
  dialTo(S.count[0], S.count[1]);
  const done = S.over || G.forfeit;
  $('#btns').innerHTML = G.camp ? Camp.buttons() : (done ? '<button type="button" class="plate" data-act="again">Play again</button>'
    : `<button type="button" class="plate" data-act="undo"${canUndo() ? '' : ' disabled'}>Take back</button>`)
    + `<button type="button" class="plate" data-act="new">${G.armed ? 'Leave this game?' : 'New game'}</button>`;
  $('#rival').classList.toggle('thinking', !!G.camp && !done && G.seat[S.turn].kind === 'bot');
  View.mark(S);
}
/** is there a move of a person's to take back? With points at stake none is. */
function canUndo() { return !G.forfeit && !(G.camp && G.camp.rated) && G.S.history.some((m, i) => m !== PASS_MOVE && G.seat[i % 2].kind === 'human'); }
function startGame(kept) {
  G.token++; G.forfeit = null; clearTimeout(G.armed); G.armed = 0; G.note = '';
  G.seat = kept ? kept.seat : seats(); G.S = (kept && replay(kept.moves)) || newGame();
  View.quiet = false; View.setInput(null);
  $('#setup').hidden = true; $('#hud').hidden = false; $('#rival').hidden = !G.camp; $('#toast').classList.remove('on');
  show('play');
  View.fit(); View.set(G.S.b); drawDiscs(); G.shown = G.S.count.slice(); dialTo(G.S.count[0], G.S.count[1], true);
  if (!kept) snd('start');
  save(); turn(G.token);
}
function toSetup() {
  G.token++; G.forfeit = null; clearTimeout(G.armed); G.armed = 0; G.camp = null;
  Bots.dropAll('the game was left'); View.setInput(null);
  $('#hud').hidden = true; $('#rival').hidden = true; $('#setup').hidden = false; $('#toast').classList.remove('on');
  show('setup');
  renderSetup(); View.fit(); paintEmblem(); save(); demo(G.token);
}
/** While nothing is being played, the board plays by itself, slowly and without a sound. */
async function demo(token) {
  View.quiet = true;
  for (;;) {
    const S = newGame();
    View.set(S.b); View.mark(S);
    await sleep(1300);
    while (!S.over) {
      if (token !== G.token) return;
      const legal = legalMoves(S);
      if (legal[0] === PASS_MOVE) { playMove(S, PASS_MOVE); continue; }
      let best = legal[0], top = -99;
      for (const m of legal) {
        const edge = (m & 7) % 7 === 0, end = (m >> 3) % 7 === 0, v = countFlips(S, m) * 0.6 + (edge && end ? 9 : edge || end ? 1.5 : 0) + Math.random() * 3;
        if (v > top) { top = v; best = m; }
      }
      const ev = playMove(S, best);
      await View.show(ev);
      if (token !== G.token) return;
      View.mark(S);
      await sleep(1250);
    }
    await sleep(3200);
    if (token !== G.token) return;
  }
}

/** Whoever is to move, moves: a person is shown where, a bot is asked, a side with no move is passed over. */
async function turn(token) {
  if (token !== G.token) return;
  const S = G.S, n = names();
  if (S.over) return finish();
  const legal = legalMoves(S), me = S.turn, seat = G.seat[me];
  if (legal[0] === PASS_MOVE) {
    say(`${has(n[me])} no move`, `${plays(n[1 - me])} again.`); renderHud();
    toast(`${has(n[me])} no move`, 1250); snd('pass');
    if (G.camp) Camp.passed(me);
    await sleep(1400);
    if (token !== G.token) return;
    playMove(S, PASS_MOVE); save();
    return turn(token);
  }
  if (seat.kind === 'human') {
    const people = G.seat.filter(s => s.kind === 'human').length;
    say(people === 1 ? 'Your move' : `${SIDE[me]} to move`, G.note || (S.history.length < 2 ? 'A star marks every square where a disc can go.' : ''));
    View.setInput({ side: me, legal, flips: s => flipsOf(S, s), pick: s => personMoves(s, token), miss: () => { snd('no'); say($('#status').textContent, 'A disc there would enclose nothing.'); } });
    renderHud();
    return;
  }
  View.setInput(null); say(`${seat.name} is thinking…`, G.note); renderHud();
  const t0 = performance.now(), a = await Bots.move(S, seat.bot, seat.level);
  if (token !== G.token) return;
  let m = a.move;
  if (m === undefined) {
    // on the kit's board a bot that breaks has lost, as it would have in the arena; the game's own bot is helped over the move
    if (KIT) { G.forfeit = { side: me, why: a.error }; say(`${seat.name} has lost`, `Its side forfeits: ${a.error}.`); snd('no'); renderHud(); save(); return; }
    m = legal[Math.floor(Math.random() * legal.length)];
  }
  const rest = (G.seat[1 - me].kind === 'bot' ? 450 : 700) - (performance.now() - t0);
  if (rest > 0) await sleep(rest);
  if (token !== G.token) return;
  const ev = playMove(S, m);
  G.note = `${seat.name} played ${sqName(m)} and turned ${ev.flips.length}.`;
  $('#sub').textContent = G.note;
  await View.show(ev);
  if (token !== G.token) return;
  if (G.camp) Camp.react(ev);
  save(); turn(token);
}
async function personMoves(s, token) {
  if (token !== G.token) return;
  View.setInput(null);
  const ev = playMove(G.S, s);
  if (!ev) return turn(token);
  G.note = ''; clearTimeout(G.armed); G.armed = 0; $('#sub').textContent = '';
  await View.show(ev);
  if (token !== G.token) return;
  if (G.camp) Camp.react(ev);
  save(); turn(token);
}
function finish() {
  const S = G.S, o = S.over, n = names(), [dark, light] = o.discs, people = G.seat.filter(s => s.kind === 'human').length;
  View.setInput(null);
  const why = o.why === 'swept' ? `${has(n[o.loser])} no disc left.` : o.why === 'blocked' ? 'Neither side can move.' : o.why === 'resign' ? 'The game was given up.' : 'The board is full.';
  if (o.winner < 0) { say(`A draw, ${dark} all`, why); snd('draw'); }
  else { say(o.why === 'resign' ? wins(n[o.winner]) : `${wins(n[o.winner])}, ${Math.max(dark, light)} to ${Math.min(dark, light)}`, why); snd(people === 1 && G.seat[o.winner].kind !== 'human' ? 'lose' : 'win'); View.cheer(o.winner + 1); }
  toast($('#status').textContent, G.camp ? 1250 : 2600);       // in the campaign a sheet follows, which says it again
  if (G.camp) Camp.finish();                                 // what the game did to the player's points, and what it opened
  renderHud(); save();
}
function undo() {
  if (G.screen !== 'play' || !canUndo()) return;
  const S = G.S;
  G.token++; Bots.dropAll('the move was taken back');
  for (;;) { const i = S.history.length - 1; if (i < 0) break; const m = undoMove(S); if (m !== PASS_MOVE && G.seat[i % 2].kind === 'human') break; }
  G.note = ''; clearTimeout(G.armed); G.armed = 0; $('#toast').classList.remove('on');
  View.setInput(null); View.set(S.b); snd('tick');
  save(); turn(G.token);
}

/* ── the rules, each with a small board ── */
function buildHelp() {
  if ($('#steps').childElementCount) return;
  const D = 1, L = 2, steps = [
    [4, 3, [[1, 1, L], [2, 1, D], [1, 2, D], [2, 2, L]], { stars: [[1, 0], [0, 1], [3, 2]] },
      '<b>Dark moves first.</b> On your turn you put one disc on the board, your side up. A star marks every square where it can go.'],
    [4, 3, [[0, 1, D], [1, 1, L], [2, 1, L]], { ghost: [3, 1, D], rings: [[1, 1], [2, 1]] },
      'A disc has to <b>enclose</b>: in a straight line from it come one or more of the other side’s discs, and then one of your own.'],
    [4, 3, [[0, 0, D], [2, 0, D], [1, 1, L], [2, 1, L], [3, 1, L]], { ghost: [2, 2, D], rings: [[1, 1], [2, 1]] },
      'Everything you enclose <b>turns over</b> and is yours: along the row, the column and both diagonals, all at once.'],
    [4, 3, [[0, 0, D], [1, 1, L], [3, 2, L]], { corner: true },
      '<b>No move?</b> Then you miss that turn and the other side goes again. With a move to make, you have to make one.'],
    [4, 3, [[0, 0, D], [1, 0, D], [2, 0, L], [3, 0, D], [0, 1, D], [1, 1, L], [2, 1, D], [3, 1, D], [0, 2, L], [1, 2, D], [2, 2, D], [3, 2, L]], {},
      'When <b>neither side can move</b> the game is over, and whoever has more discs showing their side has won.'],
    [4, 3, [[0, 0, D], [1, 0, L], [1, 1, L], [0, 1, L], [2, 1, D]], { corner: true },
      'A disc in a <b>corner</b> can never be enclosed, so it never turns back. Corners are worth waiting for.'],
  ];
  $('#steps').innerHTML = steps.map(s => `<div class="step"><canvas aria-hidden="true"></canvas><p>${s[4]}</p></div>`).join('');
  document.querySelectorAll('#steps canvas').forEach((c, i) => paintScene(c, c.clientWidth || 132, steps[i][0], steps[i][1], steps[i][2], steps[i][3]));
}
function openHelp() { $('#help').hidden = false; buildHelp(); $('[data-act=help-close]').focus({ preventScroll: true }); $('#help').scrollTop = 0; }
function closeHelp() { $('#help').hidden = true; }

/* ── wiring ── */
function renderSound() { const b = $('#sound'), say = SFX.on ? 'Sound on' : 'Sound off'; $('#sound-say').textContent = say; b.classList.toggle('off', !SFX.on); b.setAttribute('aria-pressed', SFX.on); b.setAttribute('aria-label', say); }
/** The sky is painted for the window as it is. A window that only grows or shrinks a little in height (a phone's
 *  address bar coming and going) keeps the sky it has, stretched: painting it again each time would stutter.
 *  scene: in the campaign, the place whose picture stands behind everything; '' for the game's own dusk. */
const Sky = { w: 0, h: 0, scene: '', paint(force) {
  const w = window.innerWidth, h = window.innerHeight;
  if (!force && w === this.w && Math.abs(h - this.h) < 140) return;
  this.w = w; this.h = h;
  const dpr = Math.min(2, window.devicePixelRatio || 1), place = KIT ? '' : this.scene;
  if (place) World.scene($('#sky'), place, w, h, dpr); else paintSky($('#sky'), w, h, dpr);
  // and over the paint, a handful of stars that twinkle, where the place has a night sky for them
  const rand = rngOf(7 + Math.round(w / 40)), n = place && !World.lookOf(place).stars ? 0 : Math.max(6, Math.round(w / 150)); let html = '';
  for (let i = 0; i < n; i++) html += `<i style="left:${((i + 0.15 + rand() * 0.7) / n * 100).toFixed(1)}%;top:${(3 + Math.pow(rand(), 1.4) * 44).toFixed(1)}%;--d:${(7 + rand() * 9).toFixed(1)}px;--t:${(3.2 + rand() * 4).toFixed(1)}s;--w:${(-rand() * 6).toFixed(1)}s"></i>`;
  $('#stars').innerHTML = html;
} };
function paintAll() {
  Sky.paint(); View.fit(); paintEmblem();
  if (G.screen === 'play') dialTo(G.S.count[0], G.S.count[1], true);
}
function wire() {
  document.addEventListener('click', ev => {
    if (!KIT && Camp.click(ev)) return;                      // the campaign's own screens answer for themselves
    const b = ev.target.closest('[data-act]');
    if (!b) { if (ev.target.id === 'help') closeHelp(); return; }
    const act = b.dataset.act, v = b.dataset.v;
    if (act === 'sound') { SFX.on = !SFX.on; renderSound(); snd('pick'); save(); return; }
    if (act === 'help') return openHelp();
    if (act === 'help-close') return closeHelp();
    if (act === 'vs') { G.cfg.vs = v; snd('pick'); renderSetup(); return save(); }
    if (act === 'level') { G.cfg.level = v; snd('pick'); renderSetup(); return save(); }
    if (act === 'side') { G.cfg.side = +v; snd('pick'); renderSetup(); return save(); }
    if (act === 'pick') { const p = $('#pick'); p.dataset.side = v; p.value = ''; return p.click(); }
    if (act === 'kit-level') { G.kit[+b.dataset.side].level = v; snd('pick'); return renderSetup(); }
    if (act === 'unseat') { Object.assign(G.kit[+v], { bot: '', info: null, level: '', file: '', error: '' }); Bots.drop('file' + v, 'the seat was given up'); return renderSetup(); }
    if (act === 'start' || act === 'again') { G.camp = null; return startGame(); }
    if (act === 'undo') return undo();
    if (act === 'new') {
      // one press too many should not cost a game that is under way
      if (G.S.history.length && !G.S.over && !G.forfeit && !G.armed) { G.armed = setTimeout(() => { G.armed = 0; if (G.screen === 'play') { renderHud(); if (!KIT) Camp.top(); } }, 3200); renderHud(); if (!KIT) Camp.top(); return; }
      clearTimeout(G.armed); return toSetup();
    }
  });
  $('#pick').addEventListener('change', ev => { const f = ev.target.files && ev.target.files[0]; if (f) takeFile(+ev.target.dataset.side, f); });
  document.addEventListener('keydown', ev => { if (ev.key !== 'Escape') return; if (!$('#help').hidden) closeHelp(); else if (!KIT) Camp.escape(); });
  let again = 0;
  window.addEventListener('resize', () => { clearTimeout(again); again = setTimeout(() => { paintAll(); if (!KIT) Camp.resized(); }, 140); });
}
async function boot() {
  const kept = Store.read();
  if (kept.sound === false) SFX.on = false;
  if (kept.cfg && !KIT) Object.assign(G.cfg, { vs: kept.cfg.vs === 'friend' ? 'friend' : 'bot', level: String(kept.cfg.level || ''), side: kept.cfg.side === LIGHT ? LIGHT : DARK });
  View.init(); wire(); renderSound();
  Sky.paint(true);
  try { await Promise.race([Promise.all([document.fonts.load('20px Marcellus'), document.fonts.load('500 16px Jost')]), sleep(1500)]); } catch (e) { /* the page's fallback faces will do */ }
  View.fit(); paintEmblem();
  if (!KIT) {
    const info = await Bots.info('house');
    G.house = info.levels || [];
    if (!G.house.includes(G.cfg.level)) G.cfg.level = G.house[Math.min(1, G.house.length - 1)] || '';
  }
  if (KIT) return toSetup();
  // a game with nothing at stake that was left under way comes first; else the campaign opens, on whoever played last
  const game = kept.game, fits = game && Array.isArray(game.moves) && Array.isArray(game.seat) && game.seat.length === 2
    && game.seat.every(s => s && (s.kind === 'human' || (s.kind === 'bot' && s.bot === 'house' && G.house.includes(s.level)))) && replay(game.moves) && !replay(game.moves).over;
  Camp.boot(fits ? game : null);
}
