/* The catalogue: every game on the shelf, read at runtime from /catalog.json so the list is data and not code.

   A catalogue entry needs only key, title, group and machine; everything else has a default. An entry with no
   `play` is on the shelf without a game behind it yet. `added` is the day it went on the shelf: the newest games of
   a kind stand in front of it, large, so every entry should say. `blurb` is what a game shown large says under its
   name; a small tile never shows it.
   Which games are picked out as highlights is not in this file. The game service keeps that (highlights.ts), and a
   `highlight` written here is not read.
   A blurb says what the game is, in words that stay true while the game grows: no count of its levels, rooms or
   opponents and no single place in it, since the next version makes that wrong. A number belongs in a blurb only
   when it is the game's own rule and never changes (eight Rams a side).

   A game's pictures keep their names when they are taken again, and a browser keeps a picture for a while without
   asking for it again. So the catalogue that is served also says, of each game that has pictures, a `stamp` made
   from the pictures themselves, and it is part of their addresses: a picture that changed is at another address, and
   nobody goes on seeing the old one. The stamp is not written by hand: the build puts it in (scripts/stamp-covers.mjs).

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
  /** picked out by the owner: it stands in front of its kind. Kept by the game service, not by the catalogue file. */
  highlight: boolean;
  /** the moment it was picked out, when it is */
  picked: string | null;
  /** the day it went on the shelf (YYYY-MM-DD) */
  added: string | null;
  /** the pictures it has under /covers/<key>-<shot>-<width>.webp */
  shots: Shot[];
  /** made from those pictures as they are now, and part of their addresses; null where the catalogue was not stamped
   *  (a page run from the sources), and the pictures are then asked for by name alone */
  stamp: string | null;
  /** where it runs */
  play: string | null;
  /** set when the game is someone else's file, played in a frame of its own */
  frame: Frame | null;
  /** a sample entry of the test shelf (see testShelf.ts): never a real game */
  test?: boolean;
}

/** which games are picked out: a game's key and the moment it was picked, as the game service writes it (one form for
 *  all, so a later moment sorts after an earlier one) */
export type Picked = ReadonlyMap<string, string>;
export const NO_PICKS: Picked = new Map();

export type Raw = Partial<Game> & { key: string; title: string; group: string };

export function toGame(r: Raw): Game {
  const players = r.players ?? 1, ai = r.ai ?? 0;
  const sub = r.sub ?? null;
  const who = players > 1 ? `up to ${players} players` : ai > 1 ? `you against up to ${ai} AI rivals` : ai === 1 ? 'you against the AI' : '1 player';
  return {
    key: r.key, title: r.title, alt: r.alt ?? [], lang: r.lang ?? 'en', group: r.group, sub, machine: r.machine ?? 'web',
    year: r.year ?? null, series: r.series ?? null, tags: r.tags ?? [], players, ai, inputs: r.inputs ?? [],
    kind: r.kind ?? `${subOf(r.group, sub)?.name ?? groupOf(r.group).name}, ${who}`,
    blurb: r.blurb ?? null, maker: r.maker ?? null, highlight: !!r.highlight, picked: r.picked ?? null, added: r.added ?? null, shots: r.shots ?? [], stamp: r.stamp ?? null,
    play: r.play ?? (r.frame ? `/play/${encodeURIComponent(r.key)}` : null), frame: r.frame ?? null,
    test: r.test,
  };
}

/** The games of a catalogue file. Whatever it says of highlights is left out: the game service alone says. */
export const readCatalog = (file: { games: Raw[] }): Game[] => file.games.map(r => toGame({ ...r, highlight: false, picked: null }));

export async function fetchCatalog(): Promise<Game[]> {
  const res = await fetch('/catalog.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`catalog.json: ${res.status}`);
  return readCatalog((await res.json()) as { games: Raw[] });
}

export const cover = (g: Game, shot: Shot, width: 640 | 1280) => `/covers/${g.key}-${shot}-${width}.webp${g.stamp ? `?v=${encodeURIComponent(g.stamp)}` : ''}`;
export const coverSet = (g: Game, shot: Shot) => `${cover(g, shot, 640)} 640w, ${cover(g, shot, 1280)} 1280w`;
export const gamePage = (g: Game) => `/game/${encodeURIComponent(g.key)}`;
export const playsOnPhone = (g: Game) => g.inputs.includes('touch');

/** a number from a game's key that never changes: picks its plate pattern, its place in a shuffle */
export function seedOf(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
