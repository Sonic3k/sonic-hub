/* ── Western Europe: longbows, knights and castles; painted raiders and the riches of Burgundy ── */
Object.assign(UNITS, {
  /* Britons */
  longbowmen:         { name: 'Longbowmen', sym: 'longranged longranged longranged', lore: 'Yew bows that dropped arrows over any rampart from far beyond its reach.' },
  eliteLongbowmen:    { name: 'Elite Longbowmen', sym: 'longranged longranged longranged longranged' },
  yeomen:             { name: 'Yeomen', sym: 'longranged draw', lore: 'Free farmers who practised at the butts every Sunday by law.' },
  magnaCarta:         { name: 'Magna Carta', sym: 'draw draw gold', lore: 'The great charter of 1215, sealed at Runnymede.' },
  warwolf:            { name: 'Warwolf', sym: 'catapult catapult catapult', lore: 'The largest trebuchet ever built, raised by Edward I before the walls of Stirling.' },
  /* Celts */
  woadRaiders:        { name: 'Woad Raiders', sym: 'strike flank play', lore: 'Painted warriors who ran down the enemy before they could form up.' },
  roundTower:         { name: 'Round Tower', sym: 'wall wall draw', lore: 'Tall stone towers beside the Irish monasteries, where monks hid their books and bells from raiders.' },
  gallowglass:        { name: 'Gallowglass', sym: 'strike strike strike strike', lore: 'Hebridean axemen in mail who sold their swords to Irish chiefs for three centuries.' },
  /* Franks */
  throwingAxemen:     { name: 'Throwing Axemen', sym: 'ranged snipe', lore: 'Frankish warriors whose francisca, thrown before the charge, split the shields in the enemy line.' },
  carolingianCourt:   { name: 'Carolingian Court', sym: 'draw bodyguard play', lore: 'Charlemagne\'s court at Aachen, where scholars and envoys met.' },
  paladin:            { name: 'Paladin', sym: 'cavalry cavalry heal', lore: 'The peers of Charlemagne in the songs, the finest knights of the realm.' },
  oriflamme:          { name: 'Oriflamme Charge', sym: 'cavalry cavalry play', lore: 'The red banner of the kings of France: no quarter while it flies.' },
  /* Burgundians */
  coustilliers:       { name: 'Coustilliers', sym: 'cavalry flank play', lore: 'Mounted men of the Burgundian ordonnance, who struck with the coustille and rode on.' },
  flemishMilitia:     { name: 'Flemish Militia', sym: 'strike bodyguard gold', lore: 'Burghers of Ghent and Bruges, who brought down the flower of French chivalry at Courtrai in 1302.' },
  vineyards:          { name: 'Burgundian Vineyards', sym: 'gold heal', lore: 'The vineyards of the Côte d\'Or, worth more to the dukes than many a province.' },
  goldenFleece:       { name: 'Order of the Golden Fleece', sym: 'cavalry cavalry gold', lore: 'The order of chivalry founded by Philip the Good in 1430, the most splendid in Europe.' },
});
Object.assign(CIVS, {
  britons: { name: 'Britons', group: 'Western Europe', color: '#9b1c1c', charge: 'tower', hp2: 15, hp4: 16,
    style: 'Longbows that drop their arrows over any wall',
    deck: { longbowmen: 4, archers: 2, yeomen: 2, swordsmen: 2, militia: 1, spearmen: 1, cavalry: 1, stoneWall: 1, watchTower: 2, palisade: 1, healer: 1, monastery: 1, magnaCarta: 1, merchant: 1, batteringRam: 1, messenger: 1, skirmishers: 1 },
    imperial: { eliteLongbowmen: 1, warwolf: 1, menAtArms: 1, archers: 1, castle: 1 }, age: 'draw draw' },
  celts: { name: 'Celts', group: 'Western Europe', color: '#1d6b45', charge: 'knot', hp2: 12, hp4: 13,
    style: 'Woad raiders, siege engines and the round towers',
    deck: { woadRaiders: 3, swordsmen: 2, menAtArms: 1, spearmen: 2, militia: 3, skirmishers: 2, archers: 1, batteringRam: 2, mangonel: 1, roundTower: 1, palisade: 1, stoneWall: 1, monastery: 1, healer: 1, messenger: 1, merchant: 1 },
    imperial: { gallowglass: 1, woadRaiders: 1, batteringRam: 1, menAtArms: 1, castle: 1 }, age: 'heal draw' },
  franks: { name: 'Franks', group: 'Western Europe', color: '#1f4e9c', charge: 'fleur', hp2: 10, hp4: 13,
    style: 'Knights and castles of the Carolingian realm',
    deck: { knights: 2, cavalry: 1, throwingAxemen: 2, swordsmen: 2, militia: 3, spearmen: 2, castle: 1, stoneWall: 1, watchTower: 1, batteringRam: 1, monk: 1, healer: 1, monastery: 1, messenger: 1, carolingianCourt: 1, merchant: 1, archers: 1, palisade: 1 },
    imperial: { paladin: 1, oriflamme: 1, knights: 1, crossbowmen: 1, castle: 1 }, age: 'heal heal' },
  burgundians: { name: 'Burgundians', group: 'Western Europe', color: '#800020', charge: 'saltire', hp2: 11, hp4: 12,
    style: 'Ordonnance riders, Flemish burghers and the riches of Burgundy',
    deck: { coustilliers: 2, flemishMilitia: 3, cavalry: 1, crossbowmen: 2, spearmen: 2, swordsmen: 2, militia: 3, vineyards: 2, castle: 1, stoneWall: 1, watchTower: 1, monastery: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { goldenFleece: 1, handCannoneers: 1, coustilliers: 1, flemishMilitia: 1, castle: 1 }, age: 'gold gold' },
});
