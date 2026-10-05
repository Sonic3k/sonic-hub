/* ── UI: the war table. Map on the left, orders on the right, the chronicle after each reveal ── */
const UI = { sel: 'c0', mode: null, capTab: 'train', pick: { civ: 'daiviet', foe: 'random', diff: 1 }, confirm: null };
let META = null, S = null;
const $ = s => document.querySelector(s);
const ME = 0, FOE = 1;
const civOf = i => CIVS[S.sides[i].civ];
const rname = r => REGIONS[r].kind === 'capital' ? civOf(r === 'c0' ? 0 : 1).capital : REGIONS[r].name + (REGIONS[r].side === 1 ? ' địch' : '');
const unitName = t => UNITS[t].name;
const stackText = st => UNIT_ORDER.filter(t => st[t] > 0).map(t => `${st[t]} ${unitName(t).toLowerCase()}`).join(', ') || 'không ai';
const costHTML = c => RES.filter(r => c[r]).map(r => `<span class="cost">${RES_ICON[r]}${c[r]}</span>`).join('');
function incomeOf(i) {
  const P = S.sides[i], M = modsOf(S, i), g = { food: 0, wood: 0, gold: 0 };
  for (const j in P.jobs) { const J = JOBS[j]; let v = P.jobs[j] * GATHER[J.res] * (1 + M.gather[J.res]); if (J.reserve != null) v = Math.min(v, P.goldLeft[j] || 0); g[J.res] += v; }
  if (M.soldierFarm) for (const r of homeOf(i)) g.food += total(P.army[r] || {}) * M.soldierFarm;
  if (S.owner.m === i && total(P.army.m || {})) g.gold += 12;
  for (const r of RES) g[r] = Math.round(g[r]);
  return g;
}

/* ── shell ── */
function render() {
  if (!S) { renderTitle(); return; }
  document.body.className = 'in-game';
  $('#app').innerHTML = `${topbarHTML()}${hudHTML()}
    <div class="table" style="--c0:${civOf(ME).color};--c1:${civOf(FOE).color}">
      <div class="mapwrap">${mapSVG()}${legendHTML()}</div>
      <aside class="panel" aria-label="Mệnh lệnh">${panelHTML()}</aside>
    </div>
    <div class="sealbar"><button class="seal" data-a="commit">${S.over ? 'Ván đã kết thúc' : 'Lật bài'}<small>${S.over ? '' : 'hai bên cùng ra lệnh'}</small></button></div>`;
}
function topbarHTML() {
  return `<div class="topbar"><a class="home" href="index.html">‹ Sonic Hub Pages</a><span class="game">Lên Đời</span><span class="sp"></span>
    ${S ? '<button class="tbtn" data-a="help">Cách chơi</button><button class="tbtn" data-a="home">Lưu và thoát</button>' : ''}
    <button class="tbtn" data-a="sound" aria-label="${META.sound ? 'Tắt âm thanh' : 'Bật âm thanh'}">${META.sound ? 'Âm thanh: bật' : 'Âm thanh: tắt'}</button></div>`;
}
function hudHTML() {
  const P = S.sides[ME], F = S.sides[FOE], inc = incomeOf(ME), M = modsOf(S, ME);
  const res = RES.map(r => `<div class="res"><span class="ri-wrap">${RES_ICON[r]}</span><b>${fmtN(P.res[r])}</b><small>+${inc[r]}</small></div>`).join('');
  const relic = (i) => `<span class="relicbar" title="Thánh tích ${S.sides[i].relic}/${RELIC_WIN}">${Array.from({ length: RELIC_WIN }, (_, k) => `<i class="${k < S.sides[i].relic ? 'on' : ''}"></i>`).join('')}</span>`;
  const wonder = i => S.sides[i].wonder ? `<span class="wonderflag">Kỳ quan: ${S.sides[i].wonder.left > 0 ? 'đang xây' : `đứng ${S.sides[i].wonder.held}/${WONDER_HOLD} lượt`}</span>` : '';
  return `<header class="hud" style="--c0:${civOf(ME).color};--c1:${civOf(FOE).color}">
    <div class="side me">${crest(P.civ, 44)}<div><b>${civOf(ME).name}</b><span>${AGES[P.age].name}, ${AGES[P.age].title.toLowerCase()}</span></div></div>
    <div class="ress">${res}<div class="res"><span class="ri-wrap">${RES_ICON.pop}</span><b>${popNow(S, ME)}/${popCap(S, ME)}</b><small>${villCount(P)} dân${P.idle ? `, <em>${P.idle} rảnh</em>` : ''}</small></div></div>
    <div class="when"><b>${turnLabel(S.turn)}</b><span>Lượt ${S.turn}/${MAX_TURNS}</span></div>
    <div class="goals"><div><span>Thánh tích ta</span>${relic(ME)}${wonder(ME)}</div><div><span>Thánh tích địch</span>${relic(FOE)}${wonder(FOE)}</div></div>
    <div class="side foe">${crest(F.civ, 36)}<div><b>${civOf(FOE).name}</b><span>${AGES[F.age].name}${S.sides[FOE].ai ? `, máy ${['', 'dễ', 'vừa', 'khó'][S.diff < 1 ? 1 : S.diff > 1 ? 3 : 2]}` : ''}</span></div></div>
  </header>`;
}
function legendHTML() {
  return `<div class="legend"><span><i class="lg own"></i>Đất ta</span><span><i class="lg foe"></i>Đất địch</span><span><i class="lg fog"></i>Chưa thấy</span><span><i class="lg near"></i>Thấy lờ mờ</span></div>`;
}

/* ── the map ── */
function banner(x, y, color, text, cls = '') {
  return `<g class="banner ${cls}" transform="translate(${x} ${y})"><path d="M0 2V-36" stroke="#2b1a0d" stroke-width="2.4"/><circle cy="-38" r="2.4" fill="#c9a24a"/><path d="M1 -35h30l-7 8 7 8H1z" fill="${color}" stroke="#1d1209" stroke-width="1.2"/><text x="13" y="-22" class="bt">${text}</text></g>`;
}
function arrowPath(path, side) {
  const pts = path.map(r => CENTER[r]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let k = 1; k < pts.length; k++) {
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k], mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1;
    const bend = side === 0 ? 26 : -26;
    d += ` Q${mx + nx / l * bend} ${my + ny / l * bend} ${k === pts.length - 1 ? x1 - (x1 - x0) * 0.16 : x1} ${k === pts.length - 1 ? y1 - (y1 - y0) * 0.16 : y1}`;
  }
  return d;
}
function mapSVG() {
  const P = S.sides[ME], F = S.sides[FOE], R = S.report;
  const mv = UI.mode && UI.mode.kind === 'move' ? UI.mode : null;
  const reach = mv ? pathsFrom(S, ME, mv.from, moveRange(S, ME, mv.units)) : null;
  let s = `<svg viewBox="0 0 1000 640" class="map" role="img" aria-label="Bản đồ chiến trường" style="--c0:${civOf(ME).color};--c1:${civOf(FOE).color}">${mapDefs()}
    <rect x="4" y="4" width="992" height="632" rx="16" fill="url(#vellum)"/><rect x="4" y="4" width="992" height="632" rx="16" filter="url(#paper)"/>
    ${compassRose(84, 74, 1)}
    <g class="ink deco">${[0, 1, 2].map(k => `<path d="M${880 + k * 22} ${560 + (k % 2) * 14}l18-30 18 30" fill="#d8c08c"/>`).join('')}${[0, 1].map(k => `<path d="M${850 + k * 40} ${80 + k * 12}q12-8 24 0t24 0" fill="none"/>`).join('')}</g>
    <text x="500" y="626" class="ink-text cartouche" text-anchor="middle">Bản đồ vùng biên</text>`;
  for (const r of REGION_IDS) {
    const own = S.owner[r];
    const fill = own === 0 ? 'var(--c0)' : own === 1 ? 'var(--c1)' : 'none';
    s += `<path d="${polyPath(r)}" class="land" fill="${fill}" fill-opacity="${own === null ? 0 : 0.15}"/>`;
  }
  for (const r of REGION_IDS) s += landArt(r, CENTER[r][0], CENTER[r][1] - 10);
  for (const r of REGION_IDS) {
    const v = P.vis[r];
    if (v === 'fog') s += `<path d="${polyPath(r)}" fill="url(#fog)" class="fogfill"/>`;
    else if (v === 'near') s += `<path d="${polyPath(r)}" fill="url(#haze)"/>`;
  }
  for (const r of REGION_IDS) s += `<path d="${polyPath(r)}" class="border" filter="url(#rough)"/>`;
  // labels, forts, workers, troops
  for (const r of REGION_IDS) {
    const [x, y] = CENTER[r], v = P.vis[r], I = enemySeen(S, ME, r);
    const label = rname(r);
    s += `<g class="ribbon" transform="translate(${x} ${y + 46})"><path d="M${-label.length * 3.9 - 14} -11h${label.length * 7.8 + 28}l-6 11 6 11h${-(label.length * 7.8 + 28)}l6-11z" fill="#efe1bb" stroke="${INK}" stroke-width="1"/><text y="5" text-anchor="middle" class="rlabel">${esc(label)}</text></g>`;
    const forts = [];
    const tw = (who, n) => { for (let k = 0; k < n; k++) forts.push(`<path transform="translate(${forts.length * 13} 0)" d="M0 0v-16h3v-3h2v3h2v-3h2v3h2v16z" fill="${who === 0 ? 'var(--c0)' : 'var(--c1)'}" stroke="${INK}" stroke-width="1"/>`); };
    tw(0, P.towers[r] || 0); if (v !== 'fog' && I) tw(1, I.towers || 0);
    if (P.castles[r] > 0 || (I && I.castle && v !== 'fog')) forts.push(`<path transform="translate(${forts.length * 13} 0)" d="M0 0v-14h4v-6h4v6h4v-6h4v6h4v14z" fill="${P.castles[r] > 0 ? 'var(--c0)' : 'var(--c1)'}" stroke="${INK}" stroke-width="1"/>`);
    if (P.towns[r] || (I && I.town && v !== 'fog')) forts.push(`<path transform="translate(${forts.length * 13 + 4} 0)" d="M0 0v-10l7-6 7 6v10z" fill="${P.towns[r] ? 'var(--c0)' : 'var(--c1)'}" stroke="${INK}" stroke-width="1"/>`);
    if (forts.length) s += `<g transform="translate(${x + 30} ${y - 28})">${forts.join('')}</g>`;
    const myV = jobsIn(P, r) + (r === 'c0' ? P.idle : 0);
    if (myV) s += `<g class="vbadge" transform="translate(${x - 74} ${y + 6})"><circle r="12" fill="#efe1bb" stroke="${INK}"/><circle cy="-4" r="3" fill="${INK}"/><path d="M-5 5c0-4 2-6 5-6s5 2 5 6z" fill="${INK}"/><text x="16" y="5" class="vcount">${myV}</text></g>`;
    if (I && v === 'full' && I.vills) s += `<g class="vbadge foe" transform="translate(${x + 52} ${y + 6})"><circle r="10" fill="#efe1bb" stroke="${INK}"/><circle cy="-3" r="2.5" fill="var(--c1)"/><path d="M-4 4c0-3 2-5 4-5s4 2 4 5z" fill="var(--c1)"/><text x="14" y="4" class="vcount">${I.vills}</text></g>`;
    const mine = total(P.army[r] || {});
    if (mine) s += banner(x - 32, y + 26, 'var(--c0)', mine);
    if (I && I.n && v !== 'fog' && I.age === 0) s += banner(x + 20, y + 26, 'var(--c1)', I.exact ? I.n : '~' + Math.max(5, Math.round(I.n / 5) * 5));
    else if (I && I.n && I.age > 0 && I.age <= 4) s += banner(x + 20, y + 26, 'var(--c1)', '?', 'stale');
    if (S.sides[ME].orders.scouts.includes(r)) s += `<g transform="translate(${x - 8} ${y - 70})" class="eye"><path d="M-14 0q14-12 28 0q-14 12-28 0z" fill="#efe1bb" stroke="${INK}" stroke-width="1.4"/><circle r="4" fill="${INK}"/></g>`;
  }
  // last turn: where swords met
  if (R) for (const b of R.battles) {
    const [x, y] = b.where ? [(CENTER[b.where[0]][0] + CENTER[b.where[1]][0]) / 2, (CENTER[b.where[0]][1] + CENTER[b.where[1]][1]) / 2] : CENTER[b.r];
    s += `<g class="clash" transform="translate(${x + (b.where ? 0 : 52)} ${y - 44})"><circle r="15" fill="${b.winner === ME ? 'var(--c0)' : 'var(--c1)'}" stroke="${INK}" stroke-width="1.4"/><path d="M-7 -7L7 7M7 -7L-7 7" stroke="#f1e4c6" stroke-width="2.6" stroke-linecap="round"/></g>`;
  }
  // orders
  for (const m of S.sides[ME].orders.moves) s += `<path d="${arrowPath(m.path, 0)}" class="arrow a0" marker-end="url(#ah0)"/>`;
  if (R) for (const m of R.moves[FOE]) if (m.path.some(r => P.vis[r] !== 'fog')) s += `<path d="${arrowPath(m.path, 1)}" class="arrow a1 past" marker-end="url(#ah1)"/>`;
  // hit areas on top
  for (const r of REGION_IDS) {
    const target = reach && reach[r];
    s += `<path d="${polyPath(r)}" class="hit${UI.sel === r ? ' sel' : ''}${target ? ' target' : ''}${mv && r === mv.from ? ' from' : ''}${mv && mv.to === r ? ' chosen' : ''}" data-a="region" data-r="${r}" tabindex="0" role="button" aria-label="${esc(rname(r))}"/>`;
  }
  return s + '</svg>';
}

/* ── the order panel ── */
function panelHTML() {
  if (S.over) return endPanelHTML();
  if (UI.mode && UI.mode.kind === 'move') return movePanelHTML();
  const r = UI.sel, P = S.sides[ME], own = S.owner[r], R = REGIONS[r];
  const ownTxt = own === ME ? 'Đất ta' : own === FOE ? `Đất ${civOf(FOE).name}` : 'Vùng trung lập';
  let h = `<div class="phead"><h2>${esc(rname(r))}</h2><span class="own ${own === ME ? 'o0' : own === FOE ? 'o1' : ''}">${ownTxt}</span>${R.note ? `<p class="note">${esc(R.note)}</p>` : ''}</div>`;
  if (!META.helped) h += `<div class="howto"><b>Cách chơi</b><p>Mỗi lượt bạn và đối thủ cùng ra lệnh bí mật: phân dân đi làm, luyện quân ở kinh thành, xây dựng, cho quân hành quân, cử người do thám. Bấm <b>Lật bài</b>: lệnh hai bên cùng chạy một lúc.</p><p>Quân luyện xong mới xuất hiện ở kinh thành vào cuối lượt, nên phải đoán trước. Giáo khắc kỵ, kỵ khắc cung, cung khắc giáo. Vàng chỉ có ở giữa bản đồ.</p><p>Thắng khi phá được kinh thành địch, giữ Tu viện đủ ${RELIC_WIN} điểm thánh tích, hoặc giữ Kỳ quan ${WONDER_HOLD} lượt.</p><button class="btn" data-a="helped">Đã hiểu</button></div>`;
  if (r === capOf(ME)) h += capitalHTML();
  h += jobsHTML(r) + armyHTML(r) + intelHTML(r);
  if (r !== capOf(ME) && own === ME) h += regionBuildHTML(r);
  h += scoutHTML(r) + ordersHTML();
  return h;
}
function jobsHTML(r) {
  const P = S.sides[ME], jobs = JOB_IDS.filter(j => JOBS[j].region === r);
  if (!jobs.length) return '';
  const rows = jobs.map(j => {
    const J = JOBS[j], open = jobOpen(S, ME, j), n = P.jobs[j] || 0;
    const left = J.reserve != null ? `, mỏ còn ${Math.round(P.goldLeft[j] || 0)}` : '';
    return `<div class="jrow"><span class="ri-wrap">${RES_ICON[J.res]}</span><span class="jn">${J.res === 'food' ? 'Làm ruộng' : J.res === 'wood' ? 'Đốn gỗ' : 'Đào vàng'}<small>${J.slots} chỗ, ${Math.round(GATHER[J.res] * (1 + modsOf(S, ME).gather[J.res]))}/người/lượt${left}</small></span>
      <span class="step"><button data-a="job" data-x="${j}" data-d="-1" ${n ? '' : 'disabled'} aria-label="Bớt dân">−</button><b>${n}</b><button data-a="job" data-x="${j}" data-d="1" ${open && P.idle && n < J.slots ? '' : 'disabled'} aria-label="Thêm dân">+</button></span></div>`;
  }).join('');
  const closed = jobs.every(j => !jobOpen(S, ME, j)) && !jobs.some(j => P.jobs[j]);
  return `<section class="psec"><h3>Dân đi làm${P.idle ? ` <em>(${P.idle} dân rảnh ở kinh thành)</em>` : ''}</h3>${closed ? '<p class="muted">Đất địch: dân ta chưa vào làm được. Đem quân chiếm trước.</p>' : rows}</section>`;
}
function armyHTML(r) {
  const P = S.sides[ME], st = P.army[r] || {}, av = availableAt(S, ME, r);
  if (!total(st)) return '';
  const rows = UNIT_ORDER.filter(t => st[t]).map(t => `<span class="uchip">${unitIcon(t, 18)}${st[t]} ${unitName(t).toLowerCase()}</span>`).join('');
  return `<section class="psec"><h3>Quân ta ở đây</h3><div class="uchips">${rows}</div>
    ${total(av) ? `<button class="btn primary" data-a="move" data-r="${r}">Hành quân</button>` : '<p class="muted">Cả đạo quân đã nhận lệnh đi rồi.</p>'}</section>`;
}
function intelHTML(r) {
  const I = enemySeen(S, ME, r), v = S.sides[ME].vis[r];
  if (S.owner[r] === ME && (!I || !I.n)) return '';
  let t;
  if (v === 'fog') t = I && I.n ? `Lần cuối thấy ${I.n} quân địch, cách đây ${I.age} lượt.` : 'Mù mịt. Cử người do thám để biết.';
  else if (!I || !I.n) t = v === 'full' ? 'Không có quân địch.' : 'Không thấy quân địch (nhìn từ xa).';
  else if (I.exact) t = `Quân địch: ${stackText(I.units)}.`;
  else t = `Có khoảng ${Math.max(5, Math.round(I.n / 5) * 5)} quân địch, không rõ binh chủng. Do thám để biết rõ.`;
  const extra = I && v !== 'fog' ? [I.vills ? `${I.vills} dân địch đang làm` : '', I.towers ? `${I.towers} tháp canh` : '', I.castle ? 'một lâu đài' : '', I.town ? 'một thị trấn' : ''].filter(Boolean).join(', ') : '';
  return `<section class="psec"><h3>Tình báo</h3><p>${esc(t)}${extra ? ` Thấy ${extra}.` : ''}</p></section>`;
}
function scoutHTML(r) {
  if (r === capOf(ME)) return '';
  const on = S.sides[ME].orders.scouts.includes(r);
  return `<section class="psec"><button class="btn ${on ? 'on' : ''}" data-a="scout" data-r="${r}">${on ? 'Đã cử người do thám vùng này' : 'Cử người do thám vùng này'}</button><p class="muted small">Cuối lượt sẽ thấy rõ mọi thứ ở đó${r === capOf(FOE) ? ', cả công trình và số dân trong kinh thành địch' : ''}. Mỗi lượt do thám ${modsOf(S, ME).scouts} nơi.</p></section>`;
}
function regionBuildHTML(r) {
  const opts = ['tower', 'town', 'castle'].filter(k => !(k === 'town' && REGIONS[r].kind === 'relic'));
  return `<section class="psec"><h3>Xây ở đây</h3>${opts.map(k => buildRow(k, r)).join('')}</section>`;
}
function buildRow(k, r) {
  const B = BUILDINGS[k], why = buildCheck(S, ME, k, r), q = S.sides[ME].orders.builds.findIndex(b => b.kind === k && b.region === r);
  return `<div class="brow"><div><b>${B.name}</b><small>${esc(B.desc)}</small><span class="costs">${costHTML(costOf(S, ME, 'bld', k))}</span></div>
    ${q >= 0 ? `<button class="btn on" data-a="unbuild" data-i="${q}">Đang xây, hủy</button>` : `<button class="btn" data-a="build" data-x="${k}" data-r="${r}" ${why ? 'disabled' : ''} title="${esc(why)}">${why ? esc(why.startsWith('Thiếu') ? 'Chưa đủ tài nguyên' : why) : 'Xây'}</button>`}</div>`;
}
function capitalHTML() {
  const P = S.sides[ME], tabs = [['train', 'Luyện quân'], ['build', 'Xây dựng'], ['research', 'Nghiên cứu']];
  let body = '';
  if (UI.capTab === 'train') {
    const row = (what, name, cost, cap, desc, extra = '') => {
      const n = P.orders.train[what] || 0, can = cap > 0;
      return `<div class="trow"><span class="ti">${what === 'vill' ? `<span class="ri-wrap">${RES_ICON.pop}</span>` : unitIcon(what, 26)}</span><div class="tn"><b>${name}</b><small>${esc(desc)}</small><span class="costs">${costHTML(cost)}${extra}</span></div>
        <span class="step"><button data-a="train" data-x="${what}" data-d="-1" ${n ? '' : 'disabled'} aria-label="Bớt">−</button><b>${n}</b><button data-a="train" data-x="${what}" data-d="1" ${can ? '' : 'disabled'} aria-label="Thêm">+</button></span></div>`;
    };
    body += row('vill', 'Dân', costOf(S, ME, 'vill'), prodCap(S, ME, 'vill'), P.orders.research === 'age' ? 'Nhà chính đang lên đời, không luyện dân được.' : 'Dân mới tự vào làm ở chỗ trống gần nhà.', ` <em>tối đa ${prodCap(S, ME, 'vill')}/lượt</em>`);
    for (const t of unitsFor(S, ME)) {
      const U = UNITS[t], cap = prodCap(S, ME, t);
      const why = P.age < U.age ? `Cần ${AGES[U.age].name}` : !cap ? `Cần ${BUILDINGS[U.bld].name.toLowerCase()}` : '';
      body += row(t, U.name + (U.civ ? ' ★' : ''), costOf(S, ME, 'unit', t), cap, why || U.desc, why ? '' : ` <em>tối đa ${cap}/lượt</em>`);
    }
    body += `<p class="muted small">Quân luyện xong xuất hiện ở kinh thành cuối lượt. Dân số ${popNow(S, ME)}/${popCap(S, ME)}.</p>`;
  } else if (UI.capTab === 'build') {
    for (const k of ['barracks', 'range', 'stable', 'workshop', 'walls', 'tower', 'castle', 'wonder']) body += buildRow(k, capOf(ME));
    body += `<p class="muted small">Mỗi lượt xây được ${AGES[P.age].builds} công trình. Tháp canh, lâu đài, thị trấn còn xây được ở các vùng ta đang giữ.</p>`;
  } else {
    if (P.age < 4) {
      const A = AGES[P.age + 1], on = P.orders.research === 'age';
      body += `<div class="agecard ${on ? 'on' : ''}"><span class="agename">${A.name}</span><b>${A.title}</b><small>Mở quân mới, công trình mới, và chọn một lá bài chiến lược. Lượt lên đời nhà chính không luyện dân.</small><span class="costs">${costHTML(costOf(S, ME, 'age'))}</span>
        <button class="btn ${on ? 'on' : 'primary'}" data-a="research" data-x="age">${on ? 'Đang lên đời, hủy' : 'Lên đời'}</button></div>`;
    }
    for (const id in TECHS) {
      const T = TECHS[id], have = P.techs.includes(id), on = P.orders.research === id;
      body += `<div class="brow"><div><b>${T.name}</b><small>${esc(T.desc)}${P.age < T.age ? ` Cần ${AGES[T.age].name}.` : ''}</small><span class="costs">${costHTML(costOf(S, ME, 'tech', id))}</span></div>
        ${have ? '<span class="done">Đã có</span>' : `<button class="btn ${on ? 'on' : ''}" data-a="research" data-x="${id}" ${P.age < T.age ? 'disabled' : ''}>${on ? 'Đang nghiên cứu, hủy' : 'Nghiên cứu'}</button>`}</div>`;
    }
    body += '<p class="muted small">Mỗi lượt nghiên cứu một thứ.</p>';
    if (P.cards.length) body += `<div class="mycards">${P.cards.map(c => `<span class="minicard"><b>${CARDS[c].name}</b><small>${esc(CARDS[c].desc)}</small></span>`).join('')}</div>`;
  }
  return `<section class="psec cap"><div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-a="captab" data-x="${k}" aria-selected="${UI.capTab === k}">${l}</button>`).join('')}</div>${body}</section>`;
}
function movePanelHTML() {
  const mv = UI.mode, av = availableAt(S, ME, mv.from);
  const rows = UNIT_ORDER.filter(t => av[t]).map(t => `<div class="jrow">${unitIcon(t, 22)}<span class="jn">${unitName(t)}<small>có ${av[t]}</small></span>
    <span class="step"><button data-a="mvu" data-x="${t}" data-d="-1" ${mv.units[t] ? '' : 'disabled'}>−</button><b>${mv.units[t] || 0}</b><button data-a="mvu" data-x="${t}" data-d="1" ${(mv.units[t] || 0) < av[t] ? '' : 'disabled'}>+</button></span></div>`).join('');
  const range = moveRange(S, ME, mv.units);
  let fc = '';
  if (mv.to) { const f = forecast(S, ME, mv.from, mv.to, mv.units); fc = `<div class="forecast ${f.kind}"><b>Đến ${esc(rname(mv.to))}</b><p>${esc(f.text)}</p></div>`; }
  return `<div class="phead"><h2>Hành quân từ ${esc(rname(mv.from))}</h2><p class="note">${range > 1 ? `Toàn quân cưỡi ngựa: đi được ${range} vùng.` : 'Đi được 1 vùng. Chỉ toàn quân cưỡi ngựa mới đi xa hơn.'} Bấm vùng sáng trên bản đồ để chọn nơi đến.</p></div>
    <section class="psec">${rows}<div class="row2"><button class="btn" data-a="mvall">Tất cả</button><button class="btn" data-a="mvmounted">Chỉ quân ngựa</button></div></section>
    ${fc}
    <div class="row2"><button class="btn" data-a="mvcancel">Thôi</button><button class="btn primary" data-a="mvok" ${mv.to && total(mv.units) ? '' : 'disabled'}>Ra lệnh hành quân</button></div>`;
}
function ordersHTML() {
  const O = S.sides[ME].orders, items = [];
  O.moves.forEach((m, i) => items.push(`<li><span>Hành quân ${esc(rname(m.from))} → ${esc(rname(m.to))}: ${stackText(m.units)}</span><button data-a="unmove" data-i="${i}" aria-label="Hủy">×</button></li>`));
  for (const t in O.train) items.push(`<li><span>Luyện ${O.train[t]} ${t === 'vill' ? 'dân' : unitName(t).toLowerCase()}</span><button data-a="untrain" data-x="${t}" aria-label="Bớt">×</button></li>`);
  O.builds.forEach((b, i) => items.push(`<li><span>Xây ${BUILDINGS[b.kind].name.toLowerCase()} ở ${esc(rname(b.region))}</span><button data-a="unbuild" data-i="${i}" aria-label="Hủy">×</button></li>`));
  if (O.research) items.push(`<li><span>${O.research === 'age' ? `Lên ${AGES[S.sides[ME].age + 1].name}` : `Nghiên cứu ${TECHS[O.research].name.toLowerCase()}`}</span><button data-a="research" data-x="${O.research}" aria-label="Hủy">×</button></li>`);
  O.scouts.forEach(r => items.push(`<li><span>Do thám ${esc(rname(r))}</span><button data-a="scout" data-r="${r}" aria-label="Hủy">×</button></li>`));
  return `<section class="psec orders"><h3>Lệnh lượt này</h3>${items.length ? `<ul>${items.join('')}</ul>` : '<p class="muted">Chưa có lệnh nào. Chọn một vùng trên bản đồ để bắt đầu.</p>'}</section>`;
}
function endPanelHTML() {
  return `<div class="phead"><h2>${S.winner === ME ? 'Chiến thắng' : S.winner === FOE ? 'Thất bại' : 'Hòa'}</h2></div><section class="psec"><button class="btn primary" data-a="newgame">Ván mới</button></section>`;
}

/* ── chronicle ── */
function chronicle(R) {
  const out = [], nm = i => (i === ME ? 'Quân ta' : `Quân ${civOf(FOE).name}`);
  const P = S.sides[ME];
  for (const e of R.ev) {
    if (e.k === 'battle') {
      const b = e.b, where = b.where ? `giữa đường ${rname(b.where[0])} và ${rname(b.where[1])}` : rname(b.r);
      const mineIdx = b.a === ME ? 'A' : 'D', mineBefore = b.a === ME ? b.before[0] : b.before[1], foeBefore = b.a === ME ? b.before[1] : b.before[0];
      const myLoss = b.a === ME ? b.lossA : b.lossD, foeLoss = b.a === ME ? b.lossD : b.lossA;
      const forts = b.forts && b.d === FOE ? ' cùng tháp lũy' : b.forts && b.d === ME ? ' (ta có tháp lũy giữ)' : '';
      out.push({ k: b.winner === ME ? 'win' : 'loss', t: `Trận ${where}: ta ${total(mineBefore) ? stackText(mineBefore) : 'chỉ có tháp lũy và dân'}, địch ${stackText(foeBefore)}${forts}. ${b.winner === ME ? 'Ta thắng' : 'Ta thua'}; ta mất ${total(myLoss) || 'không ai'}, địch mất ${total(foeLoss)}.` });
    } else if (e.k === 'raid') out.push({ k: e.side === ME ? 'win' : 'loss', t: e.side === ME ? `Quân ta tập kích ${rname(e.r)}, ${e.kills} dân địch thiệt mạng${e.loot ? `, thu ${e.loot.food} lương thực và ${e.loot.gold} vàng` : ''}.` : `Quân ${civOf(FOE).name} tập kích ${rname(e.r)}: ${e.kills} dân ta thiệt mạng, số còn lại chạy về kinh thành.` });
    else if (e.k === 'siege') out.push({ k: e.side === ME ? 'win' : 'loss', t: e.side === ME ? `Ta công phá ${rname(capOf(FOE))}: thành mất ${e.dmg} độ bền, còn ${e.hp}.` : `${rname(capOf(ME))} bị công: thành mất ${e.dmg} độ bền, còn ${e.hp}.` });
    else if (e.k === 'capture') { if (P.vis[e.r] !== 'fog') out.push({ k: e.side === ME ? 'win' : 'loss', t: e.side === ME ? `Ta chiếm ${rname(e.r)}.` : `${civOf(FOE).name} chiếm ${rname(e.r)}.` }); }
    else if (e.k === 'relic') out.push({ k: e.side === ME ? 'win' : 'loss', t: `${e.side === ME ? 'Thầy tu của ta' : `Thầy tu ${civOf(FOE).name}`} mang thánh tích về: ${e.total}/${RELIC_WIN}.` });
    else if (e.k === 'age') out.push({ k: 'age', t: e.side === ME ? `Ta bước sang ${AGES[e.age].name}, ${AGES[e.age].title.toLowerCase()}!` : `${civOf(FOE).name} đã lên ${AGES[e.age].name}.` });
    else if (e.k === 'built' && e.side === ME) out.push({ k: 'info', t: `Xây xong ${BUILDINGS[e.kind].name.toLowerCase()}${e.kind === 'tower' || e.kind === 'castle' || e.kind === 'town' ? ` ở ${rname(e.r)}` : ''}.` });
    else if (e.k === 'tech' && e.side === ME) out.push({ k: 'info', t: `Nghiên cứu xong ${TECHS[e.id].name.toLowerCase()}.` });
    else if (e.k === 'trained' && e.side === ME) out.push({ k: 'info', t: `Luyện xong ${Object.entries(e.units).map(([t, n]) => `${n} ${t === 'vill' ? 'dân' : unitName(t).toLowerCase()}`).join(', ')}.` });
    else if (e.k === 'attrition') out.push({ k: e.side === ME ? 'loss' : 'win', t: e.side === ME ? `Vườn không nhà trống: quân ta hao ${total(e.lost)} người trên đất địch.` : `Vườn không nhà trống: quân ${civOf(FOE).name} hao ${total(e.lost)} người trên đất ta.` });
    else if (e.k === 'retreat' && e.side === ME) out.push({ k: 'info', t: `Tàn quân (${stackText(e.units)}) rút về ${rname(e.to)}.` });
    else if (e.k === 'razed') out.push({ k: e.side === ME ? 'loss' : 'win', t: `${e.what === 'castle' ? 'Lâu đài' : 'Tháp canh'} ${e.side === ME ? 'của ta' : 'địch'} ở ${rname(e.r)} bị phá.` });
    else if (e.k === 'depleted' && e.side === ME) out.push({ k: 'info', t: 'Mỏ vàng gần kinh thành đã cạn. Vàng giờ chỉ còn ở giữa bản đồ.' });
    else if (e.k === 'wonder') out.push({ k: e.side === ME ? 'win' : 'loss', t: `${e.side === ME ? 'Kỳ quan của ta' : `Kỳ quan của ${civOf(FOE).name}`} đã xây xong! Đứng vững ${WONDER_HOLD} lượt là thắng.` });
    else if (e.k === 'collapse') out.push({ k: e.side === ME ? 'loss' : 'win', t: e.side === ME ? 'Không còn quân, dân tan tác: vương quốc sụp đổ.' : `${civOf(FOE).name} không còn quân, dân tan tác.` });
  }
  return out;
}
function reportHTML(R) {
  const lines = chronicle(R), g = R['got' + ME];
  return `<div class="modal scroll" role="dialog" aria-labelledby="ct"><h2 id="ct">Biên niên sử</h2><p class="sub">${R.label}</p>
    <ul class="chron">${lines.length ? lines.map(l => `<li class="${l.k}">${esc(l.t)}</li>`).join('') : '<li class="info">Một mùa yên ả.</li>'}</ul>
    <p class="gain">Thu hoạch: ${RES.map(r => `${RES_ICON[r]} +${g[r]}`).join(' ')}</p>
    <button class="seal small" data-a="closechron">${S.over ? 'Xem kết cục' : 'Sang mùa mới'}</button></div>`;
}
function cardHTML() {
  const P = S.sides[ME];
  return `<div class="modal" role="dialog" aria-labelledby="cd"><h2 id="cd">${AGES[P.age].name}: ${AGES[P.age].title}</h2><p class="sub">Chọn một lá bài chiến lược. Lá này theo bạn tới cuối ván.</p>
    <div class="cards">${P.pendingCard.map(id => { const C = CARDS[id]; return `<button class="card ${C.civ ? 'civ' : ''}" data-a="card" data-x="${id}"><span class="cn">${C.civ ? `${CIVS[C.civ].name}` : 'Chung'}</span><b>${C.name}</b><span>${esc(C.desc)}</span></button>`; }).join('')}</div></div>`;
}
function endHTML() {
  const win = S.winner === ME, P = S.sides[ME], F = S.sides[FOE];
  const how = { capital: win ? `Kinh thành ${civOf(FOE).capital} đã thất thủ.` : `${civOf(ME).capital} đã thất thủ.`, relic: win ? `Ta giữ Tu viện đủ ${RELIC_WIN} điểm thánh tích.` : `${civOf(FOE).name} giữ Tu viện đủ ${RELIC_WIN} điểm thánh tích.`, wonder: win ? 'Kỳ quan của ta đứng vững.' : `Kỳ quan của ${civOf(FOE).name} đứng vững.`, time: 'Hết thời gian, phân định bằng điểm.' }[S.over.how];
  return `<div class="modal end ${win ? 'won' : 'lost'}" role="dialog" aria-labelledby="et">${crest(P.civ, 64)}<h2 id="et">${S.winner === -1 ? 'Bất phân thắng bại' : win ? 'Chiến thắng' : 'Thất bại'}</h2><p class="sub">${how} ${turnLabel(S.turn)}.</p>
    <div class="stats"><div><span>Trận thắng/thua</span><b>${P.stats.battlesWon}/${P.stats.battlesLost}</b></div><div><span>Quân địch hạ</span><b>${P.stats.kills}</b></div><div><span>Dân địch hạ</span><b>${P.stats.villsKilled}</b></div><div><span>Dân ta mất</span><b>${P.stats.villsLost}</b></div><div><span>Đối thủ chơi kiểu</span><b>${F.ai ? AI_STRATS[F.ai.strat].name : '?'}</b></div></div>
    <button class="seal small" data-a="newgame">Ván mới</button></div>`;
}
function showModal(html) { $('#modal').innerHTML = `<div class="overlay">${html}</div>`; const b = $('#modal button'); if (b) b.focus({ preventScroll: true }); }
function closeModal() { $('#modal').innerHTML = ''; }

/* ── title ── */
function renderTitle() {
  document.body.className = 'at-title';
  const p = UI.pick, run = META.run;
  $('#app').innerHTML = `${topbarHTML()}
    <header class="hero"><h1 class="logo">Lên Đời</h1><p>Đế chế trên bàn cờ, năm 400–1500. Hai bên ra lệnh cùng lúc trong bí mật, rồi cùng lật bài.</p></header>
    ${run ? `<section class="sheet"><h2>Ván đang dở</h2><div class="resume">${crest(run.sides[0].civ, 40)}<div><b>${CIVS[run.sides[0].civ].name} đấu ${CIVS[run.sides[1].civ].name}</b><span>${turnLabel(run.turn)}, ${AGES[run.sides[0].age].name}</span></div><button class="seal small" data-a="resume">Vào lại</button><button class="btn ${UI.confirm === 'abandon' ? 'danger' : ''}" data-a="abandon">${UI.confirm === 'abandon' ? 'Chắc chưa? Bỏ ván' : 'Bỏ ván này'}</button></div></section>` : ''}
    <section class="sheet"><h2>Chọn nền văn minh</h2>
      <div class="civs">${CIV_ORDER.map(c => { const C = CIVS[c], U = UNITS[C.uu]; return `<button class="civ ${p.civ === c ? 'on' : ''}" data-a="pickciv" data-x="${c}" aria-pressed="${p.civ === c}" style="--cc:${C.color}">
        <span class="ch">${crest(c, 52)}<span><b>${C.name}</b><small>${C.era}</small></span></span><span class="cd">${esc(C.desc)}</span>
        <span class="cb">${C.bonus.map(b => `<span>${esc(b)}</span>`).join('')}</span><span class="uu">${unitIcon(C.uu, 20)} ${U.name}: ${esc(U.desc)}</span></button>`; }).join('')}</div>
      <div class="opts"><div><h3>Đối thủ</h3><div class="seg">${['random', ...CIV_ORDER].map(c => `<button data-a="pickfoe" data-x="${c}" aria-pressed="${p.foe === c}">${c === 'random' ? 'Ngẫu nhiên' : CIVS[c].name}</button>`).join('')}</div></div>
      <div><h3>Độ khó</h3><div class="seg">${[[0.85, 'Dễ'], [1, 'Vừa'], [1.2, 'Khó']].map(([d, l]) => `<button data-a="pickdiff" data-x="${d}" aria-pressed="${p.diff === d}">${l}</button>`).join('')}</div></div></div>
      <div class="go"><span class="muted">Máy chọn bí mật một trong bốn lối chơi: đánh sớm, phát triển, phòng thủ, giữ thánh địa. Do thám để đoán ra.</span><button class="seal" data-a="start">Xuất quân<small>bắt đầu ván mới</small></button></div>
    </section>
    <section class="sheet"><h2>Chiến tích</h2><p class="muted">${META.games ? `Đã chơi ${META.games} ván, thắng ${META.wins}.` : 'Chưa có ván nào.'}${Object.keys(META.byCiv || {}).length ? ' ' + Object.entries(META.byCiv).map(([c, v]) => `${CIVS[c].name}: ${v.w}/${v.g}`).join(', ') + '.' : ''}</p></section>
    <footer class="credit">Demo game của Sonic Hub Pages. Lấy cảm hứng từ tinh thần Age of Empires II; luật chơi, hình vẽ và âm thanh đều làm mới bằng code.</footer>`;
}
