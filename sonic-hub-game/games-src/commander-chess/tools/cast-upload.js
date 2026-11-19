/* Gives the officers their portraits at the saves service: art/portraits/<id>.jpg goes up as the picture of the
   member <id> of this game's cast, which is where the game reads its pictures from (src/game/12-cast.js).
       node tools/cast-upload.js                 says what it would send, and sends nothing
       node tools/cast-upload.js --send          sends them to the service src/saves.json names
       node tools/cast-upload.js --send --api http://127.0.0.1:3200     to a service run on this machine
   A picture the service already has for her (the very same file) is left alone, so it can be run again at any time:
   after a new portrait was put into the folder, or after the service's database was set up anew. A file is sent as it
   is; the service keeps it in the hub's bucket and the CDN hands it out at the width a place asks for. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { loadCampaign, root } = require('./campaign.js');

const flag = name => { const i = process.argv.indexOf('--' + name); return i < 0 ? undefined : process.argv[i + 1]; };
const SEND = process.argv.includes('--send'), saves = JSON.parse(fs.readFileSync(path.join(root, 'src/saves.json'), 'utf8'));
const API = String(flag('api') || saves.api).replace(/\/+$/, ''), GAME = saves.game, DIR = path.join(root, 'art/portraits');
const KINDS = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

(async () => {
  const { WOMEN } = loadCampaign('{ WOMEN }');
  const files = fs.readdirSync(DIR).filter(f => KINDS[path.extname(f)]);
  const strangers = files.filter(f => !WOMEN.some(w => w.id === path.basename(f, path.extname(f))));
  if (strangers.length) throw new Error('art/portraits has a picture of nobody in the campaign: ' + strangers.join(', '));
  const res = await fetch(`${API}/api/games/${GAME}/cast`);
  if (!res.ok) throw new Error(`the service at ${API} would not say who is in the cast: ${res.status}`);
  const there = await res.json(), has = Object.fromEntries((there.cast || []).map(m => [m.id, m.photo || '']));
  if (there.photoBytes === null) throw new Error(`the service at ${API} has nowhere to keep a picture (no bucket)`);
  console.log(`${API}, game ${GAME}: ${Object.values(has).filter(Boolean).length} of the cast have a picture there now`);
  let sent = 0, same = 0, none = 0;
  for (const w of WOMEN) {
    const f = files.find(x => path.basename(x, path.extname(x)) === w.id), who = (w.rank + ' ' + w.name).padEnd(36);
    if (!f) { none++; console.log(`  ${who} no picture in art/portraits`); continue; }
    const bytes = fs.readFileSync(path.join(DIR, f)), mark = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    if (bytes.length > there.photoBytes) throw new Error(`${f} is ${bytes.length} bytes, more than the service takes (${there.photoBytes})`);
    if ((has[w.id] || '').includes(`/${w.id}-${mark}.`)) { same++; console.log(`  ${who} has this picture already`); continue; }   // the service names a file after what is in it
    if (!SEND) { console.log(`  ${who} ${f} (${Math.round(bytes.length / 1024)} KB) would be sent${has[w.id] ? ', in place of the one she has' : ''}`); continue; }
    const put = await fetch(`${API}/api/games/${GAME}/cast/${w.id}/photo`, { method: 'PUT', headers: { 'Content-Type': KINDS[path.extname(f)] }, body: bytes });
    if (!put.ok) throw new Error(`${f} was not taken: ${put.status} ${(await put.text()).slice(0, 200)}`);
    const now = await put.json();
    sent++; console.log(`  ${who} ${f} → ${now.photo}`);
  }
  console.log(SEND ? `${sent} sent, ${same} there already${none ? `, ${none} without a picture` : ''}` : `nothing was sent (${same} there already): run it again with --send`);
})().catch(e => { console.error(String(e.message || e)); process.exit(1); });
