/* How one opponent may speak of another. The page reads {key} in what she says, or in what is said of her, as the
   name that opponent goes by now, which can be changed after the game is built (game/admin.html). So a key has to be
   someone, and a name written out is a mistake: it would stay behind when she is given another.
   Returns what is wrong, one sentence each; nothing when all is well. Used by the build and by the tests. */
module.exports = function namesAmiss(opponents) {
  const wrong = [], ids = Object.keys(opponents);
  const outright = new RegExp('(?<![\\p{L}\\p{N}])(' + ids.map(id => opponents[id].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![\\p{L}\\p{N}])', 'u');
  for (const id of ids) {
    const o = opponents[id];
    for (const text of [o.about, ...Object.values(o.lines).flat()]) {
      for (const [, key] of text.matchAll(/\{([^}]*)\}/g)) if (!opponents[key]) wrong.push(`${id} names {${key}}, who is not an opponent of the campaign: "${text}"`);
      const said = outright.exec(text.replace(/\{[^}]*\}/g, ''));
      if (said) wrong.push(`${id} names ${said[1]} outright: write {${ids.find(k => opponents[k].name === said[1])}}, so that the name follows her when it is changed: "${text}"`);
    }
  }
  return wrong;
};
