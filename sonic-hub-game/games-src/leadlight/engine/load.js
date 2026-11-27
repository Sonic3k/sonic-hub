/* For Node (tests, simulations): the engine's three files run as one script, the way the page runs them, and what
   they define is handed back. The page carries the same three files in one <script>. */
const fs = require('fs'), path = require('path');
const FILES = ['core.js', 'scripts.js', 'match.js', 'catalog.js'];
const EXPORTS = ['GameState', 'Match', 'Deck', 'CardItem', 'CardForm', 'LeaderForm', 'LeaderItem', 'PlayerType', 'CardType', 'Faction',
  'LandscapeType', 'Quality', 'SCRIPTS', 'Random', 'AIManager', 'wheelZones', 'wheelResult', 'Catalog', 'CardScript', 'CreatureScript', 'BuildingScript', 'SpellScript', 'LeaderScript'];
function load() {
  const src = FILES.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n;\n');
  return new Function(src + '\nreturn {' + EXPORTS.join(',') + '};')();
}
module.exports = load;
