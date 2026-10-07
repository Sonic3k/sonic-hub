/* ── Units: one shared list. A unit is a name and its symbols, nothing else.
   Any civilization can put any unit in its deck; a unit that only one civilization uses carries that civilization's crest.
   Mercenaries are units too: they sit in the market and anyone can hire them for gold. ── */
const UNITS = {
  /* foot */
  militia:            { name: 'Militia', sym: 'strike' },
  spearmen:           { name: 'Spearmen', sym: 'strike bodyguard' },
  swordsmen:          { name: 'Swordsmen', sym: 'strike strike' },
  menAtArms:          { name: 'Men-at-Arms', sym: 'strike strike strike' },
  skirmishers:        { name: 'Skirmishers', sym: 'ranged flank' },
  archers:            { name: 'Archers', sym: 'longranged' },
  crossbowmen:        { name: 'Crossbowmen', sym: 'longranged longranged' },
  raiders:            { name: 'Raiders', sym: 'strike raid' },
  /* horse, camel, elephant */
  scoutCavalry:       { name: 'Scout Cavalry', sym: 'cavalry' },
  lightCavalry:       { name: 'Light Cavalry', sym: 'cavalry flank' },
  knights:            { name: 'Knights', sym: 'cavalry cavalry' },
  horseArchers:       { name: 'Horse Archers', sym: 'ranged play' },
  camelRiders:        { name: 'Camel Riders', sym: 'camel camel' },
  warElephant:        { name: 'War Elephant', sym: 'elephant' },
  /* siege, guns, ships */
  batteringRam:       { name: 'Battering Ram', sym: 'ram strike' },
  mangonel:           { name: 'Mangonel', sym: 'catapult ranged' },
  handCannoneers:     { name: 'Hand Cannoneers', sym: 'gunpowder gunpowder' },
  warship:            { name: 'Warship', sym: 'ship' },
  /* buildings */
  palisade:           { name: 'Palisade', sym: 'wall' },
  stoneWall:          { name: 'Stone Wall', sym: 'wall wall' },
  castle:             { name: 'Castle', sym: 'wall wall wall' },
  watchTower:         { name: 'Watch Tower', sym: 'wall heal' },
  guardTower:         { name: 'Guard Tower', sym: 'wall heal bodyguard' },
  /* people */
  healer:             { name: 'Healer', sym: 'heal heal draw' },
  monastery:          { name: 'Monastery', sym: 'heal draw' },
  scholars:           { name: 'Scholars', sym: 'draw draw' },
  messenger:          { name: 'Messenger', sym: 'play draw' },
  merchant:           { name: 'Merchant', sym: 'gold draw' },
  monk:               { name: 'Monk', sym: 'monk play' },
  spy:                { name: 'Spy', sym: 'spy play' },

  /* Mongols */
  mangudai:           { name: 'Mangudai', sym: 'ranged ranged raid', lore: 'Mongol horse archers who rode ahead of the army and lived off the land they plundered.' },
  steppeLancer:       { name: 'Steppe Lancer', sym: 'cavalry raid', lore: 'Lance-armed riders of the steppe, as quick to strike a camp as to strip it.' },
  keshik:             { name: 'Keshik', sym: 'cavalry gold', lore: 'The khan\'s guard: elite riders paid from the spoils they brought home.' },
  feignedRetreat:     { name: 'Feigned Retreat', sym: 'flank flank play', lore: 'Turn and flee, then wheel around on whoever gave chase.' },
  yam:                { name: 'Yam Relay', sym: 'play draw gold', lore: 'Relay stations a day\'s ride apart carried orders and tribute across the empire.' },
  eliteMangudai:      { name: 'Elite Mangudai', sym: 'ranged ranged raid play', lore: 'Veteran horse archers of the great campaigns.' },
  /* Đại Việt */
  rattanArcher:       { name: 'Rattan Archer', sym: 'longranged heal', lore: 'Archers behind light rattan shields, hard to pin down and quick to recover.' },
  imperialSkirmisher: { name: 'Imperial Skirmisher', sym: 'ranged ranged heal', lore: 'Light troops who harried the invader and melted back into the countryside.' },
  bachDang:           { name: 'Bạch Đằng Stakes', sym: 'trap trap heal', lore: 'Iron-tipped stakes hidden under the tide of the Bạch Đằng river wrecked fleet after fleet.' },
  bambooSpikes:       { name: 'Bamboo Spikes', sym: 'trap trap draw', lore: 'Sharpened bamboo hidden on every path into the villages.' },
  emptyVillages:      { name: 'Empty Villages', sym: 'trap heal gold', lore: 'Vườn không nhà trống: the people left with their harvest and left the invader nothing but snares.' },
  dienHong:           { name: 'Diên Hồng Council', sym: 'heal draw play', lore: 'The elders of the realm gathered and answered with one voice: fight.' },
  ricePaddies:        { name: 'Rice Paddies', sym: 'gold gold heal', lore: 'Wet-rice fields that fed the army and the treasury alike.' },
  thanCo:             { name: 'Thần Cơ Hand Cannons', sym: 'gunpowder gunpowder', lore: 'Đại Việt firearms, feared enough that the Ming carried their makers home.' },
  eliteRattanArcher:  { name: 'Elite Rattan Archer', sym: 'longranged longranged heal' },
  /* Teutons */
  teutonicKnight:     { name: 'Teutonic Knight', sym: 'strike strike bodyguard', lore: 'Brother knights of the Order, slow, heavily armoured and impossible to rush.' },
  paviseCrossbowmen:  { name: 'Pavise Crossbowmen', sym: 'longranged mantlet', lore: 'Crossbowmen who shot from behind a tall standing shield, the pavise.' },
  hanseatic:          { name: 'Hanseatic Traders', sym: 'gold gold draw', lore: 'Merchant towns of the Baltic bound together in the Hansa.' },
  eliteTeutonicKnight:{ name: 'Elite Teutonic Knight', sym: 'strike strike strike bodyguard' },
  marienburg:         { name: 'Marienburg', sym: 'wall wall wall heal bodyguard', lore: 'The great brick castle of the Order, hospital and fortress in one.' },
  /* Britons */
  longbowmen:         { name: 'Longbowmen', sym: 'longranged longranged longranged', lore: 'Yew bows that dropped arrows over any rampart from far beyond its reach.' },
  yeomen:             { name: 'Yeomen', sym: 'longranged draw', lore: 'Free farmers who practised at the butts every Sunday by law.' },
  magnaCarta:         { name: 'Magna Carta', sym: 'draw draw gold', lore: 'The great charter of 1215, sealed at Runnymede.' },
  eliteLongbowmen:    { name: 'Elite Longbowmen', sym: 'longranged longranged longranged longranged' },
  warwolf:            { name: 'Warwolf', sym: 'catapult catapult catapult', lore: 'The largest trebuchet ever built, raised by Edward I before the walls of Stirling.' },
  /* Japanese */
  samurai:            { name: 'Samurai', sym: 'strike strike flank', lore: 'Sword and bow of the warrior class, deadliest against a foe caught without cover.' },
  yumiArchers:        { name: 'Yumi Archers', sym: 'ranged ranged', lore: 'Archers with the tall asymmetric yumi.' },
  shinobi:            { name: 'Shinobi', sym: 'snipe spy', lore: 'Spies and assassins who struck down guards and stole secrets.' },
  divineWind:         { name: 'Divine Wind', sym: 'storm draw', lore: 'Kamikaze: the typhoons that scattered the Mongol fleets in 1274 and 1281.' },
  sohei:              { name: 'Sōhei', sym: 'strike bodyguard heal', lore: 'Warrior monks with the naginata, guardians of the great temples.' },
  kensei:             { name: 'Kensei', sym: 'strike strike strike flank', lore: 'A sword saint: a master swordsman beyond rank.' },
  tanegashima:        { name: 'Tanegashima Gunners', sym: 'gunpowder longranged', lore: 'Matchlocks copied from the Portuguese and soon made by the thousand.' },
  himeji:             { name: 'Himeji Castle', sym: 'wall wall wall bodyguard', lore: 'The White Heron castle on its hill above Himeji.' },
  mountedSamurai:     { name: 'Mounted Samurai', sym: 'cavalry flank flank', lore: 'Mounted archers and lancers of the warrior houses.' },
  /* Franks */
  throwingAxemen:     { name: 'Throwing Axemen', sym: 'ranged strike', lore: 'Frankish warriors who hurled the francisca before closing in.' },
  carolingianCourt:   { name: 'Carolingian Court', sym: 'draw bodyguard play', lore: 'Charlemagne\'s court at Aachen, where scholars and envoys met.' },
  paladin:            { name: 'Paladin', sym: 'cavalry cavalry heal', lore: 'The peers of Charlemagne in the songs, the finest knights of the realm.' },
  oriflamme:          { name: 'Oriflamme Charge', sym: 'cavalry cavalry play', lore: 'The red banner of the kings of France: no quarter while it flies.' },
  /* Byzantines */
  cataphract:         { name: 'Cataphract', sym: 'cavalry bodyguard', lore: 'Horse and rider armoured head to hoof, the heavy cavalry of the Empire.' },
  greekFire:          { name: 'Greek Fire', sym: 'ship gunpowder', lore: 'Liquid fire sprayed from Byzantine dromons that burned even on water.' },
  theodosianWalls:    { name: 'Theodosian Walls', sym: 'wall wall wall trap', lore: 'The triple land walls of Constantinople, unbroken for a thousand years.' },
  hyperpyron:         { name: 'Golden Hyperpyron', sym: 'gold gold spy', lore: 'Byzantine gold coins that bought allies, informers and peace.' },
  hagiaSophia:        { name: 'Hagia Sophia', sym: 'heal wall wall wall countdown countdown countdown countdown', lore: 'Justinian\'s great church, for a thousand years the largest in the world.' },
  /* Arabs */
  camelArcher:        { name: 'Camel Archers', sym: 'camel ranged', lore: 'Archers mounted on camels, whose smell alone threw horses into panic.' },
  bimaristan:         { name: 'Bimaristan', sym: 'heal heal heal draw', lore: 'The great hospitals of Baghdad and Damascus.' },
  caravanserai:       { name: 'Caravanserai', sym: 'wall gold draw', lore: 'Fortified inns along the caravan roads.' },
  mamluks:            { name: 'Mamluks', sym: 'camel cavalry', lore: 'Slave soldiers raised as elite riders, later the rulers of Egypt.' },
  houseOfWisdom:      { name: 'House of Wisdom', sym: 'draw draw draw heal', lore: 'The library and academy of Abbasid Baghdad.' },
  /* Khmer */
  ballistaElephant:   { name: 'Ballista Elephant', sym: 'elephant ranged', lore: 'War elephants carrying a double crossbow on their backs.' },
  angkorWat:          { name: 'Angkor Wat', sym: 'wall wall wall countdown countdown countdown countdown', lore: 'The temple-mountain of Suryavarman II, the largest religious monument on earth.' },
  baray:              { name: 'Baray Reservoir', sym: 'heal heal gold', lore: 'Vast reservoirs that watered the rice fields of Angkor.' },
  apsaraTemple:       { name: 'Apsara Temple', sym: 'heal draw draw', lore: 'Temples carved with dancing apsaras.' },
  eliteBallistaElephant: { name: 'Elite Ballista Elephant', sym: 'elephant ranged ranged' },
  bayon:              { name: 'Bayon', sym: 'wall wall heal heal', lore: 'The temple of the smiling faces at the heart of Angkor Thom.' },
  /* Vikings */
  longship:           { name: 'Longship', sym: 'ship raid', lore: 'Shallow keels that could row up any river to the next monastery.' },
  berserker:          { name: 'Berserker', sym: 'strike strike heal', lore: 'Warriors who fought in a trance and seemed to shrug off their wounds.' },
  huscarl:            { name: 'Huscarl', sym: 'strike bodyguard bodyguard', lore: 'Household troops of the jarls, a wall of shields around their lord.' },
  lindisfarne:        { name: 'Lindisfarne Raid', sym: 'spy raid strike', lore: 'The raid of 793 on the holy island that opened the Viking Age.' },
  meadHall:           { name: 'Mead Hall', sym: 'heal heal play', lore: 'Where the jarl feasted his warriors and gave out rings.' },
  eliteBerserker:     { name: 'Elite Berserker', sym: 'strike strike strike heal' },
  dragonShip:         { name: 'Dragon Ship', sym: 'ship ship raid', lore: 'The great dragon-prowed ships of the sea kings.' },

  /* mercenaries */
  genoese:            { name: 'Genoese Crossbowmen', sym: 'longranged longranged play', lore: 'Professional crossbowmen hired by every power around the Mediterranean.' },
  cuman:              { name: 'Cuman Horse Archers', sym: 'ranged ranged play', lore: 'Steppe riders who sold their bows to Hungary, Byzantium and the Rus.' },
  varangian:          { name: 'Varangian Guard', sym: 'strike strike bodyguard bodyguard', lore: 'Norse and English axemen sworn to the emperor in Constantinople.' },
  hashashin:          { name: 'Hashashin', sym: 'longranged longranged snipe', lore: 'The order of Alamut, feared for killing guarded men in their own halls.' },
  trebuchet:          { name: 'Trebuchet', sym: 'catapult catapult', lore: 'A counterweight siege engine that could hurl stones over the highest wall.' },
  siegeEngineers:     { name: 'Siege Engineers', sym: 'ram ram draw', lore: 'Sappers and engineers who sold their craft to any besieger.' },
  physician:          { name: 'Physician', sym: 'heal heal heal play', lore: 'A learned doctor from Salerno or Córdoba.' },
  venetian:           { name: 'Venetian Merchants', sym: 'gold gold draw play', lore: 'Merchants of the Serenissima, who lent to kings and sold to everyone.' },
  envoy:              { name: 'Envoy', sym: 'spy spy play', lore: 'An ambassador with open ears and an open purse.' },
  templars:           { name: 'Knights Templar', sym: 'cavalry cavalry bodyguard', lore: 'Warrior monks of the Temple, bankers and shock cavalry.' },
  gunners:            { name: 'Hungarian Gunners', sym: 'gunpowder gunpowder gunpowder', lore: 'Handgunners of the Black Army of Matthias Corvinus.' },
  hiredElephants:     { name: 'Hired Elephants', sym: 'elephant strike', lore: 'War elephants with their mahouts, for hire to any prince.' },
  bedouin:            { name: 'Bedouin Camels', sym: 'camel camel play', lore: 'Desert riders who knew every well between two cities.' },
  condottieri:        { name: 'Condottieri', sym: 'strike strike play', lore: 'Italian captains who fought for whoever paid on time.' },
};
for (const [id, U] of Object.entries(UNITS)) { U.id = id; U.icons = symCodes(U.sym); }
/* the market: cost in gold and how many copies are in its pile */
const MERCS = [
  { unit: 'genoese', cost: 3, n: 2 }, { unit: 'cuman', cost: 3, n: 2 }, { unit: 'varangian', cost: 4, n: 1 }, { unit: 'hashashin', cost: 4, n: 1 },
  { unit: 'trebuchet', cost: 3, n: 1 }, { unit: 'siegeEngineers', cost: 3, n: 2 }, { unit: 'physician', cost: 3, n: 1 }, { unit: 'venetian', cost: 2, n: 2 },
  { unit: 'envoy', cost: 3, n: 1 }, { unit: 'templars', cost: 4, n: 1 }, { unit: 'gunners', cost: 4, n: 1 }, { unit: 'hiredElephants', cost: 3, n: 1 },
  { unit: 'bedouin', cost: 3, n: 1 }, { unit: 'condottieri', cost: 3, n: 1 },
];
const MERC_UNITS = new Set(MERCS.map(m => m.unit));
