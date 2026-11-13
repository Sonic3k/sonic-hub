/* Games that are someone else's files are not in this repository. kept.json names each one: its place under
   public/kept/, where its bytes are stored, and their SHA-256. Before a build this brings them in (git ignores
   public/kept/) and checks them. A file already there with the right hash is left alone. A file that cannot be had,
   or is not byte for byte the one named, stops the build: going on would publish the shelf with a game that does
   not open.

     node scripts/fetch-kept.mjs      (npm run kept; `npm run build` runs it first) */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRIES = 4;
const sha = buf => createHash('sha256').update(buf).digest('hex');
const { files } = JSON.parse(await readFile(join(ROOT, 'kept.json'), 'utf8'));

for (const f of files) {
  const to = join(ROOT, 'public', 'kept', f.path);
  try {
    if (sha(await readFile(to)) === f.sha256) { console.log(`kept: ${f.path} is in place`); continue; }
  } catch { /* not there yet */ }
  let got = null, why = '';
  for (let attempt = 1; attempt <= TRIES && !got; attempt++) {
    try {
      const res = await fetch(f.from, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (sha(buf) !== f.sha256) throw new Error(`not the file named in kept.json (${buf.length} bytes, SHA-256 ${sha(buf)})`);
      got = buf;
    } catch (e) {
      why = String(e?.message ?? e);
      if (attempt < TRIES) await new Promise(r => setTimeout(r, attempt * 3000));
    }
  }
  if (!got) { console.error(`kept: ${f.path} could not be brought from ${f.from}: ${why}`); process.exit(1); }
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, got);
  console.log(`kept: ${f.path} brought in (${got.length} bytes)`);
}
