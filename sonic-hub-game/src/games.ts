/* The portal's whole catalogue. To add a game: build its page into public/games/<key>.html, take its covers
   (scripts/capture_covers.py), and add an entry here. To add a group: add it to GROUPS with one of the liquids. */

export type Liquid = 'cyan' | 'magenta' | 'lime';
export type Input = 'keyboard' | 'gamepad' | 'touch' | 'mouse';

export interface Group {
  key: string;
  name: string;
  /** the colour that runs through the group's pipe and marks its games */
  liquid: Liquid;
}

export interface Game {
  /** its address (/games/<key>) and the name of its cover files */
  key: string;
  title: string;
  /** the language the game itself is played in */
  lang: 'vi' | 'en';
  group: string;
  /** what kind of game it is and who plays, as one plain phrase */
  kind: string;
  blurb: string;
  inputs: Input[];
  /** where its sources live, for whoever rebuilds it: games-src/<src>/build.py */
  src: string;
}

export const GROUPS: Group[] = [
  { key: 'platformer', name: 'Platformer', liquid: 'cyan' },
  { key: 'cards', name: 'Card & Board', liquid: 'magenta' },
  { key: 'strategy', name: 'Strategy & Tycoon', liquid: 'lime' },
];

export const GAMES: Game[] = [
  {
    key: 'muop', title: 'Mướp và Mười Hai Ngọn Đèn', lang: 'vi', group: 'platformer', src: 'muop',
    kind: 'Platformer, 1 player',
    blurb: 'A ginger cat carries the last spark through one long day, from morning hills to an aurora peak, to relight twelve lanterns.',
    inputs: ['keyboard', 'gamepad', 'touch'],
  },
  {
    key: 'tim-4', title: 'Tím 4', lang: 'vi', group: 'platformer', src: 'notebook4',
    kind: 'Platformer, 1 player',
    blurb: 'Notebook pages of a hand-drawn platformer, inked in purple and rebuilt as levels you can really play.',
    inputs: ['keyboard', 'gamepad', 'touch'],
  },
  {
    key: 'medieval-mayhem-2', title: 'Medieval Mayhem II', lang: 'en', group: 'cards', src: 'civ-clash-v2',
    kind: 'Card battle, you against up to 3 AI rivals',
    blurb: 'Pick a civilization and outlast the table. Every card is a unit, and everything it does is printed in its symbols.',
    inputs: ['mouse', 'touch'],
  },
  {
    key: 'mayhem-classic', title: 'Mayhem Classic', lang: 'en', group: 'cards', src: 'mayhem-classic',
    kind: 'Card battle, you against up to 3 AI rivals',
    blurb: 'Four heroes, ten hit points each. Draw a card, play a card, and be the last one standing. Plays by the Dungeon Mayhem rules.',
    inputs: ['mouse', 'touch'],
  },
  {
    key: 'masks-and-mortar', title: 'Masks & Mortar', lang: 'en', group: 'cards', src: 'citadels',
    kind: 'City building with cards, you against up to 7 AI rivals',
    blurb: 'Each round, secretly take a character, gather gold and build districts. The finest city wins. Plays by the Citadels rules.',
    inputs: ['mouse', 'touch'],
  },
  {
    key: 'len-doi', title: 'Lên Đời', lang: 'vi', group: 'strategy', src: 'age-duel',
    kind: 'Turn-based strategy, you against the AI',
    blurb: 'Medieval empires on a small map. Both sides give their orders in secret, then reveal them at the same moment.',
    inputs: ['mouse', 'touch'],
  },
  {
    key: 'forum-tycoon', title: 'Ông Trùm 4rum', lang: 'vi', group: 'strategy', src: 'forum-tycoon',
    kind: 'Management, 1 player',
    blurb: 'It is 2007 and you run a fan forum. Clear the spam, calm the drama and keep the boards alive until Facebook arrives.',
    inputs: ['mouse', 'touch'],
  },
];

export const gameUrl = (g: Game) => `/games/${g.key}`;
export const cover = (g: Game, shot: 'title' | 'play', width: 640 | 1280) => `/covers/${g.key}-${shot}-${width}.webp`;
export const groupOf = (g: Game) => GROUPS.find(x => x.key === g.group)!;

export const INPUT_NAME: Record<Input, string> = { keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch', mouse: 'Mouse' };
export const LANG_NAME: Record<Game['lang'], string> = { vi: 'Vietnamese', en: 'English' };

/* The game last opened from here, remembered in this browser only, so the portal can offer it again. */
const LAST = 'sonic-hub-games.last';
export function lastPlayed(): Game | null {
  try { const k = localStorage.getItem(LAST); return GAMES.find(g => g.key === k) ?? null; } catch { return null; }
}
export function rememberPlayed(g: Game) {
  try { localStorage.setItem(LAST, g.key); } catch { /* a browser that keeps nothing: the portal just shows a pick */ }
}
