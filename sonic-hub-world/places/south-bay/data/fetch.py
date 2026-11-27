"""The OpenStreetMap data this world is baked from, fetched from the OpenStreetMap API into a cache that git does not
keep (places/south-bay/data/osm/): one file per box of blocks.txt, fetched once. Any session can rebuild the cache:

    python3 places/south-bay/data/fetch.py                    # every box of blocks.txt not yet in the cache
    python3 places/south-bay/data/fetch.py --add I,J …        # add the world's 1 km blocks I,J (x 1000·I…, z 1000·J…) and fetch them

A block is two by two of the world's 500 m tiles. The five first boxes (east, elsegundo, north, south, west) are the
ones the first route was baked from (25/11/2026); they are not cut to blocks. Map data (c) OpenStreetMap contributors,
ODbL. The API is for editing: fetch politely (one box at a time, a pause between), and only what the world needs."""
import os, sys, time, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, 'osm'); LIST = os.path.join(HERE, 'blocks.txt')
LAT0, LON0 = 33.92290, -118.39500
import math
KX = math.cos(math.radians(LAT0)) * 111320.0; KZ = 110574.0
M = 20.0                                                                     # a box reaches 20 m past its block on every side

def block_box(I, J):
    x0, x1, z0, z1 = 1000.0 * I - M, 1000.0 * (I + 1) + M, 1000.0 * J - M, 1000.0 * (J + 1) + M
    return (LAT0 - z1 / KZ, LON0 + x0 / KX, LAT0 - z0 / KZ, LON0 + x1 / KX)

def read():
    out = []
    for line in open(LIST):
        line = line.split('#')[0].split()
        if len(line) == 5: out.append((line[0], *map(float, line[1:])))
    return out

def fetch(name, s, w, n, e):
    f = os.path.join(CACHE, name + '.osm')
    if os.path.exists(f) and os.path.getsize(f) > 1000: return 'cached'
    url = 'https://api.openstreetmap.org/api/0.6/map?bbox=%.7f,%.7f,%.7f,%.7f' % (w, s, e, n)
    for attempt in range(4):
        t = time.time(); r = subprocess.run(['curl', '-sS', '-m', '180', '-o', f + '.part', '-w', '%{http_code}', url], capture_output=True, text=True)
        if r.stdout.strip() == '200' and os.path.getsize(f + '.part') > 1000:
            os.replace(f + '.part', f); return '%.1f MB in %.0f s' % (os.path.getsize(f) / 1e6, time.time() - t)
        time.sleep(5 + 10 * attempt)
    return 'FAILED ' + r.stdout.strip() + ' ' + r.stderr.strip()[:120]

if __name__ == '__main__':
    os.makedirs(CACHE, exist_ok=True)
    if sys.argv[1:2] == ['--add']:
        have = {b[0] for b in read()}
        with open(LIST, 'a') as f:
            for a in sys.argv[2:]:
                I, J = map(int, a.split(',')); name = 'b%d_%d' % (I, J)
                if name not in have: f.write('%-10s %.7f %.7f %.7f %.7f\n' % (name, *block_box(I, J))); have.add(name)
    boxes = read(); todo = [b for b in boxes if not os.path.exists(os.path.join(CACHE, b[0] + '.osm'))]
    print(len(boxes), 'boxes,', len(todo), 'to fetch', flush=True)
    for k, b in enumerate(todo):
        print('%3d/%d %-10s %s' % (k + 1, len(todo), b[0], fetch(*b)), flush=True); time.sleep(1.0)
