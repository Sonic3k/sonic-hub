/* Cards as the player sees them: a whole card (to read), a small one (in the hand), and a creature or building
   standing in a lane. A card's row is its line in the game's data; its picture is drawn by 25-pictures.js. */

/** row: a card of the data. o: { cost (what it costs now), atk, def, glint, mini, cls, lazy (draw its picture only
 *  once it is near the screen) } */
function cardEl(row, o = {}) {
  const el = h('div.card.r' + row.faction + (row.edition ? '.e-' + row.edition : '') + (o.mini ? '.mini' : '') + (o.cls ? '.' + o.cls : ''));
  el.dataset.id = row.id;
  const cost = o.cost !== undefined ? o.cost : row.cost;
  el.append(
    h('div.top', h('span.cost', String(cost)), h('span.name', row.name)),
    h('div.pic-w', o.lazy ? Pictures.lazy('card', row) : Pictures.img('card', row)),
  );
  if (row.edition && !o.mini) el.append(h('span.ed', row.edition));
  if (!o.mini) el.append(h('div.line', `${REALM_SHORT[row.faction]} · ${KINDS[row.type]}`), h('div.text', row.text || ''));
  else el.append(h('div'));
  const stats = h('div.stats');
  if (row.type === 0) stats.append(h('span.st.atk', String(o.atk !== undefined ? o.atk : row.atk)), o.mini ? '' : h('span.st.gl', String(o.glint !== undefined ? o.glint : row.floop)), h('span.st.def', String(o.def !== undefined ? o.def : row.def)));
  else stats.append(h('span'), h('span.caps', { style: { fontSize: '.7em', color: '#fffaf0', textShadow: '0 1px 2px #0008' } }, KINDS[row.type]), h('span'));
  el.append(stats);
  return el;
}
function backEl() { return h('div.card.back'); }

/** a woman's face: her photo when she was given one, else her glass portrait. hero: a row of the data's heroes */
function faceEl(hero, px = 120) {
  const w = h('div.face'), photo = Game.cast ? Game.cast.photo(hero.cast, px) : '';
  if (photo) { const im = h('img', { alt: '', src: photo }); w.append(im); }
  else w.append(Pictures.img('portrait', hero, CONTENT.cast.people[hero.cast]));
  return w;
}
/** the name she goes by: the one she was given on the cast page, else the game's own */
function nameOf(castKey) { return (Game.cast && Game.cast.name(castKey)) || CONTENT.cast.people[castKey].name; }
function heroTitle(hero) { return nameOf(hero.cast) + (hero.form ? ' · ' + hero.form : ''); }
