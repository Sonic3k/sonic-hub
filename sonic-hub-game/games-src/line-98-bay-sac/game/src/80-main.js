/* ── the game itself: where the player is, the game being played there, and what a press does ── */
const backdropCv = $('backdrop'), airCv = $('ambient');
let here = null;                 // the place whose table is laid, once the player has gone in
let game = null;                 // the game being played there, as the rules keep it
let showing = Promise.resolve(), busy = false;      // what a move did is still being shown
let clockMs = 0, counted = 0, bestBefore = 0, cheered = false, litTold = false, toldCant = false, airThings = null, airSize = [0, 0], boardBox = null, changing = false;

/* ── keeping ── */
function save() {
  if (!here) return;
  const pk = placeKept(here.id);
  if (game && game.score > pk.best) pk.best = game.score;
  pk.game = game && !game.over ? { board: game.board, next: game.next, shown: game.shown, score: game.score, moves: game.moves, back: game.back, time: Math.round(clockMs / 1000), was: bestBefore } : null;
  keep();
}
const thaw = g => ({ board: g.board.slice(), next: g.next.map(b => ({ c: b.c, at: b.at })), shown: !!g.shown, score: g.score, moves: g.moves || 0, over: false,
  back: g.back ? { board: g.back.board.slice(), next: g.back.next.map(b => ({ c: b.c, at: b.at })), shown: !!g.back.shown, score: g.back.score || 0, moves: g.back.moves || 0 } : null });

/* ── a place's table ── */
function dress(P) {
  const d = P.dress, s = stageEl.style;
  s.setProperty('--p-ink', d.ink); s.setProperty('--p-soft', d.soft); s.setProperty('--p-panel', d.panel); s.setProperty('--p-edge', d.edge); s.setProperty('--p-accent', d.accent); s.setProperty('--p-num', d.num || d.ink);
  document.documentElement.style.setProperty('--hue', P.hue);
  stageEl.dataset.place = P.id;
  names();
}
function names() {
  if (!here) return;
  const no = here.no === 0 ? W().startStop : W().stop(here.no);
  $('place').textContent = tr(here.name); $('sd-name').textContent = tr(here.name); $('sd-tag').textContent = tr(here.tag); $('sd-no').textContent = no;
}
function paintBackdrop() {
  if (!here) return;
  const [c, w, h] = fit(backdropCv, Math.min(DPR(), 2));
  const br = $('boardbox').getBoundingClientRect(), sr = stageEl.getBoundingClientRect();
  boardBox = { x: br.left - sr.left, y: br.top - sr.top, w: br.width, h: br.height };
  c.clearRect(0, 0, w, h); c.save(); here.backdrop(c, w, h, boardBox); c.restore();
  const [, aw, ah] = fit(airCv, Math.min(DPR(), 1.5));
  if (here.air && (!airThings || airSize[0] !== aw || airSize[1] !== ah)) { airThings = here.air.make(aw, ah); airSize = [aw, ah]; }
  if (!here.air) { airThings = null; airCv.getContext('2d').clearRect(0, 0, airCv.width, airCv.height); }
}
function drawAir(t, dt) {
  if (!here || !here.air || !airThings) return;
  const d = Math.min(DPR(), 1.5), c = airCv.getContext('2d');
  c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, airSize[0], airSize[1]);
  here.air.draw(c, airThings, t, dt, airSize[0], airSize[1], boardBox);
}
function setTable() {
  table.set(here); table.lay(game); table.setCursor(-1);
  counted = game.score; cheered = game.score > bestBefore; litTold = bestBefore >= STARS[0] || game.score >= STARS[0];
  ui.set(game.score, bestBefore, !!here.lamps); ui.next(game.next, here); ui.clock(clockMs / 1000);
  buttons();
}
function buttons() { ui.backBtn.disabled = !game || !game.back || game.over || busy; }

/** lays the table of a place: the game that was left there, or a new one */
function lay(id) {
  here = placeById(id);
  const pk = placeKept(id);
  game = pk.game ? thaw(pk.game) : Lines.newGame(dice);
  clockMs = pk.game ? (pk.game.time || 0) * 1000 : 0;
  bestBefore = pk.game && pk.game.was >= 0 ? Math.min(pk.game.was, pk.best) : pk.best;       // the best there before this game began
  airThings = null; audio.place(here.voice);
  dress(here); paintBackdrop(); setTable(); save();
}
function fresh() {
  game = Lines.newGame(dice); clockMs = 0;
  table.lay(game, true);
  bestBefore = placeKept(here.id).best; counted = 0; cheered = false; litTold = bestBefore >= STARS[0];
  ui.set(0, bestBefore); ui.next(game.next, here); ui.clock(0); buttons(); save(); audio.open();
}

/* ── going in and coming out: the table opens out of the place on the map, and closes back into it ── */
function iris(opening, x, y) {
  if (STILL.matches || !stageEl.animate) return Promise.resolve();
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 24, a = `circle(0px at ${x}px ${y}px)`, b = `circle(${R}px at ${x}px ${y}px)`;
  stageEl.classList.add('iris');
  return stageEl.animate([{ clipPath: opening ? a : b }, { clipPath: opening ? b : a }], { duration: opening ? 780 : 620, easing: 'cubic-bezier(.66,0,.28,1)', fill: 'both' }).finished.then(a2 => { a2.cancel(); stageEl.classList.remove('iris'); }, () => {});
}
async function goIn(id) {
  if (changing) return;
  changing = true; audio.wake();
  const [x, y] = atlas.spot(id);
  stageEl.hidden = false; stageEl.style.clipPath = 'circle(0px at 0 0)';
  kept.at = id; lay(id);
  stageEl.style.clipPath = ''; audio.open();
  await iris(true, x, y);
  mapEl.hidden = true; changing = false;
}
async function goOut() {
  if (changing || !here) return;
  changing = true;
  await settle(); save();
  mapEl.hidden = false; atlas.layout(); atlas.refresh();
  const [x, y] = atlas.spot(here.id);
  await iris(false, x, y);
  stageEl.hidden = true; changing = false;
}

/* ── playing ── */
/** what is still being shown is shown at once: the player has gone on */
async function settle() { if (busy) { anim.hurry(); await showing; anim.calm(); } }
const hooks = {
  gain(points) {
    counted += points; ui.gain(points);
    ui.say(W().sayScore(points, counted));
    if (!litTold && here.colour != null && counted >= STARS[0]) { litTold = true; cheered = true; audio.best(); table.cheer(60); ui.toast(W().lit(tr(here.name)), 3200); }       // its colour is lit on the rainbow
    else if (!cheered && bestBefore > 0 && counted > bestBefore) { cheered = true; audio.best(); table.cheer(46); ui.toast(W().newBest + '!'); }
  },
  next(list) { ui.next(list, here); },
};
async function press(at) {
  audio.wake();
  if (!game || changing || ui.isOpen()) return;
  await settle();
  if (game.over) return;
  if (game.board[at] >= 0) {                       // a ball: it is the one to go (also when another was)
    table.pick(at); audio.pick(game.board[at]); ui.say(W().sayPicked(W().colours[game.board[at]]));
    return;
  }
  const from = table.picked();
  if (from < 0) return;
  const ev = Lines.move(game, from, at, dice);
  if (!ev) {                                        // a free square with no way to it
    table.jolt(from); table.no(at); audio.cant();
    if (!toldCant) { toldCant = true; ui.toast(W().cant); }
    return;
  }
  save(); busy = true; buttons(); table.point(-1);
  showing = table.show(ev, hooks).then(() => {
    busy = false;
    ui.set(game.score, bestBefore); counted = game.score;
    buttons(); save();
    if (game.over) end();
  });
}
function end() {
  const pk = placeKept(here.id), was = bestBefore, score = game.score, newBest = score > was;
  const lit = here.colour != null && was < STARS[0] && score >= STARS[0];
  if (score > pk.best) pk.best = score;
  pk.games++; pk.game = null; keep();
  table.pick(-1); table.rest();
  if (newBest && score > 0) audio.best(); else audio.over();
  setTimeout(() => { if (game && game.over && !stageEl.hidden && !changing && !ui.isOpen()) ui.over({ score, best: pk.best, newBest: newBest && score > 0, lit }, here); }, STILL.matches ? 50 : 900);
}
async function stepBack() {
  if (!game || game.over || changing) return;
  await settle();
  if (!Lines.stepBack(game, dice)) { ui.toast(W().noBack); return; }
  table.lay(game, true); counted = game.score;
  ui.set(game.score, bestBefore); ui.next(game.next, here); buttons(); save(); audio.tap();
}
async function askFresh() {
  if (!game || changing) return;
  await settle();
  if (!game.over && game.score > 0) ui.askNew(game.score, fresh); else fresh();
}

/* ── what is pressed ── */
table.on.press = press;
table.on.drop = at => { if (game && game.board[at] < 0) press(at); };
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  audio.wake();
  if (act === 'sound') { kept.sound = !kept.sound; keep(); ui.words(); if (kept.sound) audio.tap(); }
  else if (act === 'help') { audio.tap(); ui.help(here && !stageEl.hidden ? here : atlas.place()); }
  else if (act === 'menu') { audio.tap(); ui.menu(applySetting); }
  else if (act === 'close') ui.close();
  else if (act === 'play') goIn(atlas.place().id);
  else if (act === 'to-map') { ui.close(true); goOut(); }
  else if (act === 'again') { ui.close(true); fresh(); }
  else if (act === 'back') stepBack();
  else if (act === 'new') askFresh();
});
function applySetting(key) {
  if (key === 'lang') { ui.words(); names(); atlas.layout(); atlas.refresh(); if (here && game) ui.next(game.next, here); }
  else if (key === 'sound') ui.words();
  else if (key === 'marks') { table.repaint(); if (here && game) ui.next(game.next, here); atlas.layout(); }
  else if (key === 'show') { if (here && game) ui.next(game.next, here); }
}
document.addEventListener('keydown', e => {
  if (e.altKey || e.metaKey) return;
  const k = e.key;
  if (ui.isOpen()) { if (k === 'Escape') { ui.close(); e.preventDefault(); } return; }
  if (!mapEl.hidden && stageEl.hidden) { if (atlas.key(k)) e.preventDefault(); return; }
  if (!here || changing) return;
  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (arrows[k]) {
    let at = table.cursor(); if (at < 0) at = table.picked() >= 0 ? table.picked() : 40;
    else { const x = clamp(at % N + arrows[k][0], 0, N - 1), y = clamp(Math.floor(at / N) + arrows[k][1], 0, N - 1); at = y * N + x; }
    table.setCursor(at); $('boardbox').focus({ preventScroll: true });        // the keys are on the board now, whatever button was pressed last
    const c = game.board[at], r = Math.floor(at / N) + 1, col = at % N + 1;
    ui.say(c >= 0 ? W().sayBall(W().colours[c], r, col) : W().sayEmpty(r, col));
    e.preventDefault();
  } else if (k === 'Enter' || k === ' ') { if (e.target.closest && e.target.closest('button, a')) return; const at = table.cursor(); if (at >= 0) press(at); e.preventDefault(); }
  else if (k === 'Escape') { if (table.picked() >= 0) table.pick(-1); else goOut(); }
  else if (k === 'Backspace' || ((e.ctrlKey) && (k === 'z' || k === 'b')) || (!e.ctrlKey && (k === 'z' || k === 'u'))) { stepBack(); e.preventDefault(); }
  else if (!e.ctrlKey && k === 'n') askFresh();
  else if (!e.ctrlKey && k === 'm') goOut();
});

/* ── the frame: everything that moves, moved once ── */
let lastT = 0;
function frame(t) {
  const dt = Math.min(.05, Math.max(0, (t - lastT) / 1000)); lastT = t;
  anim.tick(t);
  if (!stageEl.hidden) {
    const still = STILL.matches;                 // for those who asked their machine for less movement: nothing sways, drifts or twinkles
    table.draw(still ? 0 : t, dt); drawAir(still ? 0 : t, still ? 0 : dt);
    if (game && !game.over && !ui.isOpen() && !changing) { clockMs += dt * 1000; ui.clock(clockMs / 1000); }
  }
  if (!mapEl.hidden) atlas.draw(STILL.matches ? 0 : t, STILL.matches ? 0 : dt);
  requestAnimationFrame(frame);
}
let resizeTimer = 0;
function relay() {
  if (!stageEl.hidden && here) { paintBackdrop(); table.layout(); if (game) ui.next(game.next, here); }
  if (!mapEl.hidden) atlas.layout();
}
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(relay, 90); });
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ── the start ── */
atlas.on.play = id => goIn(id);
ui.words();
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
  atlas.start(kept.at);
  requestAnimationFrame(frame);
});
/* for the scripts that take the game's pictures and try it out: nothing here is used by the page itself */
window.L98 = { kept, places: PLACES, state: () => ({ game, here: here && here.id, busy, onMap: !mapEl.hidden && stageEl.hidden }), press, goIn, goOut, settle, table, atlas, ui, anim,
  /** puts a game on the table as given (a board of 81, and optionally the three to come) */
  put(g) { game = thaw(Object.assign({ next: game.next, shown: true, score: 0, moves: 0, back: null }, g)); table.lay(game); ui.set(game.score, bestBefore); ui.next(game.next, here); counted = game.score; buttons(); save(); } };
