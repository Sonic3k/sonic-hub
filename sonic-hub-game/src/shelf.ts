/* Narrowing a shelf down: the filters a visitor can set, kept in the address so a narrowed shelf can be bookmarked,
   shared and come back to, and the orders a shelf can be read in. */
import { playsOnPhone, type Game } from './catalog';
import { fold, search, type SearchIndex } from './search';

export type Sort = 'relevance' | 'az' | 'new' | 'year';
export type View = 'tiles' | 'list';
export interface Filters {
  q: string; group: string; sub: string; machine: string; lang: string;
  /** '' any, '1' one player only, '2' two or more on one device */
  players: string;
  touch: boolean; fav: boolean;
  /** '' means the natural order of the shelf: by relevance when something is typed, otherwise A to Z */
  sort: Sort | '';
  view: View;
}

export function readFilters(p: URLSearchParams): Filters {
  const s = p.get('sort');
  return {
    q: p.get('q') ?? '', group: p.get('group') ?? '', sub: p.get('sub') ?? '', machine: p.get('machine') ?? '', lang: p.get('lang') ?? '',
    players: p.get('players') === '1' || p.get('players') === '2' ? p.get('players')! : '',
    touch: p.get('touch') === '1', fav: p.get('fav') === '1',
    sort: s === 'relevance' || s === 'az' || s === 'new' || s === 'year' ? s : '', view: p.get('view') === 'list' ? 'list' : 'tiles',
  };
}

/** the address with some filters changed; a filter set to '' or false leaves the address */
export function withFilters(p: URLSearchParams, patch: Partial<Record<keyof Filters, string | boolean>>): URLSearchParams {
  const next = new URLSearchParams(p);
  for (const [k, v] of Object.entries(patch)) {
    if (v === '' || v === false || (k === 'view' && v === 'tiles')) next.delete(k);
    else next.set(k, v === true ? '1' : String(v));
  }
  return next;
}
export const anyFilter = (f: Filters) => !!(f.group || f.sub || f.machine || f.lang || f.players || f.touch || f.fav);

const azKeys = new WeakMap<Game, string>();
/** what a name is filed under: accents off, a leading "The" dropped, numbers in number order ("2" before "10") */
export function azKey(g: Game): string {
  let k = azKeys.get(g);
  if (k === undefined) { k = fold(g.title).replace(/^(the|a|an)\s+/, '').replace(/\d+/g, n => n.padStart(6, '0')); azKeys.set(g, k); }
  return k;
}
/** the letter a name is filed under, or # for names that begin with anything else */
export const letterOf = (g: Game): string => { const c = azKey(g)[0]; return c >= 'a' && c <= 'z' ? c.toUpperCase() : '#'; };
export const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

const byAz = (a: Game, b: Game) => (azKey(a) < azKey(b) ? -1 : azKey(a) > azKey(b) ? 1 : 0);
const ORDER: Record<Exclude<Sort, 'relevance'>, (a: Game, b: Game) => number> = {
  az: byAz,
  new: (a, b) => (b.added ?? '').localeCompare(a.added ?? '') || byAz(a, b),
  year: (a, b) => (b.year ?? 0) - (a.year ?? 0) || byAz(a, b),
};

export interface NarrowContext { index: SearchIndex; favorites: Set<string>; boost?: (g: Game) => number }

/** The games of `base` that pass the filters, in the order asked for. `base` is never changed. */
export function narrow(base: Game[], whole: boolean, f: Filters, ctx: NarrowContext): Game[] {
  const pass = (g: Game) =>
    (!f.group || g.group === f.group) && (!f.sub || g.sub === f.sub) && (!f.machine || g.machine === f.machine) && (!f.lang || g.lang === f.lang) &&
    (!f.touch || playsOnPhone(g)) && (!f.fav || ctx.favorites.has(g.key)) && (f.players !== '2' || g.players >= 2) && (f.players !== '1' || g.players === 1);
  const sort = f.sort || (f.q.trim() ? 'relevance' : 'az');
  if (f.q.trim()) {
    const inBase = whole ? null : new Set(base);
    const found = search(ctx.index, f.q, { among: g => (!inBase || inBase.has(g)) && pass(g), boost: ctx.boost }).map(h => h.game);
    return sort === 'relevance' ? found : found.sort(ORDER[sort]);
  }
  return base.filter(pass).sort(ORDER[sort === 'relevance' ? 'az' : sort]);
}
