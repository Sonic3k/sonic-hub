/* ── The screens: title, the chart of the coast, a place and its people, face to face, the table, the cards ── */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const first = w => w.name.split(' ')[0];
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const soundBtn = () => `<button type="button" class="chip" data-act="sound" aria-pressed="${SFX.on}">${SFX.on ? 'Sound on' : 'Sound off'}</button>`;
const plate = () => `<span class="plate"><b>${rankFor(SAVE.rating)}</b><i>${SAVE.rating}</i></span>`;

function screenTitle() {
  const played = Object.keys(SAVE.record).length > 0 || SAVE.match;
  return `<div class="title-art">${sceneHalcyon()}</div>
  <div class="title-box">
    <h1 class="logo" aria-label="Commander Chess"><span>Commander</span><span>Chess</span></h1>
    <p class="tag">The Grand Maneuvers</p>
    <div class="title-btns">
      <button type="button" class="btn big" data-act="${SAVE.match ? 'resume' : 'chart'}">${SAVE.match ? 'Back to your game' : played ? 'Continue the tour' : 'Report for duty'}</button>
      ${SAVE.match ? '<button type="button" class="btn" data-act="chart">The chart</button>' : ''}
      <button type="button" class="btn ghost" data-act="rules">How to play</button>
    </div>
    <p class="credit">The game is Cờ Tư Lệnh, by Nguyễn Quý Hải, played by the rules of cotulenh.vn.</p>
  </div>`;
}

/** the chart as one sheet with its flags: wide for a desk, tall for an upright phone (both are drawn, the page shows the one that fits) */
function chartSheet(tall) {
  const c = tall ? CHART.tall : CHART.wide, pts = PLACES.map((p, i) => chartPoint(i, tall));
  let route = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], q = tall ? [(a[0] + b[0]) / 2 + (i % 2 ? -44 : 44), (a[1] + b[1]) / 2 + 34] : [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 60];
    route += `<path class="route${placeOpen(PLACES[i + 1]) ? ' done' : ''}" d="M${a[0]} ${a[1]}Q${q[0]} ${q[1]} ${b[0]} ${b[1]}"/>`;
  }
  const pins = PLACES.map((p, i) => {
    const open = placeOpen(p), x = pts[i][0] / c.w, y = pts[i][1] / c.h, left = x > (tall ? 0.5 : 0.75);
    return `<button type="button" class="pin${open ? ' open' : ''}${left ? ' left' : ''}" style="left:${(x * 100).toFixed(2)}%;top:${(y * 100).toFixed(2)}%" data-act="${open ? 'place' : 'locked'}" data-id="${p.id}"><i>${i + 1}</i><span><b>${p.name}</b><em>${open ? p.room : !p.built && SAVE.peak >= p.open ? 'Being charted' : `Opens at ${p.open}`}</em></span></button>`;
  }).join('');
  return `<div class="map ${tall ? 'tall' : 'wide'}"><svg viewBox="0 0 ${c.w} ${c.h}" aria-hidden="true">${chartArt(tall)}${route}</svg>${pins}</div>`;
}
function screenChart() {
  const won = WOMEN.reduce((n, w) => n + recordOf(w.id).w, 0), lost = WOMEN.reduce((n, w) => n + recordOf(w.id).l, 0);
  return `<header class="bar"><button type="button" class="chip" data-act="title">‹ Title</button><span class="bar-sp"></span>${plate()}
      <button type="button" class="chip" data-act="cards">Cards ${cardCount()}/${WOMEN.length * 3}</button><button type="button" class="chip" data-act="rules">Rules</button>${soundBtn()}</header>
    <div class="chart-wrap"><div class="chart">${chartSheet(false)}${chartSheet(true)}</div>
      <div class="logbook"><h2>The Lumen coast</h2><p>Five garrisons, each with its own table and its own way of playing. Points open the way: beat people rated above you and they come quickly.</p>
        <p class="log-line"><b>${SAVE.rating}</b> points, best ${SAVE.peak}. Won ${won}, lost ${lost}.</p>
        <label class="check"><input type="checkbox" data-act="all" ${SAVE.all ? 'checked' : ''}> Open everyone (for trying things out)</label></div>
    </div>`;
}
/** what is known of a place that cannot be entered yet */
function placeNote(p) {
  const when = p.built ? `Opens at ${p.open} points. You have ${SAVE.rating}.` : SAVE.peak >= p.open ? 'You have the points. Its table is still being built.' : `Opens at ${p.open} points; you have ${SAVE.rating}. Its table is still being built.`;
  return `<h2 id="dlg-title">${esc(p.name)}</h2><p class="dlg-sub">${esc(p.room)}</p><p>${esc(p.blurb)}</p><p class="dlg-house"><span>House rules</span>${esc(p.house)}</p><p class="dlg-when">${when}</p>
    <div class="dlg-btns"><button type="button" class="btn big" data-act="close">Back to the chart</button></div>`;
}

function dossier(w) {
  const open = isOpen(w), r = recordOf(w.id), won = cardsWon(w), win = pointsFor(SAVE.rating, w.rating, 1), loss = pointsFor(SAVE.rating, w.rating, 0);
  return `<article class="dossier${open ? '' : ' locked'}">
    ${portrait(w)}
    <div class="d-body">
      <h3>${w.rank} ${esc(w.name)}</h3><p class="d-job">${esc(w.job)}</p>
      <p class="d-facts"><span class="lvl">${w.level}</span><span class="rate">${w.rating}</span><span class="stars" aria-label="${won.filter(Boolean).length} of 3 cards">${won.map(v => (v ? '★' : '☆')).join('')}</span></p>
      <p class="d-style">${esc(w.style)}</p>
      ${open ? `<p class="d-rec">${r.w + r.l + r.d ? `Won ${r.w}, lost ${r.l}${r.d ? ', drew ' + r.d : ''}` : 'Not played yet'}</p>
        <div class="d-acts"><button type="button" class="btn" data-act="challenge" data-id="${w.id}">Challenge <small>${signed(win)} / ${signed(loss)}</small></button><button type="button" class="btn ghost" data-act="spar" data-id="${w.id}">Spar</button></div>`
      : `<p class="d-needs">Sits down with you at ${w.needs} points. You have ${SAVE.rating}.</p>`}
    </div></article>`;
}
function screenPlace(p) {
  return `<header class="bar"><button type="button" class="chip" data-act="chart">‹ Chart</button><span class="bar-sp"></span>${plate()}<button type="button" class="chip" data-act="cards">Cards</button><button type="button" class="chip" data-act="rules">Rules</button>${soundBtn()}</header>
    <div class="place-top">${sceneHalcyon()}<div class="place-name"><h2>${p.room}</h2><p>${p.name}</p></div></div>
    <div class="place-text"><p>${esc(p.blurb)}</p><p class="house">House rules: ${esc(p.house)} A challenge counts for points and cards; sparring counts for nothing and lets you take moves back.</p></div>
    <div class="roster">${WOMEN.filter(w => w.place === p.id).map(dossier).join('')}</div>`;
}

function screenVersus(w, rated) {
  const win = pointsFor(SAVE.rating, w.rating, 1), draw = pointsFor(SAVE.rating, w.rating, 0.5), loss = pointsFor(SAVE.rating, w.rating, 0);
  return `<div class="vs-art">${sceneHalcyon()}</div>
    <div class="vs">
      <div class="vs-her">${portrait(w, 'big')}<h2>${w.rank} ${esc(w.name)}</h2><p>${w.level}, rated ${w.rating}</p></div>
      <div class="talk" data-act="talk" role="button" tabindex="0"><p id="talk-text"></p><span class="talk-more" id="talk-more">tap</span></div>
      <div class="vs-opts">
        <div class="sides" role="radiogroup" aria-label="Your side">
          <button type="button" role="radio" class="side-pick" data-act="side" data-val="0" aria-checked="${SAVE.side === 0}">${pieceIcon(COMMANDER, 0, 34)}<span><b>Red</b>moves first</span></button>
          <button type="button" role="radio" class="side-pick" data-act="side" data-val="1" aria-checked="${SAVE.side === 1}">${pieceIcon(COMMANDER, 1, 34)}<span><b>Blue</b>moves second</span></button>
        </div>
        <p class="stakes">${rated ? `Win ${signed(win)}, draw ${signed(draw)}, lose ${signed(loss)} points.` : 'Sparring: no points, no cards, moves can be taken back.'}</p>
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
        <div class="her" id="her">${portrait(w)}<div class="her-id"><b>${w.rank} ${esc(w.name)}</b><span>${w.level}, ${w.rating}</span></div><div class="bubble" id="bubble" aria-live="polite"></div></div>
        <div class="tray" id="tray-her" data-empty="${first(w)} has taken nothing"></div>
        <div class="statusbox"><p class="status" id="status"></p><p class="sub" id="sub"></p></div>
        <div class="orders" id="orders"></div>
        <div class="tray" id="tray-me" data-empty="You have taken nothing"></div>
        <div class="btns" id="btns"></div>
        <div class="logpanel"><ol id="movelog"></ol></div>
        <div class="me">${pieceIcon(COMMANDER, G.side, 34)}<span><b>You, ${rankFor(SAVE.rating)}</b>${SIDE_NAME[G.side]}, ${rated ? SAVE.rating + ' points' : 'sparring'}</span></div>
      </aside>
    </main>`;
}

function screenCards() {
  return `<header class="bar"><button type="button" class="chip" data-act="chart">‹ Chart</button><span class="bar-title">Cards</span><span class="bar-sp"></span>${plate()}${soundBtn()}</header>
    <div class="album"><p class="album-note">Each of them has three cards: one for beating her, one for beating her three times, one for five. ${ART.base ? '' : 'The portraits are stand-ins until the real pictures are in.'}</p>
    <div class="album-rows">${WOMEN.map(w => `<section class="album-row"><h3>${w.rank} ${esc(w.name)} <span>${placeById(w.place).name}</span></h3><div class="album-cards">${cardsWon(w).map((v, i) => cardArt(w, i, v)).join('')}</div></section>`).join('')}</div></div>`;
}

/* ── the rules, as a leaflet ── */
const RULE_PIECES = [
  [COMMANDER, 'Any distance along a line, never through a piece. Takes one point away.', 'Lose it and the game is lost. Never slantwise.'],
  [INFANTRY, 'One point along a line.', ''], [ENGINEER, 'One point along a line.', 'Ferries a heavy piece across the river.'], [MILITIA, 'One point in any of the eight directions.', ''],
  [TANK, 'Up to two along a line.', 'Carries two foot soldiers.'], [ANTIAIR, 'One point along a line.', 'Guards the points next to it against planes.'],
  [ARTILLERY, 'Up to three, any direction.', 'Fires over pieces in between, but not over a Headquarters.'], [MISSILE, 'Two along a line, one slantwise.', 'Fires over anything. Guards two points round it against planes.'],
  [AIR, 'Up to four, any direction, over everything.', 'Cannot land on open sea. May strike without moving.'], [NAVY, 'Up to four, any direction, on sea and shore.', 'Reaches three against anything but a ship. Shells the land from where it lies.'],
  [HQ, 'Does not move.', 'Shelters the Commander. Its point is worth the game.'],
];
function rulesHTML() {
  return `<h2 id="dlg-title">How to play</h2>
  <div class="rules">
    <p><b>To win</b> take the other Commander, or leave it under attack with no move, or stand on one of the other side’s two Headquarters points at the end of three of your turns in a row.</p>
    <p><b>The board.</b> Pieces stand where the lines cross. The two files on the sea side are for ships only; the shore line and the river mouth take ships and land pieces alike. The river runs across the middle: Artillery, Anti-Air and Missiles cross it only over the two bridges, unless an Engineer carries them or they cross by taking something on the far side.</p>
    <table class="rule-pieces">${RULE_PIECES.map(([k, mv, more]) => `<tr><td>${pieceIcon(k, 0, 38)}</td><th>${KIND_NAME[k]}</th><td>${mv} ${more}</td></tr>`).join('')}</table>
    <p><b>Taking.</b> A piece takes by moving onto its target. One that cannot stand where the target stands fires from its place instead: a Tank at a ship out at sea, a ship at the land. A plane may choose between flying in and striking from where it is.</p>
    <p><b>Air defence.</b> A plane cannot land on a guarded point. It can take a piece that stands on one, and is lost with it. It cannot fly through a guard to reach something beyond: it is shot down on the way, and the marks on the board show which targets are like that. When a gun moves up beside a plane, the plane has one move to get out; if it is still there, it is shot down, and that costs the gunner no move.</p>
    <p><b>Riding.</b> Move onto a friend to ride on it. A Tank carries two of Infantry and Militia. A plane carries a Tank, and one of Commander, Infantry, Militia. A ship carries a plane, and one of Commander, Infantry, Militia, Tank. An Engineer carries one of Artillery, Anti-Air, Missile, along the river banks only. A Headquarters holds the Commander. When you pick a stack you choose who goes: all together, or some of them getting off. Several can leave in one turn; press Done when the turn is over.</p>
    <p><b>Heroes.</b> A piece that threatens the Commander becomes a hero for the rest of the game and reaches one point further in every direction, slantwise too. A side’s last piece becomes a hero as well.</p>
    <p><b>The Commanders</b> may never face each other along an open line. One that is riding in something is hidden; from in there it can still strike the other Commander down an open line, so do not stand in one.</p>
    <p><b>A draw:</b> no move left while not under attack; a hundred turns with nothing taken, joined or promoted; the same position three times.</p>
  </div>
  <button type="button" class="btn" data-act="close">Back</button>`;
}

/* ── boxes over the screen ── */
function openDialog(html, cls = '') { const o = $('#overlay'); o.innerHTML = `<div class="dlg ${cls}" role="dialog" aria-modal="true" aria-labelledby="dlg-title">${html}</div>`; o.hidden = false; o.scrollTop = 0; const b = o.querySelector('.btn.big, .btn'); if (b) b.focus({ preventScroll: true }); }
function closeDialog() { $('#overlay').hidden = true; $('#overlay').innerHTML = ''; }
const WHY = {
  commander: ['You took her Commander.', 'She took your Commander.'], mate: ['Her Commander has nowhere left to go.', 'Your Commander has nowhere left to go.'],
  hq: ['You held her Headquarters for three turns.', 'She held your Headquarters for three turns.'], resign: ['', 'You resigned.'],
  stalemate: ['No move left, and nobody under attack.'], fifty: ['A hundred turns with nothing taken.'], repeat: ['The same position three times.'],
};
/** the end of a game. res: 1 won, 0.5 drawn, 0 lost; got: what scoreGame returned (rated games only) */
function resultHTML(w, res, why, line, got) {
  const head = res === 1 ? 'Victory' : res === 0 ? 'Defeat' : 'Drawn';
  let h = `<h2 id="dlg-title" class="res-head r${res * 2}">${head}</h2><p class="res-why">${(WHY[why] || [''])[res === 0 ? 1 : 0] || ''}</p>
    <div class="res-her">${portrait(w)}<p>“${esc(line)}”</p></div>`;
  if (got) {
    h += `<p class="res-points"><span>${got.before}</span><b class="${got.delta > 0 ? 'up' : got.delta < 0 ? 'down' : 'flat'}">${signed(got.delta)}</b><span>${got.after} points</span></p>`;
    if (got.newCards.length) h += `<div class="res-cards">${got.newCards.map(i => cardArt(w, i, true)).join('')}</div><p class="res-note">${got.newCards.length > 1 ? 'New cards' : 'A new card'} for your collection.</p>`;
    for (const x of got.newWomen) h += `<p class="res-note">${x.rank} ${esc(x.name)} will play you now.</p>`;
    for (const p of got.newPlaces) h += `<p class="res-note">${p.name} is on the chart${p.built ? '' : ', though its table is not ready yet'}.</p>`;
  } else h += '<p class="res-note">Sparring: nothing changes.</p>';
  return h + `<div class="dlg-btns"><button type="button" class="btn ghost" data-act="place" data-id="${w.place}">Back to the mess</button><button type="button" class="btn big" data-act="${got ? 'challenge' : 'spar'}" data-id="${w.id}">Play her again</button></div>`;
}
