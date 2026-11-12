/* ── Caucasus: mountain kingdoms of churches and fortresses, between the empires ── */
Object.assign(UNITS, {
  /* Armenians */
  compositeBowmen:    { name: 'Composite Bowmen', sym: 'longranged longranged ranged', lore: 'Archers with layered bows of horn and sinew that outranged and outshot their foes.' },
  eliteCompositeBowmen: { name: 'Elite Composite Bowmen', sym: 'longranged longranged ranged ranged' },
  warriorPriests:     { name: 'Warrior Priests', sym: 'monk heal', lore: 'Priests who marched with Vartan at Avarayr, tending the wounded and turning the wavering.' },
  cilicianFleet:      { name: 'Cilician Fleet', sym: 'ship gold', lore: 'The Armenian kingdom on the sea, trading through the port of Ayas with Genoa and Venice.' },
  ani:                { name: 'Ani', sym: 'wall heal heal draw', lore: 'The city of a thousand and one churches, behind its double walls.' },
  /* Georgians */
  monaspa:            { name: 'Monaspa', sym: 'cavalry heal', lore: 'David the Builder\'s royal guard, riders who fought as one and closed up as one.' },
  eliteMonaspa:       { name: 'Elite Monaspa', sym: 'cavalry cavalry heal heal' },
  svanTowers:         { name: 'Svan Towers', sym: 'wall wall ranged', lore: 'Stone tower-houses of Svaneti: every family its own fortress.' },
  fortifiedChurch:    { name: 'Fortified Church', sym: 'wall heal heal', lore: 'Churches within walls, where the villages sheltered from raiders.' },
});
Object.assign(CIVS, {
  armenians: { name: 'Armenians', group: 'Caucasus', color: '#cf5a1e', charge: 'lion', hp2: 11, hp4: 15,
    style: 'Composite bowmen, warrior priests and the city of a thousand churches',
    deck: { compositeBowmen: 3, warriorPriests: 1, cilicianFleet: 1, archers: 2, spearmen: 2, swordsmen: 2, menAtArms: 1, militia: 2, cavalry: 1, knights: 1, ani: 1, stoneWall: 1, castle: 1, watchTower: 1, monastery: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { eliteCompositeBowmen: 1, warriorPriests: 1, crossbowmen: 1, knights: 1, castle: 1 }, age: 'heal draw' },
  georgians: { name: 'Georgians', group: 'Caucasus', color: '#a8243a', charge: 'borjgali', hp2: 14, hp4: 15,
    style: 'Monaspa guards, Svan towers and fortified churches',
    deck: { monaspa: 3, svanTowers: 1, fortifiedChurch: 1, knights: 1, cavalry: 2, spearmen: 2, swordsmen: 2, militia: 3, archers: 2, skirmishers: 1, stoneWall: 1, monastery: 1, healer: 1, merchant: 1, messenger: 1, scholars: 1 },
    imperial: { eliteMonaspa: 1, svanTowers: 1, knights: 1, crossbowmen: 1, castle: 1 }, age: 'heal gold' },
});
