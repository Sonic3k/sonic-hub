/* ── Events arrive as messenger windows. at(S): fixed month; scheduled: only via schedule(); else random with cond(S). ── */
const SYS = {
  system: { nick: 'Hệ thống 4rum', sys: 'system', role: 'Thông báo tự động' },
  hacker: { nick: 'h4ck3r_kh0ng_d4nh', sys: 'hacker', role: 'Người lạ' },
  dad: { nick: 'Bố', sys: 'dad', role: 'Gia đình' },
  boss: { nick: 'Sếp', sys: 'boss', role: 'Trưởng phòng' },
  press: { nick: 'phong_vien_bao_teen', sys: 'press', role: 'Báo tuổi teen' },
  label: { nick: 'Hãng đĩa Ánh Sao', sys: 'label', role: 'Bộ phận bản quyền' },
  host: { nick: 'Nhà cung cấp hosting', sys: 'host', role: 'Chăm sóc khách hàng' },
  shop: { nick: 'shop_thoi_trang_xinh', sys: 'shop', role: 'Nhà tài trợ' },
};
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const fromN = (S, id) => { const n = notableById(S, id); return n ? { nick: n.nick, seed: n.seed, role: rankTitle(n), id: n.id } : { nick: 'Ai đó', sys: 'anon', role: '' }; };
const fromNick = (nick, role) => ({ nick, sys: 'anon', role: role || 'Thành viên' });
const rivalOf = S => ARCH[S.arch].rival;
const rivalAdmin = S => ({ nick: 'admin_' + slug(rivalOf(S)), sys: 'rival', role: 'Admin ' + rivalOf(S) });
function pickN(S, f) { const c = liveNotables(S).filter(f || (() => true)); return c.length ? pick(S, c) : null; }
function cleanSpam(S, frac) {
  const list = Object.values(S.threads).filter(t => t.type === 'spam');
  const k = Math.round(list.length * frac);
  shuffled(S, list).slice(0, k).forEach(t => removeThread(S, t, 'event'));
  return k;
}
function removeIds(S, ids) { let k = 0; for (const id of ids || []) if (S.threads[id]) { removeThread(S, S.threads[id], 'event'); k++; } return k; }
function stickIfFree(S, t) { if (stickyCount(S) < S.sticky) { t.sticky = true; return true; } return false; }
function loseData(S, bad) {
  if (!bad) return 'Bạn thức tới 4 giờ sáng, dựng lại được gần như mọi thứ.';
  S.members = Math.round(S.members * 0.92); S.active = Math.round(S.active * 0.95); S.core = Math.min(S.core, S.active);
  const lost = S.legends.pop();
  return lost ? `Mất một phần dữ liệu, kể cả thớt huyền thoại "${lost.title}". Đau lòng.` : 'Mất một phần dữ liệu thành viên. Đau lòng.';
}
function offlineParty(S, cost) {
  const add = Math.round((S.active - S.core) * 0.07);
  S.vibe = clamp(S.vibe + 7, 0, 100); S.passion = clamp(S.passion + 5, 0, 100); S.core = Math.min(S.active, S.core + add);
  S.cd.offline = S.turn + 4;
  announce(S, `Ảnh offline 4rum tại ${pick(S, CITIES)} đây!`, 'offline', 1);
  return `Buổi offline vui nổ trời. Thêm ${add} lão làng.`;
}
const REWARD = {
  sticky: () => ({ label: 'Thêm 1 chỗ ghim', hint: 'Từ giờ ghim được thêm một thớt', fx: { sticky: 1 }, out: 'Thêm một chỗ ghim trên trang chủ.' }),
  ap: () => ({ label: 'Thêm 1 giờ online mỗi tháng', hint: 'Giữ mãi tới cuối ván', run: S => { S.apBonus++; S.ap++; return 'Bạn sắp xếp lại lịch, mỗi tháng rảnh thêm một giờ cho 4rum.'; } }),
  funds: () => ({ label: 'Nhà tài trợ: +500k', hint: 'Quỹ +500k ngay', fx: { funds: 500 }, out: 'Quỹ rủng rỉnh hẳn.' }),
  veteran: () => ({ label: 'Một lão làng từ forum cũ chuyển sang', hint: 'Thêm một thành viên Lão làng hiền rất gắn bó', run: S => { const n = addNotable(S, 'veteran'); n.loyalty = 90; n.posts = rint(S, 1200, 2400); S.core = Math.min(S.active, S.core + 1); return `${n.nick} chuyển nhà sang 4rum mình, mang theo cả kho bài hay.`; } }),
  plugin: (S, c) => { const P = PLUGIN_BY[c.plugin]; return { label: `Tặng hack: ${P.name}`, hint: P.desc, run: S => { if (!has(S, P.id)) S.plugins.push(P.id); if (P.once) applyFx(S, P.once); return `Đã cài ${P.name}, miễn phí.`; } }; },
};

const EVENTS = [
  { id: 'welcome', at: S => S.turn === 1,
    prep: S => ({ n: S.notables[0].id }),
    from: (S, c) => fromN(S, c.n),
    text: 'Anh ơi 4rum mở rồi!!! Em rủ được mấy đứa bạn vào rồi đó :D Có gì em giúp được không?',
    options: (S, c) => { const n = notableById(S, c.n), b = boxByType(S, 'chat') || forumBoxes(S)[0], T = MODTYPES[TRAITS[n.trait].mod]; return [
      { label: 'Làm mod giúp anh nhé!', hint: `Bạn ấy thành mod box ${b.name} (${T.name.toLowerCase()}: ${T.desc.split('.')[0].toLowerCase()}). Không tốn giờ online`, run: S => { n.role = 'mod'; n.box = b.id; n.morale = 75; n.modType = TRAITS[n.trait].mod; n.loyalty = clamp(n.loyalty + 15, 0, 100); return `${n.nick} giờ là mod box ${b.name}. Đầu mỗi tháng bạn ấy sẽ tự dọn dẹp box này.`; } },
      { label: 'Rủ thêm bạn bè vào đi', hint: 'Khách +30% tháng này', fx: { effect: { id: 'friends', label: 'Bạn bè rủ nhau vào', turns: 1, mods: { guest: 1.3 } } }, out: 'Cả lớp nhận được link 4rum qua Yahoo.' },
      { label: 'Cứ chém gió cho vui nhé', hint: 'Không khí +3', fx: { vibe: 3 }, out: '"Dạ!!! =))"' },
    ]; } },
  /* ── the three tests and the new era ── */
  { id: 'spam_storm', boss: true, buzz: true, at: S => S.turn === 6,
    prep: S => {
      let n = 3 + forumBoxes(S).length;
      if (has(S, 'captcha')) n = Math.round(n * 0.3);
      if (S.policies.includes('approve')) n = Math.round(n * 0.4);
      const boxes = forumBoxes(S);
      for (let i = 0; i < n; i++) spawnThread(S, 'spam', pick(S, boxes).id, { bump: 0.9 });
      return { n };
    },
    from: () => SYS.system,
    text: (S, c) => c.n <= 2 ? `Một đàn bot spam tràn vào đêm giao thừa, may mà hàng rào chống bot chặn gần hết, chỉ lọt ${c.n} thớt.` : `Hàng trăm nick bot đăng ký trong đêm giao thừa! ${c.n} thớt spam đã mọc khắp các box. Bot thì đâu có nghỉ Tết.`,
    options: S => [
      { label: 'Thức trắng dọn spam', hint: 'Thêm 2 giờ online tháng này, nhiệt huyết −6', fx: { ap: 2, passion: -6 }, out: 'Bạn pha một ly cà phê và bắt đầu xóa.' },
      { label: 'Khóa đăng ký, quét nick bot', hint: 'Xóa một nửa số spam ngay. Tháng này không ai đăng ký được', run: S => { const k = cleanSpam(S, 0.5); addEffect(S, { id: 'closed', label: 'Khóa đăng ký', turns: 1, mods: { signup: 0 } }); S.flags.regClosed = S.turn + 1; return `Cửa đăng ký đóng lại, ${k} thớt spam bay màu.`; } },
      has(S, 'captcha')
        ? { label: 'Để mã xác nhận lo', hint: 'Không tốn gì', out: 'Mã xác nhận vẫn đứng gác.' }
        : { label: 'Cài mã xác nhận ngay', hint: `Quỹ −${fmtMoney(pluginPrice(S, 'captcha'))}. Xóa một nửa số spam, về sau spam −60%`, cost: pluginPrice(S, 'captcha'), run: S => { S.plugins.push('captcha'); const k = cleanSpam(S, 0.5); return `Mã xác nhận đã chặn cửa, ${k} thớt spam bay màu.`; } },
    ] },
  { id: 'hacker', boss: true, buzz: true, at: S => S.turn === 12,
    prep: S => {
      const sec = securityOf(S), safe = sec >= 4;
      if (!safe) { addEffect(S, { id: 'defaced', label: 'Trang chủ bị phá', turns: 1, mods: { guest: 0.45, signup: 0.5 } }); S.vibe = clamp(S.vibe - 8, 0, 100); S.passion = clamp(S.passion - 8, 0, 100); }
      return { safe, sec };
    },
    from: () => SYS.hacker,
    text: (S, c) => c.safe ? `Đêm qua có kẻ dò lỗi 4rum suốt 6 tiếng mà không lọt được (bảo mật ${c.sec}/4). Hắn để lại đúng một dòng: "Gặp lại sau :))".` : `Sáng nay trang chủ chỉ còn nền đen và dòng chữ "Hacked by h4ck3r, admin ngủ ngon nha" (bảo mật mới ${c.sec}/4). Tháng này khách vào ít hẳn.`,
    options: (S, c) => c.safe ? [
      { label: 'Tự hào ghê!', hint: 'Danh tiếng +4, nhiệt huyết +5', fx: { fame: 4, passion: 5 }, out: 'Cả Ban quản trị ăn mừng trong chatbox.' },
    ] : [
      has(S, 'backup')
        ? { label: 'Khôi phục từ bản sao lưu', hint: 'Không mất dữ liệu. Bảo mật +1', fx: { security: 1 }, out: 'Bản sao lưu đêm qua cứu cả 4rum.' }
        : { label: 'Tự mày mò khôi phục', hint: 'Mất 2 giờ online. 50% vẫn mất một phần dữ liệu', ap: 2, run: S => loseData(S, chance(S, 0.5)) },
      { label: 'Thuê người khôi phục', hint: 'Quỹ −350k. Không mất dữ liệu, bảo mật +2', cost: 350, fx: { security: 2 }, out: 'Chuyên gia vá lỗ hổng, dựng lại trang chủ trong một đêm.' },
      { label: 'Làm lại từ đầu', hint: 'Mất một phần thành viên và một thớt huyền thoại', run: S => loseData(S, true) },
    ] },
  { id: 'war', boss: true, buzz: true, at: S => S.turn === 18,
    prep: S => {
      const ids = [];
      for (const b of shuffled(S, forumBoxes(S)).slice(0, 3)) ids.push(spawnThread(S, 'drama', b.id, { heat: 2, bump: 1, by: 'quan_' + slug(rivalOf(S)) + '_' + rint(S, 1, 99) }).id);
      return { ids, loss: Math.max(3, Math.round(S.active * 0.12)) };
    },
    from: S => rivalAdmin(S),
    text: (S, c) => `Bên ${rivalOf(S)} vừa kéo quân sang gây chiến ở 3 box, còn nhắn riêng rủ thành viên mình bỏ sang bên đó. Khoảng ${c.loss} người tích cực đang lung lay.`,
    options: (S, c) => [
      { label: 'Kêu gọi đoàn kết', hint: 'Cần không khí từ 60. Chỉ mất vài người, không khí +3', req: S => S.vibe >= 60 || `Không khí mới ${Math.round(S.vibe)}, chưa tới 60`, run: S => { const l = Math.round(c.loss * 0.3); S.active -= l; S.core = Math.min(S.core, S.active); S.vibe = clamp(S.vibe + 3, 0, 100); return `Cả 4rum đổi avatar đồng phục. Chỉ ${l} người bỏ đi.`; } },
      { label: 'Đáp trả tới cùng', hint: 'Mất cả số đang lung lay, nhưng khách tò mò +40% và nhiệt huyết +4', run: S => { S.active -= c.loss; S.core = Math.min(S.core, S.active); addEffect(S, { id: 'warfans', label: 'Khách hóng chiến', turns: 1, mods: { guest: 1.4 } }); S.passion = clamp(S.passion + 4, 0, 100); return `Chiến tranh 4rum nổ ra. ${c.loss} người bỏ sang bên kia, nhưng cả cõi mạng kéo đến xem.`; } },
      { label: 'Đóng cửa với khách 1 tháng', hint: 'Dập hết drama vừa nổ, mất nửa số lung lay, khách −60% tháng này', run: S => { removeIds(S, c.ids); const l = Math.round(c.loss / 2); S.active -= l; S.core = Math.min(S.core, S.active); addEffect(S, { id: 'shut', label: 'Đóng cửa với khách', turns: 1, mods: { guest: 0.4 } }); return `Cửa đóng then cài. ${l} người vẫn bỏ đi.`; } },
    ] },
  { id: 'phay', boss: true, at: S => S.turn === 19,
    from: () => SYS.system,
    text: 'Mạng xã hội "Phây" đang nổi như cồn. Lớp nào cũng có nick Phây, ai cũng hỏi nhau: "4rum còn ai không?". Từ giờ mỗi tháng sẽ có người bỏ đi, ngày càng nhiều.',
    options: S => [
      { label: 'Lập trang Phây cho 4rum', hint: 'Người bỏ đi chậm hơn 30%, khách +10%', fx: { flag: { fanpage: true } }, out: 'Trang Phây của 4rum có ngay 300 lượt thích.' },
      has(S, 'wap')
        ? { label: 'Đã có giao diện điện thoại', hint: 'Không cần làm gì thêm', out: 'Thành viên vẫn vào 4rum bằng điện thoại mỗi ngày.' }
        : { label: 'Làm giao diện cho điện thoại', hint: `Quỹ −${fmtMoney(pluginPrice(S, 'wap'))}. Người bỏ đi chậm hơn 40%, online +10%`, cost: pluginPrice(S, 'wap'), run: S => { S.plugins.push('wap'); return 'Giờ vào 4rum bằng điện thoại cũng mượt.'; } },
      { label: 'Kệ, 4rum mình khác', hint: 'Không khí +3, lão làng bám trụ hơn 20%', fx: { vibe: 3, flag: { pride: true } }, out: 'Lão làng gật gù: "4rum là nhà".' },
    ] },

  /* ── scheduled consequences ── */
  { id: 'milestone', scheduled: true,
    prep: (S, c) => { const avail = PLUGINS.filter(p => !has(S, p.id) && (!p.minTurn || S.turn >= p.minTurn)); const picks = shuffled(S, ['sticky', 'ap', 'funds', 'veteran', avail.length ? 'plugin' : 'funds']).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3); return { ...c, picks, plugin: avail.length ? pick(S, avail).id : null }; },
    from: () => SYS.system,
    text: (S, c) => `Chúc mừng! 4rum đã vượt mốc ${ACTS[c.act].name} với hơn ${fmtN(ARCH[S.arch].milestones[c.act])} thành viên. Chọn một phần thưởng:`,
    options: (S, c) => c.picks.map(p => REWARD[p](S, c)) },
  { id: 'mod_quit', scheduled: true,
    prep: (S, c) => { const n = notableById(S, c.n); return n && n.role === 'mod' ? c : null; },
    from: (S, c) => fromN(S, c.n),
    text: (S, c) => { const n = notableById(S, c.n), b = boxOf(S, n.box); return `Anh ơi, em mệt quá :(( Box ${b ? b.name : ''} ngày nào cũng ngập việc. Em xin nghỉ mod một thời gian nhé.`; },
    options: (S, c) => [
      { label: 'Níu kéo, hứa sẽ đỡ việc', hint: '1 giờ online. Tinh thần mod lên lại 45', ap: 1, run: S => { notableById(S, c.n).morale = 45; return 'Bạn ấy đồng ý ở lại thêm. "Nhớ giữ lời đó nha anh!"'; } },
      { label: 'Cảm ơn và để bạn ấy nghỉ', hint: 'Mất một mod, bạn ấy vẫn ở lại 4rum', run: S => { const n = notableById(S, c.n); n.role = 'member'; n.box = null; n.modType = null; n.loyalty = clamp(n.loyalty + 5, 0, 100); return 'Bạn ấy về làm thành viên thường, vẫn hay ghé chém gió.'; } },
    ] },
  { id: 'tyrant', scheduled: true, buzz: true,
    prep: (S, c) => { const n = notableById(S, c.n); return n && n.role === 'mod' && n.modType === 'tyrant' ? { ...c, who: genNick(S) } : null; },
    from: (S, c) => fromNick(c.who),
    text: (S, c) => `Mod ${notableById(S, c.n).nick} xóa bài tâm huyết của em mà không nói một lời! Không chỉ em đâu, cả box đang bức xúc. Admin xem lại đi!!!`,
    options: (S, c) => [
      { label: `Cách chức ${notableById(S, c.n).nick}`, hint: 'Không khí +4. Cựu mod rất giận', run: S => { const n = notableById(S, c.n); n.role = 'member'; n.box = null; n.modType = null; n.loyalty = clamp(n.loyalty - 40, 0, 100); S.vibe = clamp(S.vibe + 4, 0, 100); S.flags.tyrantExposed = true; return 'Cả 4rum vỗ tay. Cựu mod đổi chữ ký thành "Ở hiền chưa chắc gặp lành".'; } },
      { label: 'Nói chuyện riêng với mod', hint: '1 giờ online. 60% mod sửa đổi', ap: 1, run: S => { const n = notableById(S, c.n); S.flags.tyrantExposed = true; if (chance(S, 0.6)) { n.modType = 'strict'; return 'Mod nhận sai, hứa sẽ nhẹ tay hơn. Lần này có vẻ thật lòng.'; } S.vibe = clamp(S.vibe - 3, 0, 100); return 'Mod cãi lại một hồi rồi tắt nick. Chẳng có gì thay đổi.'; } },
      { label: 'Bênh mod', hint: 'Không khí −6, mod vẫn làm như cũ', fx: { vibe: -6 }, out: 'Thành viên bàn tán: "Admin với mod một phe rồi".' },
    ] },
  { id: 'leaving', scheduled: true,
    prep: (S, c) => { const n = notableById(S, c.n); return n && (n.role === 'member' || n.role === 'mod') ? c : null; },
    from: (S, c) => fromN(S, c.n),
    text: 'Mình nghĩ đã đến lúc rời 4rum. Cảm ơn mọi người vì quãng thời gian qua. Bài tạm biệt mình để ở box Chém gió.',
    options: (S, c) => [
      { label: 'Nhắn tin níu kéo', hint: '1 giờ online. 60% bạn ấy ở lại', ap: 1, run: S => { const n = notableById(S, c.n); if (chance(S, 0.6)) { n.loyalty = 50; return 'Hai người nói chuyện tới khuya. Bạn ấy xóa bài tạm biệt.'; } n.role = 'left'; n.box = null; return 'Bạn ấy cảm ơn, nhưng vẫn đi.'; } },
      { label: 'Tổ chức chia tay đàng hoàng', hint: 'Bạn ấy rời đi, không khí +1', run: S => { const n = notableById(S, c.n); n.role = 'left'; n.box = null; S.vibe = clamp(S.vibe + 1, 0, 100); return 'Cả 4rum viết lời tạm biệt. Có người khóc thật.'; } },
      { label: 'Mặc kệ', hint: 'Bạn ấy rời đi trong một bài viết đầy trách móc', run: S => { const n = notableById(S, c.n); n.role = 'left'; n.box = null; spawnThread(S, 'drama', bestBoxFor(S, 'drama').id, { heat: 2, title: 'Tôi rời 4rum. Đây là lý do.', by: n.nick, bump: 1 }); return 'Bài tạm biệt dài 5 trang, trang nào cũng có tên admin.'; } },
    ] },
  { id: 'clone', scheduled: true,
    prep: (S, c) => { const o = notableById(S, c.n); return o ? { ...c, nick: o.nick + pick(S, ['_clone', '_new', '_2', '_comeback', '_vip']), who: genNick(S) } : null; },
    from: (S, c) => fromNick(c.who),
    text: (S, c) => `Có nick mới tên ${c.nick} vừa đăng ký, văn phong y hệt ${notableById(S, c.n).nick}... Mọi người đồn đó là nick clone.`,
    options: (S, c) => [
      { label: 'Ban luôn', hint: '1 giờ online. Có thể lại có clone khác', ap: 1, run: S => { S.stats.bans++; if (chance(S, 0.35)) schedule(S, 2, 'clone', { n: c.n }); return 'Nick clone bay màu sau đúng 3 bài viết.'; } },
      { label: 'Cho một cơ hội', hint: 'Nick clone ở lại, có thể lại gây chuyện', run: S => { addNotable(S, 'warrior', { nick: c.nick, clone: true }); return `${c.nick} hứa "lần này sẽ ngoan".`; } },
    ] },
  { id: 'confess_result', scheduled: true,
    prep: (S, c) => { const a = notableById(S, c.a), b = notableById(S, c.b); return a && b ? { ...c, yes: chance(S, 0.6) } : null; },
    from: (S, c) => fromN(S, c.a),
    text: (S, c) => c.yes ? `${notableById(S, c.b).nick} đồng ý rồi!!! Tụi mình chính thức là một đôi của 4rum :">` : `${notableById(S, c.b).nick} từ chối mình rồi... Bạn bè hai bên đang cãi nhau trong box Chém gió.`,
    options: (S, c) => c.yes
      ? [{ label: 'Chúc mừng hai bạn!', hint: 'Không khí +5, nhiệt huyết +3', run: S => { S.vibe = clamp(S.vibe + 5, 0, 100); S.passion = clamp(S.passion + 3, 0, 100); bumpLoyalty(S, c.a, 10); bumpLoyalty(S, c.b, 10); return 'Cả 4rum đổi chữ ký thành hình trái tim một tuần.'; } }]
      : [{ label: 'Ôi trời...', hint: 'Một thớt drama mới ở Chém gió', run: S => { const box = boxByType(S, 'chat') || bestBoxFor(S, 'drama'); spawnThread(S, 'drama', box.id, { heat: 1, bump: 1 }); return 'Tình yêu tuổi 4rum.'; } }] },
  { id: 'suspended', scheduled: true, buzz: true,
    from: () => SYS.host,
    text: 'Do khiếu nại bản quyền, chúng tôi tạm khóa 4rum của quý khách trong 1 tháng.',
    options: () => [
      { label: 'Đành chịu', hint: 'Khách và đăng ký −70% tháng này, nhiệt huyết −5', fx: { passion: -5, effect: { id: 'suspended', label: 'Bị khóa host', turns: 1, mods: { guest: 0.3, signup: 0.3 } } }, out: 'Cả tháng 4rum chỉ hiện trang "Account suspended".' },
      { label: 'Nộp phạt để mở lại', hint: 'Quỹ −200k', cost: 200, out: 'Mất tiền nhưng 4rum sống lại sau một ngày.' },
    ] },

  /* ── random life of a forum ── */
  { id: 'link', w: 3, cond: S => S.turn >= 3 && S.turn <= 14 && S.fame >= 8 && !S.flags.linked,
    prep: S => ({ other: pick(S, OTHER_FORUMS) }),
    from: (S, c) => ({ nick: 'admin_' + slug(c.other), sys: 'rival', role: 'Admin ' + c.other }),
    text: (S, c) => `Chào bạn, mình là admin ${c.other}. Hai 4rum mình trao đổi banner liên kết nhé? Đôi bên cùng có lợi :D`,
    options: () => [
      { label: 'Đồng ý', hint: 'Khách +12% mãi mãi', fx: { flag: { linked: true } }, out: 'Banner hai bên đã lên. "4rum anh em" từ nay.' },
      { label: 'Từ chối', hint: 'Không thay đổi gì', out: 'Bạn lịch sự từ chối.' },
    ] },
  { id: 'offline_idea', w: 3, cond: S => S.turn >= 3 && S.active >= 20 && (!S.cd.offline || S.cd.offline <= S.turn),
    prep: S => { const n = pickN(S, n => ['veteran', 'joker', 'star', 'fanatic'].includes(n.trait)); return n ? { n: n.id, city: pick(S, CITIES) } : null; },
    from: (S, c) => fromN(S, c.n),
    text: (S, c) => `Admin ơi tổ chức offline đi! Ở ${c.city}, cuối tuần này nhé, em lo phần địa điểm cho :D`,
    options: (S, c) => [
      { label: 'Tổ chức luôn', hint: 'Quỹ −120k. Không khí +7, nhiệt huyết +5, thêm lão làng', cost: 120, run: S => offlineParty(S) },
      { label: 'Để mọi người tự tổ chức', hint: 'Không khí +3. Có thể cãi nhau xem ai làm trưởng đoàn', run: S => { S.vibe = clamp(S.vibe + 3, 0, 100); if (chance(S, 0.35)) { spawnThread(S, 'drama', bestBoxFor(S, 'drama').id, { title: `Ai cho phép ${notableById(S, c.n).nick} làm trưởng đoàn offline?`, bump: 1 }); return 'Offline vẫn vui, nhưng có thớt cãi nhau về khâu tổ chức.'; } return 'Mọi người tự lo, vui vẻ.'; } },
      { label: 'Để dịp khác', hint: 'Bạn ấy hơi buồn', run: S => { bumpLoyalty(S, c.n, -6); return '"Dạ, vậy dịp khác nha anh..."'; } },
    ] },
  { id: 'confession', w: 3, cond: S => S.turn >= 2 && liveNotables(S).length >= 3,
    prep: S => { const b = pickN(S, n => n.trait === 'star') || pickN(S); const a = b && pickN(S, n => n.id !== b.id); return a && b ? { a: a.id, b: b.id, who: genNick(S) } : null; },
    from: (S, c) => fromNick(c.who),
    text: (S, c) => `${notableById(S, c.a).nick} vừa lập thớt tỏ tình với ${notableById(S, c.b).nick} ở box Chém gió!!! Cả 4rum đang ngồi hóng =))`,
    options: (S, c) => [
      { label: 'Ghim cho cả 4rum vào chúc', hint: 'Một thớt hot được ghim (nếu còn chỗ), không khí +2', run: S => { const t = spawnThread(S, 'hot', (boxByType(S, 'chat') || bestBoxFor(S, 'hot')).id, { title: `Mình thích ${notableById(S, c.b).nick} lâu rồi, hôm nay nói luôn!!!`, byId: c.a, bump: 1 }); stickIfFree(S, t); S.vibe = clamp(S.vibe + 2, 0, 100); schedule(S, 1, 'confess_result', { a: c.a, b: c.b }); return 'Thớt tỏ tình lên đầu 4rum, hàng trăm lời chúc.'; } },
      { label: 'Để tự nhiên', hint: 'Một thớt hot mới ở Chém gió', run: S => { spawnThread(S, 'hot', (boxByType(S, 'chat') || bestBoxFor(S, 'hot')).id, { title: `Mình thích ${notableById(S, c.b).nick} lâu rồi, hôm nay nói luôn!!!`, byId: c.a, bump: 1 }); schedule(S, 1, 'confess_result', { a: c.a, b: c.b }); return 'Cả 4rum hóng tiếp.'; } },
      { label: 'Khóa lại, chuyện riêng tư', hint: 'Không khí −1, hai bạn hơi ngượng', run: S => { S.vibe = clamp(S.vibe - 1, 0, 100); bumpLoyalty(S, c.a, -6); return 'Thớt bị khóa. Chuyện chuyển sang tin nhắn riêng.'; } },
    ] },
  { id: 'poach', w: 2, cond: S => S.turn >= 6 && S.turn !== 18 && S.active >= 40,
    from: S => rivalAdmin(S),
    text: S => `Bên ${rivalOf(S)} đang nhắn tin mời thành viên mình sang, hứa ai sang cũng cho làm mod.`,
    options: () => [
      { label: 'Ra thông báo đoàn kết', hint: '1 giờ online. Không mất ai, không khí +2', ap: 1, fx: { vibe: 2 }, out: '"4rum mình là nhà." Bài viết được cảm ơn 200 lần.' },
      { label: 'Sang bên đó "nói chuyện"', hint: 'Thêm một thớt drama lửa 2; khách tò mò +15% tháng này; nhiệt huyết +2', run: S => { spawnThread(S, 'drama', bestBoxFor(S, 'drama').id, { heat: 2, title: `Gửi ${rivalOf(S)}: đừng có mà cướp mem!`, admin: true, bump: 1 }); addEffect(S, { id: 'poachwar', label: 'Khách hóng chuyện', turns: 1, mods: { guest: 1.15 } }); S.passion = clamp(S.passion + 2, 0, 100); return 'Hai bên đấu khẩu, khách cả hai bên kéo đến xem.'; } },
      { label: 'Kệ họ', hint: 'Mất 6% thành viên tích cực', fx: { activePct: -0.06 }, out: 'Vài người lặng lẽ sang bên kia.' },
    ] },
  { id: 'copyright', w: 2, cond: S => S.turn >= 5 && (boxByType(S, 'share') || has(S, 'music')),
    from: () => SYS.label,
    text: 'Kính gửi Ban quản trị: yêu cầu gỡ toàn bộ link nhạc vi phạm bản quyền trên diễn đàn trong vòng 7 ngày.',
    options: () => [
      { label: 'Gỡ hết link', hint: 'Khách −12% trong 3 tháng, không khí −2', fx: { vibe: -2, effect: { id: 'takedown', label: 'Gỡ link nhạc', turns: 3, mods: { guest: 0.88 } } }, out: 'Box Chia sẻ buồn hẳn đi.' },
      { label: 'Chuyển link sang host nước ngoài', hint: 'Quỹ −120k', cost: 120, out: 'Link mới, nhạc vẫn đó.' },
      { label: 'Lờ đi', hint: '45% nhà host khóa 4rum một tháng', run: S => { if (chance(S, 0.45)) { schedule(S, 1, 'suspended'); return 'Im lặng... có vẻ êm. Tạm thời.'; } return 'Không thấy ai nhắc lại nữa.'; } },
    ] },
  { id: 'parents', w: 2.5, repeat: true, cond: S => S.bg === 'student' && S.turn >= 3 && (!S.flags.parentsT || S.turn - S.flags.parentsT >= 5) && (seasonOf(S).exam || chance(S, 0.3)),
    prep: S => { S.flags.parentsT = S.turn; return {}; },
    from: () => SYS.dad,
    text: 'Học hành thế nào mà suốt ngày ôm cái máy tính! Tháng này cấm lên mạng!',
    options: S => [
      { label: 'Vâng ạ...', hint: 'Mất 2 giờ online tháng này', fx: { ap: -2 }, out: 'Bạn ngồi học, lòng thì ở 4rum.' },
      { label: 'Lén ra quán net', hint: 'Quỹ −40k, nhiệt huyết −2', cost: 40, fx: { passion: -2 }, out: 'Máy số 12, ghế gãy, nhưng vẫn online được.' },
      { label: 'Nhờ mod trông giúp', hint: 'Mất 1 giờ online, tinh thần các mod −10', req: S => modsOf(S).length > 0 || 'Chưa có mod nào', run: S => { S.ap = Math.max(0, S.ap - 1); for (const n of modsOf(S)) n.morale = clamp(n.morale - 10, 0, 100); return 'Các mod gánh giúp, hơi mệt nhưng vui.'; } },
    ] },
  { id: 'boss', w: 2, cond: S => S.bg === 'office' && S.turn >= 2,
    from: () => SYS.boss,
    text: 'Em đang làm gì mà màn hình toàn chữ xanh xanh thế kia?',
    options: () => [
      { label: 'Tắt vội', hint: 'Mất 1 giờ online, nhiệt huyết −2', fx: { ap: -1, passion: -2 }, out: 'Bạn mở file Excel lên, tim đập thình thịch.' },
      { label: 'Thú thật đang làm admin 4rum', hint: '50/50: sếp cũng là thành viên, hoặc bị trừ lương', run: S => { if (chance(S, 0.5)) { S.fame += 3; S.passion = clamp(S.passion + 5, 0, 100); return 'Sếp cười: "Nick anh là lang_tu_gio_88 đấy, admin chăm vào nhé!"'; } S.funds -= 150; return 'Sếp không vui. Tháng này bị trừ 150k lương.'; } },
      { label: 'Xin nghỉ phép một ngày', hint: 'Thêm 1 giờ online, quỹ −80k', cost: 80, fx: { ap: 1 }, out: 'Một ngày trọn vẹn cho 4rum.' },
    ] },
  { id: 'press', w: 2, cond: S => S.turn >= 5 && S.fame >= 18,
    from: () => SYS.press,
    text: 'Chào admin! Báo mình muốn viết bài giới thiệu 4rum. Bạn muốn đăng kiểu nào?',
    options: () => [
      { label: 'Đăng ngay số tới', hint: 'Khách ×1,7 tháng này (coi chừng server), danh tiếng +6', fx: { fame: 6, effect: { id: 'press', label: 'Lên báo', turns: 1, mods: { guest: 1.7 } } }, out: 'Báo ra, khách ùn ùn kéo tới.' },
      { label: 'Đăng thành loạt bài', hint: 'Khách ×1,25 trong 3 tháng, danh tiếng +6', fx: { fame: 6, effect: { id: 'press', label: 'Loạt bài trên báo', turns: 3, mods: { guest: 1.25 } } }, out: 'Mỗi số báo lại nhắc tới 4rum một lần.' },
    ] },
  { id: 'mod_fight', w: 2, cond: S => modsOf(S).length >= 2,
    prep: S => { const [a, b] = shuffled(S, modsOf(S)); return { a: a.id, b: b.id }; },
    from: (S, c) => fromN(S, c.a),
    text: (S, c) => `Anh phân xử giùm! ${notableById(S, c.b).nick} cứ tự ý xóa bài trong box em quản lý. Tụi em cãi nhau to rồi, cả 4rum đang bàn tán.`,
    options: (S, c) => [
      { label: `Bênh ${notableById(S, c.a).nick}`, hint: `Tinh thần ${notableById(S, c.b).nick} −40`, run: S => { notableById(S, c.a).morale += 10; notableById(S, c.b).morale = clamp(notableById(S, c.b).morale - 40, 0, 100); return 'Một bên vui, một bên im lặng.'; } },
      { label: `Bênh ${notableById(S, c.b).nick}`, hint: `Tinh thần ${notableById(S, c.a).nick} −40`, run: S => { notableById(S, c.b).morale += 10; notableById(S, c.a).morale = clamp(notableById(S, c.a).morale - 40, 0, 100); return 'Một bên vui, một bên im lặng.'; } },
      { label: 'Họp Ban quản trị', hint: '2 giờ online. Cả hai +15 tinh thần, không khí +2', ap: 2, run: S => { notableById(S, c.a).morale += 15; notableById(S, c.b).morale += 15; S.vibe = clamp(S.vibe + 2, 0, 100); return 'Họp tới nửa đêm, cuối cùng bắt tay làm hòa.'; } },
    ] },
  { id: 'sponsor', w: 2, cond: S => S.turn >= 4 && S.funds < 300,
    from: () => SYS.shop,
    text: 'Shop mình muốn đặt một banner thật to ở đầu 4rum trong 4 tháng, trả trước 450k. Ok không bạn?',
    options: () => [
      { label: 'Nhận', hint: 'Quỹ +450k. Không khí −1,2 mỗi tháng trong 4 tháng', fx: { funds: 450, effect: { id: 'sponsor', label: 'Banner tài trợ', turns: 4, mods: { vibeTurn: -1.2 } } }, out: 'Banner hồng chóe đã lên đầu 4rum.' },
      { label: 'Từ chối', hint: 'Nhiệt huyết +2', fx: { passion: 2 }, out: 'Bạn muốn 4rum sạch sẽ.' },
    ] },
  { id: 'pics', w: 2.5, cond: S => S.turn >= 10 && S.turn <= 16 && S.arch !== 'game' && !S.flags.picsDead,
    from: () => SYS.system,
    text: 'Dịch vụ host ảnh miễn phí vừa đổi chính sách: ảnh trong các bài cũ giờ chỉ hiện một ô "ảnh không còn tồn tại".',
    options: S => has(S, 'album') ? [
      { label: 'May mà có kho ảnh riêng', hint: 'Không ảnh hưởng, danh tiếng +3', fx: { fame: 3 }, out: 'Ảnh của 4rum vẫn còn nguyên.' },
    ] : [
      { label: 'Kêu gọi mọi người up lại ảnh', hint: '1 giờ online, không khí −1', ap: 1, fx: { vibe: -1 }, out: 'Mọi người lục máy tìm ảnh cũ, up lại gần hết.' },
      { label: 'Mua kho ảnh riêng ngay', hint: `Quỹ −${fmtMoney(pluginPrice(S, 'album'))}. Từ giờ ảnh không chết nữa`, cost: pluginPrice(S, 'album'), run: S => { S.plugins.push('album'); return 'Kho ảnh riêng đã chạy.'; } },
      { label: 'Đành chịu', hint: 'Bài chất và thớt huyền thoại hút khách kém đi 25%, mãi mãi', fx: { flag: { picsDead: true } }, out: 'Những ô "ảnh không còn tồn tại" nằm lại trong các bài cũ.' },
    ] },
  { id: 'cable', w: 1.5, cond: S => S.turn >= 4,
    from: () => SYS.system,
    text: 'Đứt cáp quang biển! Mạng đi quốc tế chậm như rùa, mà server 4rum lại đặt ở nước ngoài.',
    options: () => [
      { label: 'Chuyển server về Việt Nam', hint: 'Quỹ −150k, không ảnh hưởng gì', cost: 150, out: 'Server mới ở trong nước, nhanh vèo vèo.' },
      { label: 'Ngồi chờ sửa cáp', hint: 'Khách −40% tháng này', fx: { effect: { id: 'cable', label: 'Đứt cáp quang', turns: 1, mods: { guest: 0.6, online: 0.7 } } }, out: 'Cả tháng vào 4rum như đi đường đất.' },
    ] },
  { id: 'virus', w: 2, cond: S => S.turn >= 3,
    prep: S => { const ids = []; const boxes = forumBoxes(S); for (let i = 0; i < 3; i++) ids.push(spawnThread(S, 'spam', pick(S, boxes).id, { title: pick(S, ['Clip hot cực sốc, xem ngay kẻo bị xóa >>>', 'Tải bộ smiley mới ở đây (file .exe)', 'Xem ai đã ghé thăm nick Yahoo của bạn!']), bump: 1 }).id); return { ids, who: genNick(S) }; },
    from: (S, c) => fromNick(c.who),
    text: 'Admin ơi có người rải link "xem clip hot" khắp 4rum, em bấm vào xong máy dính virus luôn rồi :((',
    options: (S, c) => [
      { label: 'Xóa hết và ban ngay', hint: '1 giờ online. Dọn sạch 3 thớt', ap: 1, run: S => { const k = removeIds(S, c.ids); S.stats.bans++; return `Đã dọn ${k} thớt độc.`; } },
      { label: 'Ra cảnh báo cho mọi người', hint: 'Không khí −2, link độc vẫn còn đó', fx: { vibe: -2 }, out: '"KHÔNG BẤM VÀO LINK LẠ!!!" được ghim ở box Thông báo.' },
    ] },
  { id: 'newbies', w: 2.5, cond: S => S.signupsLast >= 25,
    prep: S => { const boxes = forumBoxes(S); for (let i = 0; i < 2; i++) spawnThread(S, 'request', (boxByType(S, 'qa') || pick(S, boxes)).id); const m = pickN(S, n => n.role === 'mod') || pickN(S); return { n: m ? m.id : null }; },
    from: (S, c) => c.n ? fromN(S, c.n) : SYS.system,
    text: 'Tháng này người mới vào ồ ạt, ai cũng hỏi "cái này làm sao ạ?". Box nào cũng thấy câu hỏi.',
    options: () => [
      { label: 'Viết thớt hướng dẫn người mới', hint: '1 giờ online. Người mới ở lại +8% trong 2 tháng', ap: 1, run: S => { spawnThread(S, 'quality', (boxByType(S, 'qa') || bestBoxFor(S, 'quality')).id, { admin: true, title: '[Hướng dẫn] Cẩm nang cho thành viên mới (đọc trước khi hỏi)' }); addEffect(S, { id: 'guide', label: 'Cẩm nang người mới', turns: 2, mods: { activation: 0.08 } }); return 'Cẩm nang ra đời, câu hỏi giảm hẳn.'; } },
      { label: 'Giao cho các mod', hint: 'Người mới ở lại +5% trong 2 tháng, tinh thần mod −10', req: S => modsOf(S).length > 0 || 'Chưa có mod nào', run: S => { for (const n of modsOf(S)) n.morale = clamp(n.morale - 10, 0, 100); addEffect(S, { id: 'guide', label: 'Mod đón người mới', turns: 2, mods: { activation: 0.05 } }); return 'Các mod chia nhau trả lời.'; } },
      { label: 'Tự lo đi', hint: 'Thêm 2 câu hỏi mới nữa', run: S => { for (let i = 0; i < 2; i++) spawnThread(S, 'request', pick(S, forumBoxes(S)).id); return 'Câu hỏi càng lúc càng nhiều.'; } },
    ] },
  { id: 'contest_idea', w: 2, cond: S => S.turn >= 4 && !S.effects.some(e => e.id === 'contest'),
    prep: S => { const n = pickN(S, n => ['joker', 'star', 'veteran', 'expert'].includes(n.trait)); return n ? { n: n.id } : null; },
    from: (S, c) => fromN(S, c.n),
    text: 'Anh ơi mở cuộc thi Chữ ký đẹp đi, em xin làm giám khảo!',
    options: (S, c) => [
      { label: 'Mở luôn!', hint: 'Quỹ −50k. 2 tháng: bài chất ×1,5, không khí +1,5/tháng', cost: 50, run: S => { addEffect(S, { id: 'contest', label: 'Cuộc thi chữ ký', turns: 2, mods: { gen: { quality: 1.5 }, vibeTurn: 1.5 } }); announce(S, 'Cuộc thi Chữ ký đẹp nhất 4rum', 'contest', 2); bumpLoyalty(S, c.n, 10); return 'Cả 4rum đua nhau làm chữ ký lấp lánh.'; } },
      { label: 'Để tháng sau', hint: 'Bạn ấy hơi buồn', run: S => { bumpLoyalty(S, c.n, -5); return '"Dạ..."'; } },
    ] },
  { id: 'tet', at: S => S.turn === 17,
    prep: S => { const n = pickN(S, n => n.trait === 'joker') || pickN(S); return { n: n ? n.id : null }; },
    from: (S, c) => c.n ? fromN(S, c.n) : SYS.system,
    text: 'Giao thừa rồi! Cả 4rum đang đếm ngược trong chatbox, chúc nhau rôm rả :D',
    options: () => [
      { label: 'Lì xì mỗi người một huy hiệu', hint: 'Không khí +5, nhiệt huyết +3', fx: { vibe: 5, passion: 3 }, out: 'Huy hiệu "Tết 2009" lấp lánh dưới nick mọi người.' },
      { label: 'Kêu gọi ủng hộ quỹ đầu năm', hint: 'Quỹ thêm theo số lão làng, không khí +1', run: S => { const got = Math.round(S.core * 5 + 50); S.funds += got; S.vibe = clamp(S.vibe + 1, 0, 100); return `Lì xì cho 4rum được ${fmtMoney(got)}.`; } },
    ] },
  { id: 'birthday', at: S => S.turn === 13,
    from: () => SYS.system,
    text: S => `${S.name} tròn 1 tuổi! Cả 4rum đang hỏi admin có làm gì không.`,
    options: () => [
      { label: 'Làm tiệc sinh nhật lớn', hint: 'Quỹ −120k. Không khí +6, nhiệt huyết +6, danh tiếng +5', cost: 120, fx: { vibe: 6, passion: 6, fame: 5 }, out: 'Bánh kem có in logo 4rum. Ai cũng chụp ảnh.' },
      { label: 'Đăng thớt kỷ niệm', hint: '1 giờ online. Một bài chất của admin, không khí +3', ap: 1, run: S => { spawnThread(S, 'quality', bestBoxFor(S, 'quality').id, { admin: true, title: '[Kỷ niệm] Một năm 4rum mình: nhìn lại từ những ngày đầu' }); S.vibe = clamp(S.vibe + 3, 0, 100); return 'Thớt kỷ niệm làm nhiều người nhớ lại ngày đầu.'; } },
      { label: 'Đổi banner mừng sinh nhật', hint: 'Không khí +1', fx: { vibe: 1 }, out: 'Banner có thêm cây nến số 1.' },
    ] },
  { id: 'album', boss: false, buzz: true, at: S => S.arch === 'fan' && (S.turn === 8 || S.turn === 16),
    prep: S => { addEffect(S, { id: 'hype', label: 'Album mới', turns: 2, mods: { guest: 1.8, online: 1.3 } }); const nb = boxByType(S, 'news') || bestBoxFor(S, 'news'); const album = S.turn === 8 ? BAND.albums[1] : BAND.albums[2]; const t = spawnThread(S, 'news', nb.id, { title: `[Tin nóng] ${BAND.name} chính thức phát hành album "${album}"!`, bump: 1 }); const n = pickN(S, n => n.trait === 'fanatic'); return { album, t: t.id, n: n ? n.id : null }; },
    from: (S, c) => c.n ? fromN(S, c.n) : SYS.system,
    text: (S, c) => `ALBUM MỚI!!! ${BAND.name} vừa phát hành "${c.album}"!!! Fan cả nước đang đổ về 4rum tìm nghe, server bắt đầu nóng rồi anh ơi.`,
    options: (S, c) => [
      { label: 'Mở thớt tổng hợp và ghim', hint: '1 giờ online. Ghim tin album (nếu còn chỗ), danh tiếng +3', ap: 1, run: S => { const t = S.threads[c.t]; if (t) stickIfFree(S, t); S.fame += 3; return 'Thớt tổng hợp lên đầu 4rum, lượt xem nhảy liên tục.'; } },
      { label: 'Tổ chức nghe album cùng nhau', hint: 'Không khí +4', fx: { vibe: 4 }, out: 'Chatbox kín lời bình từng bài một.' },
      { label: 'Để fan tự lo', hint: 'Không làm gì thêm', out: 'Fan tự lo được, như mọi khi.' },
    ] },
  { id: 'split', buzz: true, at: S => S.arch === 'fan' && S.turn === 14,
    prep: S => { const ids = []; for (const b of shuffled(S, forumBoxes(S)).slice(0, 2)) ids.push(spawnThread(S, 'drama', b.id, { heat: 2, bump: 1 }).id); return { m: pick(S, BAND.members), ids }; },
    from: () => SYS.system,
    text: (S, c) => `[Tin sốc] ${c.m} tuyên bố rời nhóm ${BAND.name}! Fan khóc, fan giận, fan cãi nhau khắp 4rum.`,
    options: (S, c) => [
      { label: 'Thông báo kêu gọi bình tĩnh', hint: '1 giờ online. Mọi drama hạ một bậc lửa', ap: 1, run: S => { for (const t of Object.values(S.threads)) if (t.type === 'drama') t.heat = Math.max(1, t.heat - 1); return 'Bức thư của admin được lan khắp 4rum. Mọi người dịu lại.'; } },
      { label: 'Mở Góc tâm sự cho fan', hint: 'Mở box Góc tâm sự miễn phí, không khí +3', req: S => !boxByType(S, 'heart') || 'Đã có box này', run: S => { addBox(S, 'heart'); S.vibe = clamp(S.vibe + 3, 0, 100); return 'Góc tâm sự mở cửa. Fan có chỗ để khóc cùng nhau.'; } },
      { label: 'Để fan xả', hint: 'Khách +30% tháng này, không khí −3', fx: { vibe: -3, effect: { id: 'splitfans', label: 'Fan đổ về', turns: 1, mods: { guest: 1.3 } } }, out: 'Cả cõi mạng kéo vào xem fan khóc.' },
    ] },
  { id: 'exam_box', w: 3, cond: S => S.arch === 'teen' && seasonOf(S).exam && !boxByType(S, 'study'),
    prep: S => { const n = pickN(S, n => n.trait === 'newbie') || pickN(S); return { n: n ? n.id : null }; },
    from: (S, c) => c.n ? fromN(S, c.n) : SYS.system,
    text: 'Sắp thi rồi, mọi người xin mở box Học tập để chia sẻ đề cương với ạ!',
    options: () => [
      { label: 'Mở box Học tập', hint: 'Miễn phí. Không khí +2', run: S => { addBox(S, 'study'); S.vibe = clamp(S.vibe + 2, 0, 100); return 'Box Học tập kín đề cương sau một đêm.'; } },
      { label: '4rum để giải trí thôi', hint: 'Không khí −1', fx: { vibe: -1 }, out: 'Mọi người lủi thủi đi tìm forum khác để ôn thi.' },
    ] },
  { id: 'update', buzz: true, at: S => S.arch === 'game' && [5, 11, 17].includes(S.turn),
    prep: S => { addEffect(S, { id: 'hype', label: 'Bản cập nhật mới', turns: 2, mods: { guest: 1.6, online: 1.25 } }); const b = boxByType(S, 'gametalk') || bestBoxFor(S, 'news'); const t = spawnThread(S, 'news', b.id, { title: '[Tin nóng] Bá Vương Online ra bản cập nhật lớn: phái mới, boss mới!', bump: 1 }); return { t: t.id }; },
    from: () => SYS.system,
    text: 'Bá Vương Online vừa ra bản cập nhật lớn: phái mới, boss mới! Game thủ đổ về 4rum tìm thông tin.',
    options: (S, c) => [
      { label: 'Ghim tin cập nhật', hint: '1 giờ online. Danh tiếng +3', ap: 1, run: S => { const t = S.threads[c.t]; if (t) stickIfFree(S, t); S.fame += 3; return 'Tin cập nhật nằm đầu 4rum.'; } },
      { label: 'Mở giải đấu trong 4rum', hint: 'Quỹ −80k. Không khí +4, danh tiếng +4', cost: 80, fx: { vibe: 4, fame: 4 }, out: 'Giải đấu đầu tiên của 4rum!' },
      { label: 'Để game thủ tự lo', hint: 'Không làm gì thêm', out: 'Game thủ tự lo được.' },
    ] },
  { id: 'acc_sellers', w: 3, cond: S => S.arch === 'game' && S.turn >= 3,
    prep: S => { const ids = []; for (let i = 0; i < 4; i++) ids.push(spawnThread(S, 'spam', pick(S, forumBoxes(S)).id, { bump: 1 }).id); return { ids }; },
    from: () => SYS.system,
    text: 'Dân buôn acc kéo vào rao khắp nơi, box nào cũng có "bán acc VIP giá rẻ".',
    options: (S, c) => [
      { label: 'Mở box Chợ trời cho họ rao', hint: 'Mở Chợ trời miễn phí (thu phí rao vặt được). Spam vừa mọc vẫn còn', req: S => !boxByType(S, 'market') || 'Đã có Chợ trời', run: S => { addBox(S, 'market'); return 'Chợ trời khai trương, dân buôn có chỗ riêng.'; } },
      { label: 'Ban sạch', hint: '1 giờ online. Xóa hết 4 thớt vừa mọc', ap: 1, run: S => { const k = removeIds(S, c.ids); S.stats.bans += k; return `Đã ban ${k} nick buôn acc.`; } },
      { label: 'Mặc kệ', hint: 'Spam vẫn nằm đó', out: 'Dân buôn rao tiếp.' },
    ] },
  { id: 'photo_contest', w: 3, cond: S => S.arch === 'photo' && S.turn >= 4,
    from: () => SYS.press,
    text: 'Một cuộc thi ảnh toàn quốc mời các CLB gửi bài. 4rum mình có tham gia không?',
    options: () => [
      { label: 'Tổ chức chọn ảnh gửi đi', hint: '1 giờ online. Danh tiếng +10, thêm một bài chất', ap: 1, run: S => { S.fame += 10; spawnThread(S, 'quality', (boxByType(S, 'gallery') || bestBoxFor(S, 'quality')).id, { title: '[Bộ ảnh] Những tấm ảnh 4rum mình gửi đi thi', admin: true }); return 'Hai tấm ảnh của 4rum lọt vào vòng chung kết!'; } },
      { label: 'Thôi, để năm sau', hint: 'Không làm gì', out: 'Năm sau nhất định.' },
    ] },
  { id: 'blog360', at: S => S.turn === 23,
    from: () => SYS.system,
    text: 'Blog 360 sắp đóng cửa! Dân viết blog đang tìm nhà mới để chuyển đến.',
    options: () => [
      { label: 'Mở Góc tâm sự đón họ', hint: 'Mở box miễn phí. Đăng ký ×1,5 tháng này', req: S => !boxByType(S, 'heart') || 'Đã có Góc tâm sự', run: S => { addBox(S, 'heart'); addEffect(S, { id: 'bloggers', label: 'Dân blog chuyển nhà', turns: 1, mods: { signup: 1.5 } }); return 'Dân blog kéo sang, mang theo cả kho tâm sự.'; } },
      { label: 'Đăng thớt chào mừng', hint: 'Đăng ký ×1,3 tháng này, không khí +2', fx: { vibe: 2, effect: { id: 'bloggers', label: 'Dân blog chuyển nhà', turns: 1, mods: { signup: 1.3 } } }, out: '"Chào mừng các bạn từ 360!"' },
    ] },
  { id: 'host_offer', w: 2.5, cond: S => S.turn >= 4 && S.hosting !== 'dedi' && S.online > 0.7 * HOSTING[S.hosting].cap * calcMods(S).cap,
    prep: S => { const nx = HOST_ORDER[HOST_ORDER.indexOf(S.hosting) + 1]; return { nx, fee: Math.round(hostingFee(S, nx) * 0.25) }; },
    from: () => SYS.host,
    text: (S, c) => `4rum bạn sắp quá tải rồi. Nâng lên ${HOSTING[c.nx].name} ngay tháng này, giảm một nửa phí chuyển nhà nhé!`,
    options: (S, c) => [
      { label: `Nâng lên ${HOSTING[c.nx].name}`, hint: `Quỹ −${fmtMoney(c.fee)}, không tốn giờ online. Tiền thuê ${fmtMoney(hostingFee(S, c.nx))}/tháng`, cost: c.fee, run: S => { S.hosting = c.nx; return `Đã chuyển sang ${HOSTING[c.nx].name}.`; } },
      { label: 'Để sau', hint: 'Giữ gói hiện tại', out: 'Hy vọng server chịu nổi.' },
    ] },
  { id: 'ddos', w: 1.5, cond: S => S.turn >= 9 && S.fame >= 25 && securityOf(S) < 5,
    from: () => SYS.hacker,
    text: 'Đêm nay tao cho 4rum mày nghỉ ngơi một chút nhé :)) (4rum bị DDoS, lúc vào được lúc không)',
    options: () => [
      { label: 'Thuê dịch vụ chống DDoS', hint: 'Quỹ −250k', cost: 250, out: 'Lưu lượng rác bị chặn sạch.' },
      { label: 'Chịu trận', hint: 'Khách −50% tháng này, nhiệt huyết −4', fx: { passion: -4, effect: { id: 'ddos', label: 'Bị DDoS', turns: 1, mods: { guest: 0.5 } } }, out: 'Cả tháng 4rum chập chờn.' },
    ] },
  { id: 'rumor', w: 2, cond: S => S.turn >= 5 && liveNotables(S).some(n => n.trait === 'star'),
    prep: S => { const n = pickN(S, n => n.trait === 'star'); return { n: n.id, who: genNick(S) }; },
    from: (S, c) => fromNick(c.who),
    text: (S, c) => `Có tin đồn ${notableById(S, c.n).nick} đang hẹn hò với một mod, box Chém gió đang đào bới từng bài viết =))`,
    options: (S, c) => [
      { label: 'Khóa mọi thớt đồn đoán', hint: '1 giờ online. Không khí +1, bạn ấy biết ơn', ap: 1, run: S => { S.vibe = clamp(S.vibe + 1, 0, 100); bumpLoyalty(S, c.n, 12); return 'Tin đồn lắng xuống.'; } },
      { label: 'Kệ, vui mà', hint: 'Một thớt hot mới, có thể thành drama', run: S => { spawnThread(S, 'hot', (boxByType(S, 'chat') || bestBoxFor(S, 'hot')).id, { title: `Điều tra: ai là người ấy của ${notableById(S, c.n).nick}?`, bump: 1 }); bumpLoyalty(S, c.n, -6); return 'Cả 4rum thành thám tử.'; } },
    ] },
  { id: 'gift', w: 2, cond: S => S.vibe >= 70 && S.core >= 15,
    from: () => SYS.system,
    text: 'Các lão làng lén góp tiền tặng 4rum một năm hosting, kèm lời nhắn: "Admin vất vả rồi!"',
    options: () => [{ label: 'Cảm động quá!', hint: 'Quỹ +400k, nhiệt huyết +6', fx: { funds: 400, passion: 6 }, out: 'Bạn đọc đi đọc lại lời nhắn.' }] },
  { id: 'blackout', w: 1.2, cond: S => S.turn >= 3 && S.bg !== 'it',
    from: () => SYS.system,
    text: 'Cúp điện cả khu, mạng sập hai ngày liền.',
    options: () => [
      { label: 'Thắp nến ngồi chờ', hint: 'Mất 1 giờ online', fx: { ap: -1 }, out: 'Hai ngày dài nhất năm.' },
      { label: 'Ra quán net', hint: 'Quỹ −30k', cost: 30, out: 'Quán net đầu ngõ, máy 7.' },
    ] },
  { id: 'trolls', w: 1.5, cond: S => S.turn >= 7 && S.turn !== 18,
    prep: S => { const ids = []; const b = boxByType(S, 'chat') || bestBoxFor(S, 'drama'); for (let i = 0; i < 2; i++) ids.push(spawnThread(S, 'drama', b.id, { bump: 1, by: 'troll_' + rint(S, 100, 999) }).id); return { ids, who: genNick(S) }; },
    from: (S, c) => fromNick(c.who),
    text: 'Một nhóm nick lạ từ đâu kéo vào, chửi bới khắp nơi cho vui. Admin ơi!!!',
    options: (S, c) => [
      { label: 'Xóa hết và ban', hint: '1 giờ online. Dọn sạch 2 thớt', ap: 1, run: S => { const k = removeIds(S, c.ids); S.stats.bans += 2; return `Đã dọn ${k} thớt và ban cả nhóm.`; } },
      { label: 'Để mod lo', hint: 'Không làm gì thêm', out: 'Hy vọng các mod kịp tay.' },
    ] },
  { id: 'hacker_note', w: 2, cond: S => S.turn >= 4 && S.turn <= 10 && securityOf(S) < 3,
    from: () => SYS.hacker,
    text: '4rum mày dính lỗi bảo mật to đùng đó :)) Vá đi, không thì tháng 8 tao vào chơi.',
    options: () => [
      { label: 'Thuê người vá lỗi', hint: 'Quỹ −200k, bảo mật +2', cost: 200, fx: { security: 2 }, out: 'Đã vá. Tên hacker im bặt.' },
      { label: 'Nhờ Dân IT trong 4rum', hint: 'Cần một thành viên Dân IT. Bảo mật +2', req: S => liveNotables(S).some(n => n.trait === 'techie') || 'Chưa có Dân IT nào', run: S => { S.flags.sec = (S.flags.sec || 0) + 2; const n = pickN(S, n => n.trait === 'techie'); bumpLoyalty(S, n.id, 10); return `${n.nick} thức một đêm vá xong, chỉ xin một cái huy chương.`; } },
      { label: 'Kệ, dọa thôi mà', hint: 'Không làm gì', out: 'Bạn tắt cửa sổ chat.' },
    ] },
];
const EVENT_BY = Object.fromEntries(EVENTS.map(e => [e.id, e]));
