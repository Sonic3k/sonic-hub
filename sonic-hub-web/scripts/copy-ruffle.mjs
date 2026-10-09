/* Copies Ruffle (the Flash Player emulator that plays the Flash cards) from node_modules into public/ruffle/, so the
   site serves it itself. Runs before dev and build; the copy is not committed. Source maps are left out. */
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = dirname(createRequire(import.meta.url).resolve('@ruffle-rs/ruffle/package.json'));
const out = join(root, 'public', 'ruffle');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = readdirSync(src).filter(f => /\.(js|wasm)$/.test(f));
for (const f of files) cpSync(join(src, f), join(out, f));
console.log(`ruffle: ${files.length} files -> public/ruffle/`);
