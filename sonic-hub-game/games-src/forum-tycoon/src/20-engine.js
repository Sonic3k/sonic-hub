/* ── Engine: the whole run lives in one plain object S (saved as JSON). No DOM in this file. ── */

function dateOf(turn) { const i = 8 + (turn - 1); return { m: (i % 12) + 1, y: 2007 + Math.floor(i / 12) }; }
const monthLabel = turn => { const d = dateOf(turn); return `Tháng ${d.m}/${d.y}`; };
const shortMonth = turn => { const d = dateOf(turn); return `${d.m}/${d.y}`; };
const ACTS = [
  { name: 'Khai trương', end: 6 }, { name: 'Lên đời', end: 12 }, { name: 'Thời hoàng kim', end: 18 }, { name: 'Kỷ nguyên Phây', end: 24 },
];
const actOf = turn => (turn <= 6 ? 0 : turn <= 12 ? 1 : turn <= 18 ? 2 : 3);
const POLICY_BY = Object.fromEntries(POLICIES.map(p => [p.id, p]));
const PLUGIN_BY = Object.fromEntries(PLUGINS.map(p => [p.id, p]));
const has = (S, id) => S.plugins.includes(id);

function seasonOf(S, turn = S.turn) {
  const { m, y } = dateOf(turn);
  const tet = (y === 2008 && m === 2) || (y === 2009 && m === 1);
  let s;
  if (tet) s = { id: 'tet', tag: 'Tết Nguyên Đán', note: 'Ai cũng về quê: ít thớt mới, nhiều lời chúc, dễ xin ủng hộ.', act: 0.8, guest: 0.9, gen: { chat: 1.7, drama: 0.7 }, donate: 1.8, vibe: 1.5 };
  else if (m === 12 || m === 1) s = { id: 'exam', tag: 'Thi học kỳ', note: 'Học sinh, sinh viên bận ôn thi.', act: 0.85, guest: 0.95, gen: { request: 1.3, chat: 0.8 }, studentAp: -1, exam: true };
  else if (m === 5) s = { id: 'exam', tag: 'Thi cuối năm', note: 'Mùa thi cuối năm: 4rum vắng hẳn.', act: 0.82, guest: 0.92, gen: { request: 1.3, chat: 0.8 }, studentAp: -1, exam: true };
  else if (m === 6) s = { id: 'summer', tag: 'Đầu hè', note: 'Nghỉ hè: khách đông dần.', act: 1.1, guest: 1.15 };
  else if (m === 7) s = { id: 'uni', tag: 'Thi đại học', note: 'Sĩ tử lên đường, ai thi xong thì online suốt ngày.', act: 1, guest: 1.12, studentAp: -1, exam: true };
  else if (m === 8) s = { id: 'summer', tag: 'Hè rực rỡ', note: 'Đỉnh hè: ai cũng rảnh, server dễ quá tải.', act: 1.22, guest: 1.3, studentAp: 1 };
  else if (m === 9) s = { id: 'school', tag: 'Khai giảng', note: 'Năm học mới, bạn mới.', act: 1.05, guest: 1.05 };
  else s = { id: 'normal', tag: '', note: '', act: 1, guest: 1 };
  const amp = ARCH[S.arch].seasonAmp || 1;
  if (amp !== 1) s = { ...s, act: 1 + (s.act - 1) * amp, guest: 1 + (s.guest - 1) * amp };
  s.gen = s.gen || {};
  return s;
}

/* ── modifiers: every rule, hack, effect, mod and the forum type feed one table ── */
const MULT_KEYS = new Set(['guest', 'signup', 'down', 'online', 'donate', 'ads', 'cap', 'hostCost', 'pluginCost', 'phay', 'qualityViews', 'act', 'fameGain', 'coreChurn']);
function emptyMods() {
  return {
    gen: { normal: 1, chat: 1, request: 1, quality: 1, hot: 1, news: 1, drama: 1, spam: 1 },
    guest: 1, signup: 1, down: 1, online: 1, donate: 1, ads: 1, cap: 1, hostCost: 1, pluginCost: 1, phay: 1, qualityViews: 1, act: 1, fameGain: 1, coreChurn: 1,
    activation: 0, churn: 0, core: 0, vibeTurn: 0, passionTurn: 0, ap: 0, security: 0, legendSpeed: 0, modMorale: 0, modCap: 0,
  };
}
function addMods(M, m) {
  if (!m) return;
  for (const k in m) {
    if (k === 'gen') { for (const g in m.gen) M.gen[g] *= m.gen[g]; }
    else if (MULT_KEYS.has(k)) M[k] *= m[k];
    else if (k in M) M[k] += m[k];
  }
}
function calcMods(S) {
  const M = emptyMods();
  addMods(M, ARCH[S.arch].mods);
  addMods(M, BGS[S.bg].mods);
  for (const id of S.policies) addMods(M, POLICY_BY[id].mods);
  for (const id of S.plugins) addMods(M, PLUGIN_BY[id].mods);
  for (const e of S.effects) addMods(M, e.mods);
  if (has(S, 'music') && S.arch === 'fan') M.guest *= 1.13;
  if (S.hosting === 'free') M.vibeTurn -= 1;
  if (S.ads.banner) M.vibeTurn -= 1;
  if (S.ads.popup) { M.vibeTurn -= 3; M.guest *= 0.95; }
  for (const n of S.notables) {
    if (n.role === 'mod') {
      const T = MODTYPES[n.modType];
      M.vibeTurn += T.vibe; M.security += T.security || 0;
      if (n.modType === 'tech') M.down *= 0.5;
    }
    if ((n.role === 'member' || n.role === 'mod') && n.trait === 'techie') M.security += 1;
  }
  if (S.flags.linked) M.guest *= 1.12;
  if (S.flags.fanpage) { M.phay *= 0.7; M.guest *= 1.1; }
  if (S.flags.pride) M.coreChurn *= 0.8;
  if (S.flags.picsDead && !has(S, 'album')) M.qualityViews *= 0.75;
  M.security += S.flags.sec || 0;
  return M;
}
const securityOf = S => calcMods(S).security;

/* ── setup ── */
function newGame(opts) {
  const A = ARCH[opts.arch], B = BGS[opts.bg];
  const S = {
    v: 1, seed: opts.seed >>> 0, rs: opts.seed >>> 0, name: (opts.name || A.defaultName).trim().slice(0, 28) || A.defaultName, arch: opts.arch, bg: opts.bg,
    turn: 1, ap: 0, apMax: 0, apBonus: 0, passion: B.passion, vibe: 60, fame: A.fame, funds: B.funds,
    members: 12, active: 10, core: 3, guests: 260, online: 6, record: { n: 6, turn: 1 },
    signupsLast: 0, newActiveLast: 0, lastNewest: null,
    hosting: 'free', ads: { banner: false, popup: false }, policies: [], plugins: [], shop: [],
    boxes: [], threads: {}, nextId: 1, nextBox: 1, sticky: STICKY_BASE,
    legends: [], notables: [], nextNotable: 1, inbox: [], scheduled: [], flags: { seen: {} }, effects: [], cd: {},
    history: [], log: [], report: null, debt: 0, turnFx: null,
    totals: { threads: 38, posts: 240 },
    stats: { flame: 0, bans: 0, crashes: 0, deleted: 0, biggest: null, peakMembers: 12, peakActive: 10 },
    over: null, tick: 0,
  };
  for (const t of A.boxes) addBox(S, t);
  for (const tr of A.founders) addNotable(S, tr, { founder: true });
  S.turnFx = freshTurnFx();
  const ann = boxByType(S, 'announce');
  spawnThread(S, 'ann', ann.id, { admin: true, title: `Chào mừng các bạn đến với ${S.name}!`, ann: { key: 'welcome', until: 99 } });
  for (const b of S.boxes) if (b.type !== 'announce') { const t = spawnThread(S, 'normal', b.id); t.age = 1; t.last = 0.5; t.fresh = false; }
  // a few things to do on day one: a question, a good post by a founder, and the first spammer
  spawnThread(S, 'request', bestBoxFor(S, 'request').id);
  spawnThread(S, 'quality', bestBoxFor(S, 'quality').id, { byId: S.notables[1].id });
  spawnThread(S, 'spam', pick(S, forumBoxes(S)).id);
  S.history.push(snapshot(S));
  startTurn(S);
  return S;
}
const freshTurnFx = () => ({ vibe: 0, passion: 0, answered: 0, unanswered: 0 });
const snapshot = S => ({ turn: S.turn, members: S.members, active: S.active, core: S.core, vibe: Math.round(S.vibe), funds: S.funds, online: S.online, passion: Math.round(S.passion) });

/* ── boxes & threads ── */
function addBox(S, type) {
  const b = { id: S.nextBox++, type, name: ARCH[S.arch].names[type] || BOXES[type].name, desc: BOXES[type].desc };
  S.boxes.push(b);
  return b;
}
const boxOf = (S, id) => S.boxes.find(b => b.id === id);
const boxByType = (S, type) => S.boxes.find(b => b.type === type);
const forumBoxes = S => S.boxes.filter(b => b.type !== 'announce');
function threadOrder(a, b) { return (b.sticky - a.sticky) || (b.last - a.last) || (b.id - a.id); }
const boxThreads = (S, boxId) => Object.values(S.threads).filter(t => t.box === boxId).sort(threadOrder);
const stickyCount = S => Object.values(S.threads).filter(t => t.sticky && t.type !== 'ann').length;

function fillTitle(S, tpl, ctx = {}) {
  const live = liveNotables(S);
  const a = ctx.a || (live.length ? pick(S, live).nick : genNick(S));
  const others = live.filter(x => x.nick !== a);
  const b = ctx.b || (others.length ? pick(S, others).nick : genNick(S));
  const m = pick(S, BAND.members), m2 = pick(S, BAND.members.filter(x => x !== m));
  const song = pick(S, BAND.songs), song2 = pick(S, BAND.songs.filter(x => x !== song));
  const map = { band: BAND.name, m, m2, song, song2, album: pick(S, BAND.albums), city: pick(S, CITIES), a, b, n: rint(S, 2, 99) };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (k in map ? map[k] : ''));
}
function genTitle(S, type, opts = {}) {
  const T = TITLES[type], season = seasonOf(S);
  let pool = (T.any || []).concat(T[S.arch] || []);
  if (type === 'chat' && season.id === 'tet' && chance(S, 0.6)) pool = T.tet;
  else if (type === 'chat' && season.exam && chance(S, 0.35)) pool = T.exam;
  if (type === 'drama' && opts.spill) pool = T.spill;
  const used = new Set(Object.values(S.threads).map(t => t.title));
  let title = '';
  for (let i = 0; i < 5; i++) { title = fillTitle(S, pick(S, pool), opts); if (!used.has(title)) break; }
  return title;
}
function spawnThread(S, type, boxId, opts = {}) {
  const t = {
    id: S.nextId++, type, box: boxId, title: '', by: null, byId: null, age: 0, last: S.turn + (opts.bump || 0) + rnd(S) * 0.5,
    heat: type === 'drama' ? (opts.heat || 1) : 0, sticky: false, locked: false, answered: false, legend: 0,
    fuse: type === 'request' || type === 'news' ? 2 : 0, replies: rint(S, 1, 9), views: rint(S, 12, 70), fresh: true,
    admin: !!opts.admin, born: S.turn, ann: opts.ann || null,
  };
  t.title = opts.title || genTitle(S, type, opts);
  if (opts.admin) t.by = 'admin';
  else if (opts.byId) { const n = notableById(S, opts.byId); t.by = n.nick; t.byId = n.id; n.posts += 1; }
  else if (opts.by) t.by = opts.by;
  else if (type === 'spam') t.by = pick(S, SELLER_NICKS) + rint(S, 1, 99);
  else {
    const cand = liveNotables(S).filter(n => TRAITS[n.trait].sig === type);
    if (cand.length && chance(S, 0.35)) { const n = pick(S, cand); t.by = n.nick; t.byId = n.id; n.posts += 1; }
    else t.by = genNick(S);
  }
  S.threads[t.id] = t;
  S.totals.threads++;
  trimBox(S, boxId);
  return t;
}
function trimBox(S, boxId) {
  const b = boxOf(S, boxId);
  const list = boxThreads(S, boxId).filter(t => !t.sticky);
  const cap = b.type === 'announce' ? 3 : BOX_CAP;
  for (let i = cap; i < list.length; i++) sinkThread(S, list[i], 'sink');
}
function sinkThread(S, t, why) {
  if (!S.threads[t.id]) return;
  if (why === 'sink' || why === 'age') {
    if (t.type === 'request' && !t.answered) { S.turnFx.vibe -= 1; S.turnFx.unanswered++; }
    if (t.type === 'drama' && !t.locked && t.heat >= 2) S.turnFx.vibe -= 1;
  }
  delete S.threads[t.id];
}
function announce(S, title, key, turns) {
  const box = boxByType(S, 'announce');
  if (!box) return null;
  removeAnn(S, key);
  return spawnThread(S, 'ann', box.id, { admin: true, title, ann: { key, until: S.turn + turns - 1 }, bump: 0.6 });
}
function removeAnn(S, key) { for (const t of Object.values(S.threads)) if (t.ann && t.ann.key === key) delete S.threads[t.id]; }

/* ── people ── */
function genNick(S) {
  for (let i = 0; i < 24; i++) {
    let n = pick(S, NICK_A) + pick(S, NICK_B);
    if (chance(S, 0.06)) n = 'xX_' + n + '_Xx';
    if (!S.notables.some(x => x.nick === n)) return n;
  }
  return 'member_' + rint(S, 100, 999);
}
function addNotable(S, trait, opt = {}) {
  const n = {
    id: S.nextNotable++, nick: opt.nick || (trait === 'seller' ? pick(S, SELLER_NICKS) + '_' + rint(S, 1, 99) : genNick(S)), seed: rint(S, 1, 1e9), trait,
    joined: S.turn, posts: opt.founder ? rint(S, 120, 400) : rint(S, 5, 60), loyalty: opt.founder ? 80 : rint(S, 52, 72),
    role: 'member', box: null, modType: null, morale: 0, founder: !!opt.founder, clone: !!opt.clone,
  };
  S.notables.push(n);
  return n;
}
const notableById = (S, id) => S.notables.find(n => n.id === id);
const liveNotables = S => S.notables.filter(n => n.role === 'member' || n.role === 'mod');
const modsOf = S => S.notables.filter(n => n.role === 'mod');
const maxMods = S => clamp(1 + Math.floor(S.active / 70), 1, 4);
function bumpLoyalty(S, id, d) { const n = id && notableById(S, id); if (n) n.loyalty = clamp(n.loyalty + d, 0, 100); }
function rankTitle(n) {
  if (n.role === 'mod') return 'Điều hành viên';
  if (n.role === 'banned') return 'Đã bị ban';
  if (n.role === 'left') return 'Đã rời 4rum';
  const p = n.posts;
  return p < 60 ? 'Thành viên mới' : p < 300 ? 'Thành viên' : p < 900 ? 'Thành viên tích cực' : p < 2000 ? 'Lão làng' : 'Huyền thoại sống';
}

/* ── month start ── */
function startTurn(S) {
  S.turnFx = freshTurnFx();
  S.log = [];
  S.inbox = [];
  for (const t of Object.values(S.threads)) t.fresh = false;
  for (const t of Object.values(S.threads)) if (t.ann && t.ann.until < S.turn) delete S.threads[t.id];
  const M = calcMods(S), season = seasonOf(S);
  let ap = BGS[S.bg].ap + S.apBonus + M.ap;
  if (S.bg === 'student' && season.studentAp) ap += season.studentAp;
  if (S.bg === 'student' && season.id === 'summer' && !season.studentAp) ap += 1;
  if (S.passion >= 80) ap += 1; else if (S.passion <= 25) ap -= 1;
  S.apMax = S.ap = Math.max(1, ap);

  if (S.turn > 1 && S.turn % 2 === 0 && liveNotables(S).length < 9) {
    const tr = wpick(S, Object.entries(ARCH[S.arch].traitW));
    const n = addNotable(S, tr);
    S.log.push({ k: 'join', text: `${n.nick} vừa gia nhập: ${TRAITS[tr].name.toLowerCase()}.` });
  }
  generateThreads(S);
  for (const n of liveNotables(S).filter(n => n.trait === 'expert')) {
    const q = Object.values(S.threads).find(t => t.type === 'request' && !t.answered);
    if (q) { answer(S, q); S.log.push({ k: 'help', text: `Chuyên gia ${n.nick} đã trả lời giúp "${q.title}".` }); }
  }
  modsAct(S);
  queueEvents(S);
  S.shop = rollShop(S);
  S.tick++;
}

function genWeights(S, box, M, season) {
  const aff = BOXES[box.type].aff, act = Math.max(1, S.active);
  const newRatio = clamp(S.newActiveLast / act, 0, 1), coreRatio = clamp(S.core / act, 0, 1);
  const out = [];
  for (const k in GEN_BASE) {
    let v = GEN_BASE[k] * (aff[k] || 1) * M.gen[k] * (season.gen[k] || 1);
    if (k === 'request') v *= 1 + newRatio * 2.5;
    if (k === 'chat') v *= 1 + newRatio;
    if (k === 'spam') v *= (1 + newRatio * 0.6) * (1 + S.guests / 5000);
    if (k === 'quality') v *= 0.6 + coreRatio * 2.6;
    if (k === 'drama') v *= (0.8 + Math.min(1.2, S.active / 500)) * (S.vibe < 40 ? 1.35 : 1);
    if (k === 'news' && S.arch !== 'fan' && box.type !== 'news') v *= 0.5;
    out.push([k, v]);
  }
  return out;
}
function generateThreads(S) {
  const M = calcMods(S), season = seasonOf(S);
  const boxes = S.boxes.filter(b => BOXES[b.type].draw > 0);
  if (!boxes.length) return;
  const n = clamp(Math.round((2 + S.active / 14) * season.act * M.act), 2, 2 + boxes.length * 2);
  for (let i = 0; i < n; i++) {
    const box = wpick(S, boxes.map(b => [b, BOXES[b.type].draw * (b.type === 'study' && season.exam ? 2 : 1)]));
    const type = wpick(S, genWeights(S, box, M, season));
    if (type === 'spam' && S.flags.regClosed === S.turn) continue;
    spawnThread(S, type, box.id);
  }
  for (let i = 0; i < (S.flags.extraSpam || 0); i++) if (S.flags.regClosed !== S.turn) spawnThread(S, 'spam', pick(S, boxes).id);
  S.flags.extraSpam = 0;
  for (const nt of liveNotables(S)) {
    const tr = TRAITS[nt.trait];
    if (!chance(S, tr.p)) continue;
    let type = tr.sig;
    if (type === 'news' && S.arch !== 'fan') type = 'hot';
    if (nt.trait === 'star' && chance(S, 0.22)) type = 'drama';
    if (nt.trait === 'fanatic' && chance(S, 0.18)) type = 'drama';
    if (type === 'spam' && S.flags.regClosed === S.turn) continue;
    const t = spawnThread(S, type, bestBoxFor(S, type).id, { byId: nt.id });
    if (nt.trait === 'lurker' && type === 'quality') t.legend = 1;
  }
}
function bestBoxFor(S, type) {
  const boxes = S.boxes.filter(b => BOXES[b.type].draw > 0);
  return wpick(S, boxes.map(b => [b, Math.pow(BOXES[b.type].aff[type] || 1, 2) * BOXES[b.type].draw]));
}

/* ── small thread verbs shared by admin, mods and events ── */
function answer(S, t) { t.answered = true; S.turnFx.answered++; t.replies += rint(S, 3, 9); bumpLoyalty(S, t.byId, 8); }
function calm(S, t) { t.heat = Math.max(1, t.heat - 1); t.calmed = S.turn; t.replies += rint(S, 2, 6); }
function lockThread(S, t) { t.locked = true; t.sticky = false; S.turnFx.vibe -= t.type === 'drama' ? 1 : 0.3; bumpLoyalty(S, t.byId, -10); }
function removeThread(S, t, how) {
  if (!S.threads[t.id]) return;
  if (t.type === 'quality') { S.turnFx.vibe -= 3; bumpLoyalty(S, t.byId, -25); }
  else if (t.type === 'drama') { S.turnFx.vibe -= 2; bumpLoyalty(S, t.byId, -20); }
  else if (t.type === 'request' && !t.answered) S.turnFx.vibe -= 1;
  else if (t.type !== 'spam' && t.type !== 'ann') S.turnFx.vibe -= 0.5;
  if (how !== 'event') S.stats.deleted++;
  delete S.threads[t.id];
}
function moveToChat(S, t) { const c = boxByType(S, 'chat'); if (!c) return false; t.box = c.id; t.last = S.turn + 0.9; trimBox(S, c.id); return true; }

const MOD_PLAN = {
  strict: [
    { verb: 'xóa spam', when: (S, t) => t.type === 'spam', go: (S, t) => removeThread(S, t, 'mod') },
    { verb: 'khóa drama', when: (S, t) => t.type === 'drama' && !t.locked, go: (S, t) => lockThread(S, t) },
    { verb: 'xóa bài lạc đề', when: (S, t, b) => t.type === 'chat' && b.type !== 'chat' && !t.locked, go: (S, t) => removeThread(S, t, 'mod') },
  ],
  kind: [
    { verb: 'trả lời câu hỏi', when: (S, t) => t.type === 'request' && !t.answered, go: (S, t) => answer(S, t) },
    { verb: 'can ngăn', when: (S, t) => t.type === 'drama' && !t.locked && t.heat >= 2 && t.calmed !== S.turn, go: (S, t) => calm(S, t) },
    { verb: 'xóa spam', when: (S, t) => t.type === 'spam', go: (S, t) => removeThread(S, t, 'mod') },
  ],
  busy: [
    { verb: 'xóa spam', when: (S, t) => t.type === 'spam', go: (S, t) => removeThread(S, t, 'mod') },
    { verb: 'trả lời câu hỏi', when: (S, t) => t.type === 'request' && !t.answered, go: (S, t) => answer(S, t) },
    { verb: 'khóa drama', when: (S, t) => t.type === 'drama' && !t.locked && t.heat >= 2, go: (S, t) => lockThread(S, t) },
    { verb: 'chuyển bài lạc đề', when: (S, t, b) => t.type === 'chat' && b.type !== 'chat' && !!boxByType(S, 'chat'), go: (S, t) => moveToChat(S, t) },
  ],
  tech: [{ verb: 'xóa spam', when: (S, t) => t.type === 'spam', go: (S, t) => removeThread(S, t, 'mod') }],
  fun: [{ verb: 'pha trò hạ hỏa', when: (S, t) => t.type === 'drama' && !t.locked && t.calmed !== S.turn, go: (S, t) => calm(S, t) }],
  tyrant: [
    { verb: 'xóa spam', when: (S, t) => t.type === 'spam', go: (S, t) => removeThread(S, t, 'mod') },
    { verb: 'khóa drama', when: (S, t) => t.type === 'drama' && !t.locked, go: (S, t) => lockThread(S, t) },
    { verb: 'xóa bài chất', when: (S, t) => t.type === 'quality' && !t.sticky && chance(S, 0.35), go: (S, t) => { removeThread(S, t, 'mod'); S.flags.tyrantStrikes = (S.flags.tyrantStrikes || 0) + 1; } },
    { verb: 'xóa bài lạc đề', when: (S, t) => t.type === 'chat' && !t.locked, go: (S, t) => removeThread(S, t, 'mod') },
  ],
};
function modsAct(S) {
  const M = calcMods(S);
  for (const n of modsOf(S)) {
    const box = boxOf(S, n.box);
    n.lastDid = [];
    if (!box) continue;
    const cap = MODTYPES[n.modType].cap + M.modCap;
    let done = 0;
    for (const step of MOD_PLAN[n.modType]) {
      for (const t of boxThreads(S, box.id)) {
        if (done >= cap) break;
        if (!S.threads[t.id] || !step.when(S, t, box)) continue;
        step.go(S, t, n); done++; n.lastDid.push(step.verb);
      }
    }
    if (n.lastDid.length) S.log.push({ k: 'mod', text: `Mod ${n.nick} (${box.name}): ${summarizeVerbs(n.lastDid)}.` });
    if (n.modType === 'tyrant' && (S.flags.tyrantStrikes || 0) >= 1 && !S.flags.tyrantExposed && !S.scheduled.some(e => e.id === 'tyrant')) schedule(S, 1, 'tyrant', { n: n.id });
  }
}
function summarizeVerbs(list) {
  const c = {};
  for (const v of list) c[v] = (c[v] || 0) + 1;
  return Object.entries(c).map(([v, k]) => (k > 1 ? `${v} ×${k}` : v)).join(', ');
}

/* ── admin actions ── */
const ok = (msg, extra) => ({ ok: true, msg, ...extra });
const no = msg => ({ ok: false, msg });
function spend(S, ap) { if (S.ap < ap) return false; S.ap -= ap; return true; }

function threadActions(S, t) {
  const out = [], by = t.byId ? t.by : null, box = boxOf(S, t.box);
  const slots = `${stickyCount(S)}/${S.sticky}`;
  const canStick = stickyCount(S) < S.sticky;
  const add = (id, label, ap, hint, blocked) => out.push({ id, label, ap, hint, blocked: blocked || (S.ap < ap ? 'Hết giờ online tháng này' : '') });
  if (t.type === 'ann') { add('delete', 'Gỡ thông báo', 0, 'Gỡ khỏi box Thông báo.'); return out; }
  if (t.sticky) add('unstick', 'Bỏ ghim', 0, 'Trả chỗ ghim cho thớt khác.');
  switch (t.type) {
    case 'spam':
      add('delete', 'Xóa', 1, 'Dọn sạch. Không khí hết bị kéo xuống.');
      add('ban', `Ban ${t.by}`, 1, 'Xóa thớt và chặn luôn nick rao vặt.');
      if (has(S, 'modtools')) add('clean', 'Dọn spam cả box', 1, `Xóa mọi thớt spam trong box ${box.name}.`);
      break;
    case 'drama':
      if (!t.locked) {
        add('reply', 'Vào can ngăn', 1, t.heat > 1 ? 'Hạ lửa một bậc. Thớt vẫn hút khách.' : 'Lửa đang nhỏ nhất rồi, can cũng không hạ thêm.', t.heat <= 1 || t.calmed === S.turn ? 'Không hạ thêm được tháng này' : '');
        add('lock', 'Khóa thớt', 1, `Dập lửa ngay. Không khí −1${by ? `, ${by} giận` : ''}.`);
        if (!t.sticky) add('sticky', 'Ghim lên đầu', 1, `Đổ dầu vào lửa: lượt xem ×1,8, không khí tụt nhanh gấp rưỡi. Chỗ ghim ${slots}.`, canStick ? '' : 'Hết chỗ ghim');
      } else add('unlock', 'Mở khóa', 0, 'Cho cãi tiếp.');
      add('delete', 'Xóa', 1, `Không khí −2${by ? `, ${by} rất giận` : ''}.`);
      add('ban', `Ban ${t.by}`, 1, by && notableById(S, t.byId).trait === 'warrior' ? 'Dọn người gây chuyện. Có thể quay lại bằng nick clone.' : 'Xóa thớt, chặn người gây chuyện.');
      break;
    case 'request':
      if (!t.answered) add('reply', 'Trả lời', 1, 'Người hỏi ở lại; người mới tháng này gắn bó hơn.');
      add('delete', 'Xóa', 1, 'Không khí −1.');
      break;
    case 'quality':
      if (!t.sticky) add('sticky', 'Ghim lên đầu', 1, `Lượt xem ×1,8. Ghim đủ ${3 - Math.min(2, Math.floor(t.legend))} tháng nữa là thành thớt huyền thoại. Chỗ ghim ${slots}.`, canStick ? '' : 'Hết chỗ ghim');
      if (!t.praised) add('reply', 'Khen ngợi', 1, `Không khí +1${by ? `, ${by} vui hơn` : ''}.`);
      add('delete', 'Xóa', 1, `Không khí −3${by ? `, ${by} rất giận` : ''}.`);
      break;
    case 'hot':
      if (!t.sticky) add('sticky', 'Ghim lên đầu', 1, `Lượt xem ×1,8 và không bùng drama. Chỗ ghim ${slots}.`, canStick ? '' : 'Hết chỗ ghim');
      if (!t.locked) add('lock', 'Khóa thớt', 1, 'Không lo bùng drama, nhưng lượt xem giảm hẳn.');
      add('delete', 'Xóa', 1, 'Không khí −0,5.');
      break;
    case 'news':
      if (!t.sticky) add('sticky', 'Ghim lên đầu', 1, `Khách đổ về gấp ba, danh tiếng +2 mỗi tháng. Chỗ ghim ${slots}.`, canStick ? '' : 'Hết chỗ ghim');
      add('delete', 'Xóa', 1, 'Không khí −0,5.');
      break;
    case 'chat':
      if (box.type !== 'chat') {
        const cb = boxByType(S, 'chat');
        add('move', 'Chuyển sang Chém gió', 1, cb ? 'Hết lạc đề: thành +không khí thay vì −.' : 'Chưa có box Chém gió.', cb ? '' : 'Chưa có box Chém gió');
      }
      if (!t.locked) add('lock', 'Khóa thớt', 1, 'Dừng chém gió ở đây.');
      add('delete', 'Xóa', 1, 'Không khí −0,5.');
      break;
    default:
      if (!t.sticky) add('sticky', 'Ghim lên đầu', 1, `Lượt xem ×1,8. Chỗ ghim ${slots}.`, canStick ? '' : 'Hết chỗ ghim');
      add('delete', 'Xóa', 1, 'Không khí −0,5.');
  }
  return out;
}
function doThreadAction(S, id, act) {
  const t = S.threads[id];
  if (!t) return no('Thớt này không còn nữa.');
  const a = threadActions(S, t).find(x => x.id === act);
  if (!a) return no('Không làm được việc này.');
  if (a.blocked) return no(a.blocked);
  if (!spend(S, a.ap)) return no('Hết giờ online tháng này.');
  switch (act) {
    case 'unstick': t.sticky = false; return ok('Đã bỏ ghim.');
    case 'sticky': t.sticky = true; t.last = S.turn + 1; bumpLoyalty(S, t.byId, 10); return ok('Đã ghim lên đầu box.', { fx: t.type === 'drama' ? 'fire' : 'pin' });
    case 'lock': lockThread(S, t); return ok('Đã khóa thớt.', { fx: 'lock' });
    case 'unlock': t.locked = false; return ok('Đã mở khóa.');
    case 'reply':
      if (t.type === 'request') { answer(S, t); return ok('Đã trả lời. Bạn mới cảm ơn rối rít.', { fx: 'reply' }); }
      if (t.type === 'drama') { calm(S, t); return ok('Bạn vào can. Lửa hạ bớt một bậc.', { fx: 'calm' }); }
      if (t.type === 'quality') { t.praised = true; S.turnFx.vibe += 1; bumpLoyalty(S, t.byId, 10); t.replies += rint(S, 4, 12); return ok('Bạn khen bài viết, cả box rôm rả hẳn.', { fx: 'reply' }); }
      return ok('Đã trả lời.');
    case 'delete': removeThread(S, t, 'admin'); return ok(t.type === 'spam' ? 'Đã xóa spam.' : 'Đã xóa thớt.', { fx: 'delete' });
    case 'move': moveToChat(S, t); return ok('Đã chuyển sang Chém gió.', { fx: 'move' });
    case 'clean': { let k = 0; for (const x of boxThreads(S, t.box)) if (x.type === 'spam') { removeThread(S, x, 'admin'); k++; } return ok(`Đã dọn ${k} thớt spam.`, { fx: 'delete' }); }
    case 'ban': return banAuthor(S, t);
  }
  return no('?');
}
function banAuthor(S, t) {
  const n = t.byId && notableById(S, t.byId);
  if (n) return banNotable(S, n, true);
  if (t.type !== 'spam' && t.type !== 'drama') S.turnFx.vibe -= 3;
  S.stats.bans++;
  delete S.threads[t.id];
  return ok(`Đã ban ${t.by}.`, { fx: 'ban' });
}
function banNotable(S, n, viaThread) {
  if (!viaThread && !spend(S, 1)) return no('Hết giờ online tháng này.');
  const bad = n.trait === 'warrior' || n.trait === 'seller' || n.modType === 'tyrant';
  for (const t of Object.values(S.threads)) if (t.byId === n.id) delete S.threads[t.id];
  n.role = 'banned'; n.box = null;
  S.stats.bans++;
  if (!bad) { S.turnFx.vibe -= 4; S.turnFx.passion -= 2; }
  if (n.trait === 'warrior' && chance(S, 0.45) && !n.clone) schedule(S, 2, 'clone', { n: n.id });
  return ok(bad ? `Đã ban ${n.nick}. Cả 4rum thở phào.` : `Đã ban ${n.nick}. Nhiều người thấy bất công.`, { fx: 'ban' });
}
function promote(S, nid, boxId) {
  const n = notableById(S, nid), box = boxOf(S, boxId);
  if (!n || n.role !== 'member') return no('Không thăng chức được người này.');
  if (!box) return no('Chọn box cho mod.');
  if (modsOf(S).length >= maxMods(S)) return no(`Ban quản trị đã đủ ${maxMods(S)} người. 4rum đông hơn thì mới cần thêm mod.`);
  if (!spend(S, 1)) return no('Hết giờ online tháng này.');
  n.role = 'mod'; n.box = box.id; n.morale = 70; n.loyalty = clamp(n.loyalty + 25, 0, 100);
  n.modType = TRAITS[n.trait].mod;
  if (n.trait === 'warrior' && chance(S, 0.65)) n.modType = 'tyrant';
  return ok(`${n.nick} giờ là mod box ${box.name}.`, { fx: 'promote' });
}
function demote(S, nid) {
  const n = notableById(S, nid);
  if (!n || n.role !== 'mod') return no('?');
  n.role = 'member'; n.box = null; n.loyalty = clamp(n.loyalty - 15, 0, 100);
  if (n.modType === 'tyrant') { S.turnFx.vibe += 3; S.flags.tyrantExposed = true; }
  n.modType = null;
  return ok(`${n.nick} không còn là mod.`);
}
function reassign(S, nid, boxId) {
  const n = notableById(S, nid);
  if (!n || n.role !== 'mod' || !boxOf(S, boxId)) return no('?');
  n.box = boxId;
  return ok(`Mod ${n.nick} chuyển sang box ${boxOf(S, boxId).name}.`);
}
function thankMod(S, nid) {
  const n = notableById(S, nid);
  if (!n || n.role !== 'mod') return no('?');
  if (n.thanked === S.turn) return no('Tháng này đã cảm ơn rồi.');
  if (!spend(S, 1)) return no('Hết giờ online tháng này.');
  n.thanked = S.turn; n.morale = clamp(n.morale + 30, 0, 100); n.loyalty = clamp(n.loyalty + 5, 0, 100);
  return ok(`${n.nick} vui hẳn lên.`, { fx: 'heart' });
}

function togglePolicy(S, id) {
  const P = POLICY_BY[id];
  if (S.policies.includes(id)) { S.policies = S.policies.filter(x => x !== id); removeAnn(S, 'policy:' + id); return ok(`Đã bãi bỏ: ${P.name}.`); }
  if (S.policies.length >= POLICY_SLOTS) return no('Nội quy tối đa 3 điều. Bãi bỏ một điều trước đã.');
  if (!spend(S, 1)) return no('Hết giờ online tháng này.');
  S.policies.push(id);
  announce(S, `Nội quy mới: ${P.name}`, 'policy:' + id, 2);
  return ok(`Đã ban hành: ${P.name}.`, { fx: 'rule' });
}
const pluginPrice = (S, id) => Math.round(PLUGIN_BY[id].price * calcMods(S).pluginCost);
function rollShop(S) {
  const avail = PLUGINS.filter(p => !has(S, p.id) && (!p.minTurn || S.turn >= p.minTurn));
  return shuffled(S, avail).slice(0, 3).map(p => p.id);
}
function buyPlugin(S, id) {
  const P = PLUGIN_BY[id];
  if (!P || has(S, id)) return no('?');
  const price = pluginPrice(S, id);
  if (S.funds < price) return no(`Cần ${fmtMoney(price)}, quỹ chỉ còn ${fmtMoney(S.funds)}.`);
  S.funds -= price;
  S.plugins.push(id);
  S.shop = S.shop.filter(x => x !== id);
  if (P.once) { if (P.once.vibe) S.vibe = clamp(S.vibe + P.once.vibe, 0, 100); if (P.once.fame) S.fame += P.once.fame; }
  announce(S, `Cài đặt mới: ${P.name}`, 'plugin:' + id, 1);
  return ok(`Đã cài ${P.name}.`, { fx: 'buy' });
}
function rerollShop(S) {
  if (S.funds < 30) return no('Cần 30k để xem lô hack khác.');
  S.funds -= 30;
  S.shop = rollShop(S);
  return ok('Một lô hack/mod khác.');
}
const hostingFee = (S, tier) => Math.round(HOSTING[tier].cost * calcMods(S).hostCost);
function setHosting(S, tier) {
  const cur = HOST_ORDER.indexOf(S.hosting), nxt = HOST_ORDER.indexOf(tier);
  if (nxt === cur) return no('Đang dùng gói này.');
  if (nxt > cur) {
    const fee = Math.round(hostingFee(S, tier) * 0.5);
    if (S.funds < fee) return no(`Phí chuyển nhà ${fmtMoney(fee)}, quỹ không đủ.`);
    if (!spend(S, 1)) return no('Chuyển host mất 1 giờ online.');
    S.funds -= fee;
  }
  S.hosting = tier;
  announce(S, `4rum đã chuyển sang ${HOSTING[tier].name}`, 'host', 1);
  return ok(`Đã chuyển sang ${HOSTING[tier].name}.`, { fx: 'host' });
}
function toggleAds(S, kind) { S.ads[kind] = !S.ads[kind]; return ok(S.ads[kind] ? 'Đã bật quảng cáo.' : 'Đã tắt quảng cáo.'); }

function activityState(S, id, arg) {
  const A = ACTIVITIES.find(a => a.id === id);
  const cost = id === 'offline' && boxByType(S, 'offline') ? Math.round(A.cost / 2) : A.cost;
  if (S.cd[id] && S.cd[id] > S.turn) return { A, cost, blocked: `Làm lại được từ ${monthLabel(S.cd[id]).toLowerCase()}` };
  if (A.minActive && S.active < A.minActive) return { A, cost, blocked: `Cần ít nhất ${A.minActive} thành viên tích cực` };
  if (id === 'openbox' && forumBoxes(S).length >= MAX_BOXES - 1) return { A, cost, blocked: 'Đủ box rồi' };
  if (id === 'openbox' && !openableBoxes(S).length) return { A, cost, blocked: 'Không còn loại box nào để mở' };
  if (S.funds < cost) return { A, cost, blocked: `Cần ${fmtMoney(cost)}` };
  if (S.ap < A.ap) return { A, cost, blocked: `Cần ${A.ap} giờ online` };
  return { A, cost, blocked: '' };
}
const openableBoxes = S => ARCH[S.arch].canOpen.filter(t => !boxByType(S, t));
function runActivity(S, id, arg) {
  const st = activityState(S, id, arg);
  if (st.blocked) return no(st.blocked);
  const A = st.A, M = calcMods(S);
  if (id === 'seed') {
    const box = boxOf(S, arg) || bestBoxFor(S, 'quality');
    S.ap -= A.ap;
    spawnThread(S, 'quality', box.id, { admin: true });
    S.turnFx.passion += 1;
    return ok(`Bài của admin đã lên box ${box.name}.`, { fx: 'reply' });
  }
  if (id === 'openbox') {
    if (!openableBoxes(S).includes(arg)) return no('Chọn loại box muốn mở.');
    S.ap -= A.ap; S.funds -= st.cost;
    const b = addBox(S, arg);
    announce(S, `Khai trương box mới: ${b.name}`, 'box', 1);
    return ok(`Đã mở box ${b.name}.`, { fx: 'build' });
  }
  S.ap -= A.ap; S.funds -= st.cost;
  if (A.cd) S.cd[id] = S.turn + A.cd;
  if (id === 'promo') {
    addEffect(S, { id: 'promo', label: 'Đi quảng bá', turns: 1, mods: { guest: 1.3 } });
    if (chance(S, 0.2)) { S.fame = Math.max(0, S.fame - 3); return ok('Bên kia ban nick bạn vì "spam quảng cáo". Nhưng vẫn kéo được ít khách.', { fx: 'promo' }); }
    return ok('Banner 4rum đã có mặt ở khắp các forum bạn bè.', { fx: 'promo' });
  }
  if (id === 'contest') {
    addEffect(S, { id: 'contest', label: 'Cuộc thi', turns: 2, mods: { gen: { quality: 1.6 }, vibeTurn: 2 } });
    S.fame += 5 * M.fameGain;
    announce(S, pick(S, ['Cuộc thi Chữ ký đẹp nhất 4rum', 'Cuộc thi Ảnh "Góc phố của tôi"', 'Cuộc thi Viết về 4rum mình']), 'contest', 2);
    return ok('Cuộc thi đã khai mạc!', { fx: 'party' });
  }
  if (id === 'drive') {
    const got = Math.round(S.core * 6 * (S.vibe / 100) * M.donate + 20);
    S.funds += got; S.vibe = clamp(S.vibe - 2, 0, 100);
    return ok(`Mọi người góp được ${fmtMoney(got)}.`, { fx: 'coin' });
  }
  if (id === 'offline') {
    const city = pick(S, CITIES);
    const add = Math.round((S.active - S.core) * 0.08);
    S.vibe = clamp(S.vibe + 8, 0, 100); S.passion = clamp(S.passion + 6, 0, 100); S.core = Math.min(S.active, S.core + add);
    announce(S, `Ảnh offline 4rum tại ${city} đây!`, 'offline', 1);
    return ok(`Offline ở ${city} vui nổ trời. +${add} lão làng.`, { fx: 'party' });
  }
  return no('?');
}
function addEffect(S, e) { S.effects = S.effects.filter(x => x.id !== e.id); S.effects.push({ ...e }); }
function schedule(S, inTurns, id, ctx = {}) { S.scheduled.push({ turn: S.turn + inTurns, id, ctx }); }

/* ── events ── */
function queueEvents(S) {
  const due = S.scheduled.filter(e => e.turn === S.turn);
  S.scheduled = S.scheduled.filter(e => e.turn !== S.turn);
  for (const e of due) pushEvent(S, e.id, e.ctx);
  for (const e of EVENTS) if (e.at && e.at(S)) pushEvent(S, e.id);
  let k = S.inbox.length >= 2 || S.turn === 1 ? 0 : chance(S, 0.8) ? 1 : 0;
  if (k && S.turn >= 5 && !S.inbox.length && chance(S, 0.22)) k = 2;
  for (let i = 0; i < k; i++) {
    const pool = EVENTS.filter(e => !e.at && !e.scheduled && (e.repeat || !S.flags.seen[e.id]) && (!e.cond || e.cond(S)) && !S.inbox.some(x => x.id === e.id));
    if (!pool.length) break;
    pushEvent(S, wpick(S, pool.map(e => [e, e.w || 1])).id);
  }
}
function pushEvent(S, id, ctx = {}) {
  const def = EVENT_BY[id];
  if (!def) return;
  if (def.prep) { const c = def.prep(S, ctx); if (c === null) return; if (c) ctx = c; }
  S.flags.seen[id] = (S.flags.seen[id] || 0) + 1;
  S.inbox.push({ uid: S.tick * 100 + S.inbox.length + 1, id, ctx, done: false, choice: -1, out: '' });
}
function eventView(S, ev) {
  const def = EVENT_BY[ev.id];
  const from = def.from(S, ev.ctx);
  const text = typeof def.text === 'function' ? def.text(S, ev.ctx) : def.text;
  const options = def.options(S, ev.ctx).map(o => {
    let blocked = '';
    if (o.req) { const r = o.req(S, ev.ctx); if (r !== true) blocked = r || 'Không đủ điều kiện'; }
    if (!blocked && o.ap && S.ap < o.ap) blocked = `Cần ${o.ap} giờ online`;
    if (!blocked && o.cost && S.funds < o.cost) blocked = `Cần ${fmtMoney(o.cost)}`;
    return { label: o.label, hint: o.hint || '', blocked };
  });
  return { from, text, options, buzz: !!def.buzz, boss: !!def.boss };
}
function chooseEvent(S, uid, idx) {
  const ev = S.inbox.find(e => e.uid === uid);
  if (!ev || ev.done) return no('?');
  const def = EVENT_BY[ev.id];
  const opt = def.options(S, ev.ctx)[idx];
  const view = eventView(S, ev).options[idx];
  if (!opt || view.blocked) return no(view ? view.blocked : '?');
  if (opt.ap) S.ap -= opt.ap;
  if (opt.cost) S.funds -= opt.cost;
  applyFx(S, opt.fx);
  let out = opt.out || '';
  if (opt.run) { const r = opt.run(S, ev.ctx); if (typeof r === 'string') out = r; }
  ev.done = true; ev.choice = idx; ev.out = out; ev.label = view.label;
  return ok(out);
}
function applyFx(S, f) {
  if (!f) return;
  if (f.funds) S.funds += f.funds;
  if (f.vibe) S.vibe = clamp(S.vibe + f.vibe, 0, 100);
  if (f.passion) S.passion = clamp(S.passion + f.passion, 0, 100);
  if (f.fame) S.fame = Math.max(0, S.fame + f.fame);
  if (f.ap) S.ap = Math.max(0, S.ap + f.ap);
  if (f.security) S.flags.sec = (S.flags.sec || 0) + f.security;
  if (f.activePct) { S.active = Math.max(0, Math.round(S.active * (1 + f.activePct))); S.core = Math.min(S.core, S.active); }
  if (f.core) S.core = clamp(S.core + f.core, 0, S.active);
  if (f.sticky) S.sticky += f.sticky;
  if (f.effect) addEffect(S, f.effect);
  if (f.flag) Object.assign(S.flags, f.flag);
}

/* ── month end ── */
function endTurn(S) {
  if (S.over) return no('Ván đã kết thúc.');
  if (S.inbox.some(e => !e.done)) return no('Còn tin nhắn chưa trả lời.');
  const M = calcMods(S), season = seasonOf(S), fx = S.turnFx;
  const R = { turn: S.turn, label: monthLabel(S.turn), notes: [], legends: [], flames: [], ignited: [] };
  const before = { members: S.members, active: S.active, core: S.core, funds: S.funds, vibe: S.vibe, passion: S.passion, fame: S.fame };
  let views = 0, spam = 0, flames = 0, fameGain = 0, vibeT = fx.vibe;
  const fxVibe0 = fx.vibe;
  const restHours = S.ap;

  for (const t of Object.values(S.threads)) {
    if (t.type === 'ann') continue;
    const st = t.sticky ? 1.8 : 1, box = boxOf(S, t.box);
    let v = 0;
    if (t.locked) {
      v = 25;
    } else switch (t.type) {
      case 'normal': v = 40 * st; break;
      case 'chat': v = 60 * st; vibeT += box.type === 'chat' ? 0.5 : -1; break;
      case 'request': v = 30; break;
      case 'quality':
        v = 90 * st * M.qualityViews; vibeT += t.sticky ? 1.1 : 0.5;
        if (t.sticky) { t.legend += 1 + M.legendSpeed; fameGain += 1; }
        break;
      case 'hot':
        v = 160 * st;
        if (!t.sticky && chance(S, 0.12)) { t.type = 'drama'; t.heat = 1; t.ignited = true; R.ignited.push(t.title); }
        break;
      case 'news': v = t.sticky ? 360 : 120; if (t.sticky) fameGain += 2; break;
      case 'drama':
        v = 120 * t.heat * st;
        vibeT -= t.heat * 0.8 * (t.sticky ? 1.5 : 1);
        if (t.heat >= 3) {
          flames++; R.flames.push(t.title);
          if (chance(S, 0.45)) spawnThread(S, 'drama', t.box, { spill: true, a: t.by, bump: 0.95 });
        }
        t.heat = Math.min(4, t.heat + 1);
        t.last = S.turn + 1 + rnd(S) * 0.3;
        break;
      case 'spam': v = 5; spam++; vibeT -= 1.5; break;
    }
    v = Math.round(v * (0.8 + rnd(S) * 0.4));
    t.views += v; t.replies += Math.round(v / (t.type === 'drama' ? 6 : 14));
    views += v;
    if (t.type === 'drama' && (!S.stats.biggest || t.views > S.stats.biggest.views)) S.stats.biggest = { title: t.title, views: t.views, turn: S.turn, by: t.by };
  }
  // legends, fuses, ageing
  for (const t of Object.values(S.threads)) {
    if (t.type === 'quality' && t.sticky && t.legend >= 3) {
      S.legends.push({ title: t.title, by: t.by, turn: S.turn });
      R.legends.push(t.title);
      bumpLoyalty(S, t.byId, 20);
      delete S.threads[t.id];
      continue;
    }
    if (t.type === 'ann') continue;
    t.age++;
    if (t.type === 'request' && t.answered) { delete S.threads[t.id]; continue; }
    if (t.type === 'request' || t.type === 'news') { t.fuse--; if (t.fuse <= 0) { sinkThread(S, t, 'age'); continue; } }
    if (!t.sticky && (t.age > 4 || (t.locked && t.age > 2))) sinkThread(S, t, 'age');
  }
  vibeT += S.turnFx.vibe - fxVibe0;          // penalties from threads that sank this month
  S.flags.extraSpam = Math.floor(spam / 3);   // broken windows: spam attracts more spam

  // traffic
  const legendViews = S.legends.length * 120 * (S.flags.picsDead && !has(S, 'album') ? 0.75 : 1);
  let guests = (views + S.fame * 10 + legendViews + 80) * M.guest * season.guest * (1 - Math.min(0.4, spam * 0.03));
  if (S.turn >= 19) guests *= Math.pow(1 - 0.12 * M.phay, S.turn - 18);
  let online = (S.active * 0.11 + (S.members - S.active) * 0.008 + guests * 0.006) * season.act * M.online * (1 + rnd(S) * 0.25);
  const H = HOSTING[S.hosting], cap = Math.round(H.cap * M.cap);
  let pDown = H.down * M.down;
  if (online > cap) pDown = Math.max(pDown, clamp((online / cap - 1) * 1.2 + 0.2, 0, 0.95) * M.down);
  const crashed = chance(S, pDown);
  if (crashed) { guests *= 0.55; online = Math.min(online, cap); S.stats.crashes++; }
  else if (online > cap) online = cap * (1 + rnd(S) * 0.05);
  guests = Math.round(guests); online = Math.round(online);

  // people
  const phayJoin = S.turn >= 19 ? Math.max(0.4, 1 - 0.07 * (S.turn - 18) * M.phay) : 1;
  const signups = Math.round(guests * 0.033 * M.signup * (crashed ? 0.5 : 1) * phayJoin);
  const rate = clamp(0.18 + 0.06 * S.turnFx.answered + M.activation + (S.vibe - 50) / 300, 0.06, 0.7);
  const newActive = Math.round(signups * rate);
  const phay = S.turn >= 19 ? (0.04 + 0.015 * (S.turn - 19)) * M.phay : 0;
  const churnRate = Math.max(0.02, 0.075 + Math.max(0, 55 - S.vibe) / 250 + 0.025 * flames + (crashed ? 0.04 : 0) + M.churn + phay);
  const nonCore = S.active - S.core;
  const lostActive = Math.round(nonCore * churnRate);
  const lostCore = Math.round(S.core * churnRate * 0.3 * M.coreChurn);
  const promo = Math.round(nonCore * Math.max(0, 0.015 + Math.max(0, S.vibe - 55) / 1500 + 0.003 * S.legends.length + M.core));
  S.members += signups;
  S.active = Math.max(0, S.active + newActive - lostActive - lostCore);
  S.core = clamp(S.core + promo - lostCore, 0, S.active);
  S.signupsLast = signups; S.newActiveLast = newActive; S.guests = guests; S.online = online;

  // mood of the place
  const excess = Math.max(0, forumBoxes(S).length - (2 + Math.floor(S.active / 25)));
  vibeT += M.vibeTurn + (season.vibe || 0) - excess - (crashed ? 6 : 0) - flames;
  S.vibe = clamp(S.vibe + vibeT + (55 - S.vibe) * 0.12, 0, 100);

  // money
  const inc = {}, exp = {};
  if (S.ads.banner) inc.ads = Math.round(guests * 0.025 * M.ads);
  if (S.ads.popup) inc.popup = Math.round(guests * 0.06 * M.ads);
  inc.donate = Math.round(S.core * 1.2 * (S.vibe / 100) * M.donate * (season.donate || 1));
  inc.allowance = BGS[S.bg].allowance;
  if (S.policies.includes('vip')) inc.vip = Math.round(S.active * POLICY_BY.vip.vip);
  if (S.policies.includes('classified')) inc.fee = Math.round(S.active * POLICY_BY.classified.fee);
  if (boxByType(S, 'market')) inc.market = Math.round(S.active * 0.15);
  exp.hosting = Math.round(H.cost * M.hostCost);
  const sumv = o => Object.values(o).reduce((a, b) => a + b, 0);
  const net = sumv(inc) - sumv(exp);
  S.funds += net;
  S.debt = S.funds < 0 ? S.debt + 1 : 0;

  // the admin
  const growth = (S.members - before.members) / Math.max(1, before.members);
  const mess = Object.values(S.threads).filter(t => t.type === 'spam' || (t.type === 'request' && !t.answered) || (t.type === 'drama' && !t.locked && t.heat >= 2)).length;
  const rest = Math.min(2, restHours);
  let dp = (S.turn <= 8 ? -2 : S.turn <= 16 ? -3 : -4.5) + M.passionTurn + S.turnFx.passion + rest - Math.min(4, mess * 0.5);
  if (growth >= 0.1) dp += 1; else if (S.active < before.active) dp -= 2;
  const record = online > S.record.n;
  if (record) { S.record = { n: online, turn: S.turn }; dp += 2; }
  if (S.vibe >= 75) dp += 1;
  dp += R.legends.length * 3 - flames * 3 - (S.vibe < 40 ? 3 : 0) - (crashed ? 4 : 0) - (S.funds < 0 ? 8 : 0);
  R.passionParts = { rest, mess: Math.min(4, mess * 0.5) };
  S.passion = clamp(S.passion + dp, 0, 100);
  S.fame = Math.max(0, S.fame * 0.97 + fameGain * M.fameGain + R.legends.length * 6);

  // staff & regulars
  for (const n of modsOf(S)) {
    const backlog = boxThreads(S, n.box).filter(t => t.type === 'spam' || (t.type === 'drama' && !t.locked && t.heat >= 2) || (t.type === 'request' && !t.answered)).length;
    n.morale = clamp(n.morale - 2 - backlog * 3 - (MODTYPES[n.modType].drain || 0) + M.modMorale + (S.vibe >= 70 ? 2 : 0), 0, 100);
    if (n.morale <= 0 && !S.scheduled.some(e => e.id === 'mod_quit' && e.ctx.n === n.id)) schedule(S, 1, 'mod_quit', { n: n.id });
  }
  for (const n of liveNotables(S)) {
    n.posts += rint(S, 4, 30);
    if (S.vibe >= 62) n.loyalty = Math.min(100, n.loyalty + 1); else if (S.vibe < 40) n.loyalty = Math.max(0, n.loyalty - 2);
    if (n.trait === 'newbie' && S.turn - n.joined >= 5 && n.loyalty >= 55 && chance(S, 0.35)) {
      n.trait = chance(S, 0.5) ? 'veteran' : 'expert';
      R.notes.push(`${n.nick} đã lớn: từ newbie thành ${TRAITS[n.trait].name.toLowerCase()}.`);
    }
    if (n.loyalty < 15 && !S.scheduled.some(e => e.id === 'leaving' && e.ctx.n === n.id)) schedule(S, 1, 'leaving', { n: n.id });
  }
  S.totals.posts += Math.round(S.active * rint(S, 6, 12) + views / 40);
  S.stats.flame += flames;
  S.stats.peakMembers = Math.max(S.stats.peakMembers, S.members);
  S.stats.peakActive = Math.max(S.stats.peakActive, S.active);
  for (const e of S.effects) e.turns--;
  S.effects = S.effects.filter(e => e.turns > 0);

  // milestone at the end of acts I–III
  const mi = [6, 12, 18].indexOf(S.turn);
  if (mi >= 0) {
    const target = ARCH[S.arch].milestones[mi];
    R.milestone = { act: ACTS[mi].name, target, members: S.members, pass: S.members >= target };
    if (R.milestone.pass) { S.passion = clamp(S.passion + 8, 0, 100); S.fame += 8; schedule(S, 1, 'milestone', { act: mi }); }
    else S.passion = clamp(S.passion - 12, 0, 100);
  }

  Object.assign(R, {
    guests, online, cap, crashed, record, signups, newActive, left: lostActive + lostCore, promo, inc, exp, net, flamesN: flames, rest: restHours,
    d: { members: S.members - before.members, active: S.active - before.active, core: S.core - before.core, vibe: S.vibe - before.vibe, passion: S.passion - before.passion, funds: S.funds - before.funds, fame: S.fame - before.fame },
    answered: S.turnFx.answered, unanswered: S.turnFx.unanswered, log: S.log.slice(),
    events: S.inbox.filter(e => e.done).map(e => ({ id: e.id, label: e.label, out: e.out })),
  });
  S.report = R;
  S.history.push(snapshot(S));

  if (S.passion <= 0) S.over = { reason: 'passion', turn: S.turn };
  else if (S.debt >= 2) S.over = { reason: 'debt', turn: S.turn };
  else if (S.turn >= 4 && S.active < 4) S.over = { reason: 'empty', turn: S.turn };
  else if (S.turn >= TURNS) S.over = { reason: 'survived', turn: S.turn };
  if (S.over) { S.over.score = finalScore(S); S.over.rank = rankOf(S.over.score); return ok('over', { report: R }); }
  S.turn++;
  startTurn(S);
  return ok('next', { report: R });
}

function financeForecast(S) {
  const M = calcMods(S), season = seasonOf(S), inc = {}, exp = {};
  const g = S.guests;
  if (S.ads.banner) inc.ads = Math.round(g * 0.025 * M.ads);
  if (S.ads.popup) inc.popup = Math.round(g * 0.06 * M.ads);
  inc.donate = Math.round(S.core * 1.2 * (S.vibe / 100) * M.donate * (season.donate || 1));
  inc.allowance = BGS[S.bg].allowance;
  if (S.policies.includes('vip')) inc.vip = Math.round(S.active * POLICY_BY.vip.vip);
  if (S.policies.includes('classified')) inc.fee = Math.round(S.active * POLICY_BY.classified.fee);
  if (boxByType(S, 'market')) inc.market = Math.round(S.active * 0.15);
  exp.hosting = Math.round(HOSTING[S.hosting].cost * M.hostCost);
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  return { inc, exp, net: sum(inc) - sum(exp) };
}
const MONEY_LABEL = { ads: 'Banner quảng cáo', popup: 'Quảng cáo popup', donate: 'Thành viên ủng hộ', allowance: 'Tiền túi của bạn', vip: 'Nick màu VIP', fee: 'Phí rao vặt', market: 'Chợ trời', hosting: 'Tiền hosting' };

/* ── what's coming: shown in the control panel ── */
function forecast(S) {
  const out = [], next = S.turn + 1;
  if (next <= TURNS) { const s = seasonOf(S, next); if (s.tag) out.push({ k: 'season', when: monthLabel(next), text: `${s.tag}. ${s.note}` }); }
  const bosses = [[6, 'Bão spam bot'], [12, 'Hacker để mắt tới 4rum'], [18, `${ARCH[S.arch].rival} kéo quân sang`], [19, 'Mạng xã hội Phây xuất hiện']];
  for (const [t, label] of bosses) if (t >= S.turn && t - S.turn <= 3) out.push({ k: 'boss', when: t === S.turn ? 'Tháng này' : `Còn ${t - S.turn} tháng`, text: label });
  if (S.arch === 'fan') for (const t of [8, 16]) if (t > S.turn && t - S.turn <= 2) out.push({ k: 'hype', when: `Còn ${t - S.turn} tháng`, text: `Tin đồn: ${BAND.name} sắp ra album mới` });
  return out;
}
function milestoneNow(S) {
  const a = actOf(S.turn);
  if (a > 2) return null;
  return { act: ACTS[a].name, target: ARCH[S.arch].milestones[a], by: monthLabel(ACTS[a].end), members: S.members };
}

/* ── the end ── */
function finalScore(S) {
  const surv = S.over && S.over.reason === 'survived';
  return Math.round(S.stats.peakMembers + S.record.n * 6 + S.core * 5 + S.legends.length * 150 + S.fame * 4 + (surv ? 800 + S.active * 2 : S.turn * 20));
}
function rankOf(score) { let r = RANKS[0][1]; for (const [s, name] of RANKS) if (score >= s) r = name; return r; }
function checkAchievements(S, got) {
  const out = [], give = id => { if (!got[id]) { got[id] = true; out.push(id); } };
  if (S.record.n >= 100) give('rec100');
  if (S.record.n >= 500) give('rec500');
  if (S.legends.length >= 1) give('legend1');
  if (S.legends.length >= 5) give('legend5');
  if (S.members >= 1000) give('mem1000');
  if (S.members >= 3000) give('mem3000');
  if (S.funds >= 3000) give('rich');
  if (S.stats.flame >= 6) give('drama');
  if (S.over && S.over.reason === 'survived') {
    give('survive');
    if (S.stats.bans === 0) give('pacifist');
    if (S.stats.crashes === 0) give('stable');
  }
  return out;
}
