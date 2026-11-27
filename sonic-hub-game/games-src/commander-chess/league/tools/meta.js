// lists the players each file registers (id, name, author, levels, about)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CC = require(ROOT + '/kit/engine.js'), { makeTable } = require(ROOT + '/kit/table.js');
const T = makeTable(CC);
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  try { const t0 = Date.now(); const all = T.loadAIs(text, path.basename(f)); console.log('\n' + f + '  (' + (text.length / 1024).toFixed(1) + ' KB, loads in ' + (Date.now() - t0) + ' ms)'); for (const a of all.map(T.metaOf)) console.log('   ' + a.id.padEnd(22) + ' | ' + a.name.padEnd(16) + ' | ' + a.author.padEnd(26) + ' | levels ' + a.levels + '\n      ' + a.about.slice(0, 230)); }
  catch (e) { console.log('\n' + f + '\n   LOAD FAILED: ' + e.message); }
}
