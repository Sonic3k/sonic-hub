/* The campaign as the page has it, for the tools and tests that run in Node: the saves client and the campaign's own
   files (src/game/10-save.js, 12-cast.js, 60-campaign.js … 66-admiralty.js) in a world of their own, with a browser's storage
   stood in for and no saves service, so the players are kept in that storage only.
       const { PLACES, WOMEN } = loadCampaign('{ PLACES, WOMEN }');
   what: the names wanted, as the page's own script would write them. kept: what the browser holds already
   ({ key: text }); the object handed back has it as `store`, as it stands after whatever was done. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

function loadCampaign(what, kept = {}) {
  const store = Object.assign({}, kept);
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem(k, v) { store[k] = String(v); }, removeItem(k) { delete store[k]; } };
  const ctx = vm.createContext({ console, setTimeout, clearTimeout, localStorage, window: { localStorage, addEventListener() {} }, SAVES: { api: '', game: 'commander-chess' }, SFX: { on: true } });
  const files = ['10-save.js', '12-cast.js'].concat(fs.readdirSync(path.join(root, 'src/game')).filter(f => /^6\d-.*\.js$/.test(f)).sort());
  vm.runInContext(files.map(f => fs.readFileSync(path.join(root, 'src/game', f), 'utf8')).join('\n') + '\nthis.OUT = ' + what + ';', ctx);
  return Object.assign(ctx.OUT, { store });
}
module.exports = { loadCampaign, root };
