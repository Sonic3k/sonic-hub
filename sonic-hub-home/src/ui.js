/* The slips of paper over the scene: the year, the hour, the list of rooms, the note that opens when a bright dot is
   touched. Everything said here is either read off the archive (and says where), or marked as a guess. */
import { HUB, YEARS, WALL, atOf } from './era.js';
import { VIEWS } from './plan.js';

const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

export const NOTES = {
  title: 'Chỗ nào là thật, chỗ nào là đoán',
  body: [
    ['p', 'Mặt bằng, đồ đạc và chỗ đặt của chúng theo hai video quay nhà tháng 6/2013 (Hydrocity → [2013.06] Van Bao Home), mấy tấm ảnh chụp ở nhà ngày 22/9/2012 và hai tấm Tết 2009 (bể cá, tượng Di Lặc).'],
    ['p', 'Máy tính, điện thoại và ngày tháng của chúng lấy từ mục Máy tính của Sonic Hub.'],
    ['p', 'Những chỗ đoán:'],
    ['ul', [
      'Kích thước các phòng: ước theo hình, chưa có số đo.',
      'Nhà giữ nguyên bài trí của 2013 cho cả 2005–2012; chỉ máy móc và tờ lịch đổi theo năm.',
      'Chiếc máy Win XP cũ đặt ở bàn phòng bố mẹ trong 2006–2008.',
      'Tivi: loại đèn hình đến 2009, màn hình phẳng từ 2010.',
      'Màn hình máy tính, tivi, điện thoại là hình vẽ phỏng theo; riêng 2011–2012 là đúng tấm ảnh xe buýt 27 đặt làm hình nền.',
      'Tên gọi "phòng bố mẹ" và phía nào của phòng lớn là của ai.',
      'Hướng nắng: đặt theo vệt nắng chiều in song cửa lên tường tivi trong video.',
      'Nhà hàng xóm ngoài cửa sổ chỉ là kiểu phố quanh đó, không phải từng căn thật.',
    ]],
  ],
};

function cardOf(id, year, mode, extra) {
  const Y = YEARS[year], at = atOf(year, mode), when = `${mode === 'toi' ? '21:00' : '18:05'} ngày 15/6/${year}`;
  switch (id) {
    case 'pc': {
      const b = [['p', `${Y.pc.name} — ${Y.pc.model}.`], ['p', `${Y.pc.os} · ${Y.pc.web} · ${Y.pc.ym}`], ['p', `Dùng: ${Y.pc.used}.`, 'dim'],
        ['p', year >= 2011 ? `Hình nền: ${WALL[year]} — trên màn hình ở đây là đúng tấm ảnh đó.` : `Hình nền ghi trong mục Máy tính: ${WALL[year]}. Màn hình ở đây chỉ là hình vẽ phỏng theo.`, 'dim'],
        ['a', `Bật máy tính này lúc ${when}`, `${HUB}/pc?at=${at}`]];
      if (Y.phone) b.push(['p', 'Trên bàn còn chiếc Nokia (Series 40), dùng từ 2006 đến giữa 2015.', 'dim'], ['a', `Bật điện thoại lúc ${when}`, `${HUB}/phone?at=${at}`]);
      else b.push(['p', 'Năm 2005 chưa có điện thoại riêng.', 'dim']);
      return { title: 'Góc máy tính', body: b };
    }
    case 'tv': return { title: 'Tivi', body: [['p', extra ? 'Đang bật.' : 'Đang tắt.'], ['p', year <= 2009 ? 'Loại đèn hình. Năm đổi sang màn hình phẳng là đoán (ở đây: 2010).' : 'Màn hình phẳng, như trong ảnh 9/2012 và video 2013. Năm đổi là đoán (ở đây: 2010).', 'dim'], ['p', 'Mỗi lần chạm là bật hoặc tắt.', 'dim']] };
    case 'piano': return { title: 'Đàn piano', body: [['p', 'Đàn đứng màu đen, phủ khăn ren, kê sát tường dưới mấy tầng giá sách.'], ['p', 'Mỗi lần chạm là một hợp âm.', 'dim']] };
    case 'fish': return { title: 'Bể cá', body: [['p', 'Bể khung gỗ gắn vào mảng tường ốp đá cạnh cửa ban công.'], ['p', 'Ảnh mùng 2 Tết 2009 (Family → 2009 → Nha): cành đào cắm ngay trước bể.', 'dim']] };
    case 'dilac': return { title: 'Tượng Di Lặc', body: [['p', 'Tượng gỗ nâng thỏi vàng qua đầu, đứng ở đầu kệ tivi.'], ['p', 'Có trong ảnh Tết 2009 và trong video 2013.', 'dim']] };
    case 'door507': return { title: 'Cửa căn 507', body: [['p', 'Cửa gỗ hai cánh, ngoài là cửa sắt song dọc gắn biển số 507.'], ['p', 'Theo video hành lang tháng 6/2013.', 'dim']] };
    case 'gallery': return { title: 'Hành lang tầng 5', body: [['p', 'Hành lang chung lát gạch bông, lan can bê tông nan đứng; 507 là căn cuối dãy.'], ['p', 'Đi dọc hành lang, qua mấy căn bên cạnh là tới cầu thang.', 'dim']] };
    case 'globe': return { title: 'Quả địa cầu', body: [['p', 'Đặt trên nóc dãy tủ ngăn đôi phòng lớn, nên đứng bên nào cũng thấy.']] };
    case 'books': return { title: 'Giá sách', body: [['p', 'Giá sách kín tường, từ cửa phòng tới cây đàn.']] };
    case 'window': return { title: 'Cửa sổ góc máy tính', body: [['p', 'Song ngang, lưới chống muỗi, bên ngoài là chuồng cọp. Nhìn ra mái ngói đỏ của mấy nhà thấp phía dưới.']] };
    case 'phone': return { title: 'Điện thoại bàn', body: [['p', 'Máy bàn màu kem trên tủ đầu giường.']] };
    default: return null;
  }
}

export function setupUI(api) {
  const state = { year: 2007, mode: 'chieu', open: null, cardId: null };
  const root = document.documentElement;
  // how far the bottom bar reaches up (one row or two, fat slider or thin): the cards and the labels sit just above it
  const bar = $('bottom'), fit = () => root.style.setProperty('--bar', Math.round(innerHeight - bar.getBoundingClientRect().top + 8) + 'px');
  try { new ResizeObserver(fit).observe(bar); } catch { /* an old browser keeps the default */ }
  addEventListener('resize', fit); fit();
  const say = $('say'); let sayT = 0;
  function speak(html, ms = 2600) { say.innerHTML = ''; say.append(...html); say.classList.add('on'); clearTimeout(sayT); if (ms) sayT = setTimeout(() => say.classList.remove('on'), ms); }
  const label = name => speak([el('b', name)], 2400);

  function close(which) { for (const k of (which ? [which] : ['rooms', 'card'])) $(k).classList.remove('on'); $('b-rooms').setAttribute('aria-expanded', 'false'); state.open = null; state.cardId = null; }
  function open(which) { close(); $(which).classList.add('on'); state.open = which; if (which === 'rooms') $('b-rooms').setAttribute('aria-expanded', 'true'); }
  function fill(data) {
    $('card-t').textContent = data.title; const b = $('card-b'); b.innerHTML = '';
    for (const [tag, text, more] of data.body) {
      if (tag === 'ul') { const u = el('ul'); for (const t of text) u.append(el('li', t)); b.append(u); }
      else if (tag === 'a') { const a = el('a'); a.href = more; a.target = '_blank'; a.rel = 'noopener'; a.append(text, el('small', more.replace(/^https:\/\//, ''))); b.append(a); }
      else b.append(el('p', text, more));
    }
    open('card');
  }
  function showCard(id, extra) { const d = cardOf(id, state.year, state.mode, extra); if (d) { fill(d); state.cardId = id; } }
  document.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => close(x.dataset.close)));

  // rooms
  const list = $('room-list');
  for (const [key, v] of Object.entries(VIEWS)) { const li = el('li'), bt = el('button', v.name); bt.type = 'button'; bt.addEventListener('click', () => { close(); api.goto(key); label(v.name); }); li.append(bt); list.append(li); }
  $('b-rooms').addEventListener('click', () => (state.open === 'rooms' ? close() : open('rooms')));

  // year
  const yr = $('year'), out = $('year-out');
  function setYear(y, silent) {
    state.year = y; yr.value = String(y); out.textContent = String(y);
    root.dataset.era = y >= 2008 ? '2008' : '2005';
    $('where').textContent = `căn 507 · tầng 5 · ${y}`;
    api.setYear(y);
    if (!silent) { const Y = YEARS[y]; speak([el('b', String(y)), document.createTextNode(` · ${Y.pc.name}, ${Y.pc.os}${Y.phone ? ' · Nokia' : ''}`)], 3200); }
    if (state.cardId) showCard(state.cardId);
    try { localStorage.setItem('vanbao-year', String(y)); } catch { /* storage is a convenience only */ }
  }
  yr.addEventListener('input', () => setYear(+yr.value));
  // a touch on a year under the line goes straight to it
  document.querySelectorAll('#ticks span').forEach((t, i) => t.addEventListener('click', () => setYear(2005 + i)));

  // hour
  function setMode(m, silent) {
    state.mode = m; $('h-chieu').setAttribute('aria-pressed', String(m === 'chieu')); $('h-toi').setAttribute('aria-pressed', String(m === 'toi'));
    api.setMode(m);
    if (!silent) speak([el('b', m === 'toi' ? 'Tối, 21:00' : 'Chiều, 18:05'), document.createTextNode(m === 'toi' ? ' · đèn bật, màn hình sáng' : ' · nắng xiên qua cửa ban công')], 2800);
    if (state.cardId) showCard(state.cardId);
  }
  $('h-chieu').addEventListener('click', () => setMode('chieu')); $('h-toi').addEventListener('click', () => setMode('toi'));

  // tour
  const bt = $('b-tour');
  function tourState(on) { bt.setAttribute('aria-pressed', String(on)); bt.textContent = on ? 'Dừng' : 'Tham quan'; }
  bt.addEventListener('click', () => { close(); if (bt.getAttribute('aria-pressed') === 'true') api.stopTour(); else api.startTour(); });

  // intro
  const hideIntro = () => { $('intro').classList.add('off'); root.classList.remove('intro'); };
  $('go-tour').addEventListener('click', () => { hideIntro(); api.startTour(); });
  $('go-walk').addEventListener('click', () => { hideIntro(); speak([document.createTextNode('Kéo để nhìn quanh · chạm sàn để đi tới')], 4200); });
  $('go-notes').addEventListener('click', () => { hideIntro(); fill(NOTES); });

  // the stick under the left thumb
  const stick = $('stick'), knob = stick.firstElementChild;
  function onStick(s, on) { stick.style.display = on ? 'block' : 'none'; if (on) { stick.style.left = s.ox + 'px'; stick.style.top = s.oy + 'px'; knob.style.transform = `translate(${s.x * 46}px, ${s.y * 46}px)`; } }

  const fade = $('fade');
  const cut = fn => { fade.classList.add('on'); setTimeout(() => { fn(); requestAnimationFrame(() => fade.classList.remove('on')); }, 230); };
  /* the tour has already jumped: go black at once, then let the new place come up */
  const blink = () => { fade.style.transition = 'none'; fade.classList.add('on'); void fade.offsetWidth; fade.style.transition = ''; requestAnimationFrame(() => requestAnimationFrame(() => fade.classList.remove('on'))); };

  let y0 = 2007; try { const s = +localStorage.getItem('vanbao-year'); if (YEARS[s]) y0 = s; } catch { /* no storage */ }
  return { state, setYear, setMode, showCard, close, label, speak, tourState, onStick, hideIntro, cut, blink, year0: y0, ready() { $('load').remove(); for (const b of $('go').children) b.disabled = false; $('fail').style.display = 'none'; }, notes: () => fill(NOTES) };
}
