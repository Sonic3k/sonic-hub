/* ── Southern Europe: the Mediterranean of fleets, banks and walls; the Reconquista and the ocean beyond ── */
Object.assign(UNITS, {
  /* Byzantines */
  cataphract:         { name: 'Cataphract', sym: 'cavalry bodyguard', lore: 'Horse and rider armoured head to hoof, the heavy cavalry of the Empire.' },
  greekFire:          { name: 'Greek Fire', sym: 'ship gunpowder', lore: 'Liquid fire sprayed from Byzantine dromons that burned even on water.' },
  theodosianWalls:    { name: 'Theodosian Walls', sym: 'wall wall wall trap', lore: 'The triple land walls of Constantinople, with their moat, unbroken for a thousand years.' },
  hyperpyron:         { name: 'Golden Hyperpyron', sym: 'gold gold spy', lore: 'Byzantine gold coins that bought allies, informers and peace.' },
  hagiaSophia:        { name: 'Hagia Sophia', sym: 'heal wall wall wall countdown countdown countdown countdown', lore: 'Justinian\'s great church, for a thousand years the largest in the world.' },
  /* Italians */
  carroccio:          { name: 'Carroccio', sym: 'bodyguard bodyguard heal', lore: 'The war cart of the Lombard cities, altar and banner aboard, defended to the last man at Legnano.' },
  bankers:            { name: 'Bankers of Florence', sym: 'gold gold play', lore: 'The banks of Florence, whose gold florin was good in every port of Europe.' },
  arsenal:            { name: 'Arsenal of Venice', sym: 'ship ship draw', lore: 'The Arsenal could fit out a war galley in a single day.' },
  /* Spanish */
  almogavars:         { name: 'Almogàvers', sym: 'ranged ranged strike', lore: 'Aragonese light infantry who threw two javelins and closed in with the short sword.' },
  santiago:           { name: 'Order of Santiago', sym: 'cavalry bodyguard heal', lore: 'Knights of the Order of Santiago, sworn to the Reconquista.' },
  missionaries:       { name: 'Missionaries', sym: 'monk draw', lore: 'Friars who rode with the armies and won converts wherever they went.' },
  conquistadors:      { name: 'Conquistadors', sym: 'gunpowder cavalry', lore: 'Mounted adventurers with arquebus and lance who toppled empires across the ocean.' },
  tercios:            { name: 'Tercios', sym: 'gunpowder strike bodyguard', lore: 'Squares of pike and shot, the backbone of Spain\'s armies for a century.' },
  /* Portuguese */
  caravel:            { name: 'Caravel', sym: 'ship play', lore: 'Small lateen-rigged ships that could sail into the wind and feel their way down the coast of Africa.' },
  carrack:            { name: 'Carrack', sym: 'ship ship gunpowder', lore: 'Great ocean ships with cannon on two decks, the fleets of the India run.' },
  feitoria:           { name: 'Feitoria', sym: 'wall gold gold', lore: 'Fortified trading posts from Africa to the Spice Islands.' },
  seaRoute:           { name: 'Sea Route to India', sym: 'gold gold gold play', lore: 'Vasco da Gama reached Calicut in 1498, and the spice trade turned towards Lisbon.' },
});
Object.assign(CIVS, {
  byzantines: { name: 'Byzantines', group: 'Southern Europe', color: '#5b2a86', charge: 'cross', hp2: 12, hp4: 11,
    style: 'Cataphracts, Greek fire and the walls of Constantinople',
    deck: { cataphract: 2, spearmen: 2, archers: 2, greekFire: 1, theodosianWalls: 1, guardTower: 1, stoneWall: 1, hyperpyron: 1, monk: 1, healer: 1, monastery: 1, militia: 3, swordsmen: 1, mangonel: 1, scholars: 1, messenger: 1, palisade: 1, spy: 1, warship: 1 },
    imperial: { hagiaSophia: 1, cataphract: 1, greekFire: 1, guardTower: 1, crossbowmen: 1 }, age: 'heal bodyguard' },
  italians: { name: 'Italians', group: 'Southern Europe', color: '#2a6f97', charge: 'lion', hp2: 10, hp4: 11,
    style: 'Merchant republics that field the best for hire: Genoese crossbows, condottieri and the Arsenal',
    deck: { genoese: 1, condottieri: 1, crossbowmen: 2, spearmen: 2, swordsmen: 1, militia: 4, knights: 1, carroccio: 1, bankers: 1, arsenal: 1, warship: 1, stoneWall: 1, watchTower: 1, monastery: 1, healer: 1, merchant: 2, messenger: 1, scholars: 1 },
    imperial: { venetian: 1, genoese: 1, arsenal: 1, handCannoneers: 1, condottieri: 1 }, age: 'gold gold' },
  spanish: { name: 'Spanish', group: 'Southern Europe', color: '#b45309', charge: 'tower', hp2: 11, hp4: 13,
    style: 'Almogàvers, the military orders and the conquistadors',
    deck: { almogavars: 3, santiago: 1, knights: 1, lightCavalry: 1, crossbowmen: 2, archers: 1, spearmen: 2, swordsmen: 1, militia: 4, castle: 1, stoneWall: 1, watchTower: 1, missionaries: 1, monastery: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { conquistadors: 1, tercios: 1, santiago: 1, knights: 1, castle: 1 }, age: 'gold heal' },
  portuguese: { name: 'Portuguese', group: 'Southern Europe', color: '#0e5e6f', charge: 'quinas', hp2: 13, hp4: 13,
    style: 'Caravels, fortified trading posts and the sea route to India',
    deck: { caravel: 3, warship: 1, feitoria: 1, crossbowmen: 2, archers: 1, spearmen: 2, swordsmen: 2, militia: 2, knights: 1, lightCavalry: 1, stoneWall: 1, watchTower: 1, monastery: 1, healer: 1, merchant: 2, messenger: 1, scholars: 1 },
    imperial: { carrack: 1, seaRoute: 1, caravel: 1, handCannoneers: 1, crossbowmen: 1 }, age: 'gold draw' },
});
