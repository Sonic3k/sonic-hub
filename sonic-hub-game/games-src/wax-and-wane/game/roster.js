/* Who plays whom, as a page of the repository: docs/ROSTER.md. The build writes it from the campaign as the page
   carries it (every opponent with her rating and the writer of her bot) and from the points at which she opens. */
module.exports = function roster(content, opens, START) {
  const when = at => (at > START ? `${at} points` : 'the start');
  const out = ['# Who plays whom', '',
    'Every opponent of the campaign, place by place: her rating, the points at which she sits down with a player, the bot',
    'she plays as (a file in `bots/` and a level in it), and the model that wrote that bot. The ratings are the',
    'league\'s (`arena/ratings.json`, written from every game in `arena/league.json`).', '',
    'This page is written by `npm run build` from `content/campaign.json` and `arena/ratings.json`. To change who sits',
    'where, what she is called or which bot she plays as, change the campaign and build again.'];
  content.venues.forEach((v, i) => {
    out.push('', `## ${i + 1}. ${v.name}`, '', `${opens[v.id] > START ? `Opens at ${opens[v.id]} points` : 'Open from the start'}. ${v.line}`, '',
      '| Opponent | Rating | Opens at | Bot | Level | Written by |', '|---|---|---|---|---|---|');
    for (const id of v.opponents) { const o = content.opponents[id]; out.push(`| ${o.name}, ${o.role.charAt(0).toLowerCase() + o.role.slice(1)} | ${o.rating} | ${when(opens[id])} | \`bots/${o.bot}.js\` | ${o.level} | ${o.by} |`); }
  });
  return out.join('\n') + '\n';
};
