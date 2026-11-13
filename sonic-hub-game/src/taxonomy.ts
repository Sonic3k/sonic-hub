/* How the shelf is sorted. A game sits in exactly one group (what kind of game it is) and one machine (what it was
   made for), and may carry a sub-group, a series and any number of tags. Groups are the portal's pipes; everything
   else is a way to narrow down or to cross from one shelf to another.

   To add a group, a sub-group or a machine, add it here: the portal draws whatever this file lists. */

/** the group colours, and two kept for shelves that are not groups: ice (the visitor's own, machines) and gold (highlights) */
export type Liquid = 'cyan' | 'magenta' | 'lime' | 'orange' | 'violet' | 'mint' | 'coral' | 'ice' | 'gold';

export interface Sub { key: string; name: string }
export interface Group {
  key: string;
  name: string;
  /** the colour that runs through the group's pipe and marks its games */
  liquid: Liquid;
  subs: Sub[];
}

const subs = (...pairs: [string, string][]): Sub[] => pairs.map(([key, name]) => ({ key, name }));

export const GROUPS: Group[] = [
  { key: 'platformer', name: 'Platformer', liquid: 'cyan', subs: subs(['classic', 'Classic 2D'], ['runner', 'Runner'], ['puzzle-platformer', 'Puzzle platformer'], ['explore', 'Explore & unlock'], ['3d', '3D']) },
  { key: 'action', name: 'Action', liquid: 'coral', subs: subs(['beat-em-up', 'Beat ’em up'], ['run-and-gun', 'Run & gun'], ['hack-and-slash', 'Hack & slash'], ['stealth', 'Stealth'], ['survival', 'Survival']) },
  { key: 'shooter', name: 'Shooter', liquid: 'orange', subs: subs(['shoot-em-up', 'Shoot ’em up'], ['first-person', 'First person'], ['top-down', 'Top down'], ['gallery', 'Gallery']) },
  { key: 'fighting', name: 'Fighting', liquid: 'violet', subs: subs(['one-on-one', 'One on one'], ['arena', 'Arena'], ['ring', 'Boxing & wrestling']) },
  { key: 'racing', name: 'Racing', liquid: 'lime', subs: subs(['circuit', 'Circuit'], ['kart', 'Kart'], ['motorbike', 'Motorbike'], ['off-road', 'Off road'], ['top-down', 'Top down']) },
  { key: 'sports', name: 'Sports', liquid: 'mint', subs: subs(['football', 'Football'], ['basketball', 'Basketball'], ['tennis', 'Tennis & table tennis'], ['golf', 'Golf'], ['billiards', 'Billiards'], ['other-sports', 'Other sports']) },
  { key: 'puzzle', name: 'Puzzle', liquid: 'violet', subs: subs(['match', 'Match & clear'], ['blocks', 'Falling blocks'], ['logic', 'Logic'], ['physics', 'Physics'], ['word', 'Word'], ['hidden-object', 'Hidden object']) },
  { key: 'cards', name: 'Card & Board', liquid: 'magenta', subs: subs(['card-battle', 'Card battle'], ['card-game', 'Card game'], ['solitaire', 'Solitaire'], ['chess', 'Chess & checkers'], ['xiangqi', 'Xiangqi'], ['mahjong', 'Mahjong'], ['board', 'Board game']) },
  { key: 'strategy', name: 'Strategy', liquid: 'lime', subs: subs(['turn-based', 'Turn based'], ['real-time', 'Real time'], ['tower-defense', 'Tower defense'], ['tactics', 'Tactics']) },
  { key: 'simulation', name: 'Simulation & Tycoon', liquid: 'orange', subs: subs(['management', 'Management'], ['city-builder', 'City builder'], ['life', 'Life'], ['vehicle', 'Vehicle'], ['farming', 'Farming']) },
  { key: 'rpg', name: 'RPG', liquid: 'coral', subs: subs(['classic-rpg', 'Classic'], ['action-rpg', 'Action RPG'], ['tactical-rpg', 'Tactical RPG'], ['roguelike', 'Roguelike'], ['monster', 'Monster collecting']) },
  { key: 'adventure', name: 'Adventure', liquid: 'mint', subs: subs(['point-and-click', 'Point & click'], ['story', 'Story'], ['text', 'Text'], ['escape', 'Escape room']) },
  { key: 'arcade', name: 'Arcade', liquid: 'cyan', subs: subs(['maze', 'Maze'], ['paddle', 'Paddle & bricks'], ['snake', 'Snake'], ['pinball', 'Pinball'], ['catch', 'Catch & dodge'], ['bomber', 'Bomber']) },
  { key: 'music', name: 'Music & Rhythm', liquid: 'magenta', subs: subs(['rhythm', 'Rhythm'], ['dance', 'Dance'], ['instrument', 'Instrument']) },
  { key: 'learning', name: 'Quiz & Learning', liquid: 'violet', subs: subs(['trivia', 'Trivia'], ['typing', 'Typing'], ['math', 'Math'], ['language', 'Language'], ['kids', 'For kids']) },
];

/** What a game was made for. `short` is what fits on a small tile. */
export interface Machine { key: string; name: string; short: string }
export const MACHINES: Machine[] = [
  { key: 'web', name: 'Web', short: 'Web' },
  { key: 'flash', name: 'Flash', short: 'Flash' },
  { key: 'dos', name: 'DOS', short: 'DOS' },
  { key: 'windows', name: 'Windows', short: 'Win' },
  { key: 'arcade', name: 'Arcade cabinet', short: 'Arcade' },
  { key: 'nes', name: 'NES', short: 'NES' },
  { key: 'snes', name: 'SNES', short: 'SNES' },
  { key: 'gb', name: 'Game Boy', short: 'GB' },
  { key: 'gba', name: 'Game Boy Advance', short: 'GBA' },
  { key: 'nds', name: 'Nintendo DS', short: 'DS' },
  { key: 'genesis', name: 'Mega Drive', short: 'MD' },
  { key: 'ps1', name: 'PlayStation', short: 'PS1' },
  { key: 'java', name: 'Java phone', short: 'Java' },
];

/** Tags are free: any word in the catalogue becomes one. These few have a proper name. */
export const TAG_NAMES: Record<string, string> = {
  originals: 'Sonic Hub originals',
  reference: 'Vibe code references',
  'two-player': 'Two players',
  'co-op': 'Co-op',
  classic: 'Classics',
  short: 'Quick to play',
  homebrew: 'Homebrew',
};

export type Input = 'keyboard' | 'gamepad' | 'touch' | 'mouse';
export const INPUT_NAME: Record<Input, string> = { keyboard: 'Keyboard', gamepad: 'Gamepad', touch: 'Touch', mouse: 'Mouse' };
export const LANG_NAME: Record<string, string> = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', zh: 'Chinese', ko: 'Korean', fr: 'French', es: 'Spanish' };

const GROUP_BY_KEY = new Map(GROUPS.map(g => [g.key, g]));
const MACHINE_BY_KEY = new Map(MACHINES.map(m => [m.key, m]));

/** a group the catalogue names but this file does not list still gets a pipe */
export const groupOf = (key: string): Group => GROUP_BY_KEY.get(key) ?? { key, name: titled(key), liquid: 'ice', subs: [] };
export const subOf = (group: string, sub?: string | null): Sub | null =>
  sub ? groupOf(group).subs.find(s => s.key === sub) ?? { key: sub, name: titled(sub) } : null;
export const machineOf = (key: string): Machine => MACHINE_BY_KEY.get(key) ?? { key, name: titled(key), short: titled(key) };
export const tagName = (key: string) => TAG_NAMES[key] ?? titled(key);
export const langName = (key: string) => LANG_NAME[key] ?? key.toUpperCase();

function titled(key: string) {
  const s = key.replace(/[-_]+/g, ' ').trim();
  return s ? s[0].toUpperCase() + s.slice(1) : key;
}
