import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { MediaConfig } from '../src/config.js';

/*
 * A stand-in, on this machine, for the hub's bucket and the CDN in front of it: it takes and removes files the way
 * the bucket does when it is spoken to as S3 (PUT and DELETE /<bucket>/<key>), and hands them out at the same
 * addresses the way the CDN does (GET), noting what was asked. It keeps no widths: asked for one, it gives the file.
 */
export interface FakeStorage {
  /** What a service is given to keep its pictures here. */
  media: MediaConfig;
  /** The address the files are read at: what a key is appended to. */
  cdn: string;
  objects: Map<string, { bytes: Buffer; type: string; cache: string }>;
  /** The keys put and removed, in order. */
  puts: string[];
  removed: string[];
  /** What was read: key?query. */
  read: string[];
  /** While true, it takes nothing and lets nothing go, as a bucket that is having trouble. */
  failing: boolean;
  stop(): Promise<void>;
}

/** The body of an upload as it was sent, without the wrapping an S3 client may put around it (aws-chunked). */
function unwrapped(body: Buffer, encoding: string): Buffer {
  if (!/aws-chunked/i.test(encoding)) return body;
  const parts: Buffer[] = [];
  for (let at = 0; at < body.length; ) {
    const end = body.indexOf('\r\n', at);
    if (end < 0) break;
    const size = parseInt(body.toString('latin1', at, end).split(';')[0]!, 16);
    if (!size) break;
    parts.push(body.subarray(end + 2, end + 2 + size));
    at = end + 2 + size + 2;
  }
  return Buffer.concat(parts);
}

export async function startFakeStorage(bucket = 'hub-test', prefix = 'games'): Promise<FakeStorage> {
  const store: FakeStorage = { media: null as unknown as MediaConfig, cdn: '', objects: new Map(), puts: [], removed: [], read: [], failing: false, stop: async () => {} };
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://storage');
    const path = decodeURIComponent(url.pathname);
    if (!path.startsWith(`/${bucket}/`)) return void res.writeHead(404).end();
    const key = path.slice(bucket.length + 2);
    const trouble = () => res.writeHead(500, { 'content-type': 'application/xml' }).end('<?xml version="1.0"?><Error><Code>InternalError</Code><Message>Having trouble.</Message></Error>');
    if (req.method === 'PUT') {
      const parts: Buffer[] = [];
      req.on('data', (part: Buffer) => parts.push(part));
      req.on('end', () => {
        if (store.failing) return trouble();
        store.objects.set(key, { bytes: unwrapped(Buffer.concat(parts), String(req.headers['content-encoding'] ?? '')), type: String(req.headers['content-type'] ?? ''), cache: String(req.headers['cache-control'] ?? '') });
        store.puts.push(key);
        res.writeHead(200, { etag: '"kept"' }).end();
      });
    } else if (req.method === 'DELETE') {
      req.resume();
      if (store.failing) return trouble();
      store.objects.delete(key);
      store.removed.push(key);
      res.writeHead(204).end();
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      const kept = store.objects.get(key);
      store.read.push(key + url.search);
      if (!kept) return void res.writeHead(404).end();
      res.writeHead(200, { 'content-type': kept.type, 'content-length': kept.bytes.length, 'cache-control': kept.cache, 'access-control-allow-origin': '*' }).end(req.method === 'HEAD' ? undefined : kept.bytes);
    } else res.writeHead(405).end();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  store.cdn = `${at}/${bucket}`;
  store.media = { b2: { endpoint: at, region: 'us-east-005', keyId: 'a-key-id-for-the-tests', appKey: 'an-app-key-for-the-tests', bucket, pathStyle: true }, prefix, publicBaseUrl: store.cdn };
  store.stop = () => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); });
  return store;
}

/** How a file of each kind begins. The service tells a picture's kind by this, and looks no further into it. */
const BEGINS = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: Buffer.from('RIFF\x24\x0b\x00\x00WEBPVP8 ', 'latin1'),
};
/** A file that begins as a picture of that kind does; `what` makes it its own picture, different from every other. */
export function picture(what: string, kind: keyof typeof BEGINS = 'jpeg', bytes = 3000): Buffer {
  const seed = createHash('sha256').update(what).digest(), rest = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) rest[i] = seed[i % 32]! ^ (i & 255);
  return Buffer.concat([BEGINS[kind], rest]);
}
