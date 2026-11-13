#!/usr/bin/env python3
"""How many SQL statements does each read endpoint send?

    python3 sql-sweep.py https://angels-islands-api-production.up.railway.app
    python3 sql-sweep.py http://localhost:8080 --max 50 --paths sql-sweep.paths

Calls every path of the paths file (GET) and prints the X-Sql-Count header the API puts on each answer, with the
time and the size. Exits 1 when a read sent more statements than --max (50): a list costs a handful of statements
whatever its length, so a higher count means something is fetched row by row.

Placeholders in a path are filled from the API itself: {self} {person} {album} {forum} {game} {memory} {note} {event}
{media} {fb}.
A path whose placeholder cannot be filled (nothing of that kind yet) is skipped. Python 3, no packages needed.
"""
import argparse, json, os, sys, time, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument('base'); ap.add_argument('--max', type=int, default=50)
ap.add_argument('--paths', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sql-sweep.paths'))
ap.add_argument('--token', default=os.environ.get('ADMIN_TOKEN', ''), help='X-Admin-Token, when the API asks for one')
args = ap.parse_args()
base = args.base.rstrip('/')


def call(path):
    req = urllib.request.Request(base + path, headers={'Accept': 'application/json', **({'X-Admin-Token': args.token} if args.token else {})})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            body = r.read(); return r.status, r.headers.get('X-Sql-Count'), round((time.time() - t0) * 1000), body
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get('X-Sql-Count'), round((time.time() - t0) * 1000), b''


def first(path, pick):
    """one value out of a list answer, or None"""
    try:
        data = json.loads(call(path)[3] or b'null')
        rows = data.get('content', data) if isinstance(data, dict) else data
        return next((v for v in (pick(x) for x in rows or []) if v), None)
    except Exception:
        return None


ids = {}
ids['self'] = first('/api/persons', lambda p: p['id'] if p.get('isSelf') else None)
ids['person'] = first('/api/persons', lambda p: None if p.get('isSelf') else p['id'])
ids['album'] = first('/api/collections', lambda c: c['id'])
ids['forum'] = first('/api/forums', lambda f: f.get('key'))
ids['game'] = first('/api/games', lambda g: g.get('key'))
ids['note'] = first('/api/journal/notes?size=1', lambda n: n['id'])
ids['media'] = first('/api/media-files/library?size=1', lambda m: m['id'])
try: ids['fb'] = (json.loads(call('/api/social/fb/home')[3] or b'{}').get('me') or {}).get('id')
except Exception: ids['fb'] = None
if ids['self']:
    ids['memory'] = first(f"/api/persons/{ids['self']}/memory/episodes", lambda e: e['id'])
    ids['event'] = first(f"/api/events?personId={ids['self']}", lambda e: e['id'])

over, total, n = [], 0, 0
print(f"{'sql':>6} {'ms':>7} {'bytes':>10}  status  path")
for line in open(args.paths, encoding='utf-8'):
    path = line.strip()
    if not path or path.startswith('#'): continue
    missing = [k for k in ids if '{' + k + '}' in path and not ids.get(k)]
    if missing:
        print(f"{'-':>6} {'-':>7} {'-':>10}  skip    {path}   (no {missing[0]})"); continue
    shown = path
    for k, v in ids.items():
        if v: path = path.replace('{' + k + '}', str(v))
    call(path)                                   # the first call warms caches; the second is the one reported
    status, sql, ms, body = call(path)
    count = int(sql) if sql is not None and sql.isdigit() else -1
    n += 1; total += max(count, 0)
    flag = '  <-- above --max' if count > args.max else '  (no X-Sql-Count header)' if count < 0 else ''
    if count > args.max: over.append((count, shown))
    print(f"{count:>6} {ms:>7} {len(body):>10}  {status}     {shown}{flag}")
print(f"\n{n} reads, {total} statements in all; {len(over)} above {args.max}")
for count, shown in sorted(over, reverse=True): print(f"  {count:>6}  {shown}")
sys.exit(1 if over else 0)
