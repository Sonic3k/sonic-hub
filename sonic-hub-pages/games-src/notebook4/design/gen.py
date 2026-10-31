# Build design/levels.raw.json from the transcribed pages (design/pages/*.json) of the owner's hand-drawn "MARIO 4".
# Each page: strips of 13 rows, read left to right then down; we put them side by side and add 3 sky rows on top
# so a level is 16 tiles tall (one screen). Then `node design/repair.js` (real physics) adds the few ledges a page
# needs to be finishable and writes src/10-levels.js. Edit pages/, not 10-levels.js.
import json, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
pages = []
for f in sorted(glob.glob(os.path.join(HERE, 'pages', '*.json'))):
    pages += json.load(open(f))
SKIP_FILES = {'scan0082.jpg'}               # a second scan of scan0081
seen = set(SKIP_FILES); uniq = []
for p in pages:                          # one entry per scan
    if p['file'] in seen: continue
    seen.add(p['file']); uniq.append(p)
# a level runs over two (sometimes three) scans: the "N : MARIO 4" header page, then the next scan(s).
# Group by level and join the parts' strips in order.
num = lambda f: int(''.join(c for c in f if c.isdigit()) or 0)
groups = {}
for p in uniq:
    key = p.get('level') if p.get('level') is not None else 'x' + p['file']
    groups.setdefault(key, []).append(p)
joined = []
for key, ps in groups.items():
    low = min(num(p['file']) for p in ps)          # no part given: the lower scan number is the header page
    ps.sort(key=lambda p: (p.get('part') or (1 if num(p['file']) == low else 2), num(p['file'])))
    # the parts are one spread: strip k of part 1 runs straight on into strip k of part 2
    n = max(len(p['strips']) for p in ps)
    strips = []
    for k in range(n):
        row = [p['strips'][k] for p in ps if k < len(p['strips'])]
        strips.append([''.join(st[y] if y < len(st) else '' for st in [[r.ljust(max(len(x) for x in s0)) for r in s0] for s0 in row]) for y in range(13)])
    joined.append(dict(level=ps[0].get('level'), file='+'.join(p['file'] for p in ps), files=[p['file'] for p in ps],
                       strips=strips, notes=' | '.join(p.get('notes', '') for p in ps)))
joined.sort(key=lambda p: (p['level'] if isinstance(p['level'], int) else 999, p['file']))
uniq = joined
KEEP = set("#=?X+oDwnm:egqf^PG ")
def build(page):
    strips = []
    for st in page['strips']:
        st = [r.rstrip('\n') for r in st][:13]
        while len(st) < 13: st.insert(0, '')
        w = max(len(r) for r in st)
        strips.append([r.ljust(w) for r in st])
    rows = [''] * 16
    starts = []
    for st in strips:
        starts.append(len(rows[0]))
        w = len(st[0])
        for y in range(3): rows[y] += ' ' * w
        for y in range(13): rows[3 + y] += st[y]
    g = [list(r) for r in rows]
    H, W = len(g), len(g[0])
    for y in range(H):
        for x in range(W):
            if g[y][x] not in KEEP: g[y][x] = ' '
    # a platform drawn 2-3 tiles wide is one platform
    for y in range(H):
        for x in range(W - 1, 0, -1):
            if g[y][x] in 'nm' and g[y][x - 1] == g[y][x]: g[y][x] = ' '
    # platforms without a rail end get one
    for y in range(H):
        for x in range(W):
            if g[y][x] == 'n' and not any(g[k][x] == ':' for k in range(H)):
                k = y - 4 if y - 4 >= 1 else y + 4
                if g[k][x] == ' ': g[k][x] = ':'
            if g[y][x] == 'm' and ':' not in ''.join(g[y]):
                if x + 6 < W and g[y][x + 6] == ' ': g[y][x + 6] = ':'
    # doors stay decoration unless repair.js pairs them
    for y in range(H):
        for x in range(W):
            if g[y][x] == 'D': g[y][x] = 'Q'
    # one goal: the same exit box is often drawn on both sides of the page seam, and a bonus room may follow
    # the end wall — keep the left-most G of the last strip that has one
    strip_of = lambda x: max(i for i, s0 in enumerate(starts) if s0 <= x)
    gs = [(y, x) for y in range(H) for x in range(W) if g[y][x] == 'G']
    if gs:
        last = max(strip_of(x) for _, x in gs)
        keep = min((p for p in gs if strip_of(p[1]) == last), key=lambda p: p[1])
        for p in gs:
            if p != keep: g[p[0]][p[1]] = ' '
        gs = [keep]
    if gs:
        y, x = gs[-1]
        if y + 1 < H and g[y + 1][x] not in '#X?+=':
            g[y][x] = ' '
            yy = y
            while yy + 1 < H and g[yy + 1][x] not in '#X?+=': yy += 1
            if yy + 1 < H: g[yy][x] = 'G'
    for (y, x) in [(y, x) for y in range(H) for x in range(W) if g[y][x] == 'P'][1:]: g[y][x] = ' '
    def surface(x):
        for y in range(1, H):
            if g[y][x] in '#X?+=' and g[y - 1][x] == ' ': return y - 1
        return None
    if not any('P' in r for r in g):
        for x in range(1, 8):
            s = surface(x)
            if s is not None: g[s][x] = 'P'; break
    if not any('G' in r for r in g):
        for x in range(W - 4, W // 2, -1):
            s = surface(x)
            if s is not None and surface(x - 1) == s: g[s][x - 1] = 'G'; break
    for sx in starts[1:]:                        # a flag at the start of each new strip
        for x in range(sx + 1, min(sx + 6, W)):
            s = surface(x)
            if s is not None and g[s][x] == ' ': g[s][x] = 'F'; break
    coins = sum(r.count('o') for r in g)
    return [''.join(r) for r in g], coins
levels = []
for i, p in enumerate(uniq):
    rows, coins = build(p)
    levels.append(dict(id=i + 1, page=p.get('level'), file=p['file'], files=p.get('files'), name='Màn ' + str(p.get('level') or i + 1),
                       theme='paper', signs=[], maze=False, stars=False, coins=coins, rows=rows))
json.dump(levels, open(os.path.join(HERE, 'levels.raw.json'), 'w'), ensure_ascii=False)
print('pages', len(levels), [l['page'] for l in levels])
