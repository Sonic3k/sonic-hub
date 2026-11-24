/* What the campaign says has to stay true when the campaign grows: a bot joins, the league plays on, a room gets
   another opponent. So what is said of an opponent, and what she says, is how she plays, which is hers and stays.
   Where she stands is not written down anywhere: her rating is shown, and the build takes it from the league itself.
   The league is therefore never spoken of in the campaign's words: a standing in it ("second in the league",
   "nobody in the league…", a tally of wins) is out of date the day another bot is seated.
   Returns what is wrong, one sentence each; nothing when all is well. Used by the build and by the tests. */
module.exports = function standingsAmiss(content) {
  const wrong = [];
  const look = (who, text) => { if (/\bleagues?\b/i.test(text)) wrong.push(`${who} speaks of the league, where standings change whenever a bot joins: say how she plays instead: "${text}"`); };
  for (const v of content.venues || []) look(v.id, v.line || '');
  for (const id of Object.keys(content.opponents || {})) {
    const o = content.opponents[id];
    for (const text of [o.about, ...Object.values(o.lines).flat()]) look(id, text);
  }
  return wrong;
};
