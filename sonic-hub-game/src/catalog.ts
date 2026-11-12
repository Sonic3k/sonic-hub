/* The catalogue: every game on the shelf, read at runtime from /catalog.json so the list is data and not code.

   A catalogue entry needs only key, title, group and machine; everything else has a default. An entry with no
   `play` is on the shelf without a game behind it yet. `blurb` is optional and worth writing only for games that
   will be shown large (highlights): a small tile never shows it.

   A game that is someone else's file (found on the web, kept to look at) has `frame` instead of `play`: the file's
   address under /kept/ and the only other sites its page may load from. It is played at /play/<key>, in a frame
   with none of this site's origin (pages/Player.tsx). Such files are not in the repository: see kept.json. */
import { groupOf, subOf, type Input } from './taxonomy';

export type Shot = 'title' | 'play';
export interface Frame { file: string; hosts?: string }

export interface Game {
  key: string;
  title: string;
  /** other names people may look for it under */
  alt: string[];
  lang: string;
  group: string;
  sub: string | null;
  machine: string;
  year: number | null;
  series: string | null;
  tags: string[];
  /** how many people can play on one device, and how many AI rivals it offers at most */
  players: number;
  ai: number;
  inputs: Input[];
  /** one plain phrase saying what it is; written by hand for a few, otherwise made from its group */
  kind: string;
  blurb: string | null;
  maker: string | null;
  /** the owner's pick: shown large, and first on its shelf */
  highlight: boolean;
  /** the day it went on the shelf (YYYY-MM-DD) */
  added: string | null;
  /** the pictures it has under /covers/<key>-<shot>-<width>.webp */
  shots: Shot[];
  /** where it runs */
  play: string | null;
  /** set when the game is someone else's file, played in a frame of its own */
  frame: Frame | null;
  /** a sample entry of the test shelf (see testShelf.ts): never a real game */
  test?: boolean;
}

type Raw = Partial<Game> & { key: string; title: string; group: string };

export function toGame(r: Raw): Game {
  const players = r.players ?? 1, ai = r.ai ?? 0;
  const sub = r.sub ?? null;
  const who = players > 1 ? `up to ${players} players` : ai > 1 ? `you against up to ${ai} AI rivals` : ai === 1 ? 'you against the AI' : '1 player';
  return {
    key: r.key, title: r.title, alt: r.alt ?? [], lang: r.lang ?? 'en', group: r.group, sub, machine: r.machine ?? 'web',
    year: r.year ?? null, series: r.series ?? null, tags: r.tags ?? [], players, ai, inputs: r.inputs ?? [],
    kind: r.kind ?? `${subOf(r.group, sub)?.name ?? groupOf(r.group).name}, ${who}`,
    blurb: r.blurb ?? null, maker: r.maker ?? null, highlight: !!r.highlight, added: r.added ?? null, shots: r.shots ?? [],
    play: r.play ?? (r.frame ? `/play/${encodeURIComponent(r.key)}` : null), frame: r.frame ?? null,
    test: r.test,
  };
}

export async function fetchCatalog(): Promise<Game[]> {
  const res = await fetch('/catalog.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`catalog.json: ${res.status}`);
  const data = (await res.json()) as { games: Raw[] };
  return data.games.map(toGame);
}

export const cover = (g: Game, shot: Shot, width: 640 | 1280) => `/covers/${g.key}-${shot}-${width}.webp`;
export const coverSet = (g: Game, shot: Shot) => `${cover(g, shot, 640)} 640w, ${cover(g, shot, 1280)} 1280w`;
export const gamePage = (g: Game) => `/game/${encodeURIComponent(g.key)}`;
export const playsOnPhone = (g: Game) => g.inputs.includes('touch');

/** a number from a game's key that never changes: picks its plate pattern, its place in a shuffle */
export function seedOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
