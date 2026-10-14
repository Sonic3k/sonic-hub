// Compiles the digitized rules (scripts/tuvi/rules/*.json, reviewed by hand) into the one file the web app loads:
// src/mystic/tuvi/kb/rules.json. Every rule keeps grandma's exact text and points back to its paragraph in book.json.
// Run after any edit of a rule file: node scripts/tuvi/build-kb.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(dir, '../..');
const book = JSON.parse(fs.readFileSync(path.join(web, 'src/mystic/tuvi/kb/book.json'), 'utf8'));
const lines = new Set(book.entries.map(e => e.line));

const rules = [];
for (const f of fs.readdirSync(path.join(dir, 'rules')).filter(f => f.endsWith('.json')).sort((a, b) => parseInt(a) - parseInt(b))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, 'rules', f), 'utf8'));
  if (!lines.has(d.entry)) throw new Error(`${f}: no entry ${d.entry}`);
  for (const r of d.rules) {
    const o = { i: r.id, e: d.entry, p: r.para, at: r.palaces, t: r.text, o: r.tone };
    if (r.ctx) o.c = r.ctx;
    if (r.when) o.w = r.when;
    if (r.review) o.r = r.review;
    rules.push(o);
  }
}
const ids = new Set();
for (const r of rules) { if (ids.has(r.i)) throw new Error(`duplicate rule id ${r.i}`); ids.add(r.i); }
fs.writeFileSync(path.join(web, 'src/mystic/tuvi/kb/rules.json'), JSON.stringify({ rules }));
console.log(`${rules.length} rules · ${rules.filter(r => !r.w).length} kept as text only · ${rules.filter(r => r.r).length} with a review note`);
