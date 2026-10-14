// Lets the build scripts use the same TypeScript engine as the web app: bundles a module with esbuild and imports it.
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function importTs(entry) {
  const out = await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'silent' });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuvi-')), file = path.join(dir, 'mod.mjs');
  fs.writeFileSync(file, out.outputFiles[0].text);
  try { return await import(pathToFileURL(file).href); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
