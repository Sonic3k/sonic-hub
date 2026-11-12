/* ── Eastern Europe: heavy horse and hill forts, war wagons and early guns, the thaw and the steppe frontier ── */
Object.assign(UNITS, {
  /* Bohemians */
  hussiteWagons:      { name: 'Hussite Wagons', sym: 'gunpowder gunpowder mantlet', lore: 'Armoured war wagons, handgunners firing through slits in their boards.' },
  wagenburg:          { name: 'Wagenburg', sym: 'wall wall gunpowder', lore: 'Jan Žižka\'s wagon fortress: the knights charged it and never came back.' },
  houfnice:           { name: 'Houfnice', sym: 'catapult gunpowder gunpowder', lore: 'The Hussite howitzer, a short gun that lobbed stone over walls and wagons.' },
  kutnaHora:          { name: 'Kutná Hora Silver', sym: 'gold gold draw draw', lore: 'The silver mines that made Bohemia the richest crown of the empire.' },
  /* Poles */
  szlachta:           { name: 'Szlachta', sym: 'cavalry draw gold', lore: 'The nobility of the Crown, who rode to war at their own cost with their own retainers.' },
  wingedHussars:      { name: 'Winged Hussars', sym: 'cavalry cavalry flank', lore: 'Lancers with feathered wings on their backs, the hammer of the Polish charge.' },
  grunwald:           { name: 'Charge at Grunwald', sym: 'cavalry strike heal', lore: 'The great battle of 1410, where Poland and Lithuania broke the Teutonic Order.' },
  wieliczka:          { name: 'Wieliczka Salt', sym: 'gold gold heal draw', lore: 'Salt from the mines of Wieliczka paid for a third of the royal treasury.' },
  /* Lithuanians */
  leitis:             { name: 'Leitis', sym: 'snipe cavalry', lore: 'Lithuanian lancers whose blows went straight through armour.' },
  eliteLeitis:        { name: 'Elite Leitis', sym: 'snipe cavalry cavalry' },
  hillFort:           { name: 'Hill Fort', sym: 'wall wall wall draw', lore: 'Earth-and-timber forts on the hilltops of the last pagan realm in Europe.' },
  trakai:             { name: 'Trakai Island Castle', sym: 'wall wall wall heal draw', lore: 'The red-brick castle of Vytautas on its island in Lake Galvė.' },
  /* Bulgarians */
  konnik:             { name: 'Konnik', sym: 'cavalry strike', lore: 'Riders who fought on foot when their horse fell, and kept fighting.' },
  eliteKonnik:        { name: 'Elite Konnik', sym: 'cavalry strike strike' },
  krepost:            { name: 'Krepost', sym: 'wall wall strike', lore: 'Small stone fortresses on the passes, with a garrison ready to sally out.' },
  preslav:            { name: 'Preslav Literary School', sym: 'draw draw heal', lore: 'The school of Preslav, where the Cyrillic script took shape.' },
  /* Slavs */
  boyars:             { name: 'Boyars', sym: 'cavalry cavalry strike', lore: 'Great nobles of the Rus, heavily armoured, each leading his own retinue.' },
  druzhina:           { name: 'Druzhina', sym: 'strike bodyguard play', lore: 'The prince\'s sworn retinue, who ate at his table and rode at his side.' },
  rasputitsa:         { name: 'Rasputitsa', sym: 'storm heal', lore: 'The spring thaw turned the roads to mud and turned Batu\'s horsemen back from Novgorod in 1238.' },
  kremlin:            { name: 'Kremlin', sym: 'wall wall wall heal heal', lore: 'The walled heart of a Rus city, its cathedrals inside the walls.' },
  /* Magyars */
  huszars:            { name: 'Huszars', sym: 'cavalry flank raid', lore: 'Light horsemen who scouted, raided and harried far ahead of the army.' },
  recurveArchers:     { name: 'Recurve Horse Archers', sym: 'ranged longranged play', lore: '"From the arrows of the Hungarians, deliver us, O Lord."' },
  blackArmy:          { name: 'Black Army', sym: 'strike strike strike gold', lore: 'Matthias Corvinus\'s standing army of mercenaries, paid on time and feared from Vienna to Silesia.' },
});
Object.assign(CIVS, {
  bohemians: { name: 'Bohemians', group: 'Eastern Europe', color: '#5a6e8c', charge: 'chalice', hp2: 16, hp4: 13,
    style: 'Hussite war wagons, early guns and the silver of Kutná Hora',
    deck: { hussiteWagons: 2, wagenburg: 1, paviseCrossbowmen: 1, crossbowmen: 1, handCannoneers: 3, spearmen: 2, swordsmen: 2, militia: 3, knights: 2, stoneWall: 1, watchTower: 1, kutnaHora: 1, monastery: 1, healer: 1, messenger: 1, batteringRam: 1 },
    imperial: { houfnice: 1, hussiteWagons: 1, handCannoneers: 1, wagenburg: 1, crossbowmen: 1 }, age: 'gold draw' },
  poles: { name: 'Poles', group: 'Eastern Europe', color: '#d22f45', charge: 'eagle', hp2: 10, hp4: 13,
    style: 'Noble cavalry, winged hussars and the salt of Wieliczka',
    deck: { szlachta: 1, knights: 1, lightCavalry: 1, grunwald: 1, spearmen: 2, swordsmen: 2, militia: 5, crossbowmen: 2, archers: 1, castle: 1, stoneWall: 1, watchTower: 1, wieliczka: 1, monastery: 1, healer: 1, messenger: 1, merchant: 1 },
    imperial: { wingedHussars: 1, szlachta: 1, knights: 1, menAtArms: 1, castle: 1 }, age: 'gold heal' },
  lithuanians: { name: 'Lithuanians', group: 'Eastern Europe', color: '#5b8c1a', charge: 'columns', hp2: 13, hp4: 13,
    style: 'Leitis lancers, hill forts and the sacred groves of the last pagans',
    deck: { leitis: 3, cavalry: 2, lightCavalry: 2, horseArchers: 1, militia: 3, spearmen: 2, swordsmen: 2, archers: 2, skirmishers: 1, hillFort: 1, palisade: 1, watchTower: 1, shrine: 1, healer: 1, merchant: 1 },
    imperial: { eliteLeitis: 1, trakai: 1, knights: 1, crossbowmen: 1, hillFort: 1 }, age: 'heal draw' },
  bulgarians: { name: 'Bulgarians', group: 'Eastern Europe', color: '#3c7a64', charge: 'crown', hp2: 14, hp4: 14,
    style: 'Konnik riders, mountain kreposts and the school of Preslav',
    deck: { konnik: 3, krepost: 1, cavalry: 2, lightCavalry: 1, swordsmen: 2, menAtArms: 1, spearmen: 2, militia: 3, archers: 2, skirmishers: 1, stoneWall: 1, watchTower: 1, monastery: 1, healer: 1, preslav: 1, merchant: 1 },
    imperial: { eliteKonnik: 1, krepost: 1, knights: 1, menAtArms: 1, crossbowmen: 1 }, age: 'bodyguard draw' },
  slavs: { name: 'Slavs', group: 'Eastern Europe', color: '#8b2a1a', charge: 'trident', hp2: 9, hp4: 11,
    style: 'Boyars, the prince\'s druzhina and the mud of the spring thaw',
    deck: { boyars: 1, druzhina: 2, cavalry: 2, lightCavalry: 1, swordsmen: 2, spearmen: 2, militia: 3, archers: 2, crossbowmen: 1, mangonel: 1, rasputitsa: 1, stoneWall: 1, watchTower: 1, monastery: 1, monk: 1, healer: 1, merchant: 1 },
    imperial: { kremlin: 1, boyars: 1, knights: 1, menAtArms: 1, mangonel: 1 }, age: 'heal draw' },
  magyars: { name: 'Magyars', group: 'Eastern Europe', color: '#b5452c', charge: 'doublecross', hp2: 11, hp4: 13,
    style: 'Huszars, recurve bows and the Black Army',
    deck: { huszars: 2, recurveArchers: 2, horseArchers: 1, cavalry: 1, swordsmen: 2, spearmen: 3, militia: 5, archers: 1, skirmishers: 1, stoneWall: 1, watchTower: 1, castle: 1, monastery: 1, healer: 1, merchant: 1 },
    imperial: { blackArmy: 1, huszars: 1, recurveArchers: 1, knights: 1, handCannoneers: 1 }, age: 'gold gold' },
});
