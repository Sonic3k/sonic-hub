// Usage: node sim.js [runs] [bot]   — plays the real engine headlessly with a greedy or random admin.
const fs = require('fs'), vm = require('vm'), path = require('path');
const SRC = path.join(__dirname, 'src') + '/';
for (const f of ['00-core.js', '10-data.js', '12-titles.js', '20-engine.js', '25-events.js']) vm.runInThisContext(fs.readFileSync(SRC + f, 'utf8'), { filename: f });

const evalState = S => S.passion * 1.1 + S.vibe * 0.6 + S.funds / 25 + S.active / 3 + S.core * 0.6 + S.fame * 0.3 - (S.funds < 0 ? 60 : 0) + S.ap * 2;
function botEvents(S, R, smart) {
  for (const ev of S.inbox.filter(e => !e.done)) {
    const v = eventView(S, ev);
    let best = -1, bestScore = -Infinity;
    v.options.forEach((o, i) => {
      if (o.blocked) return;
      if (!smart) { const sc = R(); if (sc > bestScore) { bestScore = sc; best = i; } return; }
      const C = JSON.parse(JSON.stringify(S));
      const r = chooseEvent(C, ev.uid, i);
      if (!r.ok) return;
      const sc = evalState(C) + R() * 2;
      if (sc > bestScore) { bestScore = sc; best = i; }
    });
    if (best < 0) throw new Error('all options blocked: ' + ev.id);
    const r = chooseEvent(S, ev.uid, best);
    if (!r.ok) throw new Error('choose failed ' + ev.id + ' ' + r.msg);
  }
}
const PLUGIN_PRI = ['captcha', 'thanks', 'donate', 'seo', 'shoutbox', 'medals', 'backup', 'birthday', 'firewall', 'wap', 'blog', 'album', 'rep', 'modtools', 'arcade', 'skin', 'toplist', 'music'];
function botActs(S, R) {
  const M = calcMods(S);
  // money
  const fc = financeForecast(S);
  if (!S.ads.banner && (fc.net < 0 || S.funds < 150)) toggleAds(S, 'banner');
  if (S.ads.banner && fc.net > 300 && S.funds > 1500) toggleAds(S, 'banner');
  // hosting
  const cap = HOSTING[S.hosting].cap * M.cap, i = HOST_ORDER.indexOf(S.hosting);
  if (S.online > 0.72 * cap && i < 3) { const nx = HOST_ORDER[i + 1]; if (S.funds > hostingFee(S, nx) * 2.2) setHosting(S, nx); }
  // plugins
  const reserve = hostingFee(S, S.hosting) * 2 + 120;
  for (const id of PLUGIN_PRI) if (S.shop.includes(id) && S.funds - pluginPrice(S, id) > reserve) buyPlugin(S, id);
  // policies
  for (const id of ['nospam', 'civil', 'post30']) if (S.policies.length < 3 && !S.policies.includes(id) && S.turn >= 2 && S.ap > 2) togglePolicy(S, id);
  // loop of small actions
  for (let guard = 0; guard < 12 && S.ap > 0; guard++) {
    const cand = [];
    const ts = Object.values(S.threads);
    const spamN = ts.filter(t => t.type === 'spam').length;
    for (const t of ts) for (const a of threadActions(S, t)) {
      if (a.blocked) continue;
      let v = 0;
      if (t.type === 'spam' && a.id === 'delete') v = 5 + (spamN >= 3 ? 2 : 0);
      if (t.type === 'spam' && a.id === 'ban' && t.byId) v = 7;
      if (t.type === 'spam' && a.id === 'clean') v = 3 * ts.filter(x => x.box === t.box && x.type === 'spam').length;
      if (t.type === 'drama' && a.id === 'lock') v = t.heat >= 2 ? 7 + t.heat * 2 : 1;
      if (t.type === 'drama' && a.id === 'reply') v = t.heat >= 2 ? 5.5 : 0;
      if (t.type === 'drama' && a.id === 'ban' && t.byId && notableById(S, t.byId).trait === 'warrior' && t.heat >= 2) v = 8;
      if (t.type === 'request' && a.id === 'reply') v = 4.5;
      if (t.type === 'news' && a.id === 'sticky') v = 7;
      if (t.type === 'quality' && a.id === 'sticky') v = 4.5 + t.legend * 1.5;
      if (t.type === 'hot' && a.id === 'sticky') v = 3;
      if (t.type === 'chat' && a.id === 'move') v = 2.5;
      if (t.type === 'quality' && a.id === 'reply') v = 1.2;
      if (v > 0) cand.push([v + R() * 0.5, () => doThreadAction(S, t.id, a.id)]);
    }
    if (modsOf(S).length < maxMods(S)) {
      const c = liveNotables(S).filter(n => n.role === 'member' && n.trait !== 'seller').sort((a, b) => (b.trait !== 'warrior') - (a.trait !== 'warrior') || b.loyalty - a.loyalty)[0];
      const boxes = forumBoxes(S).filter(b => !modsOf(S).some(m => m.box === b.id));
      if (c && boxes.length) cand.push([8, () => promote(S, c.id, (boxByType(S, 'chat') && boxes.includes(boxByType(S, 'chat')) ? boxByType(S, 'chat') : boxes[0]).id)]);
    }
    for (const m of modsOf(S)) if (m.morale < 35 && m.thanked !== S.turn) cand.push([6, () => thankMod(S, m.id)]);
    const act = (id, v, arg) => { if (!activityState(S, id, arg).blocked) cand.push([v, () => runActivity(S, id, arg)]); };
    act('offline', S.vibe < 62 && S.funds > 350 ? 8 : 0);
    act('contest', S.funds > 300 ? 3.5 : 0);
    act('promo', 2.2);
    act('drive', S.funds < 150 ? 8 : 0);
    const ob = openableBoxes(S);
    if (ob.length && S.active / Math.max(1, forumBoxes(S).length) > 26 && S.funds > 200) act('openbox', 6, ob[0]);
    const best = cand.filter(c => c[0] > 0).sort((a, b) => b[0] - a[0])[0];
    if (!best || best[0] < 2) break;
    best[1]();
  }
}
function botRandom(S, R) {
  for (let guard = 0; guard < 10 && S.ap > 0; guard++) {
    if (R() < 0.3) break;
    const ts = Object.values(S.threads);
    if (!ts.length) break;
    const t = ts[Math.floor(R() * ts.length)];
    const acts = threadActions(S, t).filter(a => !a.blocked);
    if (acts.length) doThreadAction(S, t.id, acts[Math.floor(R() * acts.length)].id);
  }
}
function play(seed, arch, bg, mode) {
  let rs = seed * 7919 + 13;
  const R = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  const S = newGame({ seed, arch, bg, name: '' });
  while (!S.over) {
    botEvents(S, R, mode !== 'random');
    if (mode === 'random') botRandom(S, R); else botActs(S, R);
    botEvents(S, R, mode !== 'random');
    const r = endTurn(S);
    if (!r.ok) throw new Error('endTurn failed: ' + r.msg);
    if (JSON.stringify(S).length > 600000) throw new Error('state too big');
  }
  return S;
}
module.exports = { botEvents, botActs, botRandom, play };
if (require.main === module) {
const runs = +process.argv[2] || 200, mode = process.argv[3] || 'greedy';
const pct = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)]; };
for (const arch of ['fan', 'teen', 'photo', 'game']) for (const bg of ['student', 'it', 'office']) {
  const res = [];
  for (let k = 0; k < runs; k++) res.push(play(1000 + k, arch, bg, mode));
  const surv = res.filter(S => S.over.reason === 'survived').length;
  const reasons = {}; res.forEach(S => { if (S.over.reason !== 'survived') reasons[S.over.reason + '@' + S.over.turn] = (reasons[S.over.reason + '@' + S.over.turn] || 0) + 1; });
  const ms = [6, 12, 18].map(t => res.filter(S => S.history.length > t && S.history[t].members >= ARCH[arch].milestones[[6, 12, 18].indexOf(t)]).length);
  const fail = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`${arch.padEnd(5)} ${bg.padEnd(7)} surv ${String(Math.round(surv / runs * 100)).padStart(3)}%  mem p50 ${String(pct(res.map(S => S.members), 0.5)).padStart(5)} p90 ${String(pct(res.map(S => S.members), 0.9)).padStart(5)}  act ${String(pct(res.map(S => S.active), 0.5)).padStart(4)}  rec ${String(pct(res.map(S => S.record.n), 0.5)).padStart(4)}  leg ${pct(res.map(S => S.legends.length), 0.5)}  score ${String(pct(res.map(S => S.over.score), 0.5)).padStart(5)}  ms ${ms.map(m => Math.round(m / runs * 100) + '%').join('/')}  crash ${pct(res.map(S => S.stats.crashes), 0.5)} flame ${pct(res.map(S => S.stats.flame), 0.5)}  | ${fail}`);
}
}
