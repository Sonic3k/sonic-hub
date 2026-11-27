/* The screen in the middle of the dashboard, and the sheet that opens when it is touched. The car's own screen is drawn
   the way his photographs of it show it (8/2/2020 and 30/11/2019: "Bluetooth Audio", the track's number and time, the
   song, the record, the singer, and Connect ▶ ❙❙ RPT RAND along the bottom). What it plays is his own music: the
   lists Sonic Hub keeps (/api/music/playlists), a song's sound from the same place. Where the page may not reach the
   hub (a preview shut in a frame), the list still shows, from the copy made when the place was built, and says why
   there is no sound. */
import * as THREE from 'three';

const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * @param o { api: 'https://…/api', prefer: [list keys, best first], fallback: { key, title, tracks: [[key, title, artist, album, seconds]] },
 *            el: the sheet's element, routes: [{ id, name, to, length }], onRoute(id), onOpen(open) }
 */
export function setupHeadUnit(o) {
  const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 288;
  const g = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const audio = new Audio(); audio.preload = 'none';
  const S = { lists: [], list: null, tracks: [], at: -1, playing: false, repeat: false, random: false, online: null, note: '', open: false, tab: 'music', fails: 0, order: [] };
  const origin = o.api.replace(/\/api\/?$/, '');
  const now = () => (S.at >= 0 ? S.tracks[S.at] : null);

  /* ── the car's screen ── */
  function draw() {
    const W = 480, H = 288, t = now();
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b1c33'); bg.addColorStop(0.5, '#071224'); bg.addColorStop(1, '#030812'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#16345c'; g.fillRect(0, 0, W, 46); g.fillStyle = '#2a5a96'; g.fillRect(0, 44, W, 2);
    g.fillStyle = '#fff'; g.font = '700 25px Arial, Helvetica, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('♪ Bluetooth Audio', 12, 24);
    g.strokeStyle = '#9db7d6'; g.lineWidth = 1.5; g.strokeRect(374, 9, 96, 28); g.font = '600 17px Arial, Helvetica, sans-serif'; g.fillText('◢ Source', 382, 24);
    g.fillStyle = '#9db7d6'; g.font = '500 15px Arial, Helvetica, sans-serif'; g.fillText('Track', 150, 66); g.fillText('Time', 290, 66);
    g.fillStyle = '#fff'; g.font = '600 27px Arial, Helvetica, sans-serif'; g.textAlign = 'right';
    g.fillText(t ? String(S.at + 1) : '–', 262, 68); const sec = Math.floor(audio.currentTime || 0); g.fillText(t ? `${Math.floor(sec / 60)}'${String(sec % 60).padStart(2, '0')}"` : `–'––"`, 440, 68);
    g.textAlign = 'left';
    const bx = g.createLinearGradient(20, 92, 20, 190); bx.addColorStop(0, '#2f79d8'); bx.addColorStop(1, '#1647a0'); g.fillStyle = bx; g.fillRect(20, 96, 78, 96); g.strokeStyle = '#b9d2f2'; g.strokeRect(20, 96, 78, 96);
    g.fillStyle = '#fff'; g.font = '700 54px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText('♫', 59, 146); g.textAlign = 'left';
    const lines = t ? [['♪', t.title, '700 23px'], ['◎', t.album || '', '500 20px'], ['●', t.artist || '', '500 20px']] : [['', S.note || 'Chạm để chọn nhạc', '600 21px'], ['', '', ''], ['', '', '']];
    lines.forEach(([ic, text, font], k) => {
      const y = 108 + k * 35; g.fillStyle = '#9db7d6'; g.font = '500 18px Arial, Helvetica, sans-serif'; g.fillText(ic, 114, y); if (!text) return;
      g.fillStyle = '#fff'; g.font = `${font} Arial, Helvetica, sans-serif`; let s = text; while (s.length > 3 && g.measureText(s).width > 326) s = s.slice(0, -2); g.fillText(s === text ? s : s + '…', 138, y);
    });
    const btn = (x, w, label, on) => { g.fillStyle = on ? '#2f79d8' : '#10233f'; g.fillRect(x, 232, w, 44); g.strokeStyle = on ? '#dcebff' : '#5d7da6'; g.lineWidth = 1.5; g.strokeRect(x, 232, w, 44); g.fillStyle = '#fff'; g.font = '600 19px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.fillText(label, x + w / 2, 255); g.textAlign = 'left'; };
    btn(20, 110, 'Connect', false); btn(140, 66, '▶', S.playing); btn(214, 66, '❙❙', !!t && !S.playing); btn(288, 82, 'RPT', S.repeat); btn(378, 82, 'RAND', S.random);
    texture.needsUpdate = true;
  }

  /* ── his lists ── */
  const trackOf = e => { const t = e.track; return { key: t.key, title: t.title + (t.version ? ` (${t.version})` : ''), artist: t.artist ? t.artist.name : '', album: t.album ? t.album.title : '', sec: t.durationSec || 0, url: origin + t.audioUrl }; };
  async function loadList(key) {
    const d = await (await fetch(`${o.api}/music/playlists/${encodeURIComponent(key)}`)).json();
    S.list = { key: d.key, title: d.title }; S.tracks = d.entries.filter(e => e.track && e.track.hasAudio && e.track.audioUrl).map(trackOf); S.at = -1; reorder(); remember(); render(); draw();
  }
  async function connect() {
    try {
      const all = await (await fetch(`${o.api}/music/playlists`)).json();
      S.lists = all.filter(p => p.withAudio >= 8).map(p => ({ key: p.key, title: p.title, n: p.withAudio, when: p.when || p.takenAt || '' }));
      const rank = k => { const i = o.prefer.indexOf(k); return i < 0 ? 99 : i; };
      S.lists.sort((a, b) => rank(a.key) - rank(b.key) || /driving/i.test(b.title) - /driving/i.test(a.title) || a.title.localeCompare(b.title, 'vi'));
      S.online = true; let want = null; try { want = localStorage.getItem('world.unit.list'); } catch { /* no memory here */ }
      await loadList(S.lists.some(l => l.key === want) ? want : S.lists[0].key);
    } catch {
      S.online = false; const f = o.fallback;
      if (f) { S.lists = [{ key: f.key, title: f.title, n: f.tracks.length }]; S.list = { key: f.key, title: f.title }; S.tracks = f.tracks.map(([key, title, artist, album, sec]) => ({ key, title, artist, album, sec, url: null })); reorder(); }
      S.note = 'Bản xem thử: chưa có tiếng'; render(); draw();
    }
  }
  const remember = () => { try { if (S.list) localStorage.setItem('world.unit.list', S.list.key); } catch { /* no memory here */ } };
  function reorder() { S.order = S.tracks.map((_, i) => i); if (S.random) for (let i = S.order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [S.order[i], S.order[j]] = [S.order[j], S.order[i]]; } }

  /* ── playing ── */
  function play(i) {
    if (i < 0 || i >= S.tracks.length) return;
    S.at = i; const t = S.tracks[i];
    if (!t.url) { S.playing = false; S.note = ''; render(); draw(); say('Bản xem thử này không phát được tiếng: khung xem thử chặn mọi kết nối ra ngoài. Trên trang thật nhạc phát từ thư viện của Sonic Hub.'); return; }
    audio.src = t.url; S.playing = true; say('');
    audio.play().then(() => { S.fails = 0; }).catch(() => { S.playing = false; render(); draw(); });
    if ('mediaSession' in navigator) { try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album }); } catch { /* an old browser */ } }
    render(); draw();
  }
  const step = d => { if (!S.tracks.length) return; const k = S.order.indexOf(S.at), n = S.order.length; play(S.order[((k < 0 ? (d > 0 ? -1 : 0) : k) + d + n) % n]); };
  function toggle() { const t = now(); if (!t) { step(1); return; } if (!t.url) { play(S.at); return; } if (audio.paused) { audio.play().then(() => { S.playing = true; render(); draw(); }).catch(() => {}); } else { audio.pause(); S.playing = false; render(); draw(); } }
  audio.addEventListener('ended', () => { if (S.repeat) { audio.currentTime = 0; audio.play().catch(() => {}); } else step(1); });
  audio.addEventListener('error', () => { if (!audio.src || S.at < 0) return; S.fails++; if (S.fails < 4) step(1); else { S.playing = false; say('Không tải được bài này từ Sonic Hub.'); render(); draw(); } });
  audio.addEventListener('pause', () => { if (!audio.ended) { S.playing = false; render(); draw(); } });
  audio.addEventListener('playing', () => { S.playing = true; render(); draw(); });
  if ('mediaSession' in navigator) { try { navigator.mediaSession.setActionHandler('nexttrack', () => step(1)); navigator.mediaSession.setActionHandler('previoustrack', () => step(-1)); } catch { /* an old browser */ } }

  /* ── the sheet ── */
  const el = o.el; let lastSec = -1;
  el.innerHTML = `<div class="unit-head"><div class="unit-tabs" role="tablist"><button type="button" role="tab" data-tab="music">Nhạc</button><button type="button" role="tab" data-tab="go">Điểm đến</button></div><button type="button" class="unit-x" aria-label="Đóng">Đóng</button></div>
  <div class="unit-body" data-pane="music">
    <div class="unit-now"><b class="unit-title"></b><span class="unit-sub"></span></div>
    <div class="unit-bar"><span class="unit-t0">0:00</span><input type="range" class="unit-seek" min="0" max="1000" value="0" aria-label="Vị trí trong bài"><span class="unit-t1">0:00</span></div>
    <div class="unit-keys"><button type="button" data-do="prev" aria-label="Bài trước">⏮</button><button type="button" data-do="toggle" class="unit-play" aria-label="Phát hoặc dừng">▶</button><button type="button" data-do="next" aria-label="Bài sau">⏭</button><button type="button" data-do="repeat" aria-pressed="false">Lặp</button><button type="button" data-do="random" aria-pressed="false">Ngẫu nhiên</button></div>
    <p class="unit-say" hidden></p>
    <label class="unit-pick"><span>Danh sách</span><select class="unit-lists"></select></label>
    <ol class="unit-tracks"></ol>
  </div>
  <div class="unit-body" data-pane="go" hidden><ul class="unit-routes"></ul><p class="unit-more">Về nhà 20606 Anza có hai đường (Inglewood Ave hoặc Hawthorne Blvd) và ba chỗ đỗ; chiều từ nhà đi làm chưa có. Các điểm khác (Gardena, chợ, Point Vicente, Orange County) sẽ thêm vào đây khi dựng xong.</p></div>`;
  const $ = s => el.querySelector(s);
  const say = text => { const p = $('.unit-say'); p.textContent = text; p.hidden = !text; };
  function render() {
    const t = now();
    $('.unit-title').textContent = t ? t.title : (S.online === null ? 'Đang nối với Sonic Hub…' : 'Chưa phát bài nào');
    $('.unit-sub').textContent = t ? [t.artist, t.album].filter(Boolean).join(' · ') : (S.list ? `${S.list.title} · ${S.tracks.length} bài` : '');
    $('.unit-play').textContent = S.playing ? '❙❙' : '▶';
    $('[data-do="repeat"]').setAttribute('aria-pressed', S.repeat); $('[data-do="random"]').setAttribute('aria-pressed', S.random);
    const sel = $('.unit-lists'); if (sel.options.length !== S.lists.length) sel.innerHTML = S.lists.map(l => `<option value="${esc(l.key)}">${esc(l.title)} (${l.n})</option>`).join(''); if (S.list) sel.value = S.list.key;
    const ol = $('.unit-tracks'); if (ol.dataset.list !== (S.list ? S.list.key : '') + ':' + S.tracks.length) { ol.dataset.list = (S.list ? S.list.key : '') + ':' + S.tracks.length; ol.innerHTML = S.tracks.map((x, i) => `<li><button type="button" data-i="${i}"><b>${esc(x.title)}</b><span>${esc(x.artist)}</span><i>${fmt(x.sec)}</i></button></li>`).join(''); }
    for (const b of ol.querySelectorAll('[aria-current]')) b.removeAttribute('aria-current');
    if (S.at >= 0) { const b = ol.querySelector(`[data-i="${S.at}"]`); if (b) b.setAttribute('aria-current', 'true'); }
    for (const b of el.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', b.dataset.tab === S.tab);
    for (const p of el.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== S.tab;
  }
  function routes(list, current) {
    $('.unit-routes').innerHTML = list.map(r => `<li><button type="button" data-route="${esc(r.id)}"${r.id === current ? ' aria-current="true"' : ''}><b>${esc(r.to)}</b><span>từ ${esc(r.from.split(' · ')[0])}${r.by ? ' · ' + esc(r.by) : ''} · ${(r.length / 1000).toFixed(1).replace('.', ',')} km</span></button></li>`).join('');
  }
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('unit-x')) return api.open(false);
    if (b.dataset.tab) { S.tab = b.dataset.tab; return render(); }
    if (b.dataset.i != null) return play(+b.dataset.i);
    if (b.dataset.route) { api.open(false); return o.onRoute && o.onRoute(b.dataset.route); }
    const d = b.dataset.do;
    if (d === 'toggle') toggle(); else if (d === 'next') step(1); else if (d === 'prev') step(-1);
    else if (d === 'repeat') { S.repeat = !S.repeat; render(); draw(); } else if (d === 'random') { S.random = !S.random; reorder(); render(); draw(); }
  });
  $('.unit-lists').addEventListener('change', e => { if (S.online) { audio.pause(); S.playing = false; loadList(e.target.value).catch(() => say('Không tải được danh sách này.')); } });
  $('.unit-seek').addEventListener('input', e => { if (audio.duration) audio.currentTime = audio.duration * e.target.value / 1000; });

  const api = {
    texture, state: S,
    open(v, tab) { S.open = v; if (tab) S.tab = tab; el.classList.toggle('open', v); el.setAttribute('aria-hidden', !v); render(); if (o.onOpen) o.onOpen(v); },
    routes,
    /** once a second is enough for the clock on the screen */
    tick() {
      const sec = Math.floor(audio.currentTime || 0); if (sec === lastSec) return; lastSec = sec; draw();
      if (S.open) { $('.unit-t0').textContent = fmt(sec); $('.unit-t1').textContent = fmt(audio.duration || (now() ? now().sec : 0)); if (audio.duration) $('.unit-seek').value = Math.round(1000 * audio.currentTime / audio.duration); }
    },
    toggle, next: () => step(1), prev: () => step(-1), play,
  };
  draw(); render(); connect();
  return api;
}
