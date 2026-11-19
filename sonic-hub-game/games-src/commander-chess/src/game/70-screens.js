/* ── The screens: title, the chart of the coast, a place and its people, face to face, the table, the cards ── */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const first = w => w.name.split(' ')[0];
const SHELF = 'https://sonic-hub-game-production.up.railway.app/';   // the shelf this game stands on
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const soundBtn = () => `<button type="button" class="chip" data-act="sound" aria-pressed="${SFX.on}">${SFX.on ? 'Sound on' : 'Sound off'}</button>`;
const plate = () => `<span class="plate"><b>${myRank()}</b><i>${SAVE.rating}</i></span>`;
const listChip = () => `<button type="button" class="chip" data-act="list">${ordinal(listPlace())} on the List</button>`;
const cardsChip = () => `<button type="button" class="chip" data-act="cards">Cards ${cardCount()}/${WOMEN.length * 3}</button>`;
/** the strip along the top of the chart, a station, the List and the cards */
const bar = (back, act, title = '') => `<header class="bar"><button type="button" class="chip" data-act="${act}">‹ ${back}</button>${title ? `<span class="bar-title">${title}</span>` : ''}<span class="bar-sp"></span>${plate()}<span class="bar-br"></span>${listChip()}${cardsChip()}<button type="button" class="chip" data-act="rules">Rules</button>${soundBtn()}</header>`;

function screenTitle() {
  const played = Object.keys(SAVE.record).length > 0 || SAVE.match;
  return `<div class="title-art">${sceneHalcyon()}</div>
  <a class="chip home" href="${SHELF}">‹ Sonic Hub Game</a>
  <div class="title-box">
    <h1 class="logo" aria-label="Commander Chess"><span>Commander</span><span>Chess</span></h1>
    <p class="tag">The Grand Maneuvers</p>
    <div class="title-btns">
      <button type="button" class="btn big" data-act="${SAVE.match ? 'resume' : 'chart'}">${SAVE.match ? 'Back to your game' : played ? 'Continue the tour' : 'Report for duty'}</button>
      ${SAVE.match ? '<button type="button" class="btn" data-act="chart">The chart</button>' : ''}
      <button type="button" class="btn ghost" data-act="rules">How to play</button>
    </div>
    <p class="credit">The game is Cờ Tư Lệnh, by Nguyễn Quý Hải, played by his own rules.</p>
  </div>`;
}

/* what stands in each station's flag */
const INK_LINE = 'fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"';
const EMBLEM = {
  halcyon: `<circle cx="12" cy="5.200" r="2.200" fill="none" stroke="#fff" stroke-width="1.800"/><path d="M12 7.400V20.500M8 10.800H16M4.800 13.500Q5.200 20.300 12 20.500Q18.800 20.300 19.200 13.500" ${INK_LINE}/>`,
  kestrel: '<path d="M12 2.500L13.700 9.200L21.500 13.400V15.600L13.700 13.800L13.200 18.400L15.800 20.300V21.500L12 20.500L8.200 21.500V20.300L10.800 18.400L10.300 13.800L2.500 15.600V13.400L10.300 9.200Z" fill="#fff"/>',
  ironwood: '<path d="M12 2.500L16.800 9.400H14.600L19 15.800H13.400V21.500H10.600V15.800H5L9.400 9.400H7.200Z" fill="#fff"/>',
  lantern: '<path d="M9.300 21.500L10.400 10.500H13.600L14.700 21.500ZM9.800 9.500V6.300H14.200V9.500ZM9.300 5.600L12 2.500L14.700 5.600Z" fill="#fff"/><path d="M7.800 6.800L3.500 5.200M7.800 8.600L3.500 10.200M16.200 6.800L20.500 5.200M16.200 8.600L20.500 10.200" fill="none" stroke="#fff" stroke-width="1.600" stroke-linecap="round"/>',
  meridian: '<path d="M5.500 21.500V11.500H4.500V4.500H7.700V7.300H10.400V4.500H13.600V7.300H16.300V4.500H19.500V11.500H18.500V21.500H14V16.500A2 2 0 0 0 10 16.500V21.500Z" fill="#fff"/>',
  admiralty: '<path d="M12 2.800L14.250 9.400L21.200 9.500L15.650 13.700L17.700 20.400L12 16.400L6.300 20.400L8.350 13.700L2.800 9.500L9.750 9.400Z" fill="#fff"/>',
};
/** an upright phone gets the tall sheet */
const TALL = window.matchMedia('(max-width: 900px) and (orientation: portrait)');
/** a station's flag on the chart: its emblem on a medal that stands over the place, and beside it the name and who is
 *  there. On the wide sheet they are faces; on the tall one, where there is no room, a dot for each of them. */
function pin(p, i, tall) {
  const open = placeOpen(p), os = WOMEN.filter(w => w.place === p.id), [x, y] = Chart.at(i, tall), [W, H] = Chart.size(tall), left = tall ? x > W / 2 : p.pin === 'left';
  const who = tall ? `<span class="pin-dots">${os.map(w => `<i class="${open ? faceState(w) : 'shut'}"></i>`).join('')}</span>` : `<span class="pin-faces">${os.map(w => face(w, open ? faceState(w) : 'shut')).join('')}</span>`;
  return `<button type="button" class="pin${open ? ' open' : ''}${left ? ' left' : ''}" style="left:${(x / W * 100).toFixed(2)}%;top:${(y / H * 100).toFixed(2)}%" data-act="${open ? 'place' : 'locked'}" data-id="${p.id}" aria-label="${p.name}${open ? '' : ', opens at ' + p.open + ' points'}">` +
    `<i class="pin-medal"><svg viewBox="0 0 24 24" aria-hidden="true">${EMBLEM[p.id]}</svg></i><span class="pin-label"><b>${p.name}</b>${open ? '' : `<em>Opens at ${p.open} (${rankFor(p.open)})</em>`}${who}</span></button>`;
}
/** the chart as one sheet: the picture of the coast (put in by fillChart, once it is made), what is written and
 *  routed over it, and the stations' flags */
function chartSheet(tall) {
  const [W, H] = Chart.size(tall), [ox, oy, ow, oh] = Chart.over(tall), pc = (v, of) => (v / of * 100).toFixed(3) + '%';
  const route = Chart.legs(tall).map((d, i) => { const done = placeOpen(PLACES[i + 1]); return (done ? `<path class="route-under" d="${d}"/>` : '') + `<path class="route${done ? ' done' : ''}" d="${d}"/>`; }).join('');
  return `<div class="map ${tall ? 'tall' : 'wide'}"><img class="map-art" alt="" style="left:${pc(ox, W)};top:${pc(oy, H)};width:${pc(ow, W)};height:${pc(oh, H)}"><svg class="map-ink" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="map-text"></g>${route}</svg>${PLACES.map((p, i) => pin(p, i, tall)).join('')}</div>`;
}
/** what the logbook says of the next promotion */
function nextStep() {
  const n = nextRank(SAVE.peak); if (!n) return '';
  const p = PLACES.find(x => x.open === n[0]);
  return ` ${n[1]} at ${n[0]}${p ? ': ' + p.name + ' opens' : n[0] === 1700 ? ': the General and the Second Sea Lord sit down' : n[0] === 1900 ? ': the First Sea Lord sits down' : ''}.`;
}
function screenChart() {
  const tall = TALL.matches;
  return `${bar('Title', 'title')}
    <div class="chart-wrap"><div class="chart" data-tall="${tall ? 1 : 0}">${chartSheet(tall)}<i class="neat"></i></div>
      <div class="logbook"><h2>The Lumen coast</h2><p>Every spring the Grand Maneuvers go round the coast, table by table. Each promotion opens the next station.</p>
        <p class="log-line"><b>${SAVE.rating}</b> points${SAVE.peak > SAVE.rating ? ` (best ${SAVE.peak})` : ''}, ${ordinal(listPlace())} on the List.${nextStep()}</p>
        <label class="check"><input type="checkbox" data-act="all" ${SAVE.all ? 'checked' : ''}> Open everyone (for trying things out)</label></div>
    </div>`;
}
function placeNote(p) {
  return `<h2 id="dlg-title">${esc(p.name)}</h2><p class="dlg-sub">${esc(p.room)}</p><p>${esc(p.blurb)}</p><p class="dlg-when">Opens at ${p.open} points, which makes you a ${rankFor(p.open)}. Your best so far is ${SAVE.peak}.</p>
    <div class="dlg-btns"><button type="button" class="btn big" data-act="close">Back to the chart</button></div>`;
}
const ARMS = ['at sea', 'in the air', 'on land'];
/** an officer at her station: her picture, who she is, where she stands on the List, how she plays and how she won
 *  last season, and what a game with her is worth */
function dossier(w) {
  const open = isOpen(w), r = recordOf(w.id), won = cardsWon(w), loss = pointsFor(SAVE.rating, w.rating, 0);
  const wins = w.wins ? `<div class="d-wins"><div class="d-bar">${w.wins.map((v, i) => `<i class="a${i}" style="flex:${v} 0 0"></i>`).join('')}<i style="flex:${100 - w.wins[0] - w.wins[1] - w.wins[2]} 0 0"></i></div><p>Of her wins last season: ${w.wins.map((v, i) => [v, v + '% ' + ARMS[i]]).filter(x => x[0]).map(x => x[1]).join(', ')}.</p></div>`
    : '<div class="d-wins"><p>No wins last season.</p></div>';
  return `<article class="dossier${open ? '' : ' locked'}">
    <div class="d-pic">${portrait(w)}${isNew(w) ? '<span class="d-new">New at the table</span>' : ''}</div>
    <div class="d-body">
      <h3>${w.rank} ${esc(w.name)}</h3><p class="d-job">${esc(w.job)}</p>
      <p class="d-facts"><span class="lvl">${ordinal(w.list)} on the List</span><span class="rate">${w.rating}</span><span class="stars" aria-label="${won.filter(Boolean).length} of 3 cards">${won.map(v => (v ? '★' : '☆')).join('')}</span></p>
      <p class="d-style">${esc(w.style)}</p>${wins}
      ${open ? `<p class="d-rec">${r.w + r.l + r.d ? `Won ${r.w}, lost ${r.l}${r.d ? ', drew ' + r.d : ''}.` : 'Not played yet.'}${r.w ? '' : ` A first win pays ${FIRST} more.`}</p>
        <div class="d-acts"><button type="button" class="btn" data-act="challenge" data-id="${w.id}">Challenge <small>+${winWorth(w)} / ${loss ? '−' + -loss : '0'}</small></button><button type="button" class="btn ghost" data-act="spar" data-id="${w.id}">Spar</button></div>`
      : `<p class="d-needs">Sits down with you at ${Math.max(w.needs, placeById(w.place).open)} points. You have ${SAVE.rating}.</p>`}
    </div></article>`;
}
function screenPlace(p) {
  const os = WOMEN.filter(w => w.place === p.id);
  return `${bar('Chart', 'chart')}
    <div class="place-top">${scene(p.id)}<div class="place-name"><h2>${p.room}</h2><p>${p.name}</p></div></div>
    <div class="place-text"><p>${esc(p.blurb)}</p><p class="house">House rules: the standard line-up and a game of battles. A challenge counts for points and cards; sparring counts for nothing and lets you take moves back.</p></div>
    <div class="roster${os.length > 4 ? ' many' : ''}" style="--n:${os.length}">${os.map(dossier).join('')}</div>`;
}
/** The List: last season's table, with the player on it where their points put them */
function screenList() {
  const rows = WOMEN.map(w => ({ w, pts: w.rating })).concat([{ me: true, pts: SAVE.rating }]).sort((a, b) => b.pts - a.pts || (a.me ? 1 : -1));
  const won = WOMEN.reduce((n, w) => n + recordOf(w.id).w, 0), lost = WOMEN.reduce((n, w) => n + recordOf(w.id).l, 0);
  const row = (r, i) => (r.me
    ? `<li class="you"><span class="l-n">${i + 1}</span><span class="l-you">You</span><span class="l-who">${myRank()} on the round<small>You, this spring</small></span><span class="l-rec">won ${won}, lost ${lost}</span><span class="l-pts">${SAVE.rating}</span></li>`
    : `<li><span class="l-n">${i + 1}</span>${face(r.w, recordOf(r.w.id).w ? 'won' : 'open')}<span class="l-who">${r.w.rank} ${esc(r.w.name)}<small>${placeById(r.w.place).name}</small></span><span class="l-rec">won ${r.w.rec[0]}, lost ${r.w.rec[2]}${r.w.rec[1] ? ', drew ' + r.w.rec[1] : ''}</span><span class="l-pts">${r.w.rating}</span></li>`);
  const half = Math.ceil(rows.length / 2), col = (from, to) => `<ol start="${from + 1}">${rows.slice(from, to).map((r, k) => row(r, from + k)).join('')}</ol>`;
  return `${bar('Chart', 'chart')}
    <div class="list"><h2>The List</h2><p class="list-note">Last season every officer on the coast played every other, home and away. This is how they finished, and where your points put you among them now.</p>
      <div class="list-cols">${col(0, half)}${col(half, rows.length)}</div></div>`;
}

function screenVersus(w, rated) {
  const win = winWorth(w), first = recordOf(w.id).w ? 0 : FIRST, draw = pointsFor(SAVE.rating, w.rating, 0.5), loss = pointsFor(SAVE.rating, w.rating, 0);
  return `<div class="vs-art">${scene(w.place)}</div>
    <div class="vs">
      <div class="vs-her">${portrait(w, 'big')}<h2>${w.rank} ${esc(w.name)}</h2><p>${ordinal(w.list)} on the List, rated ${w.rating}</p></div>
      <div class="talk" data-act="talk" role="button" tabindex="0"><p id="talk-text"></p><span class="talk-more" id="talk-more">tap</span></div>
      <div class="vs-opts">
        <div class="sides" role="radiogroup" aria-label="Your side">
          <button type="button" role="radio" class="side-pick" data-act="side" data-val="0" aria-checked="${SAVE.side === 0}">${pieceIcon(COMMANDER, 0, 34)}<span><b>Red</b>moves first</span></button>
          <button type="button" role="radio" class="side-pick" data-act="side" data-val="1" aria-checked="${SAVE.side === 1}">${pieceIcon(COMMANDER, 1, 34)}<span><b>Blue</b>moves second</span></button>
        </div>
        <p class="stakes">${rated ? `Win ${signed(win)}${first ? `, ${first} of it for a first win` : ''}; draw ${signed(draw)}, lose ${signed(loss)} points.` : 'Sparring: no points, no cards, moves can be taken back.'}</p>
        <p class="format"><b>A game of battles.</b> Lose your Commander, your last ship, your last plane, or the last of your infantry, tanks and artillery, and it is over.</p>
        <div class="vs-btns"><button type="button" class="btn ghost" data-act="place" data-id="${w.place}">Not now</button><button type="button" class="btn big" data-act="begin">Sit down</button></div>
      </div>
    </div>`;
}

function screenMatch(w, rated) {
  return `<header class="bar"><button type="button" class="chip" data-act="leave">‹ ${rated ? 'Resign' : 'Leave'}</button><span class="bar-title">${placeById(w.place).room}${rated ? '' : ', sparring'}</span><span class="bar-sp"></span>
      <button type="button" class="chip" data-act="rules">Rules</button>${soundBtn()}</header>
    <main class="table">
      <section class="board-wrap"><svg id="board" role="img" aria-label="The board"></svg></section>
      <aside class="side">
        <div class="her" id="her">${portrait(w)}<div class="her-id"><b>${w.rank} ${esc(w.name)}</b><span>${ordinal(w.list)} on the List, ${w.rating}</span></div><div class="bubble" id="bubble" aria-live="polite"></div></div>
        <div class="tray" id="tray-her" data-empty="${first(w)} has taken nothing"></div>
        <div class="statusbox"><p class="status" id="status"></p><p class="sub" id="sub"></p></div>
        <div class="arms" id="arms"></div>
        <div class="orders" id="orders"></div>
        <div class="tray" id="tray-me" data-empty="You have taken nothing"></div>
        <div class="btns" id="btns"></div>
        <div class="logpanel"><ol id="movelog"></ol></div>
        <div class="me">${pieceIcon(COMMANDER, G.side, 34)}<span><b>You, ${myRank()}</b>${SIDE_NAME[G.side]}, ${rated ? SAVE.rating + ' points' : 'sparring'}</span></div>
      </aside>
    </main>`;
}

function screenCards() {
  return `${bar('Chart', 'chart', 'Cards')}
    <div class="album"><p class="album-note">Each of them has three cards: one for beating her, one for beating her three times, one for five. ${ART.base ? '' : 'The portraits are stand-ins until the real pictures are in.'}</p>
    ${PLACES.map(p => `<h2 class="album-place">${p.name}</h2><div class="album-rows">${WOMEN.filter(w => w.place === p.id).map(w => `<section class="album-row"><h3>${w.rank} ${esc(w.name)}</h3><div class="album-cards">${cardsWon(w).map((v, i) => cardArt(w, i, v)).join('')}</div></section>`).join('')}</div>`).join('')}</div>`;
}

/* ── the rules, as a leaflet ── */
const RULE_PIECES = [
  [COMMANDER, 'Any distance along a line, never through a piece. Takes one point away.', 'Lose it and the game is lost. Never slantwise.'],
  [INFANTRY, 'One point along a line.', ''], [ENGINEER, 'One point along a line.', 'Ferries a heavy piece across the river.'], [MILITIA, 'One point in any of the eight directions.', ''],
  [TANK, 'Up to two along a line.', 'Carries up to two riders, the Commander too.'], [ANTIAIR, 'One point along a line.', 'Guards the points next to it against planes.'],
  [ARTILLERY, 'Up to three, any direction.', 'Fires over anything in between.'], [MISSILE, 'Two along a line, one slantwise.', 'Fires straight. Guards two points round it against planes.'],
  [AIR, 'Up to four, any direction, over everything.', 'Cannot land on open sea. May strike without moving.'], [NAVY, 'Up to four, any direction, on sea and shore; no ship passes a ship.', 'Reaches three against anything but a ship. Shells the land from where it lies.'],
  [HQ, 'Does not move.', 'Shelters the Commander from small arms.'],
];
function rulesHTML() {
  return `<h2 id="dlg-title">How to play</h2>
  <div class="rules">
    <p><b>To win.</b> Take the other Commander, or leave the other side without a move. In a game of battles, which is what every table of the coast plays, three more things end it at once: a side has lost when its last ship is gone, or its last plane, or the last of its Infantry, Tanks and Artillery. A Commander left with nobody to command has lost as well.</p>
    <p><b>The board.</b> Pieces stand where the lines cross. The two files on the sea side are for ships only; the shore line and the river mouth take ships and land pieces alike. The river runs across the middle: Artillery, Anti-Air and Missiles cross it only at the two fords, unless an Engineer carries them or they cross by taking something on the far side.</p>
    <table class="rule-pieces">${RULE_PIECES.map(([k, mv, more]) => `<tr><td>${pieceIcon(k, 0, 38)}</td><th>${KIND_NAME[k]}</th><td>${mv} ${more}</td></tr>`).join('')}</table>
    <p><b>Taking.</b> A piece takes by moving onto its target. One that cannot stand where the target stands fires from its place instead: a land piece at a ship out at sea, a ship at the land behind the shore. A plane may choose between flying in and striking from where it is, unless the target is another plane. Only Artillery, planes and a ship’s guns reach over what stands in between; everything else fires straight and is stopped by the first piece in the way. A stack that is taken is lost whole.</p>
    <p><b>Air defence.</b> Anti-Air guards the four points next to it, a Missile the points within two of it, a ship the points next to it. A plane cannot land on a guarded point. It can take a piece that stands on one, and is lost with it. It cannot fly through a guard to reach something beyond: it is shot down on the way, and the marks on the board show which targets are like that.</p>
    <p><b>Riding.</b> Move onto a friend to ride on it; that is your move. A carrier takes two riders at the most. A Tank carries Commander, Infantry and Militia. A plane carries those and a Tank; a ship carries those, a Tank and planes; neither takes two Tanks. An Engineer takes Artillery, Anti-Air or a Missile on its back at the river bank, for the one move straight across. A Headquarters holds the Commander. When you pick a stack you choose who goes: all together, or some of them getting off. Several can leave in one turn, each taking as it goes, so a full stack can strike three ways at once; press Done when the turn is over.</p>
    <p><b>Heroes.</b> A piece that gives check becomes a hero for the rest of the game: it reaches one point further in every direction, slantwise too, and so does its air defence. A hero plane is a stealth plane, which no air defence touches. A side’s last piece becomes a hero as well.</p>
    <p><b>The Commander</b> may not stop on a point where it could be taken. The two Commanders may never face each other along an open line, so neither may cross the other’s line of sight; one that is riding in something, or sitting in a Headquarters, is hidden. In a Headquarters it is safe from Infantry, Militia, Anti-Air and Missiles: it takes an Engineer, a Tank, Artillery, a plane or a ship to break in.</p>
    <p><b>On points.</b> When fifty turns each have passed with nothing taken, or the same position comes up a third time, the game stops and the points decide: 10 for Infantry, Engineer, Militia or Anti-Air taken or a Headquarters broken, 20 for a Tank or Missile, 30 for Artillery, 40 for a plane, 80 for a ship, and ten more if it was a hero. Level points are a draw.</p>
    <p><b>Points and promotions.</b> A win is worth up to ${WIN_K} points, more the higher she is rated above you; a loss costs up to ${LOSS_K}. The first win against each officer pays ${FIRST} more. Your best points are your rank on the round: each promotion opens the next station, and an officer sits down with you once your points come within reach of her rating.</p>
    <p class="rules-src">These are Nguyễn Quý Hải’s rules as he set them out himself, down to the version he wrote for online play in 2017. He plays to a clock and counts the points when it runs out; here the fifty quiet turns stand in for the clock. He also has a longer game, total war, in which only the Commander counts; the coast does not play it.</p>
  </div>
  <button type="button" class="btn" data-act="close">Back</button>`;
}

/* ── boxes over the screen ── */
function openDialog(html, cls = '') { const o = $('#overlay'); o.innerHTML = `<div class="dlg ${cls}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${html}</div>`; o.hidden = false; o.scrollTop = 0; const b = o.querySelector('.btn.big, .btn'); if (b) b.focus({ preventScroll: true }); }
function closeDialog() { $('#overlay').hidden = true; $('#overlay').innerHTML = ''; }
/** how a game ended, in a line. res: 1 won, 0.5 drawn, 0 lost */
function whyText(st, res) {
  const won = res === 1;
  switch (st.why) {
    case 'commander': return won ? 'You took her Commander.' : 'She took your Commander.';
    case 'mate': return won ? 'Her Commander has nowhere left to go.' : 'Your Commander has nowhere left to go.';
    case 'stuck': return won ? 'She has no move left.' : 'You have no move left.';
    case 'sea': return won ? 'Her last ship is gone: the battle at sea is yours, and the game with it.' : 'Your last ship is gone: the battle at sea is hers, and the game with it.';
    case 'air': return won ? 'Her last plane is gone: the battle in the air is yours, and the game with it.' : 'Your last plane is gone: the battle in the air is hers, and the game with it.';
    case 'alone': return won ? 'Her Commander has nobody left to command.' : 'Your Commander has nobody left to command.';
    case 'land': return won ? 'Her infantry, tanks and artillery are all gone: the battle on land is yours, and the game with it.' : 'Your infantry, tanks and artillery are all gone: the battle on land is hers, and the game with it.';
    case 'resign': return 'You resigned.';
    case 'points': return `${st.cause === 'repeat' ? 'The same position three times' : 'Fifty turns each with nothing taken'}. On points: you ${st.pts[G.side]}, ${first(G.w)} ${st.pts[1 - G.side]}.`;
  }
  return '';
}
/** the end of a game. res: 1 won, 0.5 drawn, 0 lost; st: how it ended; got: what scoreGame returned (rated games only) */
function resultHTML(w, res, st, line, got) {
  const head = res === 1 ? 'Victory' : res === 0 ? 'Defeat' : 'Drawn';
  let h = `<h2 id="dlg-title" class="res-head r${res * 2}">${head}</h2><p class="res-why">${whyText(st, res)}</p>
    <div class="res-her">${portrait(w)}<p>“${esc(line)}”</p></div>`;
  if (got) {
    h += `<p class="res-points"><span>${got.before}</span><b class="${got.delta > 0 ? 'up' : got.delta < 0 ? 'down' : 'flat'}">${signed(got.delta)}</b><span>${got.after} points</span></p>`;
    if (got.first) h += `<p class="res-note">${got.first} of it for a first win against her.</p>`;
    if (got.newCards.length) h += `<div class="res-cards">${got.newCards.map(i => cardArt(w, i, true)).join('')}</div><p class="res-note">${got.newCards.length > 1 ? 'New cards' : 'A new card'} for your collection.</p>`;
    if (w.id === 'vasilisa' && got.first) h += '<p class="res-note res-rank">The First Sea Lord has lost her second game. The round is yours.</p>';
    if (got.promoted) h += `<p class="res-note res-rank">Promoted: ${got.promoted}.</p>`;
    for (const p of got.newPlaces) h += `<p class="res-note">${p.name} is open to you.</p>`;
    for (const x of got.newWomen) h += `<p class="res-note">${x.rank} ${esc(x.name)} will sit down with you now, at ${placeById(x.place).name}.</p>`;
  } else h += '<p class="res-note">Sparring: nothing changes.</p>';
  return h + `<div class="dlg-btns"><button type="button" class="btn ghost" data-act="place" data-id="${w.place}">Back to ${placeById(w.place).name}</button><button type="button" class="btn big" data-act="${got ? 'challenge' : 'spar'}" data-id="${w.id}">Play her again</button></div>`;
}
