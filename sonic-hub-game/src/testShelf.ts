/* The test shelf: thousands of sample entries with no games behind them, so the portal can be looked at, and its
   search tried, at the size it is built for. Open the portal with ?test=10000 to fill the shelf; "Turn off" in the
   bar at the top empties it again. Nothing here is a real game, and none of it is in the catalogue file: the
   entries are made in the browser, the same ones every time for the same count. */
import { toGame, type Game } from './catalog';
import { GROUPS, type Input } from './taxonomy';

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ADJ = ['Tiny', 'Brave', 'Lost', 'Crimson', 'Iron', 'Lucky', 'Mighty', 'Silent', 'Neon', 'Rusty', 'Golden', 'Wild', 'Frozen', 'Hidden', 'Turbo', 'Mega',
  'Pocket', 'Royal', 'Cosmic', 'Sleepy', 'Angry', 'Clever', 'Dusty', 'Electric', 'Midnight', 'Rapid', 'Jolly', 'Ancient', 'Atomic', 'Velvet', 'Lunar', 'Solar',
  'Stormy', 'Crystal', 'Shadow', 'Scarlet', 'Emerald', 'Grand', 'Little', 'Final'];
const NAMES = ['Milo', 'Zara', 'Bao', 'Lan', 'Otto', 'Pip', 'Rudi', 'Nia', 'Tomo', 'Kiki', 'Juno', 'Remy', 'Sora', 'Tilda', 'Vito'];
const TAILS = ['Rising', 'Returns', 'Deluxe', 'Gold Edition', 'Championship', 'Night Shift', 'Remix', 'Unlimited', 'Origins', 'World Tour', 'Plus', 'The Lost Maps',
  'Second Wind', 'Legacy'];
const MAKERS = ['Blue Kettle', 'Paper Moth', 'Tin Rocket', 'Slow Comet', 'Okapi Works', 'Mango Byte', 'Red Ladder', 'Quiet Harbor', 'Pixel Orchard', 'Northwind Lab',
  'Cedar & Sons', 'Lucky Sparrow', 'Atelier Ba', 'Sunday Arcade', 'Hollow Drum'];

const BANK: Record<string, { a: string[]; b: string[]; vi: string[] }> = {
  platformer: { a: ['Fox', 'Frog', 'Knight', 'Robot', 'Penguin', 'Mole', 'Sprout', 'Lantern', 'Boots', 'Kite', 'Acorn', 'Gecko'], b: ['Tower', 'Cave', 'Jungle', 'Ladder', 'Rooftops', 'Clouds', 'Ruins', 'Garden', 'Factory', 'Island'], vi: ['Chú Ếch Leo Núi', 'Mèo Con Phiêu Lưu', 'Hang Động Bí Ẩn', 'Cậu Bé Rừng Xanh', 'Vượt Thác'] },
  action: { a: ['Fist', 'Blade', 'Dragon', 'Ninja', 'Brawler', 'Viper', 'Claw', 'Wolf', 'Hammer', 'Phantom'], b: ['Street', 'Alley', 'Fury', 'Harbor', 'Uprising', 'Showdown', 'Outlaws', 'Syndicate'], vi: ['Đường Phố Nổi Loạn', 'Hiệp Khách Đêm', 'Song Kiếm'] },
  shooter: { a: ['Squadron', 'Comet', 'Blaster', 'Gunship', 'Nova', 'Turret', 'Falcon', 'Drone', 'Sentinel'], b: ['Raid', 'Orbit', 'Asteroids', 'Frontline', 'Nebula', 'Skyline', 'Barrage', 'Zero Hour'], vi: ['Bắn Máy Bay', 'Bắn Vịt', 'Phi Đội Bão Táp', 'Xe Tăng Thép'] },
  fighting: { a: ['Champion', 'Knuckle', 'Duelist', 'Tiger', 'Crane', 'Gladiator', 'Bruiser'], b: ['Dojo', 'Rumble', 'Tournament', 'Arena', 'Ring', 'Clash', 'Showdown'], vi: ['Võ Đài', 'Cao Thủ Đối Kháng', 'Quyền Vương Phố Cổ'] },
  racing: { a: ['Rally', 'Kart', 'Buggy', 'Moto', 'Racer', 'Drifter', 'Hot Rod', 'Speedboat'], b: ['Circuit', 'Drift', 'Highway', 'Sprint', 'Grand Prix', 'Canyon', 'Night Run', 'Derby'], vi: ['Đua Xe Đường Phố', 'Vua Tốc Độ', 'Đua Thuyền', 'Xe Máy Vượt Đèo'] },
  sports: { a: ['Striker', 'Slugger', 'Dunk', 'Penalty', 'Racket', 'Keeper', 'Bowler', 'Cue'], b: ['League', 'Cup', 'Slam', 'Open', 'Finals', 'Stadium', 'Derby', 'All-Stars'], vi: ['Vua Phá Lưới', 'Bóng Bàn', 'Bi-a Phố', 'Đá Luân Lưu', 'Cầu Lông'] },
  puzzle: { a: ['Blocks', 'Gems', 'Pipes', 'Tiles', 'Marbles', 'Crates', 'Bubbles', 'Knots', 'Switches', 'Lasers', 'Mirrors', 'Gears'], b: ['Riddle', 'Puzzle', 'Logic', 'Twist', 'Factory', 'Garden', 'Lab', 'Workshop'], vi: ['Xếp Gạch', 'Nối Ống Nước', 'Xếp Hình', 'Kim Cương', 'Đẩy Thùng', 'Nối Thú'] },
  cards: { a: ['Solitaire', 'Chess', 'Checkers', 'Dominoes', 'Mahjong', 'Hearts', 'Spades', 'Rummy', 'Backgammon', 'Dice'], b: ['Club', 'Parlor', 'Masters', 'Table', 'Deck', 'Classic', 'Royale', 'Tournament'], vi: ['Cờ Tướng', 'Cờ Vua', 'Cờ Caro', 'Tiến Lên', 'Cờ Cá Ngựa', 'Ô Ăn Quan'] },
  strategy: { a: ['Empire', 'Citadel', 'Legion', 'Dynasty', 'Warlords', 'Outpost', 'Garrison', 'Armada', 'Colony'], b: ['Frontier', 'Siege', 'Tactics', 'Defense', 'Conquest', 'Borders', 'Campaign', 'Uprising'], vi: ['Thủ Thành', 'Giữ Làng', 'Đại Chiến Ba Miền', 'Lập Quốc'] },
  simulation: { a: ['Farm', 'Airport', 'Hospital', 'Cafe', 'Railway', 'Zoo', 'Market', 'Bakery', 'Hotel', 'Aquarium', 'Cinema', 'Harbor'], b: ['Tycoon', 'Manager', 'Story', 'Empire', 'Life', 'Days', 'Inc.', 'Boss'], vi: ['Quán Phở', 'Tiệm Bánh', 'Nông Trại Nhỏ', 'Bến Xe', 'Chợ Đêm'] },
  rpg: { a: ['Quest', 'Saga', 'Chronicle', 'Legend', 'Relic', 'Oath', 'Mage', 'Paladin', 'Prophecy', 'Grimoire'], b: ['Kingdom', 'Dungeon', 'Realm', 'Lands', 'Crown', 'Abyss', 'Tales', 'Wanderers'], vi: ['Hiệp Sĩ Rồng', 'Kiếm Khách', 'Truyền Thuyết Núi Tản'] },
  adventure: { a: ['Mystery', 'Detective', 'Secret', 'Diary', 'Voyage', 'Expedition', 'Curse', 'Riddle'], b: ['Island', 'Manor', 'Museum', 'Lighthouse', 'Express', 'Village', 'Archive', 'Harbor'], vi: ['Đảo Kho Báu', 'Thám Tử Nhí', 'Ngôi Nhà Trên Đồi', 'Chuyến Tàu Đêm'] },
  arcade: { a: ['Snake', 'Paddle', 'Maze', 'Pinball', 'Bricks', 'Catcher', 'Bomber', 'Hopper', 'Raiders', 'Dodger'], b: ['Mania', 'Frenzy', 'Rush', 'Panic', 'Party', 'Arcade', 'Blitz', 'Classic'], vi: ['Rắn Săn Mồi', 'Bắn Gạch', 'Hứng Trứng', 'Mê Cung', 'Đặt Bom'] },
  music: { a: ['Beat', 'Drum', 'Dance', 'Melody', 'Rhythm', 'Piano', 'DJ', 'Chorus'], b: ['Fever', 'Stage', 'Studio', 'Night', 'Jam', 'Parade', 'Session'], vi: ['Gõ Nhịp', 'Đàn Piano', 'Trống Hội'] },
  learning: { a: ['Typing', 'Math', 'Quiz', 'Spelling', 'Trivia', 'Flags', 'Memory', 'Alphabet', 'Geography'], b: ['Challenge', 'Academy', 'Trainer', 'Marathon', 'Class', 'Bee', 'Lab', 'Quest'], vi: ['Luyện Gõ Phím', 'Đố Vui', 'Toán Nhanh', 'Học Chữ Cái', 'Cờ Các Nước'] },
};

// how much of the shelf each group and each machine takes, and the years a machine's games come from
const GROUP_SHARE: [string, number][] = [['platformer', 10], ['action', 9], ['shooter', 9], ['fighting', 4], ['racing', 6], ['sports', 7], ['puzzle', 14], ['cards', 6],
  ['strategy', 8], ['simulation', 5], ['rpg', 6], ['adventure', 5], ['arcade', 8], ['music', 1.5], ['learning', 1.5]];
const MACHINE_SHARE: [string, number, number, number][] = [['web', 30, 2012, 2026], ['flash', 25, 2002, 2012], ['dos', 10, 1986, 1997], ['nes', 8, 1985, 1993],
  ['snes', 6, 1991, 1997], ['gba', 5, 2001, 2007], ['genesis', 4, 1989, 1996], ['windows', 4, 1995, 2010], ['arcade', 3, 1980, 1998], ['gb', 2, 1989, 1999],
  ['nds', 1, 2005, 2011], ['ps1', 1, 1995, 2002], ['java', 1, 2003, 2010]];
const ROMAN = ['', '', 'II', 'III', 'IV', 'V'];
const TODAY = Date.UTC(2026, 10, 12);

export function makeTestShelf(count: number, taken: Set<string> = new Set()): Game[] {
  const r = rng(20261112);
  const pick = <T,>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
  const share = <T extends [string, number, ...unknown[]]>(xs: T[]): T => {
    let v = r() * xs.reduce((s, x) => s + x[1], 0);
    for (const x of xs) { v -= x[1]; if (v <= 0) return x; }
    return xs[xs.length - 1];
  };
  const titles = new Set<string>();
  const games: Game[] = [];
  /** follow-ups still owed to a series already on the shelf */
  const sequels: { title: string; n: number; group: string; sub: string | null; machine: string; year: number; maker: string; roman: boolean }[] = [];

  while (games.length < count) {
    let title: string, group: string, sub: string | null, machine: string, year: number, maker: string, series: string | null = null, lang = 'en';
    const owed = sequels.length && r() < 0.5 ? sequels.splice(Math.floor(r() * sequels.length), 1)[0] : null;
    if (owed) {
      ({ group, sub, machine, maker } = owed);
      title = `${owed.title} ${owed.roman ? ROMAN[owed.n] : owed.n}`; series = owed.title; year = owed.year + 1 + Math.floor(r() * 2);
      if (owed.n < 5 && r() < 0.45) sequels.push({ ...owed, n: owed.n + 1, year });
    } else {
      group = share(GROUP_SHARE)[0];
      const g = GROUPS.find(x => x.key === group)!, bank = BANK[group];
      sub = r() < 0.85 ? pick(g.subs).key : null;
      const m = share(MACHINE_SHARE); machine = m[0]; year = m[2] + Math.floor(r() * (m[3] - m[2] + 1));
      maker = pick(MAKERS);
      const k = r();
      if (k < 0.08) { title = pick(bank.vi); lang = 'vi'; if (titles.has(title)) title = `${title} ${2 + Math.floor(r() * 8)}`; }
      else if (k < 0.42) title = `${pick(ADJ)} ${pick(bank.a)}`;
      else if (k < 0.60) title = `${pick(bank.a)} ${pick(bank.b)}`;
      else if (k < 0.69) title = `${pick(NAMES)}’s ${pick(bank.b)}`;
      else if (k < 0.78) title = `The ${pick(ADJ)} ${pick(bank.b)}`;
      else if (k < 0.85) title = `${pick(bank.a)} of the ${pick(ADJ)} ${pick(bank.b)}`;
      else title = `${pick(ADJ)} ${pick(bank.a)}: ${pick(TAILS)}`;
      if (titles.has(title)) title = `${title}: ${pick(TAILS)}`;
      if (titles.has(title)) continue;
      if (lang === 'en' && r() < 0.07) sequels.push({ title, n: 2, group, sub, machine, year, maker, roman: r() < 0.5 });
    }
    if (titles.has(title)) continue;
    titles.add(title);
    if (owed && games.length) { const first = games.find(x => x.title === owed.title); if (first && !first.series) first.series = owed.title; }

    const console_ = !['web', 'flash', 'dos', 'windows', 'java'].includes(machine);
    const inputs: Input[] = machine === 'web' ? (r() < 0.6 ? ['mouse', 'touch'] : r() < 0.5 ? ['keyboard', 'touch'] : ['keyboard'])
      : machine === 'flash' ? (r() < 0.5 ? ['mouse'] : ['keyboard', 'mouse'])
      : console_ ? ['gamepad', 'keyboard'] : r() < 0.3 ? ['keyboard', 'mouse'] : ['keyboard'];
    const versus = ['fighting', 'sports', 'racing', 'cards', 'strategy'].includes(group);
    const players = r() < (versus ? 0.4 : 0.12) ? (r() < 0.2 ? 4 : 2) : 1;
    const tags = [players > 1 ? 'two-player' : '', year < 1996 && r() < 0.3 ? 'classic' : '', r() < 0.15 ? 'short' : '', r() < 0.03 ? 'homebrew' : ''].filter(Boolean);
    if (lang === 'en' && console_ && r() < 0.12) lang = 'ja';
    let key = `t-${title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    while (taken.has(key)) key += '-x';
    taken.add(key);
    games.push(toGame({
      key, title, group, sub, machine, year, series, lang, tags, players, ai: versus && r() < 0.7 ? 1 + Math.floor(r() * 3) : 0, inputs, maker,
      highlight: r() < 0.012, added: new Date(TODAY - Math.floor(r() * 500) * 86400000).toISOString().slice(0, 10), test: true,
    }));
  }
  return games;
}
