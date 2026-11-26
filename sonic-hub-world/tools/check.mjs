// Every check there is, for every place: the tour's path, the looks (engine/look.js), and the place's own checks
// (places/<id>/checks.mjs) if it has any. A world is checked by its own checks alone.
import { spawnSync } from 'child_process';
import fs from 'fs';

const places = fs.readdirSync('places').filter(d => fs.existsSync(`places/${d}/place.js`)).sort();
let bad = 0;
for (const id of places) {
  // a world (engine/world: its data lies in places/<id>/world) has no tour on foot and one way of being drawn: its own checks are all it has
  const world = fs.existsSync(`places/${id}/world`);
  for (const script of world ? [`places/${id}/checks.mjs`] : ['tools/tourcheck.mjs', 'tools/lookcheck.mjs', `places/${id}/checks.mjs`]) {
    if (!fs.existsSync(script)) continue;
    const r = spawnSync(process.execPath, [script], { stdio: 'inherit', env: { ...process.env, PLACE: id } });
    if (r.status !== 0) { bad++; console.log(`FAILED: ${script} (${id})`); }
  }
}
console.log(bad ? `${bad} check(s) failed` : `all checks passed for ${places.length} place(s)`);
process.exit(bad ? 1 : 0);
