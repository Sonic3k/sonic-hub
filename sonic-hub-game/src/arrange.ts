/* The shelf worked out from the catalogue and from which games are picked out: games by key, by kind, the machines
   and shelves that exist, the search index, and the one rule for what stands up front. Plain data in, plain data
   out: nothing here touches the page, so it runs the same in a test (scripts/front.test.ts). */
import { NO_PICKS, type Game, type Picked } from './catalog';
import { buildIndex, type SearchIndex, type Shelf } from './search';
import { GROUPS, MACHINES, groupOf, machineOf, subOf, tagName, type Group, type Machine } from './taxonomy';
import { makeTestShelf } from './testShelf';

export interface Data {
  games: Game[];
  byKey: Map<string, Game>;
  index: SearchIndex;
  /** the groups that have games, in the shelf's order; each group's games as they stand: its highlights first, the
   *  one picked last before the others, then its newest */
  groups: { group: Group; games: Game[] }[];
  machines: Machine[];
  /** every shelf a visitor can be sent to: groups, sub-groups, machines, series, tags */
  shelves: Shelf[];
  /** how many sample entries the test shelf added (0 when it is off) */
  testCount: number;
}

export const groupLink = (key: string, sub?: string | null) => `/group/${key}${sub ? `?sub=${encodeURIComponent(sub)}` : ''}`;
export const machineLink = (key: string) => `/machine/${key}`;
export const seriesLink = (name: string) => `/series/${encodeURIComponent(name)}`;
export const tagLink = (key: string) => `/tag/${encodeURIComponent(key)}`;

/** How many games stand up front on a shelf, given room. The same on every shelf, whatever it holds: a shelf of
 *  two games and a shelf of two thousand look alike, and nothing about a screen's layout turns on a count. */
export const FRONT = 2;

/** how games stand on a shelf: its highlights first, the one picked last before the others; then the newest */
const order = (a: Game, b: Game) =>
  Number(b.highlight) - Number(a.highlight) || (b.picked ?? '').localeCompare(a.picked ?? '') || (b.added ?? '').localeCompare(a.added ?? '') || a.title.localeCompare(b.title);

/** The games that stand up front among `games`: its highlights, filled up with its newest. Found in one pass, so a
 *  shelf of any length costs the same. */
export function frontOf(games: Game[]): Game[] {
  const out: Game[] = [];
  for (const g of games) {
    let at = out.length;
    while (at > 0 && order(g, out[at - 1]) < 0) at--;
    if (at < FRONT) { out.splice(at, 0, g); if (out.length > FRONT) out.pop(); }
  }
  return out;
}

/** What the catalogue alone decides, worked out once: every game on the shelf (the test shelf's entries after the
 *  real ones) and what the search knows of each name, entry for game in the same order. */
export interface Stock { games: Game[]; index: SearchIndex; testCount: number }
export function takeStock(real: Game[], testCount: number): Stock {
  const games = testCount ? [...real, ...makeTestShelf(testCount, new Set(real.map(g => g.key)))] : real;
  return { games, index: buildIndex(games), testCount };
}

/** The shelf as it stands with these games picked out. The catalogue says what the games are and the service which
 *  of them are picked out, so picking one out reads nothing again: what the search knows of a name stays as it is. */
export function arrange(stock: Stock, picked: Picked = NO_PICKS): Data {
  // a sample entry of the test shelf keeps the mark it was made with: it is not a game the service could know
  const games = stock.games.map(g => { if (g.test) return g; const at = picked.get(g.key) ?? null; return g.picked === at ? g : { ...g, highlight: at !== null, picked: at }; });
  const index: SearchIndex = { entries: stock.index.entries.map((e, i) => (e.game === games[i] ? e : { ...e, game: games[i] })) };
  const { testCount } = stock;
  const byKey = new Map(games.map(g => [g.key, g]));
  const by = new Map<string, Game[]>();
  for (const g of games) { const list = by.get(g.group); if (list) list.push(g); else by.set(g.group, [g]); }
  const known = GROUPS.filter(g => by.has(g.key)).map(g => g.key);
  const groups = [...known, ...[...by.keys()].filter(k => !known.includes(k)).sort()].map(k => ({ group: groupOf(k), games: by.get(k)!.sort(order) }));

  const machineKeys = new Set(games.map(g => g.machine));
  const machines = [...MACHINES.filter(m => machineKeys.has(m.key)), ...[...machineKeys].filter(k => !MACHINES.some(m => m.key === k)).sort().map(machineOf)];

  const subs = new Set<string>(), series = new Set<string>(), tags = new Set<string>();
  for (const g of games) { if (g.sub) subs.add(`${g.group}/${g.sub}`); if (g.series) series.add(g.series); g.tags.forEach(t => tags.add(t)); }
  const shelves: Shelf[] = [
    ...groups.map(({ group }) => ({ kind: 'group' as const, key: group.key, name: group.name, to: groupLink(group.key) })),
    ...[...subs].map(s => { const [g, k] = s.split('/'); return { kind: 'sub' as const, key: s, name: subOf(g, k)!.name, note: groupOf(g).name, to: groupLink(g, k) }; }),
    ...machines.map(m => ({ kind: 'machine' as const, key: m.key, name: m.name, note: 'Machine', to: machineLink(m.key) })),
    ...[...series].map(s => ({ kind: 'series' as const, key: s, name: s, note: 'Series', to: seriesLink(s) })),
    ...[...tags].map(t => ({ kind: 'tag' as const, key: t, name: tagName(t), note: 'Tag', to: tagLink(t) })),
  ];
  return { games, byKey, index, groups, machines, shelves, testCount };
}
