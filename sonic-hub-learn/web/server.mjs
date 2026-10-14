// Serves the built app (dist/) on Railway: hashed assets cached for a year, every other path
// falls back to index.html so the app's own routes work on reload.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const port = Number(process.env.PORT ?? 3000);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.map', '.webmanifest', '.svg', '.txt']);

function fileFor(pathname) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '');
  const file = join(root, rel);
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const st = statSync(file);
    if (st.isFile()) return file;
    if (st.isDirectory()) {
      const index = join(file, 'index.html');
      if (statSync(index).isFile()) return index;
    }
  } catch {}
  return extname(rel) ? null : join(root, 'index.html');
}

createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = new URL(req.url ?? '/', 'http://local').pathname;
  } catch {}
  if (pathname.startsWith('/api/')) {
    // the API is its own service: the web must be built with VITE_API_URL pointing at it
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify({ message: 'API không chạy ở địa chỉ này — build web với VITE_API_URL trỏ tới learn API.' }));
    return;
  }
  const file = req.method === 'GET' || req.method === 'HEAD' ? fileFor(pathname) : null;
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  const ext = extname(file);
  const headers = {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
    'cache-control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : ext === '.html' || pathname === '/sw.js' || ext === '.webmanifest' ? 'no-cache' : 'public, max-age=3600',
  };
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  if (gzip) {
    headers['content-encoding'] = 'gzip';
    headers.vary = 'accept-encoding';
  }
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return void res.end();
  const stream = createReadStream(file);
  stream.on('error', () => res.destroy());
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`learn-web on :${port}`));
