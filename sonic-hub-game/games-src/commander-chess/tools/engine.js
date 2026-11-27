/* The rules and the computer player as one module for node (in the page the files simply follow one another). */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'src', 'engine');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort().map(f => fs.readFileSync(path.join(dir, f), 'utf8'));
const names = /module\.exports = \{([^}]+)\}/.exec(files[0])[1].split(',').map(s => s.trim()).filter(Boolean).concat(['AI', 'VALUE', 'STYLE0', 'WIN', 'PLAYERS']);
module.exports = new Function(files.join('\n') + '\nreturn { ' + names.filter(n => n !== 'PLAYERS').join(', ') + ", PLAYERS: typeof PLAYERS === 'undefined' ? null : PLAYERS };")();
