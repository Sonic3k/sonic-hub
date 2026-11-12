/* Finding a game among thousands.

   A game is found by what people remember of it, typed the way people type:
   - without accents ("len doi" finds Lên Đời), in any case, with or without punctuation;
   - by any part of the name, in any order, the last word still half typed ("mayh med");
   - by another name it goes by ("citadels" finds Masks & Mortar), by its series, maker, machine, group or tag;
   - by its initials ("mm2"), with the words run together ("forumtycoon"), with 2 for II and II for 2;
   - with a slip of the fingers ("medeival", "mahyem").
   Results are ranked so the plain reading wins: the exact name first, then names that begin with what was typed,
   then names that contain it, then other names, then everything looser. Among equals, the owner's highlights and
   whatever `boost` favours (the visitor's own favourites and recent games) come first.

   Everything here is plain data in, plain data out: no DOM, so it runs the same in a test. */
import type { Game } from './catalog';
import { groupOf, machineOf, subOf, tagName } from './taxonomy';

/** lower case, accents off: "Ông Trùm" → "ong trum" */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').replace(/ß/g, 'ss').replace(/[æÆ]/g, 'ae')
    .replace(/[øØ]/g, 'o').replace(/[łŁ]/g, 'l').toLowerCase();
}
const SPLIT = /[^\p{L}\p{N}]+/u;
export const wordsOf = (s: string): string[] => fold(s).split(SPLIT).filter(Boolean);
const joinedOf = (s: string) => wordsOf(s).join('');

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10', xi: '11', xii: '12', xiii: '13' };
const ARABIC: Record<string, string> = Object.fromEntries(Object.entries(ROMAN).map(([r, a]) => [a, r]));
/** the other way of writing a number word: "ii" ↔ "2" */
const twin = (w: string): string | undefined => ROMAN[w] ?? ARABIC[w];
/** small words a name may or may not carry: missing one is never a miss */
const SMALL = new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'va']);

export interface Entry {
  game: Game;
  /** the name, folded */
  title: string;
  /** the name's letters and digits only */
  joined: string;
  /** words of the name, each number also in its other spelling */
  tw: string[];
  /** other names: folded, their words, their letters and digits only */
  alt: string[];
  aw: string[];
  ajoined: string[];
  /** words of its series, tags, group, sub-group, machine, maker and year */
  xw: string[];
  /** initials of the name: "mm2", "mmii" */
  acr: string[];
  /** every word above in one string: a quick "could this match at all" */
  hay: string;
}
export interface SearchIndex { entries: Entry[] }

function initials(words: string[]): string[] {
  if (words.length < 2) return [];
  const make = (ws: string[], other: boolean) => ws.map(w => (/^\d+$/.test(w) || ROMAN[w] ? (other ? twin(w) ?? w : w) : w[0])).join('');
  const big = words.filter(w => !SMALL.has(w));
  const out = new Set([make(words, false), make(words, true)]);
  if (big.length >= 2 && big.length < words.length) { out.add(make(big, false)); out.add(make(big, true)); }
  return [...out].filter(a => a.length >= 2);
}

export function entryOf(game: Game): Entry {
  const base = wordsOf(game.title);
  const tw = [...base];
  base.forEach((w, i) => { const t = i > 0 ? twin(w) : undefined; if (t) tw.push(t); });
  const aw = game.alt.flatMap(wordsOf);
  aw.slice().forEach(w => { const t = twin(w); if (t) aw.push(t); });
  const group = groupOf(game.group), sub = subOf(game.group, game.sub), machine = machineOf(game.machine);
  const xw = [game.series, ...game.tags.map(tagName), ...game.tags, group.name, sub?.name, machine.name, machine.short, game.maker, game.year ? String(game.year) : null]
    .flatMap(v => (v ? wordsOf(v) : []));
  const acr = initials(base);
  return {
    game, title: fold(game.title).trim(), joined: base.join(''), tw, alt: game.alt.map(a => fold(a).trim()), aw, ajoined: game.alt.map(joinedOf), xw, acr,
    hay: [...tw, ...aw, ...xw, ...acr].join(' '),
  };
}
export const buildIndex = (games: Game[]): SearchIndex => ({ entries: games.map(entryOf) });

/* ── how well one typed word sits on one game ────────────────────────────────────────────────────────────────── */

function wordScore(e: Entry, t: string): number {
  let best = 0;
  for (let k = 0; k < e.tw.length; k++) {
    const w = e.tw[k], first = k === 0 ? 1 : 0;
    if (w === t) best = Math.max(best, 100 + first * 10);
    else if (w.startsWith(t)) best = Math.max(best, 70 + Math.round((18 * t.length) / w.length) + first * 8);
    else if (t.length >= 3 && w.includes(t)) best = Math.max(best, 42);
  }
  if (best < 85) for (const w of e.aw) {
    if (w === t) best = Math.max(best, 85);
    else if (w.startsWith(t)) best = Math.max(best, 58 + Math.round((15 * t.length) / w.length));
    else if (t.length >= 3 && w.includes(t)) best = Math.max(best, 34);
  }
  if (best < 40) for (const w of e.xw) {
    if (w === t) best = Math.max(best, 40);
    else if (t.length >= 2 && w.startsWith(t)) best = Math.max(best, 28);
  }
  return best;
}

/** how many slips apart two words are (a wrong, missing, extra or swapped letter each count one), or more than `max` */
export function slips(a: string, b: string, max: number): number {
  const n = a.length, m = b.length;
  if (Math.abs(n - m) > max) return max + 1;
  let prev2: number[] = [], prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const row = [i]; let low = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      row.push(v); if (v < low) low = v;
    }
    if (low > max) return max + 1;
    prev2 = prev; prev = row;
  }
  return prev[m];
}

/** the same, forgiving a slip: only for words long enough that a slip is likelier than another word */
function looseWordScore(e: Entry, t: string, last: boolean): number {
  if (t.length < 4) return 0;
  const max = t.length >= 8 ? 2 : 1;
  let best = 0;
  const tryWord = (w: string, top: number) => {
    if (w.length < 3) return;
    let d = slips(t, w, max);
    // the last word may still be half typed: compare it with the start of the name's word
    if (d > max && last && w.length > t.length) d = slips(t, w.slice(0, t.length), 1) + 1;
    if (d <= max) best = Math.max(best, top - (d - 1) * 9 + (w[0] === t[0] ? 4 : 0));
  };
  for (const w of e.tw) tryWord(w, 32);
  for (const w of e.aw) tryWord(w, 26);
  return best;
}

interface Query { text: string; tokens: string[]; joined: string }
const queryOf = (q: string): Query => { const tokens = wordsOf(q); return { text: fold(q).trim().replace(/\s+/g, ' '), tokens, joined: tokens.join('') }; };

function score(e: Entry, q: Query, loose: boolean): number {
  let total = 0, hit = 0;
  for (let i = 0; i < q.tokens.length; i++) {
    const t = q.tokens[i], last = i === q.tokens.length - 1;
    let s = e.hay.includes(t) ? wordScore(e, t) : 0;
    if (!s && loose) s = looseWordScore(e, t, last);
    if (s) { total += s; hit++; }
    else if (!(SMALL.has(t) && q.tokens.length > 1)) { total = 0; hit = 0; break; }
  }
  if (!hit) {
    // not word by word: perhaps typed without spaces, or as initials
    const j = q.joined;
    if (j.length < 2) return 0;
    if (e.joined === j) total = 250;
    else if (e.ajoined.includes(j)) total = 230;
    else if (e.acr.includes(j)) total = 120;
    else if (e.joined.startsWith(j)) total = 110;
    else if (j.length >= 3 && e.acr.some(a => a.startsWith(j))) total = 80;
    else if (e.ajoined.some(a => a.startsWith(j))) total = 75;
    else if (j.length >= 4 && e.joined.includes(j)) total = 55;
    else return 0;
  }
  if (e.title === q.text) total += 300;
  else if (e.alt.includes(q.text)) total += 200;
  else if (e.title.startsWith(q.text)) total += 120;
  else if (q.tokens.length > 1 && e.title.includes(q.text)) total += 60;
  return total + (e.game.highlight ? 6 : 0) + (e.game.play ? 3 : 0) - Math.min(8, e.title.length * 0.1);
}

export interface Hit { game: Game; score: number }
export interface SearchOptions {
  /** how many to return (all of them when left out) */
  limit?: number;
  /** extra points for games the visitor cares about */
  boost?: (g: Game) => number;
  /** look only among these */
  among?: (g: Game) => boolean;
}

export function search(index: SearchIndex, text: string, opts: SearchOptions = {}): Hit[] {
  const q = queryOf(text);
  if (!q.tokens.length) return [];
  const hits: Hit[] = [], missed: Entry[] = [];
  for (const e of index.entries) {
    if (opts.among && !opts.among(e.game)) continue;
    const s = score(e, q, false);
    if (s > 0) hits.push({ game: e.game, score: s + (opts.boost?.(e.game) ?? 0) });
    else missed.push(e);
  }
  // a slip of the fingers is assumed only when the plain reading finds nothing at all: while a name is still being
  // typed, near-misses of half a word would only be noise
  if (!hits.length) for (const e of missed) {
    const s = score(e, q, true);
    if (s > 0) hits.push({ game: e.game, score: s * 0.6 + (opts.boost?.(e.game) ?? 0) });
  }
  hits.sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title));
  return opts.limit ? hits.slice(0, opts.limit) : hits;
}

/* ── showing where the typed words sit in a name ─────────────────────────────────────────────────────────────── */

/** The name cut into pieces, the pieces the typed words matched marked, so a result shows why it is there. */
export function markTitle(title: string, text: string): { text: string; hit: boolean }[] {
  const tokens = wordsOf(text);
  if (!tokens.length) return [{ text: title, hit: false }];
  // fold letter by letter, remembering which letter of the name each folded letter came from
  let folded = ''; const from: number[] = [];
  for (let i = 0; i < title.length; i++) { const f = fold(title[i]); for (const c of f) { folded += c; from.push(i); } }
  const on = new Array<boolean>(title.length).fill(false);
  for (const t of tokens) {
    let at = -1;
    for (let i = folded.indexOf(t); i >= 0; i = folded.indexOf(t, i + 1)) {
      const wordStart = i === 0 || SPLIT.test(folded[i - 1]);
      if (wordStart) { at = i; break; }
      if (at < 0 && t.length >= 3) at = i;
    }
    if (at >= 0) for (let i = at; i < at + t.length; i++) on[from[i]] = true;
  }
  // accents that follow a marked letter belong to it
  const out: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < title.length; i++) {
    const hit = on[i] || (i > 0 && /[̀-ͯ]/.test(title[i]) && on[i - 1]);
    if (out.length && out[out.length - 1].hit === hit) out[out.length - 1].text += title[i];
    else out.push({ text: title[i], hit });
  }
  return out;
}

/* ── shelves that match what was typed ───────────────────────────────────────────────────────────────────────── */

export interface Shelf { kind: 'group' | 'sub' | 'machine' | 'series' | 'tag'; key: string; name: string; note?: string; to: string }

/** Shelves whose name begins with, or contains, what was typed: "plat" offers the Platformer shelf itself. */
export function searchShelves(shelves: Shelf[], text: string, limit = 4): Shelf[] {
  const q = queryOf(text);
  if (q.text.length < 2) return [];
  const scored: { s: Shelf; v: number }[] = [];
  for (const s of shelves) {
    const name = fold(s.name), ws = wordsOf(s.name);
    let v = 0;
    if (name === q.text) v = 100;
    else if (name.startsWith(q.text)) v = 80;
    else if (q.tokens.every(t => ws.some(w => w.startsWith(t)))) v = 60;
    else if (q.text.length >= 3 && name.includes(q.text)) v = 40;
    if (v) scored.push({ s, v: v + (s.kind === 'group' ? 5 : s.kind === 'machine' ? 3 : 0) });
  }
  return scored.sort((a, b) => b.v - a.v || a.s.name.localeCompare(b.s.name)).slice(0, limit).map(x => x.s);
}
