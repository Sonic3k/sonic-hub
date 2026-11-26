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
for kind, fl in E['S']: pl(pairs(fl), 6.5, (86, 74, 74))
for wid, h, kind, name, fl in E['B']: d.polygon([X(*p) for p in pairs(fl)], fill=(170, 120, 110), outline=(90, 50, 50))
# the streets (streets.py): strips (their two edges), the paving where roads meet, the walks' round corners, painted lines and figures
KC = [(52, 52, 56), (58, 50, 52), (150, 148, 142), (218, 214, 204), (112, 150, 90), (186, 182, 172), (200, 196, 186), (120, 156, 96)]   # street · street in the hotel's box · gutter · walk · lawn · apron · median · planted median
def quads(st, ox, oz):
    P = []; x = z = 0
    for i in range(1, len(st), 4): x += st[i]; z += st[i + 1]; P.append(((x / 100 + ox, z / 100 + oz), ((x + st[i + 2]) / 100 + ox, (z + st[i + 3]) / 100 + oz)))
    return [[a0, b0, b1, a1] for (a0, b0), (a1, b1) in zip(P, P[1:])]
def corner(c, ox, oz):
    P = []; x = z = 0
    for i in range(1, len(c), 2): x += c[i]; z += c[i + 1]; P.append((x / 100 + ox, z / 100 + oz))
    return P
for layer in ((0, 1), (2, 5), (6, 7), (3, 4)):
    for t, ox, oz in tiles:
        for st in t.get('k', []):
            if st[0] in layer:
                for q in quads(st, ox, oz): d.polygon([X(*p) for p in q], fill=KC[st[0]])
        for o in t.get('o', []):
            if o[0] in layer: d.polygon([X(*p) for p in W(o[1:], ox, oz)], fill=KC[o[0]])
        if 3 in layer:
            for c in t.get('c', []): d.polygon([X(*p) for p in corner(c, ox, oz)], fill=KC[3], outline=(150, 146, 136))
def dash(pts, on, off):
    out = []; carry = off / 2
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, z1 - z0)
        if L < 1e-6: continue
        s0 = carry
        while s0 < L: e0 = min(L, s0 + on); out.append([(x0 + (x1 - x0) * s0 / L, z0 + (z1 - z0) * s0 / L), (x0 + (x1 - x0) * e0 / L, z0 + (z1 - z0) * e0 / L)]); s0 += on + off
        carry = s0 - L
    return out
for t, ox, oz in tiles:
    for m in t.get('m', []):
        col = [(230, 190, 40), (245, 245, 240), (245, 245, 240), (245, 245, 240), (230, 190, 40), (245, 245, 240), (230, 190, 40)][m[0]]
        pts = [(m[i] / 100 + ox, m[i + 1] / 100 + oz) for i in range(2, len(m), 2)]; w = max(m[1] / 100, 1.2 / k)
        if m[0] in (0, 1): pl(pts, w, col + (255,))
        else:
            for seg in dash(pts, *{2: (3.66, 10.97), 4: (3.66, 10.97), 3: (0.6, 0.6), 5: (2.13, 5.18), 6: (2.13, 5.18)}[m[0]]): pl(seg, w, col + (255,))
    for f in t.get('y', []):
        x, z, a = f[1] / 100 + ox, f[2] / 100 + oz, math.radians(f[3]); u = (math.cos(a), math.sin(a)); rt = (-u[1], u[0])
        if f[0] == 8: d.polygon([X(x + u[0] * du + rt[0] * dr, z + u[1] * du + rt[1] * dr) for du, dr in ((-0.45, -0.6), (0.45, -0.6), (0.45, 0.6), (-0.45, 0.6))], fill=(236, 200, 40))
        elif f[0] == 5: d.polygon([X(x + u[0] * du + rt[0] * dr, z + u[1] * du + rt[1] * dr) for du, dr in ((-1.2, -1.1), (1.2, -1.1), (1.2, 1.1), (-1.2, 1.1))], outline=(245, 245, 240))
        else:
            bend = {0: -1, 2: 1}.get(f[0], 0); tip = (x + u[0] * 1.5 + rt[0] * bend * 0.9, z + u[1] * 1.5 + rt[1] * bend * 0.9)
            d.line([X(x - u[0] * 1.5, z - u[1] * 1.5), X(x + u[0] * 0.6, z + u[1] * 0.6), X(*tip)], fill=(245, 245, 240), width=max(1, int(0.3 * k)))
            if f[0] in (3, 4, 6): d.line([X(x + u[0] * 0.2, z + u[1] * 0.2), X(x + u[0] * 1.1 + rt[0] * (-1 if f[0] == 3 else 1) * 0.9, z + u[1] * 1.1 + rt[1] * (-1 if f[0] == 3 else 1) * 0.9)], fill=(245, 245, 240), width=max(1, int(0.3 * k)))
for t, ox, oz in tiles:
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
    # the path is the back axle's (millimetres, with its heading in 1e-5 rad): drawn is the car's middle, 1.39 m ahead of it
    ax = [(a / 1000, b / 1000) for a, b in pairs(r['pts'])]; hd = [h / 1e5 for h in r['hd']]; col = (255, 40, 200) if ri == 0 else (40, 220, 255)
    p = [(x + math.cos(h) * 1.3875, z + math.sin(h) * 1.3875) for (x, z), h in zip(ax, hd)]
    pl(p, 0.5, col + (255,))
    cl = [0]
    for a, b in zip(ax, ax[1:]): cl.append(cl[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    for s0, s1 in r.get('straight', []):                                           # where the street is straight: a paler line beside the path
        q = [(x - math.sin(h) * 1.2, z + math.cos(h) * 1.2) for (x, z), h, c in zip(p, hd, cl) if s0 <= c <= s1]; pl(q, 0.4, (255, 255, 255, 200))
    for s, kind, ji, grp in r['ctl']:                                              # where the bumper stops
        i = min(range(len(cl)), key=lambda i: abs(cl[i] - s)); x, z = X(ax[i][0] + math.cos(hd[i]) * 3.75, ax[i][1] + math.sin(hd[i]) * 3.75); d.ellipse([x - 5, z - 5, x + 5, z + 5], outline=col, width=2)
im.save(png); print(png, len(tiles), 'tiles')
