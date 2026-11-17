/* ── The game itself: going from screen to screen, a match from the first move to the result, what is kept ── */
const setupFor = w => ({ game: w.game === 'total' ? 'total' : 'battles' });   // every table at Port Halcyon uses the standard line-up; the Commandant plays total war
const MIN_THINK = 700;                                        // she never answers faster than a hand could

/** w: who is across the table; side: the player's; moves: every move of the game so far (steps of a deployment and their
 *  COMMIT included); seen: how often each position has come up; marks: where in `moves` each of the player's turns began;
 *  snap: the position before a deployment the player has begun, to go back to. */
const G = { screen: 'title', w: null, rated: true, side: RED, S: null, moves: [], seen: {}, legal: [], sel: -1, grp: 0, byTo: null, choice: null, snap: null,
  busy: true, token: 0, marks: [], taken: [[], []], turns: 0, saidAt: -9, repeat: false, note: '', drag: null, talk: [], talkAt: 0, lines: [], cur: [] };

function show(screen, html) { G.screen = screen; document.body.dataset.screen = screen; $('#app').innerHTML = html; window.scrollTo(0, 0); }
function goTitle() { G.token++; show('title', screenTitle()); }
function goChart() { G.token++; show('chart', screenChart()); fitChart(); }
/** the chart's sheet takes the largest size that fits whole inside the frame; the sea around it is the frame's own */
function fitChart() {
  const c = $('.chart'); if (!c) return;
  for (const m of c.querySelectorAll('.map')) { const r = m.classList.contains('tall') ? CHART.tall.w / CHART.tall.h : CHART.wide.w / CHART.wide.h, w = Math.min(c.clientWidth, c.clientHeight * r); m.style.width = w + 'px'; m.style.height = w / r + 'px'; }
}
function goPlace(id) { G.token++; closeDialog(); show('place', screenPlace(placeById(id))); }
function goCards() { G.token++; show('cards', screenCards()); }
function goVersus(w, rated) {
  G.token++; closeDialog(); G.w = w; G.rated = rated;
  show('versus', screenVersus(w, rated));
  G.talk = SAVE.met[w.id] ? [pick(w.say.rematch)] : w.say.intro; G.talkAt = 0; SAVE.met[w.id] = true; keep();
  showTalk();
}
function showTalk() { $('#talk-text').textContent = G.talk[G.talkAt]; $('#talk-more').hidden = G.talkAt >= G.talk.length - 1; }

/* ── a match ── */
const canPlay = () => G.screen === 'match' && !G.busy && !G.S.over && G.S.turn === G.side;
const worth = (S, side) => { let v = 0; for (let p = 0; p < S.n; p++) if (S.at[p] >= 0 && S.own[p] === side) v += VALUE[S.kind[p]]; return v; };
/** plays a move without showing it (going back to a game that was kept) */
function quiet(m) {
  const S = G.S, mover = S.turn; if (mMode(m) !== COMMIT) G.cur.push(moveText(S, m));
  S.log = []; if (!play(S, m, true)) { S.log = null; return false; }
  if (S.dOrg < 0) { G.lines.push([mover, G.cur.join(' ')]); G.cur = []; }
  for (const ev of S.log) if (ev.dead) for (const p of ev.dead) G.taken[1 - S.own[p]].push(p);
  S.log = null; G.moves.push(m);
  if (S.dOrg < 0) { G.turns++; const k = posKey(S); G.seen[k] = (G.seen[k] || 0) + 1; }
  return true;
}
function startMatch(w, rated, side, resume) {
  G.token++; closeDialog();
  Object.assign(G, { w, rated, side, S: newGame(setupFor(w)), moves: [], seen: {}, legal: [], sel: -1, grp: 0, byTo: null, choice: null, snap: null, busy: true, marks: [], taken: [[], []], turns: 0, saidAt: -9, repeat: false, note: '', drag: null, lines: [], cur: [] });
  G.seen[posKey(G.S)] = 1;
  show('match', screenMatch(w, rated));
  buildBoard(side === BLUE);
  for (const m of resume || []) if (!quiet(m)) break;
  placeAll(G.S); wireBoard();
  const token = G.token;                                      // she opens the game with a line, and has one for a game that is picked up again
  setTimeout(() => { if (G.screen === 'match' && token === G.token && !G.S.over) { if (resume && resume.length) speak(pick(w.say.idle)); else speak(pick(w.say.start), true); } }, 500);
  nextTurn();
}
function saveMatch() { SAVE.match = { w: G.w.id, side: G.side, rated: G.rated, moves: G.moves.slice() }; keep(); }

/** whose turn it is, and what follows from that */
async function nextTurn() {
  const S = G.S, token = G.token;
  const st = S.over || (S.dOrg < 0 && G.repeat ? onPoints(S, 'repeat') : null) || status(S);
  if (st) return finish(st);
  if (S.turn === G.side) {
    G.legal = legalMoves(S); G.busy = false;
    if (S.dOrg < 0) { G.marks.push(G.moves.length); clearSel(); saveMatch(); } else select(S.dOrg);
    renderHud(); return;
  }
  G.busy = true; clearSel(); renderHud(); saveMatch();
  const t0 = performance.now();
  const moves = await Brain.turn(setupFor(G.w), G.moves, G.w.id, G.seen, (Math.random() * 1e9) | 0);
  if (token !== G.token) return;
  const rest = MIN_THINK - (performance.now() - t0); if (rest > 0) { await sleep(rest); if (token !== G.token) return; }
  for (const m of moves) if (!(await perform(m, token))) return;
  nextTurn();
}
/** plays move m and shows it; false if the game was left meanwhile */
async function perform(m, token) {
  const S = G.S, mover = S.turn, before = S.dOrg < 0 && mover === G.side ? clone(S) : null, n0 = G.moves.length, taken0 = before ? [G.taken[0].slice(), G.taken[1].slice()] : null;
  if (mMode(m) !== COMMIT) G.cur.push(moveText(S, m));
  S.log = []; if (!play(S, m, true)) { S.log = null; return false; }
  const log = S.log; S.log = null; G.moves.push(m); G.note = '';
  if (before && S.dOrg >= 0) G.snap = { S: before, n: n0, taken: taken0 };
  if (S.dOrg < 0 || S.over) { G.lines.push([mover, G.cur.join(' ')]); G.cur = []; }
  for (const ev of log) if (ev.dead) for (const p of ev.dead) G.taken[1 - S.own[p]].push(p);
  await showLog(S, log);
  if (token !== G.token) return false;
  if (S.dOrg < 0 || S.over) {
    G.snap = null; G.turns++;
    const k = posKey(S); G.seen[k] = (G.seen[k] || 0) + 1; if (G.seen[k] >= 3 && !S.over) G.repeat = true;
    react(log, mover);
  }
  return true;
}
async function humanMove(m) {
  if (!canPlay()) return;
  const token = G.token; G.busy = true; clearSel();
  if (await perform(m, token)) nextTurn();
}
/** back to before the deployment that is going on */
function cancelDeploy() {
  if (!G.snap || G.busy) return;
  G.S = G.snap.S; G.moves.length = G.snap.n; G.taken = G.snap.taken; G.snap = null; G.marks.pop(); G.cur = [];
  placeAll(G.S); trace(-1, -1); SFX.play('tick'); nextTurn();
}
/** sparring only: back to the start of the player's last turn */
function undo() {
  if (G.rated || G.screen !== 'match') return;
  let mark = -1; while (G.marks.length) { const x = G.marks.pop(); if (x < G.moves.length) { mark = x; break; } }
  if (mark < 0) return;
  SFX.play('tick'); startMatch(G.w, false, G.side, G.moves.slice(0, mark));
}
function finish(st) {
  const res = st.winner < 0 ? 0.5 : st.winner === G.side ? 1 : 0, w = G.w, line = pick(w.say[res === 1 ? 'lose' : res === 0 ? 'win' : 'draw']);
  G.busy = true; G.token++; clearSel(); renderHud(st); speak(line); SFX.play(res === 1 ? 'win' : res === 0 ? 'lose' : 'draw');
  const got = G.rated ? scoreGame(w, res) : null; if (!G.rated) { SAVE.match = null; keep(); }
  const token = G.token;
  setTimeout(() => { if (token !== G.token) return; openDialog(resultHTML(w, res, st, line, got), 'result'); if (got && got.newCards.length) SFX.play('card'); }, 1100);
}

/* ── what she says ── */
function speak(text, loud) {
  const b = $('#bubble'); if (!b) return;
  b.textContent = text; b.classList.remove('pop'); b.getBoundingClientRect(); b.classList.add('pop'); G.saidAt = G.turns;
  if (!loud || REDUCED) return;                               // the moments that matter: she leans across the board to say it
  const old = $('.cutin'); if (old) old.remove();
  const c = document.createElement('div'); c.className = 'cutin'; c.innerHTML = `${portrait(G.w)}<p><b>${first(G.w)}</b>${esc(text)}</p>`;
  $('.board-wrap').appendChild(c); setTimeout(() => c.remove(), 3000);
}
/** picks what the turn just played calls for, if anything: a threat to a Commander, an arm down to its last piece, then losses */
function react(log, mover) {
  const S = G.S, her = 1 - G.side, w = G.w; let key = '', pri = 0;
  const set = (k, p) => { if (p > pri) { key = k; pri = p; } };
  for (const ev of log) {
    if (ev.what === 'move' && ev.dead && ev.dead.length) {
      const plane = side => ev.dead.some(p => S.own[p] === side && S.kind[p] === AIR);
      if (ev.dead.some(p => S.own[p] === G.side)) set(plane(G.side) ? 'youLosePlane' : 'sheTakes', plane(G.side) ? 5 : 4);
      if (ev.dead.some(p => S.own[p] === her)) set(plane(her) ? 'sheLosesPlane' : 'youTake', plane(her) ? 5 : 4);
    }
    if (ev.what === 'hero' && S.own[ev.piece] === her) set('hero', 3);
  }
  if (S.over) return;
  if (mover === her && inCheck(S, G.side)) { set('check', 7); SFX.play('check'); }
  if (mover === G.side && inCheck(S, her)) set('checked', 7);
  if (!S.total) for (const side of [G.side, her]) {             // an arm that has just come down to its last piece: one more and the game is over
    const n = arms(S, side);
    for (const ev of log) if (ev.what === 'move' && ev.dead) for (const p of ev.dead) { const a = armOf(S.kind[p]); if (S.own[p] === side && a >= 0 && n[a] === 1) set(side === G.side ? 'lastYours' : 'lastHers', 8); }
  }
  if (!key && G.turns - G.saidAt > 7) { const d = worth(S, her) - worth(S, G.side); key = d > 600 ? 'ahead' : d < -600 ? 'behind' : Math.random() < 0.3 ? 'idle' : ''; }
  if (key && (pri >= 5 || G.turns - G.saidAt >= 3)) speak(pick(w.say[key]), pri >= 6);
}

/* ── beside the board ── */
const groupName = (S, ids) => ids.map(p => KIND_NAME[S.kind[p]]).join(' with ');
const ruleFor = k => { const r = RULE_PIECES.find(x => x[0] === k); return r[1] + (r[2] ? ' ' + r[2] : ''); };
/** the choices of who goes, from point s: one group of the stack's pieces for each */
function groupsAt(s) {
  const set = new Set(); for (const m of G.legal) if (mMode(m) !== COMMIT && mFrom(m) === s) set.add(mGroup(m));
  const bits = g => (g & 1) + ((g >> 1) & 1) + ((g >> 2) & 1);
  return [...set].sort((a, b) => bits(b) - bits(a) || a - b);
}
/** which arm of this side the other could finish off with its next move: 'sea', 'air', 'land' or '' */
function armThreat(S, side) {
  if (S.total) return '';
  const T = clone(S); T.turn = 1 - side;
  for (const m of gen(T, [])) {
    const mode = mMode(m); if (mode !== CAPTURE && mode !== STAY && mode !== SUICIDE) continue;
    const U = clone(T); if (play(U, m, true) && U.over && U.over.winner === 1 - side && U.over.why !== 'commander') return U.over.why;
  }
  return '';
}
/** what each side still has of the three arms a game of battles is fought over */
function armsHTML(S) {
  if (S.total) return '<p class="arms-note"><b>Total war.</b> Only the Commander counts.</p>';
  const row = (side, who) => {
    const n = arms(S, side);
    return `<div class="arm-row"><span class="arm-who">${who}</span>` + [[[NAVY], 'ships', 'ship'], [[AIR], 'planes', 'plane'], [[INFANTRY, TANK, ARTILLERY], 'on land', 'on land']].map(([kinds, many, one], a) =>
      (S.had[side][a] ? `<span class="arm${n[a] === 1 ? ' low' : ''}"><i>${kinds.map(k => pieceIcon(k, side, 20)).join('')}</i><b>${n[a]}</b><em>${n[a] === 1 ? one : many}</em></span>` : '<span></span>')).join('') + '</div>';
  };
  return row(1 - G.side, esc(first(G.w))) + row(G.side, 'You');
}
function renderHud(st) {
  const S = G.S, w = G.w, me = G.side, her = 1 - me, mine = S.turn === me, name = first(w);
  let text, sub = G.note;
  if (st || S.over) { const o = st || S.over; text = o.winner < 0 ? 'Drawn' : o.winner === me ? 'You win' : name + ' wins'; sub = ''; }
  else if (!mine) text = `${name} is thinking<span class="dots"></span>`;
  else if (S.dOrg >= 0) { text = 'Who else gets off?'; sub = sub || 'Move another piece from the stack, or press Done.'; }
  else { text = 'Your move'; if (!sub && inCheck(S, me)) sub = 'Your Commander is under attack.'; }
  if (!sub && mine && !S.over && !st && S.dOrg < 0) {
    const risk = armThreat(S, me);
    if (risk) sub = `Your last ${risk === 'sea' ? 'ship' : risk === 'air' ? 'plane' : 'piece of infantry, tanks and artillery'} can be taken. Lose it and the game is over.`;
    else if ((G.seen[posKey(S)] || 0) >= 2) sub = 'This position has come up twice. A third time ends the game on points.';
    else if (S.half >= 80) sub = `Nothing taken for ${S.half >> 1} turns each. At fifty the points decide.`;
  }
  if (!sub && G.turns < 2 && mine) sub = 'Tap a piece, then where it should go.';
  $('#status').innerHTML = text; $('#sub').textContent = sub; $('#arms').innerHTML = armsHTML(S);
  const tray = side => G.taken[side].map(p => pieceIcon(S.kind[p], S.own[p], 24)).join('');
  $('#tray-her').innerHTML = tray(her); $('#tray-me').innerHTML = tray(me);
  $('#her').classList.toggle('busy', !mine && !S.over && !st);
  $('#btns').innerHTML = G.rated ? '' : `<button type="button" class="btn ghost" data-act="undo"${G.marks.some(x => x < G.moves.length) || G.marks.length > 1 ? '' : ' disabled'}>Take a move back</button>`;
  // the moves so far, a line for each pair of turns
  let rows = '', i = 0; const L = G.lines;
  if (L.length && L[0][0] === BLUE) { rows += `<li><span></span><span>${L[0][1]}</span></li>`; i = 1; }
  for (; i < L.length; i += 2) rows += `<li><span>${L[i][1]}</span><span>${L[i + 1] ? L[i + 1][1] : ''}</span></li>`;
  const ol = $('#movelog'); ol.innerHTML = rows || '<li class="none">The moves will be written down here.</li>'; ol.parentNode.scrollTop = 1e6;
  renderOrders();
}
/** what is picked, and the choices that go with it */
function renderOrders() {
  const o = $('#orders'); if (!o) return;
  const S = G.S; let h = '';
  if (G.choice) {
    let lost = mMode(G.choice[0]) === SUICIDE ? 'Air defence covers that point: the plane takes it and is lost with it.' : mMode(G.choice[0]) === INTERCEPT ? 'There is air defence on the way: the plane is shot down before it gets there.' : '';
    if (lost) { const T = clone(S); if (play(T, G.choice[0], true) && T.over) lost += T.over.winner === G.side ? ' That wins the game.' : ' It is your last plane: that loses the game.'; }
    h += `<p class="ord-q">${lost || 'Take it how?'}</p><div class="ord-row">` + G.choice.map((m, i) => `<button type="button" class="btn" data-act="mode" data-i="${i}">${mMode(m) === STAY ? 'Fire from here' : mMode(m) === SUICIDE ? 'Strike anyway' : mMode(m) === INTERCEPT ? 'Fly anyway' : 'Move in'}</button>`).join('') + (lost ? '<button type="button" class="btn ghost" data-act="unpick">Leave it</button>' : '') + '</div>';
  } else if (G.sel >= 0 && canPlay()) {
    const M = members(S, G.sel), gs = groupsAt(G.sel);
    if (gs.length > 1) {
      h += '<p class="ord-q">Who goes?</p><div class="ord-row groups">' + gs.map(g => { const ids = M.filter((_, j) => (g >> j) & 1); return `<button type="button" class="grp" data-act="group" data-g="${g}" aria-pressed="${g === G.grp}" title="${groupName(S, ids)}">${ids.map(p => pieceIcon(S.kind[p], S.own[p], 30, !!S.hero[p])).join('')}</button>`; }).join('') + '</div>';
    } else h += `<p class="ord-name"><b>${groupName(S, M)}${S.hero[M[0]] ? ', a hero' : ''}.</b> ${ruleFor(S.kind[M[0]])}</p>`;
  }
  if (S.dOrg >= 0 && canPlay()) h += `<div class="ord-row"><button type="button" class="btn big" data-act="done"${G.legal.includes(COMMIT_MOVE) ? '' : ' disabled'}>Done</button><button type="button" class="btn ghost" data-act="cancel">Take it back</button></div>`;
  o.innerHTML = h;
}
function showSel() {
  const S = G.S, byTo = new Map(); let actor = -1;
  for (const m of G.legal) if (mMode(m) !== COMMIT && mFrom(m) === G.sel && mGroup(m) === G.grp) { const t = mTo(m); if (!byTo.has(t)) byTo.set(t, []); byTo.get(t).push(m); actor = mActor(m); }
  G.byTo = byTo; showTargets(S, G.sel, byTo);
  if (actor >= 0 && S.kind[actor] === AIR) showZones(S, 1 - G.side); else V.L.zones.replaceChildren();
  renderOrders();
}
function select(s, grp) { const gs = groupsAt(s); G.sel = s; G.choice = null; G.grp = grp !== undefined && gs.includes(grp) ? grp : gs[0]; showSel(); }
function clearSel() { G.sel = -1; G.choice = null; G.byTo = null; if (V.L.under) clearTargets(); renderOrders(); }
function hint(text) { G.note = text; const e = $('#sub'); if (e) e.textContent = text; }
function chooseTarget(to) {
  const list = G.byTo.get(to); if (!list) return;
  if (list.length === 1 && mMode(list[0]) !== INTERCEPT && mMode(list[0]) !== SUICIDE) return humanMove(list[0]);
  G.choice = list; setHot(to); renderOrders();                // two ways to take it, or a plane that will not come back: ask
}
/** A press on point s. Returns true when the piece there is now held (and may be dragged). */
function press(s) {
  if (!canPlay()) return false;
  const S = G.S;
  if (s < 0) { if (S.dOrg < 0) clearSel(); return false; }
  if (G.sel >= 0 && s !== G.sel && G.byTo && G.byTo.has(s)) { chooseTarget(s); return false; }
  if (S.dOrg >= 0) { if (s !== S.dOrg) { hint('Finish getting off first: press Done, or take it back.'); nudge(S.dOrg); } return s === S.dOrg; }
  const q = S.top[s];
  if (q >= 0 && S.own[q] !== G.side) { clearSel(); hint(`${first(G.w)}’s ${members(S, s).map(p => KIND_NAME[S.kind[p]]).join(' carrying ')}. ${ruleFor(S.kind[q])}`); return false; }   // what is that piece?
  if (q < 0) { clearSel(); return false; }
  if (!groupsAt(s).length) { clearSel(); hint(S.kind[q] === HQ ? 'A Headquarters does not move.' : inCheck(S, G.side) ? 'Your Commander is under attack: this piece cannot help.' : 'That piece has nowhere to go.'); nudge(s); return false; }
  if (G.sel !== s) { hint(''); select(s); SFX.play('pick'); }
  return true;
}

function wireBoard() {
  const board = $('#board');
  board.addEventListener('pointerdown', ev => {
    if (G.screen !== 'match' || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    SFX.init(); if (!canPlay()) return;
    if (G.drag) { if (!ev.isPrimary) return; G.drag = null; }
    ev.preventDefault();
    const s = pointAt(ev), was = G.sel === s;
    if (!press(s)) return;
    G.drag = { id: ev.pointerId, s, p0: boardPoint(ev), moved: false, was };
    try { board.setPointerCapture(ev.pointerId); } catch (e) { /* an older browser: the pointer simply is not held */ }
  });
  board.addEventListener('pointermove', ev => {
    const d = G.drag;
    if (!d) { if (ev.pointerType === 'mouse' && canPlay()) { const s = pointAt(ev), q = s >= 0 ? G.S.top[s] : -1; setHot(G.byTo && G.byTo.has(s) ? s : -1); board.classList.toggle('point', (G.byTo && G.byTo.has(s)) || (q >= 0 && G.S.own[q] === G.side)); } return; }
    if (ev.pointerId !== d.id) return;
    const p = boardPoint(ev);
    if (!d.moved && Math.hypot(p[0] - d.p0[0], p[1] - d.p0[1]) < 12) return;
    d.moved = true; const el = V.pcs.get(d.s); if (el) { el.classList.add('held'); V.L.pieces.appendChild(el); setAt(el, p); }
    const s = pointAt(ev); setHot(G.byTo && G.byTo.has(s) ? s : -1);
  });
  const drop = ev => {
    const d = G.drag; if (!d || ev.pointerId !== d.id) return;
    G.drag = null;
    const el = V.pcs.get(d.s); if (el) { el.classList.remove('held'); setAt(el, xy(d.s)); restack(); }
    if (!d.moved) { if (d.was && G.S.dOrg < 0 && !G.choice) clearSel(); return; }        // a second tap on the piece that is held lets it go
    setHot(-1);
    if (ev.type !== 'pointerup') return;
    const s = pointAt(ev);
    if (G.byTo && s !== d.s && G.byTo.has(s)) chooseTarget(s); else if (s >= 0 && s !== d.s) nudge(d.s);
  };
  board.addEventListener('pointerup', drop); board.addEventListener('pointercancel', drop);
  board.addEventListener('pointerleave', () => { if (!G.drag) { setHot(-1); board.classList.remove('point'); } });
}

function wire() {
  document.addEventListener('click', ev => {
    const act = ev.target.closest('[data-act]'); if (!act || act.disabled) return;
    const a = act.dataset.act, id = act.dataset.id;
    SFX.init();
    switch (a) {
      case 'title': goTitle(); break;
      case 'chart': goChart(); break;
      case 'place': goPlace(id); break;
      case 'cards': goCards(); break;
      case 'locked': openDialog(placeNote(placeById(id))); SFX.play('tick'); break;
      case 'challenge': goVersus(womanById(id), true); break;
      case 'spar': goVersus(womanById(id), false); break;
      case 'talk': if (G.talkAt < G.talk.length - 1) { G.talkAt++; showTalk(); SFX.play('tick'); } break;
      case 'side': SAVE.side = +act.dataset.val; keep(); for (const b of document.querySelectorAll('.side-pick')) b.setAttribute('aria-checked', String(+b.dataset.val === SAVE.side)); SFX.play('tick'); break;
      case 'begin': startMatch(G.w, G.rated, SAVE.side); break;
      case 'resume': { const m = SAVE.match, w = m && womanById(m.w); if (w) startMatch(w, m.rated, m.side, m.moves); else goChart(); break; }
      case 'mode': if (G.choice) humanMove(G.choice[+act.dataset.i]); break;
      case 'group': select(G.sel, +act.dataset.g); SFX.play('pick'); break;
      case 'unpick': if (G.sel >= 0) select(G.sel, G.grp); break;
      case 'done': humanMove(COMMIT_MOVE); break;
      case 'cancel': cancelDeploy(); break;
      case 'undo': undo(); break;
      case 'leave':
        if (G.S && !G.S.over && G.rated && G.moves.length) openDialog(`<h2 id="dlg-title">Resign?</h2><p>The game counts as lost: ${signed(pointsFor(SAVE.rating, G.w.rating, 0))} points.</p><div class="dlg-btns"><button type="button" class="btn big" data-act="close">Keep playing</button><button type="button" class="btn ghost" data-act="resign">Resign</button></div>`);
        else { SAVE.match = null; keep(); goPlace(G.w.place); }
        break;
      case 'resign': closeDialog(); finish({ winner: 1 - G.side, why: 'resign' }); break;
      case 'rules': openDialog(rulesHTML(), 'wide'); break;
      case 'close': closeDialog(); break;
      case 'sound': SFX.on = !SFX.on; SAVE.sound = SFX.on; keep(); for (const b of document.querySelectorAll('[data-act=sound]')) { b.textContent = SFX.on ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(SFX.on)); } SFX.play('tick'); break;
      case 'all': SAVE.all = act.checked; keep(); goChart(); break;
    }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { if (!$('#overlay').hidden && !$('#overlay .result')) closeDialog(); else if (G.screen === 'match' && canPlay() && G.S.dOrg < 0) clearSel(); }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.dataset && ev.target.dataset.act === 'talk') { ev.preventDefault(); ev.target.click(); }
  });
  $('#overlay').addEventListener('click', ev => { if (ev.target.id === 'overlay' && !$('#overlay .result')) closeDialog(); });
}

function boot() {
  loadSave(); SFX.on = SAVE.sound !== false;
  $('#defs').innerHTML = '<defs>' + DEFS + '</defs>';
  Brain.start(); wire(); goTitle(); window.addEventListener('resize', fitChart);
}
