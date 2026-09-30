/* ═══════════════════════════════════════════════════════════════════════════
   Sonic Hub portal engine — ONE information architecture, many skins.
   Shell: top bar (brand · search · random day) · room dock · vertical year column.
   Rooms: home (on this day) · photos · journal · angels · fantasy · games.
   Readers open inside a skin-provided device frame.
   A skin only supplies look & feel: CSS + a few hooks passed to Portal({...}).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  const ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    photos: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    journal: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 19h4"/></svg>',
    angels: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
    fantasy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 3-1.5 4.7h-5L8 10.5z"/></svg>',
    games: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v4M5 13h4M16 12h.01M18 14h.01"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    dice: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="9" cy="15" r="1.1"/></svg>',
  };
  const ROOMS = [
    { id: 'home', label: 'Hôm nay' }, { id: 'photos', label: 'Ảnh' }, { id: 'journal', label: 'Nhật ký' },
    { id: 'angels', label: 'Angels' }, { id: 'fantasy', label: 'Bóng đá' }, { id: 'games', label: 'Game' },
  ];
  const TONE = { Yahoo: '#7B1FA2', Nokia: '#2E6FDB', Facebook: '#1877F2', Zalo: '#0068FF', Telegram: '#229ED9' };

  const BASE = `
  body.pt { margin: 0; }
  .pt *, .pt *::before, .pt *::after { box-sizing: border-box; }
  .pt button { font: inherit; color: inherit; cursor: pointer; }
  .pt a { color: inherit; text-decoration: none; }
  .pt .bar { position: fixed; top: 0; left: 0; right: 0; height: var(--bar-h, 68px); display: flex; align-items: center; gap: 12px; padding: 0 20px; z-index: 40; }
  .pt .bar .brand { margin-right: auto; }
  .pt .ico svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; display: block; }
  .pt .dock { position: fixed; top: var(--bar-h, 68px); left: 0; bottom: 0; width: var(--dock-w, 100px); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px 0; z-index: 30; }
  .pt .dock button { border: 0; background: none; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .pt .years { position: fixed; top: var(--bar-h, 68px); right: 0; bottom: 0; width: var(--years-w, 100px); z-index: 30; overflow-y: auto; scrollbar-width: none; }
  .pt .years::-webkit-scrollbar { display: none; }
  .pt .years-in { position: relative; display: flex; flex-direction: column; min-height: 100%; }
  .pt .years button { border: 0; background: none; padding: 0; text-align: left; position: relative; }
  .pt .stage { position: fixed; top: var(--bar-h, 68px); left: var(--dock-w, 100px); right: var(--years-w, 100px); bottom: 0; overflow-y: auto; overflow-x: hidden; }
  .pt .room { position: relative; max-width: 1180px; margin: 0 auto; padding: var(--pad-t, 30px) var(--pad-x, 40px) 80px; }
  .pt .short { display: none; }
  .pt .jg-item { margin: 0; position: relative; overflow: hidden; }
  .pt .jg-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pt .palette, .pt .reader { position: fixed; inset: 0; z-index: 90; display: none; justify-content: center; }
  .pt .palette.open { display: flex; align-items: flex-start; padding-top: 14vh; }
  .pt .reader.open { display: flex; align-items: center; padding: 20px; }
  .pt .palette-box { width: min(580px, 92vw); }
  .pt .palette input { width: 100%; border: 0; outline: 0; font: inherit; }
  .pt .palette ul { list-style: none; margin: 0; padding: 0; max-height: 50vh; overflow: auto; }
  .pt .palette li { display: flex; justify-content: space-between; gap: 12px; cursor: pointer; }
  @media (max-width: 860px) {
    body.pt { --dock-w: 0px; --years-w: var(--years-w-m, 48px); --bar-h: var(--bar-h-m, 58px); --pad-t: 20px; --pad-x: 16px; }
    .pt .dock { top: auto; bottom: 0; left: 0; right: 0; width: auto; height: var(--dock-h-m, 68px); flex-direction: row; justify-content: space-around; gap: 0; padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
    .pt .dock button { flex: 1; }
    .pt .years { bottom: var(--dock-h-m, 68px); }
    .pt .stage { bottom: var(--dock-h-m, 68px); }
    .pt .bar { padding: 0 12px; gap: 8px; }
    .pt .bar .lbl { display: none; }
    .pt .full { display: none; } .pt .short { display: inline; }
  }`;

  window.Portal = function (SKIN = {}) {
    const D = window.SH_DATA;
    const state = { room: 'home', year: SKIN.startYear || 2010 };
    const style = document.createElement('style'); style.textContent = BASE; document.head.prepend(style);
    document.body.classList.add('pt');

    const app = document.getElementById('app');
    app.innerHTML = `
      <header class="bar">
        <a class="brand" href="#home">${SKIN.brand || 'Sonic Hub'}</a>
        <button type="button" class="search" aria-label="Tìm"><span class="ico">${ICONS.search}</span><span class="lbl">Tìm một kỷ niệm…</span></button>
        <button type="button" class="random" aria-label="Một ngày bất kỳ"><span class="ico">${ICONS.dice}</span><span class="lbl">Một ngày bất kỳ</span></button>
      </header>
      <nav class="dock" aria-label="Các phòng">${ROOMS.map((r, i) => `<button type="button" data-room="${r.id}" style="--i:${i}"><span class="ico">${ICONS[r.id]}</span><span class="lbl">${r.label}</span></button>`).join('')}</nav>
      <nav class="years" aria-label="Các năm"><div class="years-in"></div></nav>
      <main class="stage"><div class="room" id="room"></div></main>
      <div class="palette"><div class="palette-box"><input type="search" placeholder="Tìm người, năm, bài viết, bộ ảnh…" autocomplete="off"><ul></ul></div></div>
      <div class="reader"><div class="reader-box"></div></div>`;

    // ── Year column (newest on top) ──
    const yearsIn = app.querySelector('.years-in');
    const desc = D.YEARS.slice().reverse();
    const maxW = Math.max(...desc.map(y => D.photosOf(y).length * 2 + D.notesOf(y).length * 3 + D.peopleOf(y).length * 3));
    desc.forEach((y, i) => {
      const weight = D.photosOf(y).length * 2 + D.notesOf(y).length * 3 + D.peopleOf(y).length * 3;
      const meta = { i, count: D.photosOf(y).length, weight: maxW ? weight / maxW : 0, thumb: (D.photosOf(y)[0] || {}).src || '', short: "'" + String(y).slice(2) };
      const b = document.createElement('button'); b.type = 'button'; b.dataset.year = y; b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--w', meta.weight.toFixed(3)); b.style.setProperty('--i', i);
      b.innerHTML = SKIN.yearItem ? SKIN.yearItem(y, meta) : `<span class="full">${y}</span><span class="short">${meta.short}</span>`;
      b.onclick = () => setYear(y); yearsIn.appendChild(b);
    });

    app.querySelectorAll('.dock [data-room]').forEach(b => b.onclick = () => go(b.dataset.room));
    app.querySelector('.random').onclick = () => { state.year = D.YEARS[Math.floor(Math.random() * D.YEARS.length)]; go(['home', 'photos', 'angels', 'journal'][Math.floor(Math.random() * 4)]); };

    function go(room) { state.room = room; render(); app.querySelector('.stage').scrollTop = 0; }
    function setYear(y) { state.year = y; render(); }

    // ── Room templates (shared markup; skins restyle) ──
    const ago = (y) => new Date().getFullYear() - y;
    const R = {
      home() {
        const y = state.year, ny = D.nearestYear(y), ph = D.photosOf(ny), who = D.peopleOf(y)[0], note = D.notesOf(y)[0] || D.NOTES[3];
        const doors = [['photos', 'Ảnh', D.photos.length + ' tấm'], ['journal', 'Nhật ký', D.NOTES.length + ' bài'], ['angels', 'Angels', D.PEOPLE.length + ' người'], ['fantasy', 'Bóng đá', 'sắp có', 1], ['games', 'Game', 'sắp có', 1]];
        return `<section class="home">
          <div class="hero" style="--img:url('${ph[0].src}')"><div class="hero-in">
            <p class="eyebrow">${D.todayVN()}</p>
            <h1>Ngày này năm <span class="yr">${y}</span></h1>
            <p class="lede">${SKIN.lede ? SKIN.lede(y) : (ago(y) > 0 ? 'Đúng ngày này, ' + ago(y) + ' năm trước.' : 'Hôm nay.')}</p>
            <div class="actions"><button type="button" class="btn primary" data-go="photos">Xem ảnh năm ${y}</button><button type="button" class="btn" data-go="angels">Đọc lại chuyện cũ</button></div>
          </div></div>
          <div class="moments">
            <article class="moment m-photos"><h3>Ảnh cùng ngày</h3><div class="thumbs">${ph.slice(0, 3).map(p => `<img src="${p.src}" alt="">`).join('')}</div><button type="button" class="more" data-go="photos">${ph.length} ảnh năm ${ny}</button></article>
            <article class="moment m-chat"><h3>Một dòng tin nhắn</h3><blockquote>mai thi xong roi di choi nhe. t mua ve rap quoc gia roi</blockquote><cite>${who ? who.name : 'Bích Trân'} · Yahoo · 23:14</cite><button type="button" class="more" data-go="angels">Vào phòng đọc</button></article>
            <article class="moment m-note"><h3>Ghi chép</h3><p class="t">${note.title}</p><p class="d">${note.body}</p><button type="button" class="more" data-go="journal">Đọc tiếp</button></article>
          </div>
          <h2 class="sec">Các phòng</h2>
          <div class="doors">${doors.map(([id, name, sub, off]) => `<button type="button" class="door d-${id} ${off ? 'off' : ''}" data-go="${id}"><span class="door-art"></span><b>${name}</b><span>${sub}</span></button>`).join('')}</div>
        </section>`;
      },
      photos() {
        const y = state.year, list = D.photosOf(y);
        return `<section class="photos"><header class="head"><p class="eyebrow">Ảnh</p><h1>Năm <span class="yr">${y}</span></h1><p class="lede">${list.length ? list.length + ' tấm, xếp theo ngày chụp.' : 'Năm này chưa có tấm nào — chọn một năm khác.'}</p></header>
          <div class="folders">${D.FOLDERS.map(([n, c], i) => `<button type="button" class="folder"><span class="folder-art"><img src="${D.photos[(i * 7) % 40].src}" alt=""></span><b>${n}</b><span>${c} ảnh</span></button>`).join('')}</div>
          <h2 class="sec">Tất cả ảnh năm ${y}</h2><div class="jg" id="jg"></div></section>`;
      },
      journal() {
        const list = D.notesOf(state.year), others = D.NOTES.filter(n => n.year !== state.year);
        const card = (n) => `<article class="note"><div class="note-meta"><span class="note-year">${n.year}</span>${n.mood ? `<span class="note-mood">${n.mood}</span>` : ''}</div><h3>${n.title}</h3><p>${n.body}</p><div class="chips">${n.problem ? `<span class="chip problem">${n.problem}</span>` : ''}${n.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div></article>`;
        return `<section class="journal"><header class="head"><p class="eyebrow">Nhật ký</p><h1>${list.length ? 'Viết năm <span class="yr">' + state.year + '</span>' : 'Nhật ký'}</h1><p class="lede">${list.length ? 'Những trang đã viết trong năm này.' : 'Năm ' + state.year + ' chưa có trang nào.'}</p></header>
          ${list.length ? `<div class="notes">${list.map(card).join('')}</div>` : ''}
          <h2 class="sec">Từ các năm khác</h2><div class="notes others">${others.map(card).join('')}</div></section>`;
      },
      angels() {
        const y = state.year, now = D.peopleOf(y);
        return `<section class="angels"><header class="head"><p class="eyebrow">Angels</p><h1>${now.length ? 'Năm <span class="yr">' + y + '</span>' : 'Những người thương'}</h1><p class="lede">${now.length ? 'Người ở bên trong năm này được làm nổi.' : 'Năm ' + y + ' không có ai — đây là tất cả.'}</p></header>
          <div class="people">${D.PEOPLE.map((p, k) => `<button type="button" class="person ${y >= p.from && y <= p.to ? 'on' : 'dim'}" data-year="${p.from}"><span class="person-art"><img src="${D.photos[(k * 5 + 3) % 40].src}" alt=""></span><b>${p.name}</b><span>${p.from}${p.to !== p.from ? '–' + p.to : ''} · ${p.via}</span></button>`).join('')}</div>
          <h2 class="sec">Phòng đọc</h2>
          <div class="readers">${['Yahoo', 'Nokia', 'Facebook'].map(v => `<button type="button" class="reader-btn" data-reader="${v}" style="--tone:${TONE[v]}"><i></i>${v === 'Yahoo' ? 'Yahoo! Messenger' : v}</button>`).join('')}</div></section>`;
      },
      fantasy() {
        return `<section class="fantasy"><header class="head"><p class="eyebrow">Bóng đá</p><h1>Mùa <span class="yr">${state.year}/${String(state.year + 1).slice(2)}</span></h1><p class="lede">Chưa nạp dữ liệu mùa giải.</p></header>
          <div class="empty"><div class="empty-art"></div><div class="empty-txt"><h3>Sắp có</h3><p>Đội hình, điểm số và bảng xếp hạng sẽ về đây — cùng trục năm với ảnh và ký ức, để mùa ${state.year} nằm cạnh ảnh ${state.year}.</p></div></div></section>`;
      },
      games() {
        return `<section class="games"><header class="head"><p class="eyebrow">Game</p><h1>Kệ game</h1><p class="lede">Những trò đã chơi, đang chơi, và sẽ tự làm.</p></header>
          <div class="shelf">${['Trò tự làm #1', 'Memory', 'Đua xe đạp', 'Ô chữ', 'Sắp có'].map((g, i) => `<div class="game" style="--i:${i}"><span class="game-art"></span><b>${g}</b><span>${i === 4 ? 'chưa có' : 'đang lên kệ'}</span></div>`).join('')}</div></section>`;
      },
    };

    const roomEl = app.querySelector('#room');
    function render() {
      document.body.dataset.room = state.room;
      app.querySelectorAll('.dock [data-room]').forEach(b => b.setAttribute('aria-current', String(b.dataset.room === state.room)));
      yearsIn.querySelectorAll('button').forEach(b => {
        const on = +b.dataset.year === state.year; b.setAttribute('aria-pressed', String(on));
        if (on) b.scrollIntoView({ block: 'nearest' });
      });
      roomEl.innerHTML = (SKIN.rooms && SKIN.rooms[state.room] ? SKIN.rooms[state.room] : R[state.room])(state, D);
      roomEl.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
      roomEl.querySelectorAll('[data-reader]').forEach(b => b.onclick = () => openReader(b.dataset.reader));
      roomEl.querySelectorAll('.person[data-year]').forEach(b => b.onclick = () => setYear(+b.dataset.year));
      if (state.room === 'photos') {
        const list = D.photosOf(state.year), j = SKIN.justify || {};
        if (list.length) SH.justify(roomEl.querySelector('#jg'), list, { rowHeight: j.rowHeight || 230, gap: j.gap ?? 8, render: (p) => {
          const f = document.createElement('figure'); f.className = 'jg-item ' + (j.cls || ''); f.innerHTML = `<img src="${p.src}" alt="${p.caption}" loading="lazy">`; return f; } });
      }
      SKIN.onRender && SKIN.onRender(state, app);
    }

    // ── Reader (device frame) ──
    const reader = app.querySelector('.reader'), readerBox = app.querySelector('.reader-box');
    function openReader(v) {
      const name = v === 'Yahoo' ? 'Yahoo! Messenger' : v;
      readerBox.innerHTML = SKIN.device ? SKIN.device(name, TONE[v] || '#555') :
        `<div class="device"><div class="screen"><b>${name}</b><p>Phòng đọc riêng — design sau.</p></div></div>`;
      reader.classList.add('open');
    }
    reader.onclick = (e) => { if (e.target === reader || e.target.closest('[data-close]')) reader.classList.remove('open'); };

    // ── Search ──
    const pal = app.querySelector('.palette'), q = pal.querySelector('input'), ul = pal.querySelector('ul');
    const INDEX = [
      ...D.PEOPLE.map(p => ({ n: p.name, d: 'Angels · ' + p.from + (p.to !== p.from ? '–' + p.to : ''), run: () => { state.year = p.from; go('angels'); } })),
      ...D.NOTES.map(n => ({ n: n.title, d: 'Nhật ký · ' + n.year, run: () => { state.year = n.year; go('journal'); } })),
      ...D.YEARS.map(y => ({ n: String(y), d: D.photosOf(y).length + ' ảnh', run: () => { state.year = y; go('home'); } })),
      ...D.FOLDERS.map(([n, c]) => ({ n, d: 'Bộ ảnh · ' + c + ' tấm', run: () => go('photos') })),
    ];
    let hits = [];
    function list() {
      const v = q.value.toLowerCase().trim();
      hits = INDEX.filter(i => !v || i.n.toLowerCase().includes(v) || i.d.toLowerCase().includes(v)).slice(0, 8);
      ul.innerHTML = hits.map((h, i) => `<li data-i="${i}" class="${i === 0 ? 'sel' : ''}"><span>${h.n}</span><small>${h.d}</small></li>`).join('') || '<li><small>Không tìm thấy</small></li>';
      ul.querySelectorAll('li[data-i]').forEach(li => li.onclick = () => pick(+li.dataset.i));
    }
    function openSearch() { pal.classList.add('open'); q.value = ''; list(); setTimeout(() => q.focus(), 30); }
    function pick(i) { if (hits[i]) { pal.classList.remove('open'); hits[i].run(); } }
    q.oninput = list;
    q.onkeydown = (e) => {
      const lis = [...ul.querySelectorAll('li[data-i]')], cur = lis.findIndex(l => l.classList.contains('sel'));
      if (e.key === 'Enter') pick(cur);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const nx = (cur + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % lis.length; lis.forEach(l => l.classList.remove('sel')); lis[nx] && lis[nx].classList.add('sel'); }
    };
    app.querySelector('.search').onclick = openSearch;
    pal.onclick = (e) => { if (e.target === pal) pal.classList.remove('open'); };

    // Keyboard works quietly — no hints on screen.
    addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
      if (e.key === 'Escape') { pal.classList.remove('open'); reader.classList.remove('open'); return; }
      if (pal.classList.contains('open') || e.target.tagName === 'INPUT') return;
      if (e.key === '/') { e.preventDefault(); openSearch(); }
      if (/^[1-6]$/.test(e.key)) go(ROOMS[+e.key - 1].id);
      if (e.key === 'ArrowUp' && state.year < D.YEARS.at(-1)) { e.preventDefault(); setYear(state.year + 1); }
      if (e.key === 'ArrowDown' && state.year > D.YEARS[0]) { e.preventDefault(); setYear(state.year - 1); }
    });

    SKIN.decorate && SKIN.decorate(app);
    const h = location.hash.slice(1); if (ROOMS.some(r => r.id === h)) state.room = h;
    render();
    return { state, go, setYear };
  };
})();
