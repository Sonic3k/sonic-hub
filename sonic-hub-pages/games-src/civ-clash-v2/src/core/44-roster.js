/* ── The roster: every unit gets its symbol letters, every civilization its place in the region list ── */
for (const [id, U] of Object.entries(UNITS)) { U.id = id; U.icons = symCodes(U.sym); }
const CIV_ORDER = REGIONS.flatMap(g => Object.keys(CIVS).filter(c => CIVS[c].group === g));
for (const c of Object.keys(CIVS)) if (!REGIONS.includes(CIVS[c].group)) throw new Error(`${c}: unknown region ${CIVS[c].group}`);
const GROUPS = REGIONS.filter(g => CIV_ORDER.some(c => CIVS[c].group === g));
for (const C of Object.values(CIVS)) C.ageIcons = symCodes(C.age);
/* who fields each unit: a unit used by a single civilization wears its crest */
const UNIT_CIVS = {};
for (const civ of CIV_ORDER) for (const list of [CIVS[civ].deck, CIVS[civ].imperial]) for (const id of Object.keys(list)) {
  if (!UNITS[id]) throw new Error(`${civ}: unknown unit ${id}`);
  (UNIT_CIVS[id] || (UNIT_CIVS[id] = new Set())).add(civ);
}
const crestOf = id => (UNIT_CIVS[id] && UNIT_CIVS[id].size === 1 && !MERC_UNITS.has(id) ? [...UNIT_CIVS[id]][0] : null);
const deckSize = civ => Object.values(CIVS[civ].deck).reduce((a, n) => a + n, 0);
const imperialSize = civ => Object.values(CIVS[civ].imperial).reduce((a, n) => a + n, 0);
