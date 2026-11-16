// Every check there is, for every place: the tour's path, and the place's own checks (places/<id>/checks.mjs) if it has any.
import { spawnSync } from 'child_process';
import fs from 'fs';

const places = fs.readdirSync('places').filter(d => fs.existsSync(`places/${d}/place.js`)).sort();
let bad = 0;
for (const id of places) {
  for (const script of ['tools/tourcheck.mjs', `places/${id}/checks.mjs`]) {
    if (!fs.existsSync(script)) continue;
    const r = spawnSync(process.execPath, [script], { stdio: 'inherit', env: { ...process.env, PLACE: id } });
    if (r.status !== 0) { bad++; console.log(`FAILED: ${script} (${id})`); }
  }
}
console.log(bad ? `${bad} check(s) failed` : `all checks passed for ${places.length} place(s)`);
process.exit(bad ? 1 : 0);
