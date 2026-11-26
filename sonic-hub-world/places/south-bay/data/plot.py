#!/usr/bin/env python3
# A map of the world's tiles and routes, to look at (needs Pillow):
#   python3 plot.py <the world's folder> <esa-osm.json> <cx> <cz> <span in metres> <out.png> [pixels]
# esa-osm.json: the hotel place's own roads and buildings, which the tiles leave out:
#   node --input-type=module -e "import * as O from '../../esa-el-segundo-2015/osm.js'; import fs from 'fs'; fs.writeFileSync('esa-osm.json', JSON.stringify({ B: O.BUILDINGS, R: O.ROADS, S: O.SERVICE }))" 
import sys, json, glob, math, os
from PIL import Image, ImageDraw
out, esaf, cx, cz, span, png = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6]
PX = int(sys.argv[7]) if len(sys.argv) > 7 else 1400; k = PX / span; T = 500
def X(x, z): return ((x - (cx - span / 2)) * k, (z - (cz - span / 2)) * k)
im = Image.new('RGB', (PX, PX), (150, 146, 136)); d = ImageDraw.Draw(im, 'RGBA')
def pl(pts, w, col):
    if len(pts) > 1: d.line([X(*p) for p in pts], fill=col, width=max(1, int(round(w * k))), joint='curve')
def pairs(a): return [(a[i], a[i + 1]) for i in range(0, len(a), 2)]
tiles = []
for f in glob.glob(out + '/tiles/*.json'):
    t = json.load(open(f)); ox, oz = t['i'] * T, t['j'] * T
    if ox > cx + span / 2 + 600 or ox + T < cx - span / 2 - 600 or oz > cz + span / 2 + 600 or oz + T < cz - span / 2 - 600: continue
    tiles.append((t, ox, oz))
W = lambda a, ox, oz: [(x / 10 + ox, z / 10 + oz) for x, z in pairs(a)]
AC = [(70, 70, 72), (104, 140, 84), (190, 188, 180), (150, 130, 104), (90, 130, 170)]
for t, ox, oz in tiles:
    for a in t.get('a', []): d.polygon([X(*p) for p in W(a[1:], ox, oz)], fill=AC[a[0]])
for t, ox, oz in tiles:
    for r in t.get('r', []):
        if r[1] == 1: pl(W(r[2:], ox, oz), r[0] / 5, (78, 78, 80))
for t, ox, oz in tiles:
    for r in t.get('r', []):
        if r[1] != 1: pl(W(r[2:], ox, oz), r[0] / 5, (52, 52, 56) if r[1] == 0 else (120, 120, 118))
E = json.load(open(esaf))
for name, cls, lanes, ow, fl in E['R']: pl(pairs(fl), lanes * 3.4 + (0.8 if ow else 1.2), (60, 44, 44))
for kind, fl in E['S']: pl(pairs(fl), 6.5, (86, 74, 74))
for wid, h, kind, name, fl in E['B']: d.polygon([X(*p) for p in pairs(fl)], fill=(170, 120, 110), outline=(90, 50, 50))
for t, ox, oz in tiles:
    for w in t.get('w', []): pl(W(w, ox, oz), 2.0, (214, 210, 200))
    for c in t.get('c', []):
        x, z, r, a0, a1 = c[0] / 10 + ox, c[1] / 10 + oz, c[2] / 10, math.radians(c[3] / 10), math.radians(c[4] / 10)
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        d.polygon([X(x, z)] + [X(x + r * math.cos(a0 + da * i / 8), z + r * math.sin(a0 + da * i / 8)) for i in range(9)], fill=(230, 226, 214))
    for m in t.get('m', []):
        col = [(230, 190, 40), (245, 245, 240), (245, 245, 240), (245, 245, 240), (230, 190, 40)][m[0]]
        pl(W(m[2:], ox, oz), max(m[1] / 100, 1.2 / k), col + ((255,) if m[0] in (0, 1) else (170,)))
    for b in t.get('b', []):
        kc = [(196, 170, 140), (200, 160, 130), (120, 170, 200), (170, 176, 184), (176, 172, 160), (210, 170, 110), (130, 130, 136), (190, 150, 170), (220, 220, 220)][b[1]]
        d.polygon([X(*p) for p in W(b[2:], ox, oz)], fill=kc, outline=(60, 60, 60))
    for e in t.get('e', []): pl(W(e[3:], ox, oz), e[2] / 5, (150, 110, 160, 190) if e[0] == 0 else (110, 110, 150, 170))
    for p in t.get('p', []):
        x, z = X(p[1] / 10 + ox, p[2] / 10 + oz); r = max(2, (p[4] / 10 if p[0] == 0 else 1.5) * k * (1 if p[0] == 0 else 1))
        if p[0] == 0: d.ellipse([x - r, z - r, x + r, z + r], fill=(60, 110, 50, 200))
        elif p[0] == 1: d.ellipse([x - 3, z - 3, x + 3, z + 3], fill=(40, 150, 90))
        elif p[0] == 2: d.rectangle([x - 2, z - 2, x + 2, z + 2], fill=(250, 220, 120))
        elif p[0] == 4: d.regular_polygon((x, z, 5), 8, fill=(220, 30, 30))
    for s in t.get('s', []):
        x, z = s[0] / 10 + ox, s[1] / 10 + oz; a = math.radians(s[2]); u = (math.cos(a), math.sin(a)); lf = (u[1], -u[0]); arm = s[3] / 10
        d.line([X(x, z), X(x + lf[0] * arm, z + lf[1] * arm)], fill=(20, 20, 20), width=2); px, pz = X(x, z); d.ellipse([px - 3, pz - 3, px + 3, pz + 3], fill=(255, 60, 60) if s[4] else (60, 255, 90))
x0, x1, z0, z1 = -280, 780, -270, 250
d.rectangle([X(x0, z0), X(x1, z1)], outline=(255, 255, 255, 160), width=2)
for gx in range(-10, 12): d.line([X(gx * T, -1e5), X(gx * T, 1e5)], fill=(255, 255, 255, 40)); d.line([X(-1e5, gx * T), X(1e5, gx * T)], fill=(255, 255, 255, 40))
for ri, r in enumerate(json.load(open(out + '/routes.json'))):
    p = [(a / 10, b / 10) for a, b in pairs(r['pts'])]; col = (255, 40, 200) if ri == 0 else (40, 220, 255)
    pl(p, 0.5, col + (255,))
    cl = [0]
    for a, b in zip(p, p[1:]): cl.append(cl[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    for s, kind, ji, grp in r['ctl']:
        i = min(range(len(cl)), key=lambda i: abs(cl[i] - s)); x, z = X(*p[i]); d.ellipse([x - 5, z - 5, x + 5, z + 5], outline=col, width=2)
im.save(png); print(png, len(tiles), 'tiles')
