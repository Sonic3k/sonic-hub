/* ── South Asia: war elephants, temples and river fleets; chariots, slave guards and desert riders ── */
Object.assign(UNITS, {
  /* Bengalis */
  ratha:              { name: 'Ratha', sym: 'longranged longranged strike', lore: 'War chariots with an archer and a lancer aboard, as ready to shoot as to ride down.' },
  eliteRatha:         { name: 'Elite Ratha', sym: 'longranged longranged strike strike' },
  paiks:              { name: 'Paiks', sym: 'strike flank bodyguard', lore: 'Bengal\'s foot soldiers with sword and shield, raised from every village.' },
  riverFleet:         { name: 'River Fleet', sym: 'ship draw', lore: 'Bengal\'s war boats ruled the hundred rivers of the delta.' },
  nalanda:            { name: 'Nalanda Mahavihara', sym: 'heal heal draw draw', lore: 'The great monastic university, where scholars came from Tibet, China and Java to study.' },
  /* Hindustanis */
  ghulam:             { name: 'Ghulam', sym: 'snipe strike strike', lore: 'Slave soldiers trained from boyhood, the backbone of the Delhi sultans\' armies.' },
  eliteGhulam:        { name: 'Elite Ghulam', sym: 'snipe strike strike strike' },
  siriFort:           { name: 'Siri Fort', sym: 'wall wall bodyguard', lore: 'Alauddin Khalji\'s walled city, raised in the face of the Mongol raids.' },
  qutbMinar:          { name: 'Qutb Minar', sym: 'wall heal draw', lore: 'The victory tower of Delhi, begun by Qutb ud-Din Aibak in 1199.' },
  /* Chola */
  urumi:              { name: 'Urumi Swordsmen', sym: 'strike flank flank', lore: 'Swordsmen with the urumi, a flexible blade that lashed out like a whip.' },
  eliteUrumi:         { name: 'Elite Urumi Swordsmen', sym: 'strike strike flank flank' },
  cholaFleet:         { name: 'Chola Fleet', sym: 'ship raid draw', lore: 'Rajendra Chola\'s fleet crossed the Bay of Bengal and sacked the ports of Srivijaya in 1025.' },
  brihadeeswarar:     { name: 'Brihadeeswarar Temple', sym: 'gold wall wall wall countdown countdown countdown countdown', lore: 'Rajaraja\'s great temple at Thanjavur, crowned by a single block of granite.' },
  /* Gurjaras */
  shrivamsha:         { name: 'Shrivamsha Riders', sym: 'cavalry mantlet flank', lore: 'Riders trained to turn aside arrows, then fall on the exposed flank.' },
  eliteShrivamsha:    { name: 'Elite Shrivamsha Riders', sym: 'cavalry cavalry mantlet flank' },
  chakram:            { name: 'Chakram Throwers', sym: 'snipe ranged ranged', lore: 'Steel war-quoits flung spinning, cutting through shields and the men behind them.' },
  stepwell:           { name: 'Stepwell', sym: 'heal heal gold gold', lore: 'Stepwells cut deep into the dry land, like Rani ki Vav, where travellers found water and shade.' },
});
Object.assign(CIVS, {
  bengalis: { name: 'Bengalis', group: 'South Asia', color: '#0f7b5f', charge: 'lotus', hp2: 14, hp4: 15,
    style: 'Chariots, river fleets and the scholars of Nalanda',
    deck: { ratha: 3, paiks: 3, elephantArchers: 2, warElephant: 1, riverFleet: 2, archers: 2, militia: 2, spearmen: 1, palisade: 1, watchTower: 1, stoneWall: 1, stupa: 1, nalanda: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { eliteRatha: 1, warElephant: 1, elephantArchers: 1, handCannoneers: 1, riverFleet: 1 }, age: 'heal draw' },
  hindustanis: { name: 'Hindustanis', group: 'South Asia', color: '#a33b5c', charge: 'peacock', hp2: 16, hp4: 12,
    style: 'Ghulam guards, camels and elephants of the Delhi sultans',
    deck: { ghulam: 3, camelRiders: 2, warElephant: 2, horseArchers: 2, cavalry: 1, archers: 1, swordsmen: 1, spearmen: 2, militia: 2, siriFort: 1, watchTower: 1, stoneWall: 1, qutbMinar: 1, madrasa: 1, healer: 1, messenger: 1, caravanserai: 1 },
    imperial: { eliteGhulam: 1, handCannoneers: 1, warElephant: 1, camelRiders: 1, castle: 1 }, age: 'gold draw' },
  chola: { name: 'Chola', group: 'South Asia', color: '#7a2e1d', charge: 'tiger', hp2: 12, hp4: 15,
    style: 'Urumi swordsmen, an overseas fleet and the great temple of Thanjavur',
    deck: { urumi: 3, cholaFleet: 2, warship: 1, elephantArchers: 2, warElephant: 1, archers: 2, spearmen: 2, swordsmen: 1, militia: 2, palisade: 1, watchTower: 1, stoneWall: 1, temple: 1, healer: 1, merchant: 2, messenger: 1 },
    imperial: { brihadeeswarar: 1, eliteUrumi: 1, cholaFleet: 1, warElephant: 1, elephantArchers: 1 }, age: 'gold draw' },
  gurjaras: { name: 'Gurjaras', group: 'South Asia', color: '#d97706', charge: 'boar', hp2: 12, hp4: 14,
    style: 'Rajput riders, chakram throwers and desert forts',
    deck: { shrivamsha: 3, chakram: 2, camelRiders: 2, cavalry: 2, archers: 2, spearmen: 2, militia: 2, swordsmen: 1, stoneWall: 1, watchTower: 1, castle: 1, stepwell: 1, temple: 1, healer: 1, merchant: 1, messenger: 1 },
    imperial: { eliteShrivamsha: 1, chakram: 1, knights: 1, camelRiders: 1, warElephant: 1 }, age: 'heal gold' },
});
