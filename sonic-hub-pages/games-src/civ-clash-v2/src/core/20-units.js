/* ── Units: one shared list. A unit is a name and its symbols, nothing else.
   Any civilization can put any unit in its deck; a unit that only one civilization uses carries that civilization's crest.
   This file holds the units everyone can field, the ones shared by a region, and the mercenaries; each region file adds its own.
   Some regional units do exactly what a common one does under the name that region used (a Pagoda is a Monastery). ── */
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
  cavalry:            { name: 'Cavalry', sym: 'cavalry' },
  lightCavalry:       { name: 'Light Cavalry', sym: 'cavalry play' },
  knights:            { name: 'Knights', sym: 'cavalry cavalry' },
  horseArchers:       { name: 'Horse Archers', sym: 'ranged play' },
  camelRiders:        { name: 'Camel Riders', sym: 'camel flank' },
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
  scholars:           { name: 'Scholars', sym: 'draw draw' },
  messenger:          { name: 'Messenger', sym: 'play draw' },
  merchant:           { name: 'Merchant', sym: 'gold draw' },
  monk:               { name: 'Monk', sym: 'monk play' },
  spy:                { name: 'Spy', sym: 'spy play' },
  /* the house of prayer and learning, under the name each region gave it */
  monastery:          { name: 'Monastery', sym: 'heal draw' },
  pagoda:             { name: 'Pagoda', sym: 'heal draw' },
  stupa:              { name: 'Stupa', sym: 'heal draw' },
  temple:             { name: 'Temple', sym: 'heal draw' },
  madrasa:            { name: 'Madrasa', sym: 'heal draw' },
  shrine:             { name: 'Shrine', sym: 'heal draw' },

  /* regional: shared by the civilizations of one part of the world */
  steppeLancer:       { name: 'Steppe Lancer', sym: 'cavalry raid', lore: 'Lance-armed riders of the steppe, as quick to strike a camp as to strip it.' },
  fireLancers:        { name: 'Fire Lancers', sym: 'gunpowder strike', lore: 'A bamboo tube of gunpowder on a spear: one burst of flame, then the point.' },
  elephantArchers:    { name: 'Elephant Archers', sym: 'elephant ranged', lore: 'Archers shooting from a howdah high on an elephant\'s back.' },
  camelArcher:        { name: 'Camel Archers', sym: 'camel ranged', lore: 'Archers mounted on camels, whose smell alone threw horses into panic.' },
  caravanserai:       { name: 'Caravanserai', sym: 'wall gold draw', lore: 'Fortified inns a day apart along the caravan roads.' },
  ricePaddies:        { name: 'Rice Paddies', sym: 'gold gold heal', lore: 'Flooded rice fields that fed the army and the treasury alike.' },
  eagleWarriors:      { name: 'Eagle Warriors', sym: 'eagle', lore: 'Warriors of the eagle societies, swift runners who struck the unprotected first.' },
  eliteEagles:        { name: 'Elite Eagle Warriors', sym: 'eagle eagle', lore: 'Veterans who had taken many captives and earned the eagle helmet.' },
  atlatl:             { name: 'Atlatl Throwers', sym: 'ranged flank', lore: 'Darts flung with a spear-thrower, far and hard enough to pierce cotton armour.' },
  clubWarriors:       { name: 'Club Warriors', sym: 'strike strike', lore: 'Warriors with heavy war clubs, some edged with obsidian.' },

  /* mercenaries */
  genoese:            { name: 'Genoese Crossbowmen', sym: 'longranged longranged play', lore: 'Professional crossbowmen hired by every power around the Mediterranean.' },
  cuman:              { name: 'Cuman Horse Archers', sym: 'ranged ranged play', lore: 'Steppe riders who sold their bows to Hungary, Byzantium and the Rus.' },
  varangian:          { name: 'Varangian Guard', sym: 'strike strike bodyguard bodyguard', lore: 'Norse and English axemen sworn to the emperor in Constantinople.' },
  hashashin:          { name: 'Hashashin', sym: 'snipe snipe longranged', lore: 'The order of Alamut, feared for killing guarded men in their own halls.' },
  trebuchet:          { name: 'Trebuchet', sym: 'catapult catapult', lore: 'A counterweight siege engine that could hurl stones over the highest wall.' },
  siegeEngineers:     { name: 'Siege Engineers', sym: 'ram ram draw', lore: 'Sappers and engineers who sold their craft to any besieger.' },
  physician:          { name: 'Physician', sym: 'heal heal heal play', lore: 'A learned doctor from Salerno or Córdoba.' },
  venetian:           { name: 'Venetian Merchants', sym: 'gold gold draw play', lore: 'Merchants of the Serenissima, who lent to kings and sold to everyone.' },
  envoy:              { name: 'Envoy', sym: 'spy spy play', lore: 'An ambassador with open ears and an open purse.' },
  templars:           { name: 'Knights Templar', sym: 'cavalry cavalry bodyguard', lore: 'Warrior monks of the Temple, bankers and shock cavalry.' },
  gunners:            { name: 'Hungarian Gunners', sym: 'gunpowder gunpowder gunpowder', lore: 'Handgunners of the Black Army of Matthias Corvinus.' },
  hiredElephants:     { name: 'Hired Elephants', sym: 'elephant strike', lore: 'War elephants with their mahouts, for hire to any prince.' },
  bedouin:            { name: 'Bedouin Camels', sym: 'camel camel play', lore: 'Desert riders who knew every well between two cities.' },
  condottieri:        { name: 'Condottieri', sym: 'strike strike bodyguard play', lore: 'Italian captains who brought their own company and fought for whoever paid on time.' },
};
/* the market: cost in gold and how many copies are in its pile */
const MERCS = [
  { unit: 'genoese', cost: 3, n: 2 }, { unit: 'cuman', cost: 3, n: 2 }, { unit: 'varangian', cost: 4, n: 1 }, { unit: 'hashashin', cost: 4, n: 1 },
  { unit: 'trebuchet', cost: 3, n: 1 }, { unit: 'siegeEngineers', cost: 3, n: 2 }, { unit: 'physician', cost: 3, n: 1 }, { unit: 'venetian', cost: 2, n: 2 },
  { unit: 'envoy', cost: 3, n: 1 }, { unit: 'templars', cost: 4, n: 1 }, { unit: 'gunners', cost: 4, n: 1 }, { unit: 'hiredElephants', cost: 3, n: 1 },
  { unit: 'bedouin', cost: 3, n: 1 }, { unit: 'condottieri', cost: 3, n: 1 },
];
const MERC_UNITS = new Set(MERCS.map(m => m.unit));
