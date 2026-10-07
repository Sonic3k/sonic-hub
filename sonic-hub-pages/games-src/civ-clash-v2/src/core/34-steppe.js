/* ── Steppe: horse archers, lancers and raids; few walls, many riders, and armies for hire ── */
Object.assign(UNITS, {
  /* Mongols */
  mangudai:           { name: 'Mangudai', sym: 'ranged ranged raid', lore: 'Mongol horse archers who rode ahead of the army and lived off the land they plundered.' },
  eliteMangudai:      { name: 'Elite Mangudai', sym: 'ranged ranged raid play', lore: 'Veteran horse archers of the great campaigns.' },
  feignedRetreat:     { name: 'Feigned Retreat', sym: 'flank flank play', lore: 'Turn and flee, then wheel around on whoever gave chase.' },
  yam:                { name: 'Yam Relay', sym: 'play draw gold', lore: 'Relay stations a day\'s ride apart carried orders and tribute across the empire.' },
  /* Huns */
  tarkan:             { name: 'Tarkan', sym: 'cavalry ram', lore: 'Hunnic horsemen who rode up to the walls with torches and set the gates alight.' },
  eliteTarkan:        { name: 'Elite Tarkan', sym: 'cavalry cavalry ram' },
  hunnicArchers:      { name: 'Hunnic Horse Archers', sym: 'ranged flank play', lore: 'Archers who shot from the saddle at full gallop, with bows stiffened by bone.' },
  scourge:            { name: 'Scourge of God', sym: 'flank flank raid', lore: 'Attila\'s name alone emptied whole provinces before his riders arrived.' },
  romanTribute:       { name: 'Roman Tribute', sym: 'raid raid gold', lore: 'Constantinople paid Attila hundreds of pounds of gold a year to keep away.' },
  /* Khitans */
  pishiGuard:         { name: 'Pishi Guard', sym: 'cavalry ranged bodyguard', lore: 'The Liao emperor\'s own guard: armoured lancers who also carried the bow.' },
  elitePishiGuard:    { name: 'Elite Pishi Guard', sym: 'cavalry ranged ranged bodyguard' },
  ordo:               { name: 'Ordo Camp', sym: 'wall heal play', lore: 'The emperor\'s moving palace-camp, which followed the seasons from pasture to pasture.' },
  dualAdmin:          { name: 'Dual Administration', sym: 'gold gold draw draw', lore: 'Northern officials ruled the herders by their customs, southern officials the farmers by theirs.' },
  /* Tatars */
  keshik:             { name: 'Keshik', sym: 'cavalry gold', lore: 'The khan\'s guard: elite riders paid from the spoils they brought home.' },
  eliteKeshik:        { name: 'Elite Keshik', sym: 'cavalry gold gold' },
  flamingCamels:      { name: 'Flaming Camels', sym: 'camel camel', lore: 'Timur\'s burning camels, driven screaming into the war elephants of Delhi in 1398.' },
  timuridSiege:       { name: 'Timurid Siegecraft', sym: 'catapult ram', lore: 'Timur\'s engineers brought down the walls of Baghdad, Damascus and Delhi.' },
  /* Cumans */
  kipchak:            { name: 'Kipchak', sym: 'ranged ranged flank', lore: 'Kipchak horse archers who loosed several arrows in the time others loosed one.' },
  eliteKipchak:       { name: 'Elite Kipchak', sym: 'ranged ranged flank play' },
  cumanMercs:         { name: 'Cuman Mercenaries', sym: 'ranged gold play', lore: 'Cuman riders who fought for Hungary, Georgia and Byzantium, and were paid well for it.' },
});
Object.assign(CIVS, {
  mongols: { name: 'Mongols', group: 'Steppe', color: '#1f6f8b', charge: 'horse', hp2: 11, hp4: 15,
    style: 'Horse archers and lancers who raid for gold and hire whole armies',
    deck: { mangudai: 2, steppeLancer: 2, horseArchers: 3, raiders: 2, feignedRetreat: 1, yam: 1, militia: 5, spearmen: 1, mangonel: 1, watchTower: 1, messenger: 1, healer: 1, merchant: 1, spy: 1, shrine: 1 },
    imperial: { eliteMangudai: 1, mangonel: 1, steppeLancer: 1, horseArchers: 1, lightCavalry: 1 }, age: 'gold gold' },
  huns: { name: 'Huns', group: 'Steppe', color: '#7a3b12', charge: 'bow', hp2: 13, hp4: 15,
    style: 'Horse archers, torch-bearing Tarkans and tribute wrung from Rome',
    deck: { hunnicArchers: 3, tarkan: 2, horseArchers: 1, raiders: 2, scourge: 1, romanTribute: 1, cavalry: 1, militia: 4, spearmen: 1, swordsmen: 2, spy: 1, healer: 1, shrine: 1, messenger: 1, palisade: 2 },
    imperial: { eliteTarkan: 1, hunnicArchers: 1, horseArchers: 1, raiders: 1, mangonel: 1 }, age: 'gold draw' },
  khitans: { name: 'Khitans', group: 'Steppe', color: '#4a6b3a', charge: 'sun', hp2: 12, hp4: 12,
    style: 'Armoured lancer-archers, moving palace camps and a two-faced government',
    deck: { pishiGuard: 2, steppeLancer: 1, horseArchers: 2, militia: 5, spearmen: 2, swordsmen: 1, crossbowmen: 1, archers: 1, ordo: 1, palisade: 1, watchTower: 1, dualAdmin: 1, pagoda: 1, healer: 1, merchant: 1, messenger: 1, mangonel: 1 },
    imperial: { elitePishiGuard: 1, ordo: 1, knights: 1, horseArchers: 1, crossbowmen: 1 }, age: 'gold heal' },
  tatars: { name: 'Tatars', group: 'Steppe', color: '#3b4a7a', charge: 'tamga', hp2: 14, hp4: 15,
    style: 'Keshik guards, Timur\'s siege engines and the tribute of the Horde',
    deck: { keshik: 3, steppeLancer: 2, horseArchers: 3, flamingCamels: 1, raiders: 2, militia: 3, spearmen: 1, swordsmen: 1, camelRiders: 1, timuridSiege: 1, watchTower: 1, palisade: 1, madrasa: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { eliteKeshik: 1, flamingCamels: 1, timuridSiege: 1, horseArchers: 1, steppeLancer: 1 }, age: 'gold gold' },
  cumans: { name: 'Cumans', group: 'Steppe', color: '#a8892c', charge: 'wolf', hp2: 11, hp4: 13,
    style: 'Kipchak archers, early rams and riders for hire',
    deck: { kipchak: 3, steppeLancer: 2, horseArchers: 2, cumanMercs: 1, raiders: 1, militia: 4, spearmen: 3, swordsmen: 1, batteringRam: 2, palisade: 1, watchTower: 1, shrine: 1, healer: 1, merchant: 1 },
    imperial: { eliteKipchak: 1, steppeLancer: 1, knights: 1, batteringRam: 1, lightCavalry: 1 }, age: 'gold draw' },
});
