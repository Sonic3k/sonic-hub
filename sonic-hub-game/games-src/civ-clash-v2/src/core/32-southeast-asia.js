/* ── Southeast Asia: elephants, rice and river fleets; citadels, temple-mountains and the straits ── */
Object.assign(UNITS, {
  /* Đại Việt */
  rattanArcher:       { name: 'Rattan Archer', sym: 'longranged heal', lore: 'Archers behind light rattan shields, hard to pin down and quick to recover.' },
  eliteRattanArcher:  { name: 'Elite Rattan Archer', sym: 'longranged longranged heal' },
  imperialSkirmisher: { name: 'Imperial Skirmisher', sym: 'ranged ranged heal', lore: 'Light troops who harried the invader and melted back into the countryside.' },
  bachDang:           { name: 'Bạch Đằng Stakes', sym: 'trap trap heal', lore: 'Iron-tipped stakes hidden under the tide of the Bạch Đằng: Ngô Quyền\'s in 938, Trần Hưng Đạo\'s in 1288.' },
  nhuNguyet:          { name: 'Như Nguyệt Line', sym: 'wall wall trap', lore: 'Lý Thường Kiệt\'s ramparts and stakes along the Như Nguyệt river, where the Song invasion of 1077 broke.' },
  thangLong:          { name: 'Thăng Long Citadel', sym: 'wall wall wall heal', lore: 'The citadel of the Ascending Dragon, raised by Lý Thái Tổ in 1010 and the heart of the realm for eight centuries.' },
  dienHong:           { name: 'Diên Hồng Council', sym: 'heal draw play', lore: 'The elders of the realm gathered and answered with one voice: fight.' },
  thanCo:             { name: 'Thần Cơ Handguns', sym: 'gunpowder gunpowder heal', lore: 'Đại Việt firearms, feared enough that the Ming carried their makers home to arm their own guard.' },
  /* Khmer */
  ballistaElephant:   { name: 'Ballista Elephant', sym: 'elephant longranged', lore: 'War elephants carrying a double crossbow that shot over the heads of the defenders.' },
  eliteBallistaElephant: { name: 'Elite Ballista Elephant', sym: 'elephant longranged longranged' },
  angkorWat:          { name: 'Angkor Wat', sym: 'wall wall wall countdown countdown countdown countdown', lore: 'The temple-mountain of Suryavarman II, the largest religious monument on earth.' },
  baray:              { name: 'Baray Reservoir', sym: 'heal heal gold', lore: 'Vast reservoirs that watered the rice fields of Angkor.' },
  apsaraTemple:       { name: 'Apsara Temple', sym: 'heal draw draw', lore: 'Temples carved with dancing apsaras.' },
  bayon:              { name: 'Bayon', sym: 'wall wall heal heal', lore: 'The temple of the smiling faces at the heart of Angkor Thom.' },
  /* Malay */
  karambit:           { name: 'Karambit Warriors', sym: 'strike play', lore: 'Light warriors with the curved karambit, cheap to raise and quick to swarm.' },
  orangLaut:          { name: 'Orang Laut', sym: 'ship spy play', lore: 'The sea people of the straits: pilots for the kings, pirates to everyone else.' },
  straitTolls:        { name: 'Strait of Malacca', sym: 'raid raid draw', lore: 'Every ship between India and China paid its toll at Malacca.' },
  jong:               { name: 'Jong', sym: 'ship ship heal', lore: 'Javanese junks four planks thick, too big for cannon shot to hole.' },
  cetbang:            { name: 'Cetbang', sym: 'gunpowder ranged', lore: 'Majapahit\'s bronze swivel guns, mounted on its ships and on the walls of every port.' },
  /* Pagan */
  arambai:            { name: 'Arambai', sym: 'ranged flank flank', lore: 'Horsemen of the Manipur hills who hurled darts at full gallop.' },
  eliteArambai:       { name: 'Elite Arambai', sym: 'ranged flank flank play' },
  royalElephants:     { name: 'Royal War Elephants', sym: 'elephant bodyguard', lore: 'Pagan\'s elephant corps, archers in the howdah and spearmen guarding its feet.' },
  anandaTemple:       { name: 'Ananda Temple', sym: 'heal heal draw play', lore: 'Kyansittha\'s gleaming white temple, one of thousands that rose over the plain of Pagan.' },
});
Object.assign(CIVS, {
  daiviet: { name: 'Đại Việt', group: 'Southeast Asia', color: '#b8860b', charge: 'star', hp2: 12, hp4: 14,
    style: 'Rattan archers, river stakes and the citadel of Thăng Long',
    deck: { rattanArcher: 3, imperialSkirmisher: 2, warElephant: 2, swordsmen: 2, spearmen: 1, militia: 2, crossbowmen: 1, bachDang: 1, nhuNguyet: 1, thangLong: 1, stoneWall: 1, watchTower: 1, dienHong: 1, ricePaddies: 1, pagoda: 1, healer: 1, messenger: 1, merchant: 1 },
    imperial: { eliteRattanArcher: 1, thanCo: 1, warElephant: 1, imperialSkirmisher: 1, castle: 1 }, age: 'heal draw' },
  khmer: { name: 'Khmer', group: 'Southeast Asia', color: '#8a5a2b', charge: 'temple', hp2: 11, hp4: 14,
    style: 'War elephants, reservoirs and Angkor Wat',
    deck: { warElephant: 3, ballistaElephant: 1, angkorWat: 1, baray: 2, militia: 3, swordsmen: 2, spearmen: 1, archers: 1, skirmishers: 1, watchTower: 2, stoneWall: 1, healer: 1, merchant: 1, batteringRam: 1, messenger: 1, apsaraTemple: 1, ricePaddies: 1 },
    imperial: { eliteBallistaElephant: 1, bayon: 1, warElephant: 1, archers: 1, watchTower: 1 }, age: 'heal gold' },
  malay: { name: 'Malay', group: 'Southeast Asia', color: '#9c2a6f', charge: 'kris', hp2: 12, hp4: 14,
    style: 'Swarming karambit warriors, sea nomads and the tolls of the straits',
    deck: { karambit: 3, orangLaut: 2, warship: 1, straitTolls: 1, warElephant: 2, swordsmen: 2, menAtArms: 1, spearmen: 2, skirmishers: 2, palisade: 1, watchTower: 1, stoneWall: 1, merchant: 1, temple: 1, healer: 1, messenger: 1, ricePaddies: 1 },
    imperial: { jong: 1, cetbang: 1, karambit: 1, warElephant: 1, orangLaut: 1 }, age: 'gold draw' },
  pagan: { name: 'Pagan', group: 'Southeast Asia', color: '#c26a1b', charge: 'wheel', hp2: 11, hp4: 15,
    style: 'Temple builders with war elephants and dart-throwing riders',
    deck: { arambai: 3, royalElephants: 2, elephantArchers: 1, swordsmen: 2, spearmen: 2, militia: 2, archers: 2, skirmishers: 1, ricePaddies: 1, stupa: 2, anandaTemple: 1, healer: 1, palisade: 1, watchTower: 1, stoneWall: 1, merchant: 1 },
    imperial: { eliteArambai: 1, royalElephants: 1, elephantArchers: 1, crossbowmen: 1, menAtArms: 1 }, age: 'heal gold' },
});
