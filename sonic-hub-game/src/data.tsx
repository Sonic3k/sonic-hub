/* The catalogue once loaded, with everything the screens ask of it worked out a single time: games by key, by group,
   the machines and shelves that exist, and the search index. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCatalog, type Game } from './catalog';
import { buildIndex, type SearchIndex, type Shelf } from './search';
import { GROUPS, MACHINES, groupOf, machineOf, subOf, tagName, type Group, type Machine } from './taxonomy';
import { makeTestShelf } from './testShelf';

export interface Data {
  games: Game[];
  byKey: Map<string, Game>;
  index: SearchIndex;
  /** the groups that have games, in the shelf's order; each group's games with its highlights first, then the newest */
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

const TEST = 'sonic-hub-games.test';
/** The size of the test shelf asked for with ?test=N, remembered until the tab closes or it is turned off. */
export function testShelfSize(): number {
  try {
    const asked = new URLSearchParams(location.search).get('test');
    if (asked !== null) { const n = Math.max(0, Math.min(20000, Math.floor(Number(asked)) || 0)); if (n) sessionStorage.setItem(TEST, String(n)); else sessionStorage.removeItem(TEST); }
    return Number(sessionStorage.getItem(TEST)) || 0;
  } catch { return 0; }
}
export function turnOffTestShelf() {
  try { sessionStorage.removeItem(TEST); } catch { /* nothing kept */ }
  const u = new URL(location.href); u.searchParams.delete('test'); location.replace(u.pathname + u.search);
}

const order = (a: Game, b: Game) => Number(b.highlight) - Number(a.highlight) || (b.added ?? '').localeCompare(a.added ?? '') || a.title.localeCompare(b.title);

export function arrange(real: Game[], testCount: number): Data {
  const games = testCount ? [...real, ...makeTestShelf(testCount, new Set(real.map(g => g.key)))] : real;
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
  return { games, byKey, index: buildIndex(games), groups, machines, shelves, testCount };
}

const Ctx = createContext<Data | null>(null);
export const useData = (): Data => useContext(Ctx)!;

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ data?: Data; failed?: boolean }>({});
  const load = () => { setState({}); fetchCatalog().then(real => setState({ data: arrange(real, testShelfSize()) })).catch(() => setState({ failed: true })); };
  useEffect(load, []);
  if (state.failed) return (
    <div className="notice">
      <p>The list of games did not load.</p>
      <button type="button" className="btn btn-steel" onClick={load}>Try again</button>
    </div>
  );
  if (!state.data) return <div className="notice" aria-busy="true"><p>Loading the shelf</p></div>;
  return <Ctx.Provider value={state.data}>{children}</Ctx.Provider>;
}
