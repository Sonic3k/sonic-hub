/* ── Americas: no horses, camels, elephants or gunpowder. Eagle and jaguar warriors, archers and slingers,
   island cities, mountain roads and great mounds ── */
Object.assign(UNITS, {
  /* Aztecs */
  jaguarWarriors:     { name: 'Jaguar Warriors', sym: 'strike strike eagle', lore: 'Warriors of the jaguar society, the elite of Tenochtitlan\'s armies.' },
  flowerWar:          { name: 'Flower War', sym: 'spy eagle', lore: 'Ritual wars fought to take captives rather than land.' },
  tenochtitlan:       { name: 'Tenochtitlan', sym: 'wall wall wall heal gold', lore: 'The island city on Lake Texcoco, joined to the shore by causeways that could be cut.' },
  chinampas:          { name: 'Chinampas', sym: 'gold gold heal', lore: 'Floating gardens on the lake that fed a city of two hundred thousand.' },
  /* Maya */
  plumedArchers:      { name: 'Plumed Archers', sym: 'longranged flank play', lore: 'Fast-moving Maya archers in feathered headdresses.' },
  elitePlumedArchers: { name: 'Elite Plumed Archers', sym: 'longranged longranged flank play' },
  chichenItza:        { name: 'Chichén Itzá', sym: 'draw wall wall wall countdown countdown countdown countdown', lore: 'The pyramid of Kukulcán, whose stairs cast a serpent of light at the equinox.' },
  longCount:          { name: 'Long Count Calendar', sym: 'draw draw heal', lore: 'A calendar that counted the days from the creation of the world.' },
  /* Inca */
  slingers:           { name: 'Slingers', sym: 'ranged strike strike', lore: 'Andean slingers whose stones could break a helmet at a hundred paces.' },
  eliteSlingers:      { name: 'Elite Slingers', sym: 'ranged ranged strike strike' },
  kamayuk:            { name: 'Kamayuk', sym: 'strike bodyguard mantlet', lore: 'Spearmen in quilted cotton armour who held the line with their long lances.' },
  sacsayhuaman:       { name: 'Sacsayhuamán', sym: 'wall wall wall mantlet', lore: 'Zigzag walls of stones weighing a hundred tons, fitted so tightly no blade slips between them.' },
  chasqui:            { name: 'Chasqui Runners', sym: 'play draw draw', lore: 'Relay runners on the royal roads who carried a message 240 kilometres in a day.' },
  terraces:           { name: 'Andean Terraces', sym: 'heal heal gold', lore: 'Terraces climbing the mountainsides, each with its own soil and its own crops.' },
  /* Mississippians */
  falconWarriors:     { name: 'Falcon Warriors', sym: 'eagle flank', lore: 'Warriors in the guise of the falcon, the Birdman of the shell gorgets and copper plates.' },
  eliteFalconWarriors:{ name: 'Elite Falcon Warriors', sym: 'eagle eagle flank' },
  warCanoes:          { name: 'War Canoes', sym: 'ship strike', lore: 'Dugout canoes carrying war parties up and down the great river.' },
  cahokiaStockade:    { name: 'Cahokia Stockade', sym: 'wall wall wall ranged', lore: 'A two-mile palisade around central Cahokia, with a bastion for archers every few dozen paces.' },
  monksMound:         { name: 'Monks Mound', sym: 'wall wall wall draw draw', lore: 'The great platform mound of Cahokia, the largest earthwork in the Americas north of Mexico.' },
  threeSisters:       { name: 'Three Sisters', sym: 'gold draw heal', lore: 'Maize, beans and squash, planted together in the same mound.' },
});
Object.assign(CIVS, {
  aztecs: { name: 'Aztecs', group: 'Americas', color: '#0f766e', charge: 'eagle', hp2: 14, hp4: 15,
    style: 'Eagle and jaguar warriors, flower wars and the island city',
    deck: { eagleWarriors: 4, jaguarWarriors: 2, atlatl: 3, flowerWar: 1, clubWarriors: 1, spearmen: 2, militia: 2, archers: 2, palisade: 1, stoneWall: 1, chinampas: 1, temple: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { eliteEagles: 1, jaguarWarriors: 1, tenochtitlan: 1, flowerWar: 1, eagleWarriors: 1 }, age: 'gold draw' },
  maya: { name: 'Maya', group: 'Americas', color: '#2e7d5b', charge: 'pyramid', hp2: 11, hp4: 15,
    style: 'Plumed archers, the Long Count and Chichén Itzá',
    deck: { plumedArchers: 4, eagleWarriors: 4, atlatl: 2, spearmen: 2, clubWarriors: 2, militia: 2, archers: 1, stoneWall: 1, watchTower: 1, palisade: 1, longCount: 1, temple: 1, healer: 1, merchant: 1 },
    imperial: { chichenItza: 1, elitePlumedArchers: 1, eliteEagles: 1, plumedArchers: 1, eagleWarriors: 1 }, age: 'heal draw' },
  inca: { name: 'Inca', group: 'Americas', color: '#c2410c', charge: 'sun', hp2: 12, hp4: 12,
    style: 'Slingers, the royal roads and the walls of Sacsayhuamán',
    deck: { slingers: 3, kamayuk: 3, eagleWarriors: 3, archers: 3, spearmen: 1, clubWarriors: 1, militia: 2, sacsayhuaman: 1, stoneWall: 1, watchTower: 1, chasqui: 1, terraces: 1, temple: 1, healer: 1, messenger: 1 },
    imperial: { eliteSlingers: 1, kamayuk: 1, sacsayhuaman: 1, eliteEagles: 1, chasqui: 1 }, age: 'heal gold' },
  mississippians: { name: 'Mississippians', group: 'Americas', color: '#8c3b2a', charge: 'handeye', hp2: 13, hp4: 15,
    style: 'Falcon warriors, war canoes and the mounds of Cahokia',
    deck: { falconWarriors: 3, clubWarriors: 2, atlatl: 1, archers: 3, spearmen: 2, militia: 3, warCanoes: 2, cahokiaStockade: 1, palisade: 1, watchTower: 1, monksMound: 1, threeSisters: 1, temple: 1, healer: 1, merchant: 1 },
    imperial: { eliteFalconWarriors: 1, warCanoes: 1, archers: 1, cahokiaStockade: 1, clubWarriors: 1 }, age: 'heal draw' },
});
