/* ── Civilizations: a deck is a list of units and how many of each; the Imperial Age adds a few more.
   hp2: starting HP in a duel, hp4: at a 3–4 player table (both tuned by AI-vs-AI simulation, see tune.js).
   age: the symbols the Imperial Age card itself resolves when played. ── */
const CIVS = {
  mongols: { name: 'Mongols', group: 'Steppe', color: '#1f6f8b', charge: 'horse', hp2: 11, hp4: 14,
    style: 'Horse archers and lancers who raid for gold and hire whole armies',
    deck: { mangudai: 2, steppeLancer: 2, horseArchers: 3, keshik: 2, raiders: 2, feignedRetreat: 1, yam: 1, militia: 5, watchTower: 1, messenger: 1, healer: 1, merchant: 1, spy: 1, monastery: 1 },
    imperial: { eliteMangudai: 1, mangonel: 1, steppeLancer: 1, horseArchers: 1, lightCavalry: 1 }, age: 'gold gold' },
  daiviet: { name: 'Đại Việt', group: 'Southeast Asia', color: '#b8860b', charge: 'star', hp2: 15, hp4: 14,
    style: 'Rattan archers, traps and healing: a defense that bends but never breaks',
    deck: { rattanArcher: 4, imperialSkirmisher: 3, bachDang: 1, bambooSpikes: 2, emptyVillages: 1, dienHong: 1, warElephant: 2, militia: 1, swordsmen: 2, ricePaddies: 1, merchant: 1, messenger: 2, healer: 1, palisade: 1, monastery: 1 },
    imperial: { eliteRattanArcher: 1, thanCo: 1, rattanArcher: 1, imperialSkirmisher: 1, warElephant: 1 }, age: 'trap heal' },
  teutons: { name: 'Teutons', group: 'Europe', color: '#2d2d2d', charge: 'cross', hp2: 13, hp4: 10,
    style: 'Armoured knights of the Order behind guard towers and castles',
    deck: { teutonicKnight: 3, guardTower: 3, stoneWall: 2, castle: 1, knights: 1, swordsmen: 2, militia: 2, paviseCrossbowmen: 2, batteringRam: 1, hanseatic: 1, monastery: 1, healer: 1, scholars: 1, spearmen: 2, palisade: 1 },
    imperial: { eliteTeutonicKnight: 1, marienburg: 1, knights: 1, guardTower: 1, crossbowmen: 1 }, age: 'bodyguard heal' },
  britons: { name: 'Britons', group: 'Europe', color: '#9b1c1c', charge: 'tower', hp2: 13, hp4: 14,
    style: 'Longbows that drop their arrows over any wall',
    deck: { longbowmen: 4, archers: 2, yeomen: 2, swordsmen: 2, militia: 1, spearmen: 1, scoutCavalry: 1, stoneWall: 1, watchTower: 2, palisade: 1, healer: 1, monastery: 1, magnaCarta: 1, merchant: 1, batteringRam: 1, messenger: 1, skirmishers: 1 },
    imperial: { eliteLongbowmen: 1, warwolf: 1, menAtArms: 1, archers: 1, castle: 1 }, age: 'draw draw' },
  japanese: { name: 'Japanese', group: 'East Asia', color: '#c0392b', charge: 'disc', hp2: 13, hp4: 13,
    style: 'Samurai who cut down the unguarded, shinobi, and the Divine Wind',
    deck: { samurai: 4, yumiArchers: 2, shinobi: 1, divineWind: 1, sohei: 1, militia: 1, spearmen: 2, swordsmen: 2, skirmishers: 1, stoneWall: 1, watchTower: 1, palisade: 1, monastery: 1, healer: 1, scholars: 1, messenger: 1, merchant: 1, archers: 1 },
    imperial: { kensei: 1, tanegashima: 1, himeji: 1, mountedSamurai: 1, samurai: 1 }, age: 'heal draw' },
  franks: { name: 'Franks', group: 'Europe', color: '#1f4e9c', charge: 'fleur', hp2: 10, hp4: 11,
    style: 'Knights and castles of the Carolingian realm',
    deck: { knights: 2, scoutCavalry: 1, throwingAxemen: 2, swordsmen: 2, militia: 3, spearmen: 2, castle: 1, stoneWall: 1, watchTower: 1, batteringRam: 1, monk: 1, healer: 1, monastery: 1, messenger: 1, carolingianCourt: 1, merchant: 1, archers: 1, palisade: 1 },
    imperial: { paladin: 1, oriflamme: 1, knights: 1, crossbowmen: 1, castle: 1 }, age: 'heal heal' },
  byzantines: { name: 'Byzantines', group: 'Europe', color: '#5b2a86', charge: 'cross', hp2: 11, hp4: 10,
    style: 'Cataphracts, Greek fire and the walls of Constantinople',
    deck: { cataphract: 2, spearmen: 2, archers: 2, greekFire: 1, theodosianWalls: 1, guardTower: 1, stoneWall: 1, hyperpyron: 1, monk: 1, healer: 1, monastery: 1, militia: 3, swordsmen: 1, mangonel: 1, scholars: 1, messenger: 1, palisade: 1, spy: 1, warship: 1 },
    imperial: { hagiaSophia: 1, cataphract: 1, greekFire: 1, guardTower: 1, crossbowmen: 1 }, age: 'heal bodyguard' },
  arabs: { name: 'Arabs', group: 'Middle East & Africa', color: '#1f7a4d', charge: 'crescent', hp2: 14, hp4: 14,
    style: 'Camels, hospitals and the caravan roads',
    deck: { camelRiders: 3, camelArcher: 3, mamluks: 2, swordsmen: 2, militia: 2, spearmen: 1, skirmishers: 1, scoutCavalry: 1, healer: 1, bimaristan: 1, caravanserai: 1, merchant: 1, monk: 1, watchTower: 1, stoneWall: 1, messenger: 1, monastery: 1 },
    imperial: { mamluks: 1, houseOfWisdom: 1, camelRiders: 1, camelArcher: 1, swordsmen: 1 }, age: 'gold heal' },
  khmer: { name: 'Khmer', group: 'Southeast Asia', color: '#8a5a2b', charge: 'temple', hp2: 11, hp4: 13,
    style: 'War elephants, reservoirs and Angkor Wat',
    deck: { warElephant: 3, ballistaElephant: 1, angkorWat: 1, baray: 2, militia: 3, swordsmen: 2, spearmen: 1, archers: 1, skirmishers: 1, watchTower: 2, stoneWall: 1, healer: 1, monastery: 1, merchant: 1, batteringRam: 1, messenger: 1, apsaraTemple: 1 },
    imperial: { eliteBallistaElephant: 1, bayon: 1, warElephant: 1, archers: 1, watchTower: 1 }, age: 'heal gold' },
  vikings: { name: 'Vikings', group: 'Europe', color: '#33506b', charge: 'ship', hp2: 13, hp4: 14,
    style: 'Longship raids, berserkers and the shield wall',
    deck: { longship: 3, berserker: 3, huscarl: 2, raiders: 2, warship: 1, swordsmen: 3, militia: 1, skirmishers: 1, palisade: 1, watchTower: 1, healer: 1, lindisfarne: 1, meadHall: 1, messenger: 1, merchant: 1, scholars: 1 },
    imperial: { eliteBerserker: 1, dragonShip: 1, longship: 1, swordsmen: 1, raiders: 1 }, age: 'gold draw' },
};
const CIV_ORDER = Object.keys(CIVS);
const GROUPS = ['East Asia', 'Southeast Asia', 'Middle East & Africa', 'Steppe', 'Europe'].filter(g => CIV_ORDER.some(c => CIVS[c].group === g));
for (const C of Object.values(CIVS)) C.ageIcons = symCodes(C.age);
/* who fields each unit: a unit used by a single civilization wears its crest */
const UNIT_CIVS = {};
for (const civ of CIV_ORDER) for (const list of [CIVS[civ].deck, CIVS[civ].imperial]) for (const id of Object.keys(list)) {
  if (!UNITS[id]) throw new Error(`${civ}: unknown unit ${id}`);
  (UNIT_CIVS[id] || (UNIT_CIVS[id] = new Set())).add(civ);
}
const crestOf = id => (UNIT_CIVS[id] && UNIT_CIVS[id].size === 1 && !MERC_UNITS.has(id) ? [...UNIT_CIVS[id]][0] : null);
const deckSize = civ => Object.values(CIVS[civ].deck).reduce((a, n) => a + n, 0);
const imperialSize = civ => Object.values(CIVS[civ].imperial).reduce((a, n) => a + n, 0);
