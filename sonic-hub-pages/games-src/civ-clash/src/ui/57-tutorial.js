/* ── Learn to play: a real duel with a coach that lights up one part of the table at a time.
   show: when the step appears ('now' or a game moment); until: 'next' (button) or the action that completes it. ── */
const TUTORIAL = [
  { show: 'now', until: 'next', target: '#opps .camp', title: 'Welcome to the war table', text: 'You lead the Franks against the Japanese. Each turn you draw 1 card and play 1. Bring their HP to 0 to win.' },
  { show: 'now', until: 'next', target: '#hand', title: 'Your hand', text: 'A card does what its symbols say, left to right. The coloured words tell you the kind of effect: damage, HP, gold, cards, walls.' },
  { show: 'now', until: 'select', target: '#hand', title: 'Pick a card', text: 'Tap or click any card to see what it would do. Nothing happens until you confirm.' },
  { show: 'now', until: 'play', target: '#stage-card', title: 'See before you play', text: 'The tags above the camps show the result in advance. Press Play below to confirm.' },
  { show: 'turn', until: 'next', target: '#me .camp', title: 'Your camp', text: 'The ring is your HP. Walls you build stand next to it and take damage before your HP does.' },
  { show: 'now', until: 'next', target: '#events', title: 'Events', text: 'Each round an event hits everyone, and the next one is always shown, so you can plan for it.', wide: true },
  { show: 'now', until: 'next', target: '#market', title: 'Mercenaries', text: 'Gold hires one mercenary per turn. The card goes straight to your hand and joins your deck.', wide: true },
  { show: 'agecard', until: 'next', target: '#hand', title: 'The Imperial Age', text: 'Turn 7 brings this card. Playing it adds your civilization\'s three Imperial cards to your deck, plus a bonus.' },
  { show: 'now', until: 'next', target: '#table', title: 'That is the whole game', text: 'Outlast the Japanese to finish the lesson. Every other civilization is waiting in Choose a civilization.' },
];
function startTutorial() { UI.tutorial = { i: 0, live: false }; coachShow(); }
function coachShow() {
  const T = UI.tutorial; if (!T) return;
  let st = TUTORIAL[T.i];
  while (st && st.wide && mobile()) { T.i++; st = TUTORIAL[T.i]; }
  if (!st) return endTutorial();
  if (st.show !== 'now' && !T.live) { $('#coach').classList.add('hidden'); return; }
  const el = document.querySelector(st.target); if (!el) { $('#coach').classList.add('hidden'); return; }
  const r = el.getBoundingClientRect(), pad = 8, bw = Math.min(360, innerWidth - 24);
  const below = r.bottom + 190 < innerHeight, bx = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), innerWidth - bw - 12);
  const by = st.target === '#table' ? Math.max(12, r.top + 12) : below ? r.bottom + pad + 10 : Math.max(12, r.top - pad - 180);
  $('#coach').innerHTML = `<div class="spot" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>
<div class="bubble" style="left:${bx}px;top:${by}px"><h4>${esc(st.title)}</h4><p>${kw(st.text)}</p><div class="row"><span class="step">Step ${T.i + 1} of ${TUTORIAL.length}</span><span>${st.until === 'next' ? '<button class="btn small" data-act="coach-next">Next</button>' : '<span class="step">Your move</span>'} <button class="btn ghost small" data-act="coach-skip">Skip lesson</button></span></div></div>`;
  $('#coach').classList.remove('hidden'); T.shown = true;
}
function coachEvent(name) {
  const T = UI.tutorial; if (!T) return; const st = TUTORIAL[T.i]; if (!st) return;
  if (!T.shown && st.show === name) { T.live = true; return setTimeout(coachShow, D(300) + 120); }
  if (T.shown && st.until === name) coachNext();
}
function coachNext() { const T = UI.tutorial; if (!T) return; T.i++; T.shown = false; T.live = false; $('#coach').classList.add('hidden'); setTimeout(coachShow, 140); }
function endTutorial() { UI.tutorial = null; $('#coach').classList.add('hidden'); SET.tutorialDone = true; saveSettings(); }
addEventListener('resize', () => { if (UI.tutorial && UI.tutorial.shown) coachShow(); });
