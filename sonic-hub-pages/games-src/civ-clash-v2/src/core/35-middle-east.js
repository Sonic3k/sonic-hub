/* ── Middle East: camels, caravans and madrasas; hospitals, great guns and paradise gardens ── */
Object.assign(UNITS, {
  /* Arabs */
  mamluks:            { name: 'Mamluks', sym: 'cavalry ranged strike', lore: 'Slave soldiers raised as elite horsemen, masters of lance, bow and sword, later the rulers of Egypt.' },
  bimaristan:         { name: 'Bimaristan', sym: 'heal heal heal draw', lore: 'The great hospitals of Baghdad and Damascus.' },
  houseOfWisdom:      { name: 'House of Wisdom', sym: 'draw draw draw heal', lore: 'The library and academy of Abbasid Baghdad.' },
  /* Turks */
  janissary:          { name: 'Janissaries', sym: 'gunpowder gunpowder strike', lore: 'The sultan\'s standing infantry, raised from the levy of boys and armed with the matchlock.' },
  greatBombard:       { name: 'Great Bombard', sym: 'catapult catapult gunpowder', lore: 'Orban\'s monster gun, dragged by sixty oxen to the walls of Constantinople in 1453.' },
  akinji:             { name: 'Akinji', sym: 'cavalry raid', lore: 'Ottoman raiders who rode ahead of the army and lived off what they took.' },
  devshirme:          { name: 'Devshirme', sym: 'draw draw bodyguard', lore: 'The levy of boys from the Balkans, raised to be the sultan\'s soldiers and ministers.' },
  /* Persians */
  savar:              { name: 'Savar', sym: 'cavalry longranged', lore: 'Armoured noble horsemen with lance and bow, heirs of the Sasanian Savaran.' },
  eliteSavar:         { name: 'Elite Savar', sym: 'cavalry cavalry longranged' },
  persianElephants:   { name: 'Armoured Elephants', sym: 'elephant elephant', lore: 'War elephants of the shahs, towers of archers above the battle.' },
  persianGarden:      { name: 'Persian Garden', sym: 'heal heal heal', lore: 'The walled garden, pairidaeza, that gave the world the word paradise.' },
});
Object.assign(CIVS, {
  arabs: { name: 'Arabs', group: 'Middle East', color: '#1f7a4d', charge: 'crescent', hp2: 13, hp4: 15,
    style: 'Camels, hospitals and the caravan roads',
    deck: { camelRiders: 2, camelArcher: 2, mamluks: 2, swordsmen: 2, militia: 3, spearmen: 1, archers: 1, skirmishers: 1, cavalry: 1, healer: 1, bimaristan: 1, caravanserai: 1, merchant: 1, madrasa: 1, monk: 1, watchTower: 1, stoneWall: 1, messenger: 1 },
    imperial: { mamluks: 1, houseOfWisdom: 1, camelRiders: 1, camelArcher: 1, mangonel: 1 }, age: 'gold heal' },
  turks: { name: 'Turks', group: 'Middle East', color: '#a51c30', charge: 'crescent', hp2: 15, hp4: 13,
    style: 'Janissaries, akinji raiders and the great bombards',
    deck: { janissary: 2, akinji: 3, horseArchers: 2, swordsmen: 2, militia: 3, spearmen: 2, archers: 1, cavalry: 1, devshirme: 1, mangonel: 1, batteringRam: 1, stoneWall: 1, watchTower: 1, madrasa: 1, merchant: 1, healer: 1 },
    imperial: { greatBombard: 1, janissary: 1, handCannoneers: 1, akinji: 1, castle: 1 }, age: 'gold gold' },
  persians: { name: 'Persians', group: 'Middle East', color: '#6b2d8f', charge: 'sun', hp2: 14, hp4: 14,
    style: 'Savaran cavalry, armoured elephants and paradise gardens',
    deck: { savar: 3, warElephant: 2, archers: 2, camelRiders: 1, knights: 1, spearmen: 2, swordsmen: 1, militia: 2, cavalry: 2, persianGarden: 1, caravanserai: 1, stoneWall: 1, watchTower: 1, madrasa: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { persianElephants: 1, eliteSavar: 1, warElephant: 1, crossbowmen: 1, castle: 1 }, age: 'gold draw' },
});
