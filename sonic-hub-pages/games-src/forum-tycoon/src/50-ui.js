/* ── UI: the forum page, the admin panel, messenger windows, month report and the memoir ── */
const UI = { tab: 'forum', open: null, im: null, buzzed: {}, buzzNow: null, fresh: false, confirm: null, pickBox: null, report: null, gotAch: [], pick: { arch: 'fan', bg: 'student', name: '' } };
let META = null, S = null;
const $ = sel => document.querySelector(sel);
const TABS = [['forum', 'Diễn đàn'], ['members', 'Thành viên'], ['rules', 'Nội quy'], ['plugins', 'Hack & Mod'], ['host', 'Hosting & Quỹ'], ['acts', 'Hoạt động']];
const ADMIN_TABS = ['rules', 'plugins', 'host', 'acts'];
const narrow = () => window.matchMedia('(max-width: 860px)').matches;
const pending = () => (S ? S.inbox.filter(e => !e.done) : []);
const nowTime = () => { const t = S ? S.tick : 1; return `${19 + (t * 7) % 5}:${String((t * 37 + 11) % 60).padStart(2, '0')}`; };
const pips = (n, of) => `<span class="pips" aria-label="${n} giờ">${Array.from({ length: of || n }, (_, i) => `<i class="${i < n ? '' : 'used'}"></i>`).join('')}</span>`;
const vibeFace = v => (v >= 75 ? '=))' : v >= 55 ? ':)' : v >= 40 ? ':|' : v >= 25 ? ':(' : ':((');

function uname(n) {
  if (!n) return '';
  const cls = n.role === 'mod' ? 'mod' : n.role === 'banned' ? 'banned' : n.posts >= 900 ? 'core' : '';
  return `<span class="uname ${cls}">${esc(n.nick)}</span>`;
}
function authorHTML(t) {
  if (t.by === 'admin') return '<span class="uname admin">admin</span>';
  const n = t.byId && notableById(S, t.byId);
  return n ? uname(n) : `<span class="uname">${esc(t.by)}</span>`;
}

/* ── shell ── */
function render() {
  const focus = document.activeElement && document.activeElement.dataset ? { a: document.activeElement.dataset.a, x: document.activeElement.dataset.x, id: document.activeElement.dataset.id } : null;
  if (!S) { renderTitle(); renderIM(); return; }
  if (UI.open && !S.threads[UI.open]) UI.open = null;
  if (!narrow() && UI.tab === 'cp') UI.tab = 'forum';
  document.body.className = 'in-game arch-' + S.arch;
  const art = bannerArt(S.arch);
  $('#app').innerHTML = `${topbarHTML()}
    <div class="page">
      ${bannerHTML(art)}
      ${navHTML()}
      ${welcomeHTML()}
      ${stripHTML()}
      <div class="cols">
        <main class="main" id="main">${mainHTML()}</main>
        <aside class="cp" aria-label="Bảng điều khiển">${cpHTML()}</aside>
      </div>
      ${footerHTML()}
    </div>
    ${mobileBarHTML()}`;
  UI.fresh = false;
  renderIM();
  if (focus && focus.a) {
    const sel = `[data-a="${focus.a}"]${focus.x ? `[data-x="${focus.x}"]` : ''}${focus.id ? `[data-id="${focus.id}"]` : ''}`;
    const el = document.querySelector(sel);
    if (el) el.focus({ preventScroll: true });
  }
}
function topbarHTML(title) {
  return `<div class="topbar">
    <a class="home" href="index.html">‹ Sonic Hub Pages</a>
    <span class="game">Ông Trùm 4rum</span><span class="sp"></span>
    ${S && !title ? `<button class="tbtn" data-a="tips">Hướng dẫn</button><button class="tbtn" data-a="home">Lưu và thoát</button>` : ''}
    <button class="tbtn" data-a="sound" aria-label="${META.sound ? 'Tắt âm thanh' : 'Bật âm thanh'}">${I.sound(META.sound)}</button>
  </div>`;
}
function bannerHTML(art) {
  const r = S.record;
  return `<header class="banner" style="background:${art.bg}">
    <svg class="art" viewBox="0 0 1200 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>${art.deco}</svg>
    <div class="gloss"></div>
    <div class="brand"><div class="logo" style="--len:${Math.max(8, S.name.length)}">${esc(S.name)}</div><div class="tagline">${esc(ARCH[S.arch].tagline)}</div><span class="beta">${S.turn >= 13 ? 'v2.0' : 'BETA'}</span></div>
    <div class="recordbox"><span>Kỷ lục online</span><b>${fmtN(r.n)}</b><small>người${r.turn > 1 ? ', tháng ' + shortMonth(r.turn) : ''}</small></div>
  </header>`;
}
function navHTML() {
  const a = actOf(S.turn);
  return `<nav class="navbar" aria-label="Khu vực">${TABS.map(([id, label]) => `<button data-a="tab" data-x="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}
    <div class="when"><b>${monthLabel(S.turn)}</b><span>Chặng ${a + 1}/4: ${ACTS[a].name}</span></div></nav>`;
}
function welcomeHTML() {
  const n = pending().length, se = seasonOf(S);
  return `<div class="welcome">
    <span>Xin chào, <b class="uname admin">admin</b>.${se.tag ? ` <span class="season" title="${esc(se.note)}">${esc(se.tag)}</span>` : ''}</span>
    ${n ? `<button class="pm" data-a="im">${I.mail} Bạn có ${n} tin nhắn mới</button>` : '<span class="muted">Không có tin nhắn mới</span>'}
    <span class="clock">Bây giờ là ${nowTime()}</span>
  </div>`;
}
function stripHTML() {
  return `<div class="strip">
    <span><small>Giờ</small>${pips(S.ap, S.apMax)}</span>
    <span class="${S.passion < 30 ? 'low' : ''}"><small>Nhiệt huyết</small><b>${Math.round(S.passion)}</b></span>
    <span><small>Không khí</small><b>${Math.round(S.vibe)}</b></span>
    <span class="${S.funds < 0 ? 'low' : ''}"><small>Quỹ</small><b>${fmtMoney(S.funds)}</b></span>
    <span><small>Thành viên</small><b>${fmtN(S.members)}</b></span>
  </div>`;
}
function mobileBarHTML() {
  const n = pending().length, adminOn = ADMIN_TABS.includes(UI.tab);
  return `<nav class="mobilebar" aria-label="Điều hướng"><div class="row">
    <button data-a="tab" data-x="forum" ${UI.tab === 'forum' ? 'aria-current="page"' : ''}>Diễn đàn</button>
    <button data-a="tab" data-x="members" ${UI.tab === 'members' ? 'aria-current="page"' : ''}>Thành viên</button>
    <button data-a="tab" data-x="${adminOn ? UI.tab : 'rules'}" ${adminOn ? 'aria-current="page"' : ''}>Quản trị</button>
    <button data-a="tab" data-x="cp" ${UI.tab === 'cp' ? 'aria-current="page"' : ''}>Bảng ĐK</button>
    <button class="end" data-a="end">${n ? `Đọc ${n} tin nhắn` : 'Kết thúc tháng'}</button>
  </div></nav>`;
}
function footerHTML() {
  return `<footer class="foot"><span>Múi giờ GMT +7. Bây giờ là ${nowTime()}.</span><span>Powered by vBulletin® 3.6.8. Skin ${esc(S.name)}.</span></footer>`;
}
function mainHTML() {
  const sub = ADMIN_TABS.includes(UI.tab) ? `<div class="subnav">${TABS.filter(t => ADMIN_TABS.includes(t[0])).map(([id, l]) => `<button data-a="tab" data-x="${id}" ${UI.tab === id ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</div>` : '';
  switch (UI.tab) {
    case 'members': return viewMembers();
    case 'rules': return sub + viewRules();
    case 'plugins': return sub + viewPlugins();
    case 'host': return sub + viewHost();
    case 'acts': return sub + viewActs();
    case 'cp': return cpHTML();
    default: return viewForum();
  }
}

/* ── forum home ── */
function viewForum() {
  let out = '';
  if (!META.tips) out += `<div class="notice">
    <b>Nếu đây là lần đầu bạn làm admin</b>, đọc nhanh mấy dòng này:
    <p>Bấm vào một thớt để xử lý: xóa spam, trả lời câu hỏi, ghim tin nóng, khóa drama trước khi cháy lan. Mỗi việc tốn 1 giờ online.</p>
    <p>Thăng mod ở tab Thành viên: mod tự làm việc trong box của mình đầu mỗi tháng. Nội quy, hack/mod và hosting giúp 4rum lớn lên.</p>
    <p>Đừng để Nhiệt huyết về 0 (admin bỏ 4rum) hay Quỹ âm hai tháng liền (bị khóa host). Giờ online để dành sẽ hồi nhiệt huyết.</p>
    <button class="btn primary" data-a="tipsok">Đã hiểu</button></div>`;
  for (const b of S.boxes) out += boxHTML(b);
  return out + wgoHTML();
}
function boxHTML(b) {
  const ts = boxThreads(S, b.id), mods = modsOf(S).filter(n => n.box === b.id);
  const fresh = ts.some(t => t.fresh), ann = b.type === 'announce';
  const issues = ts.filter(t => t.type === 'spam' || (t.type === 'drama' && !t.locked) || (t.type === 'request' && !t.answered)).length;
  return `<section class="tborder box${ann ? ' ann' : ''}" aria-label="${esc(b.name)}">
    <div class="tcat"><span class="bico">${boxIcon(fresh)}</span>
      <div class="bt"><h3>${esc(b.name)}</h3><span class="desc">${esc(b.desc)}</span></div>
      <div class="bm">${ann ? '' : mods.length ? `Điều hành: ${mods.map(m => `<b>${esc(m.nick)}</b>`).join(', ')}` : '<span class="nomod">Chưa có mod</span>'}${!ann && issues ? `<span class="issues">${issues} việc cần xử lý</span>` : ''}</div>
    </div>
    ${ann || !ts.length ? '' : '<div class="thead trow-grid"><span></span><span>Chủ đề / Người gửi</span><span>Tình trạng</span><span>Trả lời</span><span>Xem</span></div>'}
    ${ts.length ? ts.map(rowHTML).join('') : `<div class="empty">Chưa có chủ đề nào. Box vắng lâu thì 4rum trông buồn.</div>`}
  </section>`;
}
function statusHTML(t) {
  const tt = `<span class="tt tt-${t.type}">${TTYPES[t.type].name}</span>`;
  if (t.type === 'ann') return '';
  if (t.locked) return `${tt}<span class="st">${I.lock} Đã khóa</span>`;
  switch (t.type) {
    case 'drama': return `${tt}<span class="st heat h${t.heat}" title="Lửa ${t.heat}/4. Tới 3 là chiến tranh, lan sang thớt khác">${I.flame.repeat(Math.min(4, t.heat))}<span>${t.heat >= 3 ? 'Chiến tranh!' : `Lửa ${t.heat}/4`}</span></span>`;
    case 'request': return t.answered ? `${tt}<span class="st ok">${I.check} Đã trả lời</span>` : `${tt}<span class="st ${t.fuse <= 1 ? 'warn' : ''}">${I.clock} còn ${t.fuse} tháng</span>`;
    case 'news': return `${tt}<span class="st ${t.fuse <= 1 ? 'warn' : ''}">${I.clock} ${t.fuse <= 1 ? 'sắp cũ' : 'còn ' + t.fuse + ' tháng'}</span>`;
    case 'quality': return t.sticky ? `${tt}<span class="st legend" title="Ghim đủ lâu sẽ thành thớt huyền thoại">${[0, 1, 2].map(i => I.star(t.legend > i)).join('')}</span>` : tt;
    case 'hot': return `${tt}<span class="st">${t.sticky ? 'Đang ghim, an toàn' : 'Dễ bùng drama'}</span>`;
    case 'chat': return boxOf(S, t.box).type === 'chat' ? tt : `${tt}<span class="st warn">Lạc đề</span>`;
    default: return tt;
  }
}
function rowHTML(t) {
  const open = UI.open === t.id, ann = t.type === 'ann';
  const cls = ['trow', 'trow-grid', t.sticky && 'sticky', t.locked && 'locked', t.type === 'drama' && !t.locked && t.heat >= 3 && 'flame', t.type === 'spam' && 'spamrow', open && 'open', UI.fresh && t.fresh && 'fresh', ann && 'annrow'].filter(Boolean).join(' ');
  const row = `<div class="${cls}" data-a="open" data-id="${t.id}" role="button" tabindex="0" aria-expanded="${open}">
    <span class="c-ico">${tIcon(t)}</span>
    <span class="c-title">${t.sticky ? '<b class="pfx">Ghim:</b> ' : ann ? '<b class="pfx">Thông báo:</b> ' : ''}<span class="title">${esc(t.title)}</span>${t.fresh && !ann ? '<span class="badge-new">Mới</span>' : ''}
      ${ann ? '' : `<span class="by">bởi ${authorHTML(t)}</span>`}</span>
    <span class="c-stat">${statusHTML(t)}</span>
    <span class="c-num">${ann ? '' : fmtN(t.replies)}</span>
    <span class="c-num">${ann ? '' : fmtN(t.views)}</span>
  </div>`;
  return row + (open ? actionsHTML(t) : '');
}
function actionsHTML(t) {
  const acts = threadActions(S, t);
  return `<div class="actions" role="group" aria-label="Xử lý thớt">
    <div class="help"><span class="tt tt-${t.type}">${TTYPES[t.type].name}</span> ${esc(TTYPES[t.type].help)}</div>
    <div class="acts">${acts.map(a => `<button class="act${a.id === 'delete' && t.type === 'quality' ? ' warn' : ''}" data-a="tact" data-id="${t.id}" data-x="${a.id}" ${a.blocked ? 'disabled' : ''}>
      <span class="ah"><b>${esc(a.label)}</b><span class="cost">${a.ap ? pips(a.ap) : 'Miễn phí'}</span></span><small>${esc(a.blocked || a.hint)}</small></button>`).join('')}</div>
  </div>`;
}
function wgoHTML() {
  const R = cosmeticRng(S.seed + S.turn * 101);
  const live = liveNotables(S);
  const memOnline = Math.max(1, Math.round(S.online * 0.42)), guests = Math.max(0, S.online - memOnline);
  const shown = live.filter(() => R() < 0.75).slice(0, 8);
  const extra = Math.min(10, Math.max(0, memOnline - shown.length));
  const names = shown.map(n => uname(n)).concat(Array.from({ length: extra }, () => `<span class="uname">${esc(NICK_A[Math.floor(R() * NICK_A.length)] + NICK_B[Math.floor(R() * NICK_B.length)])}</span>`));
  const newest = live.slice().sort((a, b) => b.joined - a.joined || b.id - a.id)[0];
  return `<section class="tborder wgo">
    <div class="tcat"><h3>Có gì đang diễn ra?</h3></div>
    <div class="thead">Đang online: ${fmtN(S.online)} (${fmtN(memOnline)} thành viên, ${fmtN(guests)} khách)</div>
    <div class="wrow">${I.smile}<div>${names.join(', ')}${memOnline > names.length ? ` và ${fmtN(memOnline - names.length)} thành viên khác` : ''}</div></div>
    <div class="thead">Thống kê ${esc(S.name)}</div>
    <div class="wrow"><div>Chủ đề: <b>${fmtN(S.totals.threads)}</b>, Bài viết: <b>${fmtN(S.totals.posts)}</b>, Thành viên: <b>${fmtN(S.members)}</b>${newest ? `<br>Chào mừng thành viên mới nhất: ${uname(newest)}` : ''}<br>Kỷ lục online: <b>${fmtN(S.record.n)}</b> người${S.record.turn > 1 ? `, tháng ${shortMonth(S.record.turn)}` : ''}.${S.legends.length ? `<br>Thớt huyền thoại: ${S.legends.slice(-3).map(l => `<i>${esc(l.title)}</i>`).join('; ')}` : ''}</div></div>
  </section>`;
}

/* ── control panel ── */
function meterHTML(label, v, cls, extra) {
  return `<div class="meter ${cls} ${v < 30 ? 'low' : ''}"><div class="ml"><span>${label}</span><b>${Math.round(v)}${extra ? ' <span class="face">' + extra + '</span>' : ''}</b></div><div class="bar"><i style="width:${clamp(v, 0, 100)}%"></i></div></div>`;
}
function cpHTML() {
  const M = calcMods(S), fc = financeForecast(S), H = HOSTING[S.hosting], cap = Math.round(H.cap * M.cap);
  const ms = milestoneNow(S), fcst = forecast(S), n = pending().length, d = S.report ? S.report.d : null;
  const load = S.online / cap;
  return `<section class="tborder cpbox">
      <div class="tcat"><h3>Bảng điều khiển</h3></div>
      <div class="cpin">
        <div class="me"><img class="ava" src="${avatarURL(S.seed % 100000)}" alt=""><div><b class="uname admin">admin</b><div class="by">Administrator. ${esc(BGS[S.bg].name)}</div></div></div>
        <div class="hours"><span>Giờ online còn lại</span>${pips(S.ap, S.apMax)}</div>
        ${meterHTML('Nhiệt huyết', S.passion, 'passion')}
        ${meterHTML('Không khí', S.vibe, 'vibe', vibeFace(S.vibe))}
        <div class="kv">
          <div><span>Thành viên</span><b>${fmtN(S.members)}</b>${d ? `<em class="${d.members >= 0 ? 'up' : 'down'}">${signed(d.members)}</em>` : ''}</div>
          <div><span>Tích cực</span><b>${fmtN(S.active)}</b>${d ? `<em class="${d.active >= 0 ? 'up' : 'down'}">${signed(d.active)}</em>` : ''}</div>
          <div><span>Lão làng</span><b>${fmtN(S.core)}</b></div>
          <div><span>Danh tiếng</span><b>${Math.round(S.fame)}</b></div>
        </div>
        <div class="server ${load > 0.9 ? 'hot' : ''}"><div class="ml"><span>${esc(H.name)}</span><b>${fmtN(S.online)}/${fmtN(cap)} online</b></div><div class="bar"><i style="width:${clamp(load * 100, 0, 100)}%"></i></div>${load > 0.9 ? '<small>Sắp quá tải: tháng sau dễ sập server.</small>' : ''}</div>
        <div class="funds"><span>Quỹ</span><b class="${S.funds < 0 ? 'neg' : ''}">${fmtMoney(S.funds)}</b><small>Dự kiến tháng này: ${signed(fc.net, fmtMoney)}${S.debt ? '. Đang nợ tiền host!' : ''}</small></div>
      </div>
    </section>
    ${ms ? `<section class="tborder cpbox"><div class="tcat"><h3>Mục tiêu chặng</h3></div><div class="cpin">
      <div class="ms"><b>${fmtN(ms.target)} thành viên</b> trước hết ${ms.by.toLowerCase()}</div>
      <div class="bar goal"><i style="width:${clamp(ms.members / ms.target * 100, 0, 100)}%"></i></div><small>${fmtN(ms.members)}/${fmtN(ms.target)}. Đạt mốc: chọn phần thưởng và nhiệt huyết +8. Trượt: nhiệt huyết −12.</small></div></section>` : ''}
    ${fcst.length ? `<section class="tborder cpbox"><div class="tcat"><h3>Sắp tới</h3></div><div class="cpin"><ul class="fc">${fcst.map(f => `<li class="${f.k}"><b>${esc(f.when)}</b> ${esc(f.text)}</li>`).join('')}</ul></div></section>` : ''}
    <section class="tborder cpbox"><div class="tcat"><h3>Ban quản trị</h3><span class="desc">${modsOf(S).length}/${maxMods(S)} mod</span></div><div class="cpin">${modsOf(S).length ? modsOf(S).map(m => `<div class="modrow"><img class="ava s" src="${avatarURL(m.seed)}" alt=""><div><span class="uname mod">${esc(m.nick)}</span><small>${esc((boxOf(S, m.box) || {}).name || 'Chưa có box')}, ${esc(MODTYPES[m.modType].name.toLowerCase())}</small><div class="bar mini ${m.morale < 30 ? 'low' : ''}"><i style="width:${m.morale}%"></i></div></div></div>`).join('') : '<p class="muted">Chưa có mod nào. Thăng mod ở tab Thành viên để có người dọn dẹp giúp.</p>'}</div></section>
    ${S.effects.length || S.policies.length ? `<section class="tborder cpbox"><div class="tcat"><h3>Đang có hiệu lực</h3></div><div class="cpin"><ul class="fx">${S.effects.map(e => `<li>${esc(e.label)} <small>(còn ${e.turns} tháng)</small></li>`).join('')}${S.policies.map(id => `<li>Nội quy: ${esc(POLICY_BY[id].name)}</li>`).join('')}</ul></div></section>` : ''}
    <button class="go" data-a="end">${n ? `Đọc ${n} tin nhắn mới` : `Kết thúc ${monthLabel(S.turn).toLowerCase()}`}</button>
    <p class="gohint">${n ? 'Trả lời hết tin nhắn rồi mới sang tháng được.' : S.ap ? `Còn ${S.ap} giờ chưa dùng: để dành mỗi giờ hồi 1 nhiệt huyết (tối đa 2).` : 'Đã dùng hết giờ online tháng này.'}</p>`;
}

/* ── members ── */
function viewMembers() {
  const live = liveNotables(S).sort((a, b) => (b.role === 'mod') - (a.role === 'mod') || b.posts - a.posts);
  const gone = S.notables.filter(n => n.role === 'left' || n.role === 'banned');
  const card = n => {
    const box = n.role === 'mod' ? boxOf(S, n.box) : null, T = TRAITS[n.trait];
    const hearts = Math.round(n.loyalty / 20);
    const picking = UI.pickBox === 'p' + n.id || UI.pickBox === 'r' + n.id;
    let acts = '';
    if (n.role === 'member') acts = `<button class="btn primary" data-a="pickbox" data-x="p${n.id}" ${modsOf(S).length >= maxMods(S) || S.ap < 1 ? 'disabled' : ''}>Thăng làm mod</button><button class="btn ${UI.confirm === 'ban' + n.id ? 'danger' : ''}" data-a="ban" data-id="${n.id}" ${S.ap < 1 ? 'disabled' : ''}>${UI.confirm === 'ban' + n.id ? 'Chắc chưa? Ban luôn' : 'Ban'}</button>`;
    if (n.role === 'mod') acts = `<button class="btn primary" data-a="thank" data-id="${n.id}" ${S.ap < 1 || n.thanked === S.turn ? 'disabled' : ''}>Cảm ơn (1 giờ)</button><button class="btn" data-a="pickbox" data-x="r${n.id}">Đổi box</button><button class="btn" data-a="demote" data-id="${n.id}">Cách chức</button>`;
    const boxes = picking ? `<div class="boxpick"><span>Chọn box:</span>${forumBoxes(S).map(b => `<button class="btn" data-a="${UI.pickBox[0] === 'p' ? 'promote' : 'reassign'}" data-id="${n.id}" data-box="${b.id}">${esc(b.name)}</button>`).join('')}</div>` : '';
    return `<article class="postbit ${n.role}">
      <header>${uname(n)}<span class="rank">${rankTitle(n)}</span></header>
      <div class="pb"><img class="ava" src="${avatarURL(n.seed)}" alt="">
        <div class="pinfo"><b>${esc(T.name)}</b><small>${esc(T.desc)}</small>
          <dl><dt>Tham gia</dt><dd>${shortMonth(n.joined)}</dd><dt>Bài viết</dt><dd>${fmtN(n.posts)}</dd><dt>Gắn bó</dt><dd class="hearts">${[0, 1, 2, 3, 4].map(i => I.heart(i < hearts)).join('')}</dd></dl>
          ${n.role === 'mod' ? `<div class="modinfo">Mod box <b>${esc(box ? box.name : '?')}</b>: ${esc(MODTYPES[n.modType].desc)}<div class="ml"><span>Tinh thần</span><b>${Math.round(n.morale)}</b></div><div class="bar mini ${n.morale < 30 ? 'low' : ''}"><i style="width:${n.morale}%"></i></div></div>` : `<small class="would">Làm mod sẽ là: ${esc(MODTYPES[TRAITS[n.trait].mod].name.toLowerCase())}. ${esc(MODTYPES[TRAITS[n.trait].mod].desc)}</small>`}
        </div></div>
      <div class="pact">${acts}</div>${boxes}
    </article>`;
  };
  const last = S.report;
  return `<section class="tborder"><div class="tcat"><h3>Thành viên</h3><span class="desc">Ban quản trị tối đa ${maxMods(S)} mod (4rum càng đông càng được thêm). Thăng mod tốn 1 giờ online.</span></div>
    <div class="msum"><div><span>Tổng</span><b>${fmtN(S.members)}</b></div><div><span>Tích cực</span><b>${fmtN(S.active)}</b></div><div><span>Lão làng</span><b>${fmtN(S.core)}</b></div><div><span>Mới tháng trước</span><b>${last ? fmtN(last.signups) : '–'}</b></div><div><span>Rời đi tháng trước</span><b>${last ? fmtN(last.left) : '–'}</b></div></div>
    <div class="postbits">${live.map(card).join('')}</div>
    ${gone.length ? `<div class="thead">Đã rời đi hoặc bị ban</div><div class="gone">${gone.map(n => `<span class="${n.role}">${esc(n.nick)} <small>(${n.role === 'banned' ? 'bị ban' : 'rời 4rum'})</small></span>`).join(', ')}</div>` : ''}
  </section>`;
}

/* ── rules, hacks, hosting, activities ── */
function viewRules() {
  return `<section class="tborder"><div class="tcat"><h3>Nội quy 4rum</h3><span class="desc">Áp dụng tối đa ${POLICY_SLOTS} điều (đang có ${S.policies.length}). Ban hành tốn 1 giờ online, bãi bỏ miễn phí.</span></div>
    ${POLICIES.map((p, i) => { const on = S.policies.includes(p.id); return `<div class="rule ${on ? 'on' : ''}"><div class="rn">Điều ${i + 1}</div><div class="rb"><b>${esc(p.name)}</b><div class="pro">${esc(p.good)}</div><div class="con">${esc(p.bad)}</div></div>
      <button class="btn ${on ? '' : 'primary'}" data-a="policy" data-x="${p.id}" ${!on && (S.policies.length >= POLICY_SLOTS || S.ap < 1) ? 'disabled' : ''}>${on ? 'Bãi bỏ' : 'Ban hành'}</button></div>`; }).join('')}
  </section>`;
}
function viewPlugins() {
  const shop = S.shop.map(id => PLUGIN_BY[id]);
  return `<section class="tborder"><div class="tcat"><h3>Chợ hack/mod tháng này</h3><span class="desc">Mỗi tháng có 3 món mới. Quỹ: ${fmtMoney(S.funds)}.</span></div>
    <div class="shop">${shop.length ? shop.map(p => { const pr = pluginPrice(S, p.id); return `<article class="plug"><b>${esc(p.name)}</b><p>${esc(p.desc)}</p><div class="pf"><span class="price">${fmtMoney(pr)}</span><button class="btn primary" data-a="buy" data-x="${p.id}" ${S.funds < pr ? 'disabled' : ''}>${S.funds < pr ? 'Chưa đủ quỹ' : 'Cài đặt'}</button></div></article>`; }).join('') : '<p class="muted pad">Tháng này hết hàng rồi.</p>'}</div>
    <div class="pad"><button class="btn" data-a="reroll" ${S.funds < 30 ? 'disabled' : ''}>Xem lô khác (30k)</button></div>
    <div class="thead">Đã cài (${S.plugins.length})</div>
    <div class="owned pad">${S.plugins.length ? S.plugins.map(id => `<span class="chip" title="${esc(PLUGIN_BY[id].desc)}">${esc(PLUGIN_BY[id].name)}</span>`).join('') : '<span class="muted">Chưa cài gì. 4rum đang chạy bản vBulletin trơn.</span>'}</div>
  </section>`;
}
function viewHost() {
  const M = calcMods(S), cur = HOST_ORDER.indexOf(S.hosting), fc = financeForecast(S), R = S.report;
  const line = (o, sign) => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `<div class="fl"><span>${MONEY_LABEL[k]}</span><b class="${sign < 0 ? 'neg' : 'pos'}">${sign < 0 ? '−' : '+'}${fmtMoney(v)}</b></div>`).join('');
  const g = S.guests;
  return `<section class="tborder"><div class="tcat"><h3>Hosting</h3><span class="desc">Online vượt sức chứa là server dễ sập: khách bỏ về, không khí và nhiệt huyết tụt.</span></div>
    ${HOST_ORDER.map((id, i) => { const H = HOSTING[id], fee = Math.round(hostingFee(S, id) * 0.5); return `<div class="hrow ${id === S.hosting ? 'on' : ''}"><div><b>${esc(H.name)}</b><small>${esc(H.desc)}</small></div><div class="hn"><span>Sức chứa</span><b>${fmtN(Math.round(H.cap * M.cap))} online</b></div><div class="hn"><span>Tiền thuê</span><b>${H.cost ? fmtMoney(hostingFee(S, id)) + '/tháng' : 'Miễn phí'}</b></div>
      ${id === S.hosting ? '<span class="cur">Đang dùng</span>' : i > cur ? `<button class="btn primary" data-a="host" data-x="${id}" ${S.ap < 1 || S.funds < fee ? 'disabled' : ''}>Chuyển lên (${fmtMoney(fee)}, 1 giờ)</button>` : `<button class="btn" data-a="host" data-x="${id}">Chuyển xuống</button>`}</div>`; }).join('')}
  </section>
  <section class="tborder"><div class="tcat"><h3>Quảng cáo</h3></div>
    <div class="hrow two"><div><b>Banner quảng cáo</b><small>Khoảng ${fmtMoney(Math.round(g * 0.025 * M.ads))}/tháng theo lượng khách. Không khí −1/tháng.</small></div><button class="btn ${S.ads.banner ? '' : 'primary'}" data-a="ads" data-x="banner">${S.ads.banner ? 'Tắt banner' : 'Bật banner'}</button></div>
    <div class="hrow two"><div><b>Quảng cáo popup</b><small>Khoảng ${fmtMoney(Math.round(g * 0.06 * M.ads))}/tháng. Không khí −3/tháng, khách −5%.</small></div><button class="btn ${S.ads.popup ? '' : 'primary'}" data-a="ads" data-x="popup">${S.ads.popup ? 'Tắt popup' : 'Bật popup'}</button></div>
  </section>
  <section class="tborder"><div class="tcat"><h3>Quỹ 4rum: ${fmtMoney(S.funds)}</h3><span class="desc">Quỹ âm hai tháng liền là nhà host khóa 4rum.</span></div>
    <div class="fin"><div><div class="thead">Dự kiến tháng này</div>${line(fc.inc, 1)}${line(fc.exp, -1)}<div class="fl tot"><span>Cộng</span><b class="${fc.net < 0 ? 'neg' : 'pos'}">${signed(fc.net, fmtMoney)}</b></div></div>
    ${R ? `<div><div class="thead">Tháng trước</div>${line(R.inc, 1)}${line(R.exp, -1)}<div class="fl tot"><span>Cộng</span><b class="${R.net < 0 ? 'neg' : 'pos'}">${signed(R.net, fmtMoney)}</b></div></div>` : ''}</div>
  </section>`;
}
function viewActs() {
  const card = A => {
    const st = activityState(S, A.id);
    let pick = '';
    if (A.id === 'openbox' && UI.pickBox === 'open' && !st.blocked) pick = `<div class="boxpick col">${openableBoxes(S).map(t => `<button class="btn" data-a="activity" data-x="openbox" data-arg="${t}"><b>${esc(ARCH[S.arch].names[t] || BOXES[t].name)}</b><small>${esc(BOXES[t].desc)}${BOXES[t].perk ? ' ' + esc(BOXES[t].perk) + '.' : ''}</small></button>`).join('')}</div>`;
    if (A.id === 'seed' && UI.pickBox === 'seed' && !st.blocked) pick = `<div class="boxpick">${forumBoxes(S).map(b => `<button class="btn" data-a="activity" data-x="seed" data-arg="${b.id}">${esc(b.name)}</button>`).join('')}</div>`;
    const needsPick = A.id === 'openbox' || A.id === 'seed';
    return `<article class="actcard"><div class="ach"><b>${esc(A.name)}</b><span class="cost">${pips(A.ap)}${st.cost ? ` <em>${fmtMoney(st.cost)}</em>` : ''}</span></div><p>${esc(A.desc)}</p>
      <button class="btn primary" data-a="${needsPick ? 'pickbox' : 'activity'}" data-x="${needsPick ? (A.id === 'openbox' ? 'open' : 'seed') : A.id}" ${st.blocked ? 'disabled' : ''}>${st.blocked ? esc(st.blocked) : needsPick ? 'Chọn box' : 'Làm luôn'}</button>${pick}</article>`;
  };
  return `<section class="tborder"><div class="tcat"><h3>Hoạt động</h3><span class="desc">Những việc lớn của admin. Có việc phải chờ vài tháng mới làm lại được.</span></div><div class="acards">${ACTIVITIES.map(card).join('')}</div></section>`;
}

/* ── messenger ── */
function openIM(uid) {
  const p = pending();
  const ev = uid ? S.inbox.find(e => e.uid === uid) : p[0];
  if (!ev) return;
  UI.im = ev.uid;
  if (!UI.buzzed[ev.uid]) { UI.buzzed[ev.uid] = true; const def = EVENT_BY[ev.id]; UI.buzzNow = def.buzz ? ev.uid : null; SFX.play(def.buzz ? 'buzz' : 'msg'); }
  renderIM();
  const first = document.querySelector('#im .opt:not([disabled]), #im .btn');
  if (first) first.focus({ preventScroll: true });
}
function renderIM() {
  const layer = $('#im');
  const ev = S && UI.im ? S.inbox.find(e => e.uid === UI.im) : null;
  if (!ev) { layer.innerHTML = ''; return; }
  const v = eventView(S, ev), f = v.from, idx = S.inbox.indexOf(ev) + 1;
  const ava = f.sys ? avatarURL(0, f.sys) : avatarURL(f.seed);
  const more = pending().filter(e => e.uid !== ev.uid).length;
  layer.innerHTML = `<div class="im${UI.buzzNow === ev.uid ? ' buzz' : ''}${v.boss ? ' boss' : ''}" role="dialog" aria-label="Tin nhắn từ ${esc(f.nick)}">
    <div class="imbar">${I.smile}<span class="imt">${esc(f.nick)}: tin nhắn</span><span class="cnt">${idx}/${S.inbox.length}</span>${ev.done ? '<button class="x" data-a="imclose" aria-label="Đóng">×</button>' : ''}</div>
    <div class="who"><img class="ava" src="${ava}" alt=""><div><b>${esc(f.nick)}</b><small>${esc(f.role || '')}</small></div></div>
    <div class="log">
      ${v.buzz && !ev.done ? '<div class="buzzline">BUZZ!!!</div>' : ''}
      <p class="line"><span class="n">${esc(f.nick)}</span> <span class="t">(${nowTime()})</span>: ${esc(v.text)}</p>
      ${ev.done ? `<p class="line me"><span class="n">admin</span>: ${esc(ev.label || '')}</p>${ev.out ? `<p class="line sys">${esc(ev.out)}</p>` : ''}` : ''}
    </div>
    <div class="opts">${ev.done
      ? `<button class="btn primary" data-a="imnext">${more ? `Tin nhắn tiếp theo (${more})` : 'Đóng'}</button>`
      : v.options.map((o, i) => `<button class="opt" data-a="choose" data-uid="${ev.uid}" data-i="${i}" ${o.blocked ? 'disabled' : ''}><b>${esc(o.label)}</b><small>${esc(o.blocked || o.hint)}</small></button>`).join('')}</div>
  </div>`;
  UI.buzzNow = null;
}

/* ── month report & memoir ── */
function showModal(html) { $('#modal').innerHTML = `<div class="overlay">${html}</div>`; const b = document.querySelector('#modal .go'); if (b) b.focus({ preventScroll: true }); }
function closeModal() { $('#modal').innerHTML = ''; }
function sparkHTML() {
  const h = S.history.map(x => x.members), max = Math.max(...h, 10), w = 280, ht = 46;
  const pts = h.map((v, i) => `${(i / Math.max(1, h.length - 1)) * w},${ht - (v / max) * (ht - 4) - 2}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" class="spark" role="img" aria-label="Số thành viên qua các tháng"><polyline points="0,${ht} ${pts} ${w},${ht}" fill="rgba(61,111,208,.12)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#3d6fd0" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}
function reportHTML(R) {
  const row = (k, v, c) => `<div class="rr ${c || ''}"><span>${k}</span><b>${v}</b></div>`;
  const story = [];
  for (const e of R.events) story.push(`<li class="ev">${esc(e.label || '')}${e.out ? `: ${esc(e.out)}` : ''}</li>`);
  for (const l of R.log) story.push(`<li class="${l.k}">${esc(l.text)}</li>`);
  for (const t of R.legends) story.push(`<li class="legend">Thớt huyền thoại mới: <i>${esc(t)}</i></li>`);
  for (const t of R.ignited) story.push(`<li class="bad">Thớt hot biến thành drama: <i>${esc(t)}</i></li>`);
  for (const t of R.flames) story.push(`<li class="bad">Chiến tranh nổ ra: <i>${esc(t)}</i></li>`);
  for (const t of R.notes) story.push(`<li>${esc(t)}</li>`);
  if (R.crashed) story.push('<li class="bad">Server sập vì quá tải, cả 4rum hiện "Database error" suốt mấy ngày.</li>');
  if (R.unanswered) story.push(`<li class="bad">${R.unanswered} câu hỏi bị bỏ mặc, người hỏi đã bỏ đi.</li>`);
  const pp = R.passionParts || {};
  return `<div class="modal report" role="dialog" aria-labelledby="rt">
    <div class="tcat"><h3 id="rt">Tổng kết ${R.label.toLowerCase()}</h3></div>
    ${R.record ? `<div class="recordflash">Kỷ lục online mới: <b>${fmtN(R.online)}</b> người!</div>` : ''}
    ${R.milestone ? `<div class="msflash ${R.milestone.pass ? 'pass' : 'fail'}">${R.milestone.pass ? `Đạt mốc ${R.milestone.act}: ${fmtN(R.milestone.members)}/${fmtN(R.milestone.target)} thành viên. Tháng sau chọn phần thưởng!` : `Trượt mốc ${R.milestone.act}: mới ${fmtN(R.milestone.members)}/${fmtN(R.milestone.target)} thành viên. Nhiệt huyết −12.`}</div>` : ''}
    <div class="rgrid">
      <div><div class="thead">Người</div>
        ${row('Khách ghé thăm', fmtN(R.guests))}${row('Đăng ký mới', '+' + fmtN(R.signups))}${row('Người mới ở lại', '+' + fmtN(R.newActive))}${row('Rời đi', '−' + fmtN(R.left), R.left > R.newActive ? 'rneg' : '')}${row('Lên lão làng', '+' + fmtN(R.promo))}${row('Online cao nhất', `${fmtN(R.online)}/${fmtN(R.cap)}${R.crashed ? ', sập!' : ''}`, R.crashed ? 'rneg' : '')}
      </div>
      <div><div class="thead">Quỹ</div>
        ${Object.entries(R.inc).filter(([, v]) => v).map(([k, v]) => row(MONEY_LABEL[k], '+' + fmtMoney(v), 'rpos')).join('')}${Object.entries(R.exp).filter(([, v]) => v).map(([k, v]) => row(MONEY_LABEL[k], '−' + fmtMoney(v), 'rneg')).join('')}${row('Cộng', signed(R.net, fmtMoney), R.net < 0 ? 'rneg' : 'rpos')}
        <div class="thead">Tinh thần</div>
        ${row('Không khí', signed(Math.round(R.d.vibe)), R.d.vibe < 0 ? 'rneg' : 'rpos')}${row('Nhiệt huyết', signed(Math.round(R.d.passion)), R.d.passion < 0 ? 'rneg' : 'rpos')}${pp.rest ? row('Trong đó nghỉ ngơi', '+' + pp.rest) : ''}${pp.mess ? row('Trong đó 4rum bừa bộn', '−' + round1(pp.mess)) : ''}
      </div>
    </div>
    ${story.length ? `<div class="thead">Chuyện trong tháng</div><ul class="story">${story.join('')}</ul>` : ''}
    <div class="thead">Thành viên qua các tháng</div><div class="pad">${sparkHTML()}</div>
    <div class="mfoot"><button class="go" data-a="next">${S.over ? 'Xem hồi ký 4rum' : `Sang ${monthLabel(S.turn).toLowerCase()}`}</button></div>
  </div>`;
}
function memoirHTML() {
  const o = S.over, art = bannerArt(S.arch), end = shortMonth(o.turn);
  const reason = {
    passion: `Tháng ${end}, admin không còn đủ nhiệt huyết và lặng lẽ bỏ 4rum.`,
    debt: `Tháng ${end}, quỹ âm hai tháng liền, nhà host khóa 4rum.`,
    empty: `Tháng ${end}, 4rum vắng tới mức không còn ai đăng bài.`,
    survived: `4rum sống sót qua kỷ nguyên Phây. Tháng 8/2009 vẫn còn ${fmtN(S.active)} người ghé mỗi ngày.`,
  }[o.reason];
  const mods = S.notables.filter(n => n.role === 'mod');
  const star = S.notables.slice().sort((a, b) => b.posts - a.posts)[0];
  const fact = (k, v) => `<div class="rr"><span>${k}</span><b>${v}</b></div>`;
  const ach = UI.gotAch.filter(id => id !== '_game').map(id => ACHIEVEMENTS.find(a => a.id === id)).filter(Boolean);
  return `<div class="modal memoir" role="dialog" aria-labelledby="mt">
    <div class="memhead" style="background:${art.bg}"><div class="gloss"></div><div class="logo" id="mt">${esc(S.name)}</div><div class="span">9/2007 – ${end}</div></div>
    <p class="reason">${reason}</p>
    <div class="score"><span>${esc(o.rank)}</span><b>${fmtN(o.score)}</b><small>điểm huyền thoại</small></div>
    <div class="facts">
      ${fact('Kỷ lục online', `${fmtN(S.record.n)} người${S.record.turn > 1 ? ', tháng ' + shortMonth(S.record.turn) : ''}`)}
      ${fact('Thành viên nhiều nhất', fmtN(S.stats.peakMembers))}
      ${fact('Lão làng còn lại', fmtN(S.core))}
      ${fact('Thớt huyền thoại', S.legends.length ? S.legends.map(l => `<i>${esc(l.title)}</i>`).join('<br>') : 'Chưa có')}
      ${fact('Drama lớn nhất', S.stats.biggest ? `<i>${esc(S.stats.biggest.title)}</i> (${fmtN(S.stats.biggest.views)} lượt xem)` : 'Bình yên lạ thường')}
      ${fact('Ban quản trị', mods.length ? mods.map(m => esc(m.nick)).join(', ') : 'Admin một mình')}
      ${star ? fact('Thành viên đáng nhớ', `${esc(star.nick)}, ${fmtN(star.posts)} bài`) : ''}
      ${fact('Server sập', `${S.stats.crashes} lần`)}${fact('Số lần ban', `${S.stats.bans}`)}
    </div>
    ${ach.length ? `<div class="thead">Thành tựu mới</div><div class="achs pad">${ach.map(a => `<span class="achb on"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`).join('')}</div>` : ''}
    ${UI.gotAch.includes('_game') ? '<div class="msflash pass">Mở khóa loại 4rum mới: Game online!</div>' : ''}
    <div class="mfoot"><button class="go" data-a="newrun">Mở 4rum mới</button></div>
  </div>`;
}

/* ── title screen ── */
function renderTitle() {
  document.body.className = 'at-title';
  const P = UI.pick, run = META.run;
  const archCard = id => {
    const A = ARCH[id], locked = A.locked && !META.unlocked[id], art = bannerArt(id);
    return `<button class="arch ${P.arch === id ? 'on' : ''}" data-a="pickarch" data-x="${id}" ${locked ? 'disabled' : ''} aria-pressed="${P.arch === id}">
      <span class="sw" style="background:${art.bg}"><span class="gloss"></span><span class="mini">${esc(A.defaultName)}</span></span>
      <b>${esc(A.name)}</b><span class="pitch">${esc(A.pitch)}</span>
      <span class="perks">${A.perks.map(p => `<span>${esc(p)}</span>`).join('')}</span>
      ${locked ? `<span class="locked">${I.lock} ${esc(A.unlockText)}</span>` : ''}</button>`;
  };
  const bgCard = id => { const B = BGS[id]; return `<button class="bgc ${P.bg === id ? 'on' : ''}" data-a="pickbg" data-x="${id}" aria-pressed="${P.bg === id}"><b>${esc(B.name)}</b><span>${esc(B.desc)}</span><small>${B.ap} giờ online mỗi tháng, quỹ ban đầu ${fmtMoney(B.funds)}, tiền túi ${fmtMoney(B.allowance)}/tháng</small></button>`; };
  const hall = META.hall.slice(0, 8);
  $('#app').innerHTML = `${topbarHTML(true)}
    <header class="hero"><div class="logo huge">Ông Trùm 4rum</div>
      <p>Năm 2007, bạn vừa cài xong vBulletin lên một cái host miễn phí. Biến nó thành 4rum đông vui nhất mạng, trước khi Phây kéo mọi người đi.</p></header>
    ${run ? `<section class="page resume"><div class="tcat"><h3>Đang làm admin dở</h3></div><div class="rs"><div><b>${esc(run.name)}</b><span>${esc(ARCH[run.arch].name)}, ${monthLabel(run.turn).toLowerCase()}, ${fmtN(run.members)} thành viên</span></div>
      <button class="go small" data-a="resume">Vào lại 4rum</button><button class="btn ${UI.confirm === 'abandon' ? 'danger' : ''}" data-a="abandon">${UI.confirm === 'abandon' ? 'Chắc chưa? Bỏ ván này' : 'Bỏ ván này'}</button></div></section>` : ''}
    <section class="page reg"><div class="tcat"><h3>Đăng ký 4rum mới</h3></div>
      <div class="form">
        <div class="frow"><label for="fname">Tên 4rum</label><input id="fname" maxlength="28" value="${esc(P.name || ARCH[P.arch].defaultName)}" autocomplete="off"></div>
        <div class="frow"><span class="lab">Loại 4rum</span><div class="archs">${ARCH_ORDER.map(archCard).join('')}</div></div>
        <div class="frow"><span class="lab">Bạn là</span><div class="bgs">${BG_ORDER.map(bgCard).join('')}</div></div>
        <div class="frow end"><span class="muted">Một ván dài 24 tháng, từ 9/2007 tới 8/2009. Tiến trình tự lưu trên máy.</span><button class="go" data-a="start">Mở 4rum</button></div>
      </div></section>
    <section class="page hall"><div class="tcat"><h3>Đại sảnh danh vọng</h3></div>
      ${hall.length ? `<div class="hall-t"><div class="thead hgrid"><span>4rum</span><span>Kết cục</span><span>Kỷ lục online</span><span>Thành viên</span><span>Điểm</span></div>${hall.map(h => `<div class="hgrid hr"><span><b>${esc(h.name)}</b><small>${esc(ARCH[h.arch].name)}</small></span><span>${esc(h.rank)}<small>${h.reason === 'survived' ? 'Sống qua thời Phây' : 'Đóng cửa ' + esc(h.end)}</small></span><span>${fmtN(h.record)}</span><span>${fmtN(h.members)}</span><span><b>${fmtN(h.score)}</b></span></div>`).join('')}</div>` : '<p class="muted pad">Chưa có 4rum nào. Mở 4rum đầu tiên nào!</p>'}
      <div class="thead">Thành tựu (${Object.keys(META.ach).length}/${ACHIEVEMENTS.length})</div>
      <div class="achs pad">${ACHIEVEMENTS.map(a => `<span class="achb ${META.ach[a.id] ? 'on' : ''}"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`).join('')}</div>
    </section>
    <footer class="credit">Demo game của Sonic Hub Pages. Mọi nhân vật, nhóm nhạc và 4rum trong game đều là hư cấu.</footer>`;
}

/* ── feedback ── */
let toastTimer = 0;
function toast(msg, good = true) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show ' + (good ? 'good' : 'bad');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 2600);
}
function monthFx(label) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fx = $('#fx');
  fx.innerHTML = `<div class="monthfx"><span>${esc(label)}</span></div>`;
  setTimeout(() => { fx.innerHTML = ''; }, 1500);
}
const FX_SOUND = { delete: 'delete', ban: 'delete', lock: 'lock', pin: 'pin', fire: 'pin', reply: 'ok', calm: 'ok', move: 'ok', buy: 'coin', coin: 'coin', party: 'party', promote: 'ok', rule: 'ok', host: 'ok', build: 'ok', promo: 'ok', heart: 'ok' };
