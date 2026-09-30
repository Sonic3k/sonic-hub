/* ═══════════════════════════════════════════════════════════════════════════
   Sonic Hub portal engine v2 — EXPERIENCE FIRST.
   Same shell as v1 (bar · dock · year column · rooms), but the rooms are built
   around how revisiting memories should feel:
   - Home shows ONE memory and a sentence that tells it, not a dashboard.
   - "Mở lại ngày này" rebuilds that whole day, hour by hour.
   - A person is a chapter: portrait, the memory, photos together, dates.
   - Photos open in an immersive viewer tinted by the photo itself; the UI fades.
   - Content reveals as you scroll; year/room changes cross-fade.
   Skins supply tone via tokens (--u-*) + CSS; v1 skins keep using v1.
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
  const PARENT = { day: 'home', person: 'angels' };
  const TONE = { Yahoo: '#7B1FA2', Nokia: '#2E6FDB', Facebook: '#1877F2', Zalo: '#0068FF', Telegram: '#229ED9' };

  const BASE = `
  body.pt { margin: 0; }
  .pt { --u-surface: rgba(255,255,255,.75); --u-text: inherit; --u-muted: #6b6b6b; --u-accent: #333; --u-radius: 18px; --u-radius-img: 14px;
        --u-shadow: 0 12px 30px rgba(0,0,0,.12); --u-line: rgba(255,255,255,.4); --u-blur: 10px; --u-hero: var(--u-text); --u-hero-muted: var(--u-muted); }
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
  .pt .year-flag { position: fixed; z-index: 36; transform: translate(8px, -50%); white-space: nowrap; padding: 8px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
    background: var(--u-surface); color: var(--u-text); box-shadow: var(--u-shadow); backdrop-filter: blur(var(--u-blur)); pointer-events: none; opacity: 0; transition: opacity .45s ease, transform .45s ease, top .35s ease; }
  .pt .year-flag.show { opacity: 1; transform: translate(0, -50%); }
  .pt .year-flag b { margin-right: 6px; }
  .pt .stage { position: fixed; top: var(--bar-h, 68px); left: var(--dock-w, 100px); right: var(--years-w, 100px); bottom: 0; overflow-y: auto; overflow-x: hidden; }
  .pt .room { position: relative; max-width: 1180px; margin: 0 auto; padding: var(--pad-t, 30px) var(--pad-x, 40px) 90px; }
  .pt .short { display: none; }
  .pt .jg-item { margin: 0; position: relative; overflow: hidden; }
  .pt .jg-item img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
  .pt .palette, .pt .reader { position: fixed; inset: 0; z-index: 90; display: none; justify-content: center; }
  .pt .palette.open { display: flex; align-items: flex-start; padding-top: 14vh; }
  .pt .reader.open { display: flex; align-items: center; padding: 20px; }
  .pt .palette-box { width: min(580px, 92vw); }
  .pt .palette input { width: 100%; border: 0; outline: 0; font: inherit; }
  .pt .palette ul { list-style: none; margin: 0; padding: 0; max-height: 50vh; overflow: auto; }
  .pt .palette li { display: flex; justify-content: space-between; gap: 12px; cursor: pointer; }

  /* reveal + transitions */
  .pt .rv { opacity: 0; transform: translateY(18px); transition: opacity .8s ease, transform .8s ease; }
  .pt .rv.in { opacity: 1; transform: none; }
  ::view-transition-old(root), ::view-transition-new(root) { animation-duration: .4s; }

  /* shared surfaces */
  .pt .card { background: var(--u-surface); border-radius: var(--u-radius); box-shadow: var(--u-shadow); backdrop-filter: blur(var(--u-blur)); color: var(--u-text); }
  .pt .card h3 { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: var(--u-muted); }
  .pt .linkish { margin-top: 12px; border: 0; background: none; padding: 0; color: var(--u-accent); font-weight: 700; }
  .pt .btn.ghost { background: transparent; box-shadow: none; border-color: transparent; color: var(--u-hero); text-decoration: underline; text-underline-offset: 5px; text-decoration-thickness: 1px; }
  .pt .back { display: block; border: 0; background: none; padding: 6px 0; margin-bottom: 12px; color: var(--u-hero-muted); font-weight: 600; font-size: 14px; }
  .pt .strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 12px; scrollbar-width: thin; }
  .pt .strip img { flex: 0 0 auto; height: 170px; width: auto; aspect-ratio: var(--ar, 4/3); object-fit: cover; border-radius: var(--u-radius-img); cursor: zoom-in; box-shadow: var(--u-shadow); transition: transform .4s; }
  .pt .strip img:hover { transform: translateY(-3px); }

  /* home: one memory */
  .pt .h2-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: 56px; align-items: center; min-height: calc(100vh - var(--bar-h, 68px) - 80px); }
  .pt .h2-text { color: var(--u-hero); }
  .pt .h2-story { font-size: 21px; line-height: 1.55; margin: 0 0 28px; max-width: 30ch; color: var(--u-hero); opacity: .94; }
  .pt .h2-who { display: flex; align-items: center; gap: 10px; margin-top: 26px; color: var(--u-hero-muted); font-size: 14px; }
  .pt .h2-who img { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(255,255,255,.85); }
  .pt .h2-photo { position: relative; justify-self: center; width: min(100%, 500px); aspect-ratio: 4/5; max-height: 74vh; }
  .pt .h2-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: var(--u-radius); box-shadow: 0 30px 70px rgba(0,0,0,.28); }
  .pt .h2-photo .b2 { transform: rotate(-6deg) translate(-20px, 12px) scale(.93); opacity: .5; }
  .pt .h2-photo .b1 { transform: rotate(4deg) translate(18px, 4px) scale(.97); opacity: .78; }
  .pt .h2-photo .front { cursor: zoom-in; transition: transform .6s ease; } .pt .h2-photo .front:hover { transform: scale(1.012); }
  .pt .h2-count { position: absolute; left: 16px; bottom: 16px; padding: 6px 12px; border-radius: 999px; background: rgba(0,0,0,.45); color: #fff; font-size: 13px; backdrop-filter: blur(6px); pointer-events: none; }
  .pt .h2-more > * { margin-top: 34px; }
  .pt .h2-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .pt .h2-pair .card { padding: 22px; }
  .pt .quote q { display: block; font-size: 20px; line-height: 1.5; }
  .pt .quote small, .pt .notecard small { display: block; margin-top: 10px; color: var(--u-muted); font-size: 13px; }
  .pt .notecard b { display: block; font-size: 19px; margin-bottom: 6px; } .pt .notecard p { margin: 0; color: var(--u-muted); line-height: 1.6; }

  /* day: the whole day, hour by hour */
  .pt .tl { list-style: none; margin: 30px 0 0; padding: 0; position: relative; }
  .pt .tl::before { content: ""; position: absolute; left: 74px; top: 8px; bottom: 8px; width: 2px; background: var(--u-line); }
  .pt .tl-item { display: grid; grid-template-columns: 74px 1fr; gap: 30px; margin-bottom: 22px; position: relative; }
  .pt .tl-item time { padding: 18px 18px 0 0; text-align: right; font-weight: 700; font-size: 15px; color: var(--u-hero); font-variant-numeric: tabular-nums; }
  .pt .tl-item::after { content: ""; position: absolute; left: 69px; top: 23px; width: 12px; height: 12px; border-radius: 50%; background: var(--u-accent); box-shadow: 0 0 0 4px var(--u-dot-ring, rgba(255,255,255,.55)); }
  .pt .tl-body { padding: 18px 20px; min-width: 0; }
  .pt .tl-body h3 { margin: 0 0 12px; font-size: 16px; color: var(--u-text); }
  .pt .chat { display: flex; flex-direction: column; gap: 6px; font-size: 15px; }
  .pt .chat p { margin: 0; } .pt .chat .ts { color: var(--u-muted); font-size: 12px; margin-right: 6px; } .pt .chat .them b { color: #7B1FA2; } .pt .chat .self b { color: #C2185B; }

  /* person: a chapter */
  .pt .pv-head { display: grid; grid-template-columns: 300px 1fr; gap: 44px; align-items: center; }
  .pt .pv-portrait img { width: 100%; aspect-ratio: 4/5; object-fit: cover; border-radius: var(--u-radius); box-shadow: 0 30px 70px rgba(0,0,0,.3); cursor: zoom-in; display: block; }
  .pt .pv-head h1 { color: var(--u-hero); }
  .pt .pv-memory { font-size: 21px; line-height: 1.55; color: var(--u-hero); opacity: .94; margin: 0 0 24px; max-width: 34ch; }
  .pt .dates { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .pt .dates button { width: 100%; text-align: left; padding: 14px 16px; border: 0; }
  .pt .dates time { display: block; font-weight: 700; font-size: 14px; color: var(--u-accent); } .pt .dates span { font-size: 14px; color: var(--u-muted); }

  /* viewer: the photo takes over, tinted by itself; UI fades when idle */
  .pt .viewer { position: fixed; inset: 0; z-index: 95; display: none; background: #000; overflow: hidden; }
  .pt .viewer.open { display: block; }
  .pt .v-bg { position: absolute; inset: -12%; background: var(--img) center/cover; filter: blur(60px) brightness(.42) saturate(1.3); }
  .pt .v-fig { position: absolute; inset: 0; margin: 0; display: grid; place-items: center; padding: 5vh 7vw 18vh; }
  .pt .v-fig img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 6px; box-shadow: 0 30px 90px rgba(0,0,0,.55); animation: v-in .45s ease; }
  @keyframes v-in { from { opacity: 0; transform: scale(.975); } }
  .pt .v-ui { position: absolute; inset: 0; transition: opacity .6s; pointer-events: none; }
  .pt .v-ui > * { pointer-events: auto; }
  .pt .viewer.idle .v-ui { opacity: 0; } .pt .viewer.idle { cursor: none; }
  .pt .v-close, .pt .v-prev, .pt .v-next { position: absolute; border: 0; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,.14); color: #fff; font-size: 22px; line-height: 1; backdrop-filter: blur(8px); }
  .pt .v-close { top: 18px; right: 18px; } .pt .v-prev { left: 18px; top: 50%; margin-top: -24px; } .pt .v-next { right: 18px; top: 50%; margin-top: -24px; }
  .pt .v-cap { position: absolute; left: 0; right: 0; bottom: 96px; text-align: center; color: #fff; }
  .pt .v-cap b { font-size: 18px; } .pt .v-cap span { display: block; font-size: 13px; opacity: .75; margin-top: 4px; }
  .pt .v-strip { position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); display: flex; gap: 8px; max-width: 90vw; overflow-x: auto; }
  .pt .v-strip img { height: 52px; width: 52px; object-fit: cover; border-radius: 8px; opacity: .5; cursor: pointer; transition: opacity .2s; }
  .pt .v-strip img.on { opacity: 1; box-shadow: 0 0 0 2px #fff; }

  @media (max-width: 860px) {
    body.pt { --dock-w: 0px; --years-w: var(--years-w-m, 48px); --bar-h: var(--bar-h-m, 58px); --pad-t: 20px; --pad-x: 16px; }
    .pt .dock { top: auto; bottom: 0; left: 0; right: 0; width: auto; height: var(--dock-h-m, 68px); flex-direction: row; justify-content: space-around; gap: 0; padding: 6px 4px calc(6px + env(safe-area-inset-bottom)); }
    .pt .dock button { flex: 1; }
    .pt .years { bottom: var(--dock-h-m, 68px); }
    .pt .year-flag { display: none; }
    .pt .stage { bottom: var(--dock-h-m, 68px); }
    .pt .bar { padding: 0 12px; gap: 8px; } .pt .bar .lbl { display: none; }
    .pt .full { display: none; } .pt .short { display: inline; }
    .pt .h2-hero { grid-template-columns: 1fr; gap: 28px; min-height: 0; }
    .pt .h2-story { font-size: 18px; } .pt .h2-photo { width: 84%; }
    .pt .h2-pair { grid-template-columns: 1fr; }
    .pt .pv-head { grid-template-columns: 1fr; gap: 20px; } .pt .pv-portrait { max-width: 240px; }
    .pt .tl::before { left: 46px; } .pt .tl-item { grid-template-columns: 46px 1fr; gap: 18px; } .pt .tl-item::after { left: 41px; } .pt .tl-item time { font-size: 12px; padding-right: 12px; }
    .pt .strip img { height: 124px; }
    .pt .v-prev, .pt .v-next { display: none; } .pt .v-fig { padding: 9vh 3vw 22vh; }
  }`;

  window.Portal = function (SKIN = {}) {
    const D = window.SH_DATA;
    const state = { room: 'home', year: SKIN.startYear || 2010, person: 0, from: 'home' };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      <div class="reader"><div class="reader-box"></div></div>
      <div class="year-flag" aria-live="polite"></div>
      <div class="viewer" role="dialog" aria-label="Xem ảnh"><div class="v-bg"></div><figure class="v-fig"><img alt=""></figure>
        <div class="v-ui"><button type="button" class="v-close" aria-label="Đóng">✕</button><button type="button" class="v-prev" aria-label="Ảnh trước">‹</button><button type="button" class="v-next" aria-label="Ảnh sau">›</button>
        <div class="v-cap"><b></b><span></span></div><div class="v-strip"></div></div></div>`;

    const stage = app.querySelector('.stage'), roomEl = app.querySelector('#room'), yearsIn = app.querySelector('.years-in');

    // ── Year column: newest on top; the chosen year says who was there ──
    const hintOf = (y) => { const who = D.peopleOf(y).map(p => p.name).join(', '), n = D.photosOf(y).length; return [who, n ? n + ' ảnh' : ''].filter(Boolean).join(' · '); };
    const desc = D.YEARS.slice().reverse();
    const maxW = Math.max(...desc.map(y => D.photosOf(y).length * 2 + D.notesOf(y).length * 3 + D.peopleOf(y).length * 3));
    desc.forEach((y, i) => {
      const weight = D.photosOf(y).length * 2 + D.notesOf(y).length * 3 + D.peopleOf(y).length * 3;
      const meta = { i, count: D.photosOf(y).length, weight: maxW ? weight / maxW : 0, thumb: (D.photosOf(y)[0] || {}).src || '', short: "'" + String(y).slice(2) };
      const b = document.createElement('button'); b.type = 'button'; b.dataset.year = y; b.setAttribute('aria-pressed', 'false'); b.title = hintOf(y);
      b.style.setProperty('--w', meta.weight.toFixed(3)); b.style.setProperty('--i', i);
      b.innerHTML = SKIN.yearItem ? SKIN.yearItem(y, meta) : `<span class="full">${y}</span><span class="short">${meta.short}</span>`;
      b.onclick = () => setYear(y); yearsIn.appendChild(b);
    });

    app.querySelectorAll('.dock [data-room]').forEach(b => b.onclick = () => go(b.dataset.room));
    app.querySelector('.random').onclick = () => shuffle('home');

    const transition = (fn) => (document.startViewTransition && !reduce) ? document.startViewTransition(fn) : fn();
    function go(room) { transition(() => { if (PARENT[room]) state.from = state.room; state.room = room; render(); stage.scrollTop = 0; }); }
    function setYear(y) { transition(() => { state.year = y; render(); }); flagYear(); }
    // Orientation feedback: when the year changes, say who was there — then get out of the way.
    const flag = app.querySelector('.year-flag'); let flagT;
    function flagYear() {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const b = yearsIn.querySelector('button[aria-pressed="true"]'); if (!b) return;
        const r = b.getBoundingClientRect(), hint = hintOf(state.year);
        flag.innerHTML = `<b>${state.year}</b>${hint || 'Chưa có gì'}`;
        flag.style.top = (r.top + r.height / 2) + 'px'; flag.style.right = (innerWidth - r.left + 12) + 'px';
        flag.classList.add('show'); clearTimeout(flagT); flagT = setTimeout(() => flag.classList.remove('show'), 2800);
      }));
    }
    function shuffle(room) { let y; do { y = D.YEARS[Math.floor(Math.random() * D.YEARS.length)]; } while (y === state.year || !D.photosOf(D.nearestYear(y)).length); transition(() => { state.year = y; state.room = room; render(); stage.scrollTop = 0; }); }

    // ── helpers ──
    const ago = (y) => new Date().getFullYear() - y;
    const dayName = (y) => { const t = new Date(); return new Date(y, t.getMonth(), t.getDate()).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
    const img = (p, cls = '') => `<img src="${p.src}" alt="${p.caption}" data-pid="${p.id}" class="${cls}" style="--ar:${p.ratio.toFixed(3)}" loading="lazy">`;
    const faceOf = (p) => D.photos[(D.PEOPLE.indexOf(p) * 5 + 3) % D.photos.length];
    function story(y) {
      const ny = D.nearestYear(y), ph = D.photosOf(ny), who = D.peopleOf(y)[0];
      if (!ph.length) return 'Ngày này chưa để lại tấm ảnh nào.';
      let s = `Hôm ấy bạn chụp ${ph.length} tấm${ph[0].caption ? ' ở ' + ph[0].caption.replace(/, .*/, '') : ''}`;
      s += who ? `, rồi nhắn ${who.via.split(' · ')[0]} với ${who.name} tới 23:14.` : '.';
      return s;
    }

    // ── Rooms ──
    const R = {
      home() {
        const y = state.year, ny = D.nearestYear(y), ph = D.photosOf(ny), who = D.peopleOf(y), note = D.notesOf(y)[0];
        const doors = [['photos', 'Ảnh', D.photos.length + ' tấm'], ['journal', 'Nhật ký', D.NOTES.length + ' bài'], ['angels', 'Angels', D.PEOPLE.length + ' người'], ['fantasy', 'Bóng đá', 'sắp có', 1], ['games', 'Game', 'sắp có', 1]];
        return `<section class="home2">
          <div class="h2-hero rv in">
            <div class="h2-text">
              <p class="eyebrow">${D.todayVN()}${ago(y) ? ' · ' + ago(y) + ' năm trước' : ''}</p>
              <h1>Ngày này năm <span class="yr">${y}</span></h1>
              <p class="h2-story">${story(y)}</p>
              <div class="actions"><button type="button" class="btn primary" data-go="day">Mở lại ngày này</button><button type="button" class="btn ghost" data-shuffle>Một ngày khác</button></div>
              ${who.length ? `<div class="h2-who">${who.map(p => `<img src="${faceOf(p).src}" alt="">`).join('')}<span>Năm ấy có ${who.map(p => p.name).join(', ')}</span></div>` : ''}
            </div>
            <div class="h2-photo" data-plist data-plist-day="${ny}">
              ${ph[2] ? `<img class="b2" src="${ph[2].src}" alt="">` : ''}${ph[1] ? `<img class="b1" src="${ph[1].src}" alt="">` : ''}${ph[0] ? img(ph[0], 'front') : ''}
              <span class="h2-count">${ph.length} ảnh trong ngày</span>
            </div>
          </div>
          <div class="h2-more">
            ${ph.length > 1 ? `<section class="rv"><h2 class="sec">Cùng ngày ấy</h2><div class="strip" data-plist>${ph.map(p => img(p)).join('')}</div></section>` : ''}
            <div class="h2-pair rv">
              <article class="card quote"><h3>Một dòng tin nhắn</h3><q>mai thi xong roi di choi nhe. t mua ve rap quoc gia roi</q><small>${who[0] ? who[0].name : 'Bích Trân'} · Yahoo · 23:14</small><button type="button" class="linkish" data-go="day">Đọc tiếp trong ngày này</button></article>
              <article class="card notecard"><h3>${note ? 'Bạn đã viết' : 'Bạn từng viết'}</h3><b>${(note || D.NOTES[0]).title}</b><p>${(note || D.NOTES[0]).body}</p><button type="button" class="linkish" data-go="journal">Mở nhật ký</button></article>
            </div>
            <section class="rv"><h2 class="sec">Đi tiếp</h2><div class="doors">${doors.map(([id, name, sub, off]) => `<button type="button" class="door d-${id} ${off ? 'off' : ''}" data-go="${id}"><span class="door-art"></span><b>${name}</b><span>${sub}</span></button>`).join('')}</div></section>
          </div>
        </section>`;
      },
      day() {
        const y = state.year, ny = D.nearestYear(y), ph = D.photosOf(ny), who = D.peopleOf(y)[0], note = D.notesOf(y)[0];
        const half = Math.ceil(ph.length / 2), groups = [ph.slice(0, half), ph.slice(half)].filter(g => g.length);
        const items = groups.map(g => ({ t: D.timeOf(g[0]), html: `<h3>${g.length} ảnh · ${g[0].caption}</h3><div class="strip" data-plist>${g.map(p => img(p)).join('')}</div>` }));
        if (who) items.push({ t: '21:14', html: `<h3>${who.via.split(' · ')[0]} với ${who.name} · ${D.CHAT.length} dòng</h3><div class="chat">${D.CHAT.map(([w, ts, tx]) => `<p class="${w}"><span class="ts">${ts}</span><b>${w === 'them' ? who.name : 'bạn'}:</b> ${tx}</p>`).join('')}</div><button type="button" class="linkish" data-reader="${who.via.split(' · ')[0]}">Đọc cả cuộc trò chuyện</button>` });
        items.push({ t: '23:40', html: note ? `<h3>Bạn đã viết · ${note.title}</h3><p style="margin:0; line-height:1.65">${note.body}</p>` : `<h3>Ngày ấy bạn không viết gì</h3><p style="margin:0; opacity:.7">Có thể viết thêm một dòng cho ngày này.</p>` });
        items.sort((a, b) => a.t.localeCompare(b.t));
        return `<section class="day">
          <button type="button" class="back" data-back>← Quay lại</button>
          <p class="eyebrow">${ago(y) ? ago(y) + ' năm trước' : 'Hôm nay'}</p>
          <h1 style="text-transform: none">${dayName(y).replace(/^./, c => c.toUpperCase())}</h1>
          <p class="lede">Cả ngày ấy, theo đúng thứ tự thời gian.</p>
          <ol class="tl">${items.map((it, i) => `<li class="tl-item rv ${i < 2 ? 'in' : ''}"><time>${it.t}</time><div class="tl-body card">${it.html}</div></li>`).join('')}</ol>
        </section>`;
      },
      photos() {
        const y = state.year, list = D.photosOf(y);
        return `<section class="photos"><header class="head"><p class="eyebrow">Ảnh</p><h1>Năm <span class="yr">${y}</span></h1><p class="lede">${list.length ? list.length + ' tấm, xếp theo ngày chụp.' : 'Năm này chưa có tấm nào — chọn một năm khác.'}</p></header>
          <div class="folders">${D.FOLDERS.map(([n, c], i) => `<button type="button" class="folder"><span class="folder-art"><img src="${D.photos[(i * 7) % 40].src}" alt=""></span><b>${n}</b><span>${c} ảnh</span></button>`).join('')}</div>
          <h2 class="sec">Tất cả ảnh năm ${y}</h2><div class="jg" id="jg" data-plist></div></section>`;
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
        return `<section class="angels"><header class="head"><p class="eyebrow">Angels</p><h1>${now.length ? 'Năm <span class="yr">' + y + '</span>' : 'Những người thương'}</h1><p class="lede">Mỗi người là một chương. Chạm vào để mở chương đó.</p></header>
          <div class="people">${D.PEOPLE.map((p, k) => `<button type="button" class="person ${y >= p.from && y <= p.to ? 'on' : 'dim'}" data-person="${k}"><span class="person-art"><img src="${faceOf(p).src}" alt=""></span><b>${p.name}</b><span>${p.from}${p.to !== p.from ? '–' + p.to : ''} · ${p.via}</span></button>`).join('')}</div></section>`;
      },
      person() {
        const p = D.PEOPLE[state.person], face = faceOf(p), years = []; for (let y = p.from; y <= p.to; y++) years.push(y);
        const together = D.photos.filter(ph => ph.year >= p.from && ph.year <= p.to).concat(D.photos.filter(ph => ph.year < p.from || ph.year > p.to)).slice(0, 8);
        return `<section class="person-view">
          <button type="button" class="back" data-back>← Angels</button>
          <div class="pv-head rv in"><div class="pv-portrait" data-plist>${img(face)}</div>
            <div><p class="eyebrow">${p.from}${p.to !== p.from ? ' – ' + p.to : ''} · ${p.via}</p><h1>${p.name}</h1><p class="pv-memory">“${p.memory}.”</p>
              <div class="readers">${p.via.split(' · ').map(v => `<button type="button" class="reader-btn" data-reader="${v}" style="--tone:${TONE[v] || '#555'}"><i></i>Đọc lại ${v}</button>`).join('')}</div></div></div>
          <section class="rv"><h2 class="sec">Ảnh cùng nhau</h2><div class="strip" data-plist>${together.map(ph => img(ph)).join('')}</div></section>
          <section class="rv"><h2 class="sec">Những ngày đáng nhớ</h2><ul class="dates">${years.map(y => { const n = D.notesOf(y)[0]; return `<li><button type="button" class="card" data-day="${y}"><time>${new Date().getDate()}/${new Date().getMonth() + 1}/${y}</time><span>${n ? n.title : D.photosOf(y).length + ' ảnh · ' + p.like.split(',')[0].toLowerCase()}</span></button></li>`; }).join('')}</ul></section>
        </section>`;
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

    // ── Reveal on scroll ──
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: stage, threshold: 0.12 });

    function render() {
      document.body.dataset.room = state.room;
      const tab = PARENT[state.room] || state.room;
      app.querySelectorAll('.dock [data-room]').forEach(b => b.setAttribute('aria-current', String(b.dataset.room === tab)));
      yearsIn.querySelectorAll('button').forEach(b => { const on = +b.dataset.year === state.year; b.setAttribute('aria-pressed', String(on)); if (on) b.scrollIntoView({ block: 'nearest' }); });
      roomEl.innerHTML = (SKIN.rooms && SKIN.rooms[state.room] ? SKIN.rooms[state.room] : R[state.room])(state, D);
      roomEl.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
      roomEl.querySelectorAll('[data-back]').forEach(b => b.onclick = () => go(state.from && state.from !== state.room ? state.from : (PARENT[state.room] || 'home')));
      roomEl.querySelectorAll('[data-shuffle]').forEach(b => b.onclick = () => shuffle('home'));
      roomEl.querySelectorAll('[data-reader]').forEach(b => b.onclick = () => openReader(b.dataset.reader));
      roomEl.querySelectorAll('[data-person]').forEach(b => b.onclick = () => { state.person = +b.dataset.person; go('person'); });
      roomEl.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { state.year = +b.dataset.day; go('day'); });
      if (state.room === 'photos') {
        const list = D.photosOf(state.year), j = SKIN.justify || {};
        if (list.length) SH.justify(roomEl.querySelector('#jg'), list, { rowHeight: j.rowHeight || 230, gap: j.gap ?? 8, render: (p) => {
          const f = document.createElement('figure'); f.className = 'jg-item ' + (j.cls || ''); f.innerHTML = img(p); return f; } });
      }
      roomEl.querySelectorAll('.rv:not(.in)').forEach(el => io.observe(el));
      SKIN.onRender && SKIN.onRender(state, app);
    }

    // ── Photo viewer ──
    const viewer = app.querySelector('.viewer'), vImg = viewer.querySelector('.v-fig img'), vBg = viewer.querySelector('.v-bg'), vCap = viewer.querySelector('.v-cap'), vStrip = viewer.querySelector('.v-strip');
    let vList = [], vIdx = 0, idleT;
    function showPhoto(i) {
      vIdx = (i + vList.length) % vList.length; const p = vList[vIdx];
      vImg.src = p.src; vImg.style.animation = 'none'; void vImg.offsetWidth; vImg.style.animation = '';
      vBg.style.setProperty('--img', `url('${p.src}')`);
      vCap.innerHTML = `<b>${p.caption}</b><span>${D.timeOf(p)} · ${dayName(p.year)}</span>`;
      vStrip.querySelectorAll('img').forEach((t, k) => t.classList.toggle('on', k === vIdx));
    }
    function wake() { viewer.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => viewer.classList.add('idle'), 2600); }
    function openViewer(list, i) {
      vList = list; vStrip.innerHTML = list.map(p => `<img src="${p.src}" alt="">`).join('');
      vStrip.querySelectorAll('img').forEach((t, k) => t.onclick = (e) => { e.stopPropagation(); showPhoto(k); wake(); });
      viewer.classList.add('open'); showPhoto(i); wake();
    }
    const closeViewer = () => { viewer.classList.remove('open'); clearTimeout(idleT); };
    viewer.addEventListener('mousemove', wake); viewer.addEventListener('touchstart', wake, { passive: true });
    viewer.querySelector('.v-close').onclick = closeViewer;
    viewer.querySelector('.v-prev').onclick = () => { showPhoto(vIdx - 1); wake(); };
    viewer.querySelector('.v-next').onclick = () => { showPhoto(vIdx + 1); wake(); };
    viewer.querySelector('.v-fig').onclick = (e) => { if (e.target.tagName !== 'IMG') closeViewer(); };
    roomEl.addEventListener('click', (e) => {
      const t = e.target.closest('img[data-pid]'); if (!t) return;
      const box = t.closest('[data-plist]') || roomEl;
      if (box.dataset.plistDay) { const list = D.photosOf(+box.dataset.plistDay); openViewer(list, Math.max(0, list.findIndex(p => p.id === +t.dataset.pid))); return; }
      const imgs = [...box.querySelectorAll('img[data-pid]')], list = imgs.map(el => D.photos.find(p => p.id === +el.dataset.pid)).filter(Boolean);
      openViewer(list, Math.max(0, imgs.indexOf(t)));
    });

    // ── Reader (device frame) ──
    const reader = app.querySelector('.reader'), readerBox = app.querySelector('.reader-box');
    function openReader(v) {
      const name = v === 'Yahoo' ? 'Yahoo! Messenger' : v;
      readerBox.innerHTML = SKIN.device ? SKIN.device(name, TONE[v] || '#555') : `<div class="device"><div class="screen"><b>${name}</b><p>Phòng đọc riêng — design sau.</p></div></div>`;
      reader.classList.add('open');
    }
    reader.onclick = (e) => { if (e.target === reader || e.target.closest('[data-close]')) reader.classList.remove('open'); };

    // ── Search ──
    const pal = app.querySelector('.palette'), q = pal.querySelector('input'), ul = pal.querySelector('ul');
    const INDEX = [
      ...D.PEOPLE.map((p, k) => ({ n: p.name, d: 'Angels · ' + p.from + (p.to !== p.from ? '–' + p.to : ''), run: () => { state.person = k; state.year = p.from; go('person'); } })),
      ...D.NOTES.map(n => ({ n: n.title, d: 'Nhật ký · ' + n.year, run: () => { state.year = n.year; go('journal'); } })),
      ...D.YEARS.map(y => ({ n: String(y), d: 'Ngày này năm ' + y, run: () => { state.year = y; go('home'); } })),
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

    // ── Keyboard (quiet: nothing on screen) ──
    addEventListener('keydown', (e) => {
      if (viewer.classList.contains('open')) {
        if (e.key === 'Escape') closeViewer(); if (e.key === 'ArrowLeft') { showPhoto(vIdx - 1); wake(); } if (e.key === 'ArrowRight') { showPhoto(vIdx + 1); wake(); } return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
      if (e.key === 'Escape') { pal.classList.remove('open'); reader.classList.remove('open'); return; }
      if (pal.classList.contains('open') || e.target.tagName === 'INPUT') return;
      if (e.key === '/') { e.preventDefault(); openSearch(); }
      if (/^[1-6]$/.test(e.key)) go(ROOMS[+e.key - 1].id);
      if (e.key === 'ArrowUp' && state.year < D.YEARS.at(-1)) { e.preventDefault(); setYear(state.year + 1); }
      if (e.key === 'ArrowDown' && state.year > D.YEARS[0]) { e.preventDefault(); setYear(state.year - 1); }
    });

    window.PortalAPI = { state, go, setYear, openViewer };
    SKIN.decorate && SKIN.decorate(app);
    const h = location.hash.slice(1); if (ROOMS.some(r => r.id === h)) state.room = h;
    render(); flagYear();
    return { state, go, setYear };
  };
})();
