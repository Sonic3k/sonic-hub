/* The slips of paper over the scene: the year, the hour, the list of rooms, the note that opens when a bright dot is
   touched. The words are the place's (its meta, its cards, its notes); how they are shown is the same everywhere. */
import { eraOf } from './eras.js';

const $ = id => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

export function setupUI(place, api) {
  const meta = place.meta, Y = meta.years || null, hours = meta.hours;
  const state = { year: Y ? Y.start : null, hour: hours[0].id, look: '', open: null, cardId: null };
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
  function showCard(id, extra) { const d = place.card ? place.card(id, { year: state.year, hour: state.hour, extra }) : null; if (d) { fill(d); state.cardId = id; } }
  document.querySelectorAll('[data-close]').forEach(x => x.addEventListener('click', () => close(x.dataset.close)));

  // rooms
  const list = $('room-list');
  for (const [key, v] of Object.entries(place.views)) { const li = el('li'), bt = el('button', v.name); bt.type = 'button'; bt.addEventListener('click', () => { close(); api.goto(key); label(v.name); }); li.append(bt); list.append(li); }
  $('b-rooms').addEventListener('click', () => (state.open === 'rooms' ? close() : open('rooms')));
  // on the site (not as a lone file) there is a way back to the list of places
  if (/^https?:$/.test(location.protocol) && /\/places\//.test(location.pathname)) document.querySelectorAll('.back').forEach(a => { a.hidden = false; });

  // year
  const yr = $('year'), out = $('year-out');   // none for a place of one year: it keeps that year's paper and ink
  function setYear(y, silent) {
    if (!Y) return;
    state.year = y; if (yr) { yr.value = String(y); out.textContent = String(y); }
    root.dataset.era = eraOf(y).key;
    $('where').textContent = `${meta.sub} · ${y}`;
    api.setYear(y);
    if (!silent && yr) { const t = place.sayYear ? place.sayYear(y) : ''; speak([el('b', String(y)), document.createTextNode(t ? ` · ${t}` : '')], 3200); }
    if (state.cardId) showCard(state.cardId);
    try { localStorage.setItem(`world:${meta.id}:year`, String(y)); } catch { /* storage is a convenience only */ }
  }
  if (Y && yr) {
    yr.addEventListener('input', () => setYear(+yr.value));
    // a touch on a year under the line goes straight to it
    document.querySelectorAll('#ticks span').forEach(t => t.addEventListener('click', () => setYear(+t.dataset.y)));
  }

  // hour
  function setHour(id, silent) {
    const h = hours.find(x => x.id === id); if (!h) return;
    state.hour = id; for (const x of hours) $('h-' + x.id).setAttribute('aria-pressed', String(x.id === id));
    api.setHour(id);
    if (!silent) speak([el('b', h.name), document.createTextNode(h.say ? ` · ${h.say}` : '')], 2800);
    if (state.cardId) showCard(state.cardId);
  }
  for (const h of hours) $('h-' + h.id).addEventListener('click', () => setHour(h.id));

  // look: how the place is drawn (engine/look.js). The first of the list is the plain way.
  const looks = api.looks || [], lk = $('looks'), lid = l => 'l-' + (l.id || 'plain');
  function setLook(id, silent) {
    const l = looks.find(x => x.id === id) || looks[0]; if (!l) return;
    state.look = l.id; for (const x of looks) $(lid(x)).setAttribute('aria-pressed', String(x === l));
    api.setLook(l.id, !!silent);
    if (silent) return;
    speak([el('b', l.label), document.createTextNode(l.say ? ` · ${l.say}` : '')], 3000);
    // the address keeps the look, so that it can be passed on as it is seen
    try { const u = new URL(location.href); if (l.id) u.searchParams.set('look', l.id); else u.searchParams.delete('look'); history.replaceState(null, '', u); } catch { /* the address stays as it was */ }
  }
  if (looks.length > 1) for (const l of looks) { const b = el('button', l.label); b.type = 'button'; b.id = lid(l); b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', () => setLook(l.id)); lk.append(b); }
  else lk.hidden = true;

  // tour
  const bt = $('b-tour');
  function tourState(on) { bt.setAttribute('aria-pressed', String(on)); bt.textContent = on ? 'Dừng' : 'Tham quan'; }
  bt.addEventListener('click', () => { close(); if (bt.getAttribute('aria-pressed') === 'true') api.stopTour(); else api.startTour(); });

  // intro
  const hideIntro = () => { $('intro').classList.add('off'); root.classList.remove('intro'); };
  $('go-tour').addEventListener('click', () => { hideIntro(); api.startTour(); });
  $('go-walk').addEventListener('click', () => { hideIntro(); speak([document.createTextNode('Kéo để nhìn quanh · chạm sàn để đi tới')], 4200); });
  $('go-notes').addEventListener('click', () => { hideIntro(); if (place.notes) fill(place.notes); });
  if (!place.tour) { $('go-tour').hidden = true; bt.hidden = true; }
  if (!place.notes) $('go-notes').hidden = true;

  // the stick under the left thumb
  const stick = $('stick'), knob = stick.firstElementChild;
  function onStick(s, on) { stick.style.display = on ? 'block' : 'none'; if (on) { stick.style.left = s.ox + 'px'; stick.style.top = s.oy + 'px'; knob.style.transform = `translate(${s.x * 46}px, ${s.y * 46}px)`; } }

  const fade = $('fade');
  const cut = fn => { fade.classList.add('on'); setTimeout(() => { fn(); requestAnimationFrame(() => fade.classList.remove('on')); }, 230); };
  /* the tour has already jumped: go black at once, then let the new place come up */
  const blink = () => { fade.style.transition = 'none'; fade.classList.add('on'); void fade.offsetWidth; fade.style.transition = ''; requestAnimationFrame(() => requestAnimationFrame(() => fade.classList.remove('on'))); };

  let y0 = Y ? Y.start : null;
  if (Y) try { const s = +localStorage.getItem(`world:${meta.id}:year`); if (s >= Y.from && s <= Y.to) y0 = s; } catch { /* no storage */ }
  return { state, setYear, setHour, setLook, showCard, close, label, speak, tourState, onStick, hideIntro, cut, blink, year0: y0, ready() { $('load').remove(); for (const b of $('go').children) b.disabled = false; $('fail').style.display = 'none'; }, notes: () => place.notes && fill(place.notes) };
}
