"""The streets of a world, laid out the way California lays its streets out — the California MUTCD's markings and what
its cities build — from what OpenStreetMap says of each road. world.py calls layout() and cuts the result into tiles.

What the map gives, and what is made of it:
  lanes, lanes:forward/backward/both_ways, turn:lanes…   → a road's lanes from kerb to kerb (lanes_of)
  nodes that roads share                                  → where roads meet; several such points close together on a
                                                            divided road are one crossing
  highway=traffic_signals, highway=stop                   → who must stop there, and where
  footway=crossing ways (crossing, crossing:markings)     → the crosswalks, where they really are and how they are painted
  service ways that end on a road                         → driveways: the walk drops for them, the kerb opens

The rules (what is drawn where the map does not say otherwise):
  · Lines between lanes. Opposite ways: a double yellow line. A middle lane for left turns from both sides: a solid
    yellow line with a broken one inside it, on either side. Lanes going the same way: a broken white line (7 ft of
    line, 17 ft of gap; 12 and 36 where traffic is fast), solid for the last 30 m before a signal and beside a lane to
    turn from. A quiet street of two lanes has no lines at all.
  · Where roads meet. The kerbs are joined by a round corner (4.5 m between quiet streets, 7.5 m between big ones); the
    lines stop for the crossing. At a signal: a crosswalk on each arm the map marks one on (two white lines 3 m apart,
    or bars where the map says so), a limit line 1.2 m before it across the lanes that arrive, an arrow in each lane
    to turn from. At a stop sign: a limit line and the word STOP, no crosswalk unless the map has one. Elsewhere nothing.
  · Kerb and walk. A kerb with a concrete gutter along every street, a sidewalk at the kerb (none where the map says
    there is none: then the kerb alone), carried round each corner, with a yellow pad where the kerb is cut for wheels;
    at a driveway the walk drops to the road and the kerb opens. Between the two roadways of a divided road, a raised
    median.
  · Where a street's width changes from one piece to the next it tapers over 24 m.

Everything is in metres in the world's frame (x east, z south). Sides: +1 is the right of a line's own direction."""
import math, collections
from geom import lens, at, sub, keep, unit, right, offset, rdp

GUT, WALKW, KERBW, XW = 0.5, 2.0, 0.3, 3.0              # the gutter; a walk at the kerb; a kerb with no walk; a crosswalk
MEDW = 1.2                                             # a raised median, at the least
TAPER = 12.0                                           # either side of the point where a street's width changes
VEE = 22.0                                             # how far out the map's two lines of a divided road have come apart to where its roadways really run
ARTERIAL = ('trunk', 'primary', 'secondary', 'tertiary')
QUIET = ('residential', 'living_street', 'unclassified')
NOKERB = ('motorway', 'motorway_link', 'trunk_link')
STREET, STREET_BOX, GUTTER, WALK, LAWN, APRON, MEDIAN, MEDIAN_GREEN = range(8)                  # bands and outlines
YEL, WHT, WHT_LONG, BARS, YEL_LONG, WHT_DASH, YEL_DASH = range(7)                               # painted lines
A_LEFT, A_THRU, A_RIGHT, A_LEFT_THRU, A_THRU_RIGHT, STOP, A_LEFT_RIGHT, ONLY, PAD = range(9)    # painted figures

def turns_of(s):
    """'left|through;right|' → [{'left'}, {'through', 'right'}, set()]"""
    return [set(t for t in part.split(';') if t and t != 'none') for part in s.split('|')] if s else []

def lanes_of(tg, n, oneway):
    """A road's lanes from its left kerb to its right, looking along the way: [(which way, what turns)] — 'b' against
    the way, 'c' a middle lane for left turns from both sides, 'f' with it; turns as the map lists them (empty: none
    said). n: how many lanes it has where the map gives only that."""
    num = lambda k: int(tg[k]) if tg.get(k, '').isdigit() else None
    if oneway:
        t = turns_of(tg.get('turn:lanes', '')); return [('f', t[i] if i < len(t) else set()) for i in range(max(1, n))]
    f, b, c = num('lanes:forward'), num('lanes:backward'), num('lanes:both_ways') or 0
    if f is None and b is None:
        if n <= 1: return [('x', set())]
        c = 1 if n % 2 == 1 else 0; f = b = (n - c) // 2
    elif f is None: f = max(1, n - b - c)
    elif b is None: b = max(1, n - f - c)
    tf, tb = turns_of(tg.get('turn:lanes:forward', '')), turns_of(tg.get('turn:lanes:backward', ''))
    # the lanes against the way are listed as their own drivers see them, left to right: here that is right to left
    return [('b', tb[i] if i < len(tb) else set()) for i in range(b)][::-1] + [('c', set())] * c + [('f', tf[i] if i < len(tf) else set()) for i in range(f)]

def lane_edges(r):
    """the edges of a road's lanes: metres to the right of its line, from the left kerb's lane to the right kerb's
    (a roadway whose median stands in from its left edge — r['inset'] — has its lanes in what is left)"""
    N = len(r['prof']); room = r['w'] - (0.8 if r['oneway'] else 1.2) - r.get('inset', 0.0); lo = -room / 2 + r.get('inset', 0.0) / 2
    return [lo + i * room / N for i in range(N + 1)]

def lane_offsets(r, fwd=True, to=None):
    """The middles of the lanes a car may drive going with the way (fwd) or against it, from the inside lane outwards:
    metres to the right of its own travel. to: the turn it will make at this way's end ('left', 'right'; None: none) —
    a lane to turn from is the car's only if it turns that way, and the middle lane only for a left turn."""
    e, P = lane_edges(r), r['prof']; mid = lambda i: (e[i] + e[i + 1]) / 2
    norm = lambda t: {'left' if v in ('reverse', 'slight_left', 'sharp_left') else 'right' if v in ('slight_right', 'sharp_right') else v for v in t}
    mine = [i for i in range(len(P)) if P[i][0] in (('f', 'x') if fwd else ('b', 'x'))] or list(range(len(P)))   # (a one-way driven against its way: the tool's own business)
    fit = [i for i in mine if not P[i][1] or 'through' in norm(P[i][1]) or to in norm(P[i][1])] or mine
    out = sorted(mid(i) for i in fit) if fwd else sorted(-mid(i) for i in fit)
    if to == 'left':
        c = [mid(i) for i in range(len(P)) if P[i][0] == 'c']
        if c: out = [c[0] if fwd else -c[0]] + out
    return out

def side_of(r, s):
    """what stands along a road's side (+1 its right, −1 its left): (a kerb?, the width of what is behind the kerb)"""
    if r['bridge'] or r['cls'] in NOKERB: return (False, 0.0)
    if r['oneway'] and s < 0 and r.get('pair'): return (False, 0.0)                # the median's side
    tg = r['tg']; side = 'right' if s > 0 else 'left'; v = tg.get('sidewalk:' + side, tg.get('sidewalk:both', '')); sw = tg.get('sidewalk', '')
    no = v == 'no' or sw in ('no', 'none') or (sw == 'left' and s > 0) or (sw == 'right' and s < 0)
    return (True, KERBW if no or r['cls'].endswith('_link') else WALKW)

def seg_dist(q, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
    t = max(0.0, min(1.0, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / L2)); return math.hypot(a[0] + dx * t - q[0], a[1] + dz * t - q[1]), t
def line_dist(q, p):
    return min(seg_dist(q, a, b)[0] for a, b in zip(p, p[1:]))
def cross2(a, b): return a[0] * b[1] - a[1] * b[0]
def simple(P):
    """does an outline keep clear of itself"""
    n = len(P)
    def hit(a, b, c, d):
        o = lambda p, q, r: (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
        return o(a, b, c) * o(a, b, d) < -1e-9 and o(c, d, a) * o(c, d, b) < -1e-9
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1: continue
            if hit(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n]): return False
    return True

def hull(P):
    """the outline drawn tight round a set of points"""
    P = sorted(set(P))
    if len(P) < 3: return P
    def half(pts):
        h = []
        for p in pts:
            while len(h) >= 2 and (h[-1][0] - h[-2][0]) * (p[1] - h[-2][1]) - (h[-1][1] - h[-2][1]) * (p[0] - h[-2][0]) <= 0: h.pop()
            h.append(p)
        return h
    lo, up = half(P), half(P[::-1]); return lo[:-1] + up[:-1]

def layout(W, roads, service, drives=(), median_w=None):
    """→ what the streets are made of, and what the routes need to know of them:
      bands    [(kind, [(x, z, lx, lz, rx, rz)])]   strips: the road's own line under each point (to cut the strip into
                                            tiles by), then the strip's left and right edge there, looking along the
                                            list. A walk, an apron and a median have their kerb on the LEFT (the road
                                            lies to the left of it: the gutter is not in the strip)
      polys    [(kind, [(x, z)])]           outlines: the paving where roads meet
      corners  [(kerb, back)]               the round corners of the walks: the kerb from where one street's kerb ends,
                                            round the arc, to where the next one's begins; the walk's back edge from
                                            that street's back to the first one's (the outline is the two together)
      marks    [(type, width cm, [(x, z)])] painted lines
      figures  [(kind, x, z, degrees)]      arrows, the word STOP, the pads at the corners
      poles, signs                          signal masts and stop signs
      medians  [((x, z), name)]             spots down the middle of the planted medians, 22 m apart, with the road's name
      junctions, jat, legat                 the crossings; which crossing a point belongs to; the arm of a crossing
                                            that a road forms at one of its points going one way (ri, k, sgn)
      sides    {(ri, side): [(d0, d1)]}     where a road has a kerb with a walk behind it (for trees and lights)
      audit    counts, for the checks
    drives: ways in that the map does not have [(the road's name, a point of the way in, its width)].
    median_w: {a road's name: how wide its median is, where the map's two roadways leave less}."""
    use = collections.defaultdict(list)
    for ri, r in enumerate(roads):
        for k, n in enumerate(r['nd']): use[n].append((ri, k))
    bands, polys, corners, marks, figures, poles, signs, medians = [], [], [], [], [], [], [], []
    audit = collections.Counter()

    # ── the two roadways of a divided road: how far each one's left edge is from the other's ──
    CELL = 60.0; grid = collections.defaultdict(list)
    for ri, r in enumerate(roads):
        r['pair'] = False; r['med'] = []
        if not r['oneway'] or r['bridge'] or not r['name'] or r['cls'] in NOKERB or r['cls'].endswith('_link'): continue
        for a, b in zip(r['p'], r['p'][1:]):
            for gx in range(int(min(a[0], b[0]) // CELL), int(max(a[0], b[0]) // CELL) + 1):
                for gz in range(int(min(a[1], b[1]) // CELL), int(max(a[1], b[1]) // CELL) + 1): grid[(gx, gz)].append((ri, a, b))
    for ri, r in enumerate(roads):
        if not r['oneway'] or r['bridge'] or not r['name'] or r['cls'] in NOKERB or r['cls'].endswith('_link'): continue
        L = r['cl'][-1]; d = 0.0; got = 0; seen = 0
        while d <= L:
            (x, z), i = at(r['p'], r['cl'], d); f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); ln = (f[1], -f[0]); best = None
            for gx in range(int((x - 45) // CELL), int((x + 45) // CELL) + 1):
                for gz in range(int((z - 45) // CELL), int((z + 45) // CELL) + 1):
                    for rj, a, b in grid.get((gx, gz), ()):
                        o = roads[rj]
                        if rj == ri or o['name'] != r['name']: continue
                        g = unit(b[0] - a[0], b[1] - a[1])
                        if g[0] * f[0] + g[1] * f[1] > -0.6: continue                  # the other roadway runs the other way
                        dist, t = seg_dist((x, z), a, b); px, pz = a[0] + (b[0] - a[0]) * t - x, a[1] + (b[1] - a[1]) * t - z
                        if dist > 45 or px * ln[0] + pz * ln[1] < 0.7 * dist: continue    # … and lies to the left
                        if best is None or dist < best[0]: best = (dist, o['hw'])
            gap = best[0] - r['hw'] - best[1] if best else None
            r['med'].append((d, gap)); seen += 1; got += best is not None
            d += 4.0
        r['pair'] = got >= max(2, 0.3 * seen)
        # The map's lane counts make many a divided road's two roadways as wide as the space between their lines, or
        # wider: the median then stands in from each roadway's left edge, and the lanes share what is left.
        gs = sorted(g for _, g in r['med'] if g is not None and g > -4.0)
        if r['pair'] and gs: r['medw'] = (median_w or {}).get(r['name'], MEDW); r['inset'] = max(0.0, min(2.0, (r['medw'] - gs[len(gs) // 2]) / 2))

    # ── a street's half-width along it: where its width changes from one way to the next it tapers ──
    ends = collections.defaultdict(list)
    for ri, r in enumerate(roads):
        ends[r['nd'][0]].append((ri, 0)); ends[r['nd'][-1]].append((ri, 1))
    for ri, r in enumerate(roads):
        r['hwe'] = [r['hw'], r['hw']]; r['on'] = [None, None]                      # its half-width at either end; which way it goes on from there
        if r['bridge']: continue
        for e, n in ((0, r['nd'][0]), (1, r['nd'][-1])):                            # the same street going on from this end, as another way
            p = r['p']; mine = unit(p[1][0] - p[0][0], p[1][1] - p[0][1]) if e == 0 else unit(p[-1][0] - p[-2][0], p[-1][1] - p[-2][1]); on = []
            for x, e2 in ends[n]:
                o = roads[x]
                if x == ri or o['name'] != r['name'] or o['cls'] != r['cls'] or o['oneway'] != r['oneway'] or o['bridge']: continue
                q = o['p']; away = unit(q[1][0] - q[0][0], q[1][1] - q[0][1]) if e2 == 0 else unit(q[-2][0] - q[-1][0], q[-2][1] - q[-1][1])
                g = away if e == 1 else (-away[0], -away[1])                       # … along this road's own way
                if g[0] * mine[0] + g[1] * mine[1] >= 0.5: on.append((o, g))        # (not the other roadway of a divided road, which ends on the same point coming back)
            if len(on) == 1 and (r['name'] or len(use[n]) == 2): r['hwe'][e] = (r['hw'] + on[0][0]['hw']) / 2; r['on'][e] = on[0][1]
    def frame(r, d):
        """the place d metres along road r, and the step that takes a line one metre further to its right there: across
        the road — where the road bends (and at an end where the same street goes on as another way), across the bend,
        so that edges kept at their distances on either side of the bend meet in one point"""
        p, cl = r['p'], r['cl']; (x, z), i = at(p, cl, d); f = unit(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); g = None
        if abs(d - cl[i]) < 1e-6 or d <= 0: g = unit(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]) if i > 0 else r['on'][0]
        elif abs(d - cl[i + 1]) < 1e-6 or d >= cl[-1]: g = unit(p[i + 2][0] - p[i + 1][0], p[i + 2][1] - p[i + 1][1]) if i + 2 < len(p) else r['on'][1]
        if g is None or f[0] * g[0] + f[1] * g[1] < -0.6: return (x, z), right(f)
        m = unit(f[0] + g[0], f[1] + g[1]); k = 1.0 / max(0.45, m[0] * f[0] + m[1] * f[1]); n = right(m)
        return (x, z), (n[0] * k, n[1] * k)
    def hwf(r, d):
        L = r['cl'][-1]; h = r['hw']; ease = lambda t: t * t * (3 - 2 * t)
        if d < TAPER and r['hwe'][0] != h: return r['hwe'][0] + (h - r['hwe'][0]) * ease(max(0.0, d) / TAPER)
        if d > L - TAPER and r['hwe'][1] != h: return r['hwe'][1] + (h - r['hwe'][1]) * ease(max(0.0, L - d) / TAPER)
        return h

    # ── where roads meet ──
    jnode = set()
    for n, us in use.items():
        if len({ri for ri, k in us}) >= 2 and sum((k > 0) + (k < len(roads[ri]['nd']) - 1) for ri, k in us) >= 3: jnode.add(n)
    parent = {n: n for n in jnode}
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    oneway_at = {n: any(roads[ri]['oneway'] for ri, k in use[n]) for n in jnode}
    for r in roads:                                                                # the points where a divided road is crossed are one crossing
        last = None
        for k, n in enumerate(r['nd']):
            if n not in jnode: continue
            if last is not None and r['cl'][k] - r['cl'][last[0]] <= 40 and oneway_at[n] and oneway_at[last[1]]: parent[find(n)] = find(last[1])
            last = (k, n)
    def near_junction(ri, k, reach):
        r = roads[ri]; best = None
        for kk, n in enumerate(r['nd']):
            if n in jnode and kk != k:
                d = abs(r['cl'][kk] - r['cl'][k])
                if d <= reach and (best is None or d < best[0]): best = (d, n, kk)
        return best
    signal, stops = set(), {}
    for n, tg in W.ntag.items():
        if n not in use: continue
        hw = tg.get('highway')
        if hw == 'traffic_signals':
            if n in jnode: signal.add(n)
            else:
                for ri, k in use[n]:
                    b = near_junction(ri, k, 55)
                    if b: signal.add(b[1])
        elif hw == 'stop':
            if n in jnode: stops[('all', n)] = 0.0
            else:
                for ri, k in use[n]:
                    b = near_junction(ri, k, 45)
                    if b: stops[(ri, b[2], -1 if b[2] > k else 1)] = b[0]             # the arm, seen from the crossing, that the sign stands on
    sig = sorted(signal)
    for a in sig:                                                                  # signals that stand within 40 m of each other run as one
        for b in sig:
            if a < b and find(a) != find(b) and math.hypot(W.xz[a][0] - W.xz[b][0], W.xz[a][1] - W.xz[b][1]) < 40: parent[find(b)] = find(a)
    groups = collections.defaultdict(list)
    for n in sorted(jnode): groups[find(n)].append(n)

    junctions, jat, legat = [], {}, {}
    def radius(a, b):
        if a['cls'].endswith('_link') or b['cls'].endswith('_link'): return 10.0
        big = (a['cls'] in ARTERIAL) + (b['cls'] in ARTERIAL)
        return 7.5 if big == 2 else 6.0 if big == 1 else 4.5
    def along(l, d):
        """leg l's own line d metres out from its point: the place, and the way out"""
        r = l['r']; (x, z), i = at(r['p'], r['cl'], r['cl'][l['k']] + l['sgn'] * d)
        f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); return (x, z), (f[0] * l['sgn'], f[1] * l['sgn'])
    def bedge(l, side, d, more=0.0):
        """a point of leg l's edge: side +1 its right looking out, −1 its left; d metres out; `more` metres beyond the kerb"""
        r = l['r']; s = r['cl'][l['k']] + l['sgn'] * d; (x, z), n = frame(r, s); h = (hwf(r, s) + more) * l['sgn'] * side
        return (x + n[0] * h, z + n[1] * h)
    for root in sorted(groups):
        nodes = groups[root]; C = set(nodes); legs = []
        for n in nodes:
            for ri, k in use[n]:
                r = roads[ri]
                for sgn in (-1, 1):
                    if not 0 <= k + sgn < len(r['nd']): continue
                    j2, inner = k + sgn, False                                     # inside the crossing: the road comes to another of its points within 45 m
                    while 0 <= j2 < len(r['nd']) and abs(r['cl'][j2] - r['cl'][k]) <= 45:
                        if r['nd'][j2] in C: inner = True; break
                        j2 += sgn
                    if inner or abs(r['cl'][-1 if sgn > 0 else 0] - r['cl'][k]) < 1.0: continue
                    out = abs(r['cl'][-1 if sgn > 0 else 0] - r['cl'][k])
                    q = at(r['p'], r['cl'], r['cl'][k] + sgn * 9.0)[0]; d = unit(q[0] - r['p'][k][0], q[1] - r['p'][k][1])
                    far = at(r['p'], r['cl'], r['cl'][k] + sgn * min(30.0, out))[0]      # where the arm lies, seen from the crossing's middle
                    arrives = not r['oneway'] or ((sgn < 0) != r['rev'])
                    legs.append(dict(ri=ri, k=k, sgn=sgn, node=n, P=r['p'][k], d=d, far=far, r=r, arrives=arrives, leaves=not r['oneway'] or not arrives, cP=r['p'][k], cd=d,
                                     mouthL=0.0, mouthR=0.0, xw=[], stop=None, stopd=None, pairL=None, pairR=None, next=('straight',)))
        if len(legs) < 3: continue
        cx = sum(W.xz[m][0] for m in nodes) / len(nodes); cz = sum(W.xz[m][1] for m in nodes) / len(nodes)
        for l in legs: l['th'] = math.atan2(l['far'][1] - cz, l['far'][0] - cx)
        legs.sort(key=lambda l: l['th']); n = len(legs)
        for i, A in enumerate(legs):                                               # the two roadways of a divided road make one arm
            B = legs[(i + 1) % n]
            if A['r']['oneway'] and B['r']['oneway'] and A['r']['name'] and A['r']['name'] == B['r']['name'] and A['arrives'] != B['arrives'] and A['d'][0] * B['d'][0] + A['d'][1] * B['d'][1] > 0.5 and A['pairL'] is None and A['pairR'] is None and B['pairR'] is None and B['pairL'] is None:
                A['pairR'], B['pairL'] = B, A
                # The map brings the two roadways together in a V at the crossing; the road itself runs on straight, its
                # roadways side by side. The corners are worked out for that: both along the arm's own direction, each
                # where it lies VEE out — and from there in, the kerb follows that line and not the map's.
                fa, fb = along(A, 35.0)[1], along(B, 35.0)[1]; ax = unit(fa[0] + fb[0], fa[1] + fb[1])
                for l in (A, B): q = along(l, VEE)[0]; l['cd'] = ax; l['cP'] = (q[0] - ax[0] * VEE, q[1] - ax[1] * VEE)
        for i, A in enumerate(legs):                                               # the corner between each arm and the next one clockwise
            B = legs[(i + 1) % n]; dA, dB = A['cd'], B['cd']
            phi = (math.atan2(dB[1], dB[0]) - math.atan2(dA[1], dA[0])) % (2 * math.pi)
            if A['pairR'] is B: A['next'] = ('median',); continue
            if phi > math.radians(150) or phi < math.radians(8): continue
            if any(l['r']['cls'] in NOKERB or l['r']['cls'].endswith('_link') or l['r']['bridge'] for l in (A, B)): continue      # a ramp leaves or joins: no corner
            hA, hB = A['r']['hw'], B['r']['hw']; rnA, rnB = right(dA), right(dB)
            A0 = (A['cP'][0] + rnA[0] * hA, A['cP'][1] + rnA[1] * hA); B0 = (B['cP'][0] - rnB[0] * hB, B['cP'][1] - rnB[1] * hB)
            cr = cross2(dA, dB); e = (B0[0] - A0[0], B0[1] - A0[1])
            sA, sB = cross2(e, dB) / cr, cross2(e, dA) / cr
            R = radius(A['r'], B['r']); t = R / math.tan(phi / 2)
            if t > 20: t = 20.0; R = t * math.tan(phi / 2)
            mA, mB = sA + t, sB + t
            if not (0.3 < mA < 60 and 0.3 < mB < 60) or R < 1.0: continue          # no room for a corner
            # … and none where an arm has curved away from the line the corner supposes it on by the time its kerb would
            # begin (a slip road, a ramp's gore): there the two kerbs run on to the point
            paired = lambda l: l['pairL'] is not None or l['pairR'] is not None
            qa = bedge(A, 1, max(mA, VEE if paired(A) else 0.0), hA - hwf(A['r'], A['r']['cl'][A['k']] + A['sgn'] * max(mA, VEE if paired(A) else 0.0)))
            qb = bedge(B, -1, max(mB, VEE if paired(B) else 0.0), hB - hwf(B['r'], B['r']['cl'][B['k']] + B['sgn'] * max(mB, VEE if paired(B) else 0.0)))
            if abs(cross2((qa[0] - A0[0], qa[1] - A0[1]), dA)) > 2.5 or abs(cross2((qb[0] - B0[0], qb[1] - B0[1]), dB)) > 2.5: audit['corners left pointed (an arm curves away)'] += 1; continue
            Cx = (A0[0] + dA[0] * sA, A0[1] + dA[1] * sA); bis = unit(dA[0] + dB[0], dA[1] + dB[1]); kk = R / math.sin(phi / 2)
            A['mouthR'], B['mouthL'] = mA, mB
            A['next'] = ('corner', dict(O=(Cx[0] + bis[0] * kk, Cx[1] + bis[1] * kk), R=R, TA=(Cx[0] + dA[0] * t, Cx[1] + dA[1] * t), TB=(Cx[0] + dB[0] * t, Cx[1] + dB[1] * t),
                                    A0=A0, B0=B0, rnA=rnA, rnB=rnB, cr=cr))
        for l in legs: l['cut'] = max(l['mouthL'], l['mouthR'])
        for l in legs:
            if l['pairR'] is not None: l['cut'] = l['pairR']['cut'] = max(l['cut'], l['pairR']['cut'])
        for l in legs:                                                             # where the kerb along each side ends for the corner
            vee = VEE if (l['pairL'] is not None or l['pairR'] is not None) else 0.0
            l['kendL'] = max(l['mouthL'], vee) if l['mouthL'] > 0 else 0.0; l['kendR'] = max(l['mouthR'], vee) if l['mouthR'] > 0 else 0.0
            l['pave'] = max(l['cut'], l['kendL'], l['kendR'])                      # … and how far out the crossing's own paving reaches along the arm
        for l in legs:
            if l['pairR'] is not None: l['pave'] = l['pairR']['pave'] = max(l['pave'], l['pairR']['pave'])
        ji = len(junctions)
        j = dict(nodes=nodes, p=(cx, cz), legs=legs, signal=any(m in signal for m in nodes), ctl=ji, mapped=False, outline=None)
        allway = any(('all', m) in stops for m in nodes)
        for l in legs:
            legat[(l['ri'], l['k'], l['sgn'])] = l; l['j'] = j
            s = stops.get((l['ri'], l['k'], l['sgn']))
            if not j['signal'] and l['arrives'] and (s is not None or allway): l['stop'] = s if s is not None else 0.0
        for m in nodes: jat[m] = ji
        junctions.append(j)

    # ── the crosswalks the map has ──
    for r in roads: r['mid'] = []
    xings = []
    for wid in sorted(W.ways):
        tg, nd = W.ways[wid]
        if tg.get('highway') != 'footway' or tg.get('footway') != 'crossing': continue
        nd = [m for m in nd if m in W.xz]; pts = [W.xz[m] for m in nd]
        on = [(m, ri, k) for m in nd for ri, k in use.get(m, ()) if not roads[ri]['bridge']]
        if len(pts) < 2 or not on: continue
        kind, mk = tg.get('crossing', ''), tg.get('crossing:markings', '')
        for m, _, _ in on:
            t2 = W.ntag.get(m, {}); kind = kind or t2.get('crossing', ''); mk = mk or t2.get('crossing:markings', '')
        marked = mk not in ('', 'no') or (mk == '' and kind in ('marked', 'traffic_signals', 'zebra'))
        style = 'bars' if mk.startswith('zebra') else 'ladder' if mk.startswith('ladder') else 'lines'
        near = {}                                                                  # each road it crosses: the stretch of it round the crossing
        for _, ri, k in on:
            r = roads[ri]; near.setdefault(ri, []).extend(sub(r['p'], r['cl'], r['cl'][k] - 50, r['cl'][k] + 50))
        cl = lens(pts); inside = []; s = 0.0
        while s <= cl[-1]:
            q = at(pts, cl, s)[0]
            if any(line_dist(q, p) <= roads[ri]['hw'] + 0.1 for ri, p in near.items()): inside.append(s)
            s += 0.25
        if not inside or inside[-1] - inside[0] < 2.0: continue
        line = sub(pts, cl, inside[0], inside[-1]); took = False
        for m, ri, k in on:
            if m in jnode: continue
            b = near_junction(ri, k, 45)
            if not b: roads[ri]['mid'].append((roads[ri]['cl'][k], marked)); took = True; continue
            l = legat.get((ri, b[2], 1 if k > b[2] else -1))
            if l is None: continue                                                 # (inside the crossing itself)
            # how far out along the arm the crosswalk reaches, where it lies on this roadway
            far = max([((q[0] - l['P'][0]) * l['d'][0] + (q[1] - l['P'][1]) * l['d'][1]) for q in line if line_dist(q, near[ri]) <= roads[ri]['hw'] + 0.3] or [b[0]])
            l['xw'].append((max(far, b[0]), marked)); l['j']['mapped'] = True; took = True
        if took and marked: xings.append((line, style)); audit['crosswalks the map has'] += 1

    # ── what each arm asks of the lines on it: where they stop for the crossing, where its traffic stops ──
    def crossable(l): return side_of(l['r'], 1)[0] or side_of(l['r'], -1)[0]
    for j in junctions:
        if not j['signal'] or j['mapped']: continue
        for l in j['legs']:                                                        # a signal the map has no crosswalks for: one on every arm
            if l['pairL'] is not None or not crossable(l): continue
            other = l['pairR'] or l; x = max(l['cut'], other['cut']) + XW / 2 + 0.3
            xings.append(([bedge(l, -1, x, -GUT), bedge(other, 1, x, -GUT)], 'lines')); audit['crosswalks by the rule'] += 1
            l['synth'] = other['synth'] = x
    for j in junctions:
        for l in j['legs']:
            m = l['cut']; ctl = 'signal' if j['signal'] else 'stop' if l['stop'] is not None else None
            x = max((d for d, mk in l['xw'] if mk), default=l.get('synth'))
            l['lineD'] = m if x is None else max(m, x + XW / 2 + 0.2); l['lineA'] = l['lineD']
            if l['arrives'] and ctl and not l['r']['cls'].endswith('_link') and l['r']['cls'] != 'motorway':
                l['stopd'] = max(m + 0.6, x + XW / 2 + 1.2) if x is not None else max(m + 0.6, min(l['stop'] or 0.0, m + 8.0))
                l['lineA'] = l['stopd']; l['ctl'] = ctl

    # ── the paving where roads meet, the round corners, the corners of the walks ──
    for j in junctions:
        L = j['legs']; n = len(L); out = []
        for i, A in enumerate(L):
            B = L[(i + 1) % n]; kind = A['next'][0]
            if A['pairL'] is None: out.append(bedge(A, -1, A['pave']))            # (between the two roadways of a divided road the outline runs straight across)
            if A['pairR'] is None: out.append(bedge(A, 1, A['pave']))
            if kind == 'median': continue
            if kind == 'straight': out.append(bedge(A, 1, 0.0)); out.append(bedge(B, -1, 0.0)); continue
            c = A['next'][1]; O, R = c['O'], c['R']; a0 = math.atan2(c['TA'][1] - O[1], c['TA'][0] - O[0]); a1 = math.atan2(c['TB'][1] - O[1], c['TB'][0] - O[0])
            da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi; steps = max(3, math.ceil(abs(da) * R / 1.2))
            near = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1]) <= 0.3
            def between(p0, mid, p1):                                              # p0, the points of mid, p1 — without those of mid's ends that p0 and p1 already are
                return [p0] + mid[(1 if near(p0, mid[0]) else 0):(len(mid) - 1 if near(p1, mid[-1]) else len(mid))] + [p1]
            # the kerb: from where the one street's kerb ends, round the arc, to where the next one's begins
            pa, pb = bedge(A, 1, A['kendR']), bedge(B, -1, B['kendL'])
            kerb = between(pa, [(O[0] + R * math.cos(a0 + da * k / steps), O[1] + R * math.sin(a0 + da * k / steps)) for k in range(steps + 1)], pb)
            out.extend(kerb)
            kA, wA = side_of(A['r'], A['sgn']); kB, wB = side_of(B['r'], -B['sgn'])
            if not (kA or kB): continue
            wA = wA if kA else KERBW; wB = wB if kB else KERBW
            # The walk's corner: behind the kerb's arc the walk keeps its width round the corner — from the one street's
            # width to the other's. (Where the corner is tighter than the walk is wide, the two back edges run on till
            # they meet.)
            ba, bb = bedge(A, 1, A['kendR'], wA), bedge(B, -1, B['kendL'], wB)
            if R >= max(wA, wB) + 0.4:
                m = max(2, math.ceil(abs(da) * (R - min(wA, wB)) / 1.5))
                mid = [(O[0] + (R - wB + (wB - wA) * k / m) * math.cos(a1 - da * k / m), O[1] + (R - wB + (wB - wA) * k / m) * math.sin(a1 - da * k / m)) for k in range(m + 1)]
            else:
                A0b = (c['A0'][0] + c['rnA'][0] * wA, c['A0'][1] + c['rnA'][1] * wA); B0b = (c['B0'][0] - c['rnB'][0] * wB, c['B0'][1] - c['rnB'][1] * wB)
                sq = cross2((B0b[0] - A0b[0], B0b[1] - A0b[1]), B['cd']) / c['cr']; Q = (A0b[0] + A['cd'][0] * sq, A0b[1] + A['cd'][1] * sq)
                if math.hypot(Q[0] - O[0], Q[1] - O[1]) > R + 12: Q = ((ba[0] + bb[0]) / 2, (ba[1] + bb[1]) / 2)
                mid = [(c['TB'][0] - c['rnB'][0] * wB, c['TB'][1] - c['rnB'][1] * wB), Q, (c['TA'][0] + c['rnA'][0] * wA, c['TA'][1] + c['rnA'][1] * wA)]
            back = between(bb, mid, ba)
            if not simple(kerb + back): back = [bb, ba]; audit['corners cut straight behind'] += 1
            if not simple(kerb + back): audit['corners whose outline crosses itself'] += 1
            corners.append((kerb, back)); audit['corners'] += 1
            if wA >= 1.2 and wB >= 1.2 and R >= 3.0:                                # where the kerb is cut down for wheels: a yellow pad
                am = a0 + da / 2; figures.append((PAD, O[0] + (R - 0.62) * math.cos(am), O[1] + (R - 0.62) * math.sin(am), math.degrees(am))); audit['pads'] += 1
        if not any(l['next'][0] == 'corner' for l in L): continue                  # nothing to fill: the roads' own strips cover it
        clean = []                                                                 # (to the decimetre, as the tiles keep it: no point twice)
        for q in out:
            if not clean or math.hypot(q[0] - clean[-1][0], q[1] - clean[-1][1]) > 0.15: clean.append(q)
        while len(clean) > 1 and math.hypot(clean[0][0] - clean[-1][0], clean[0][1] - clean[-1][1]) <= 0.15: clean.pop()
        if len(clean) < 3: continue
        j['raw'] = list(clean)
        twice = any(math.hypot(a[0] - b[0], a[1] - b[1]) <= 0.15 for i, a in enumerate(clean) for b in clean[i + 1:])       # (an outline that goes out along a line and back)
        if twice or not simple(clean): clean = hull(clean); audit['crossings paved out to their outermost points'] += 1      # (a tangle of ramps and roadways: what lies between its arms' mouths is road)
        box = all(l['r']['esa'] for l in L); polys.append((STREET_BOX if box else STREET, clean)); j['outline'] = clean

    # ── signal masts and stop signs, the limit lines, the word STOP ──
    def arriving(r, sgn):
        """the lanes whose traffic comes to the crossing along the arm that leaves it sgn-wards: (their indices, the
        offsets of the stretch of road they take up, with the middle lane where there is one)"""
        P, e = r['prof'], lane_edges(r); own = 'b' if sgn > 0 else 'f'
        if r['oneway']: own = 'f'
        idx = [i for i in range(len(P)) if P[i][0] in (own, 'x')]; span = [i for i in range(len(P)) if P[i][0] in (own, 'x', 'c')]
        if not span: return [], (0.0, 0.0)
        lo, hi = e[span[0]], e[span[-1] + 1]
        if P[span[0]][0] != 'c' and span[0] == 0: lo = -r['hw'] + GUT
        if P[span[-1]][0] != 'c' and span[-1] == len(P) - 1: hi = r['hw'] - GUT
        if P[0][0] == 'x': lo, hi = (0.0, r['hw'] - GUT) if sgn < 0 else (-r['hw'] + GUT, 0.0)
        return idx, (lo, hi)
    def on_way(r, s, off):
        (x, z), i = at(r['p'], r['cl'], s); f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); rn = right(f)
        return (x + rn[0] * off, z + rn[1] * off), f
    for j in junctions:
        for l in j['legs']:
            if l['stopd'] is None: continue
            r = l['r']; s = r['cl'][l['k']] + l['sgn'] * l['stopd']; idx, (lo, hi) = arriving(r, l['sgn'])
            if hi - lo < 1.0: continue
            (p0, f), (p1, _) = on_way(r, s, lo), on_way(r, s, hi); marks.append((WHT, 30, [p0, p1])); audit['limit lines'] += 1
            u = (-l['cd'][0], -l['cd'][1]); rt = right(u); e = lane_edges(r)
            if l['ctl'] == 'stop':
                for i in idx:
                    mid = (e[i] + e[i + 1]) / 2
                    if r['prof'][i][0] == 'x': mid = (lo + hi) / 2
                    (q, _) = on_way(r, s + l['sgn'] * 2.7, mid); figures.append((STOP, q[0], q[1], math.degrees(math.atan2(u[1], u[0])))); audit['STOP on the road'] += 1
                (q, _) = on_way(r, s, 0.0); signs.append((q[0] + rt[0] * (r['hw'] + 1.0), q[1] + rt[1] * (r['hw'] + 1.0), math.degrees(math.atan2(l['d'][1], l['d'][0]))))
            else:
                far = max([((q[0] - l['P'][0]) * u[0] + (q[1] - l['P'][1]) * u[1]) for q in (j['outline'] or [])] or [8.0])
                px, pz = l['P'][0] + u[0] * (far + 1.3) + rt[0] * (r['hw'] + 1.4), l['P'][1] + u[1] * (far + 1.3) + rt[1] * (r['hw'] + 1.4)
                poles.append((px, pz, math.degrees(math.atan2(u[1], u[0])), r['hw'] + 0.9, 0 if abs(u[1]) >= abs(u[0]) else 1, j['ctl']))

    # ── the crosswalks, painted ──
    for line, style in xings:
        if style in ('lines', 'ladder'):
            for o in (-(XW / 2 - 0.15), XW / 2 - 0.15): marks.append((WHT, 30, offset(line, o)))
        if style in ('bars', 'ladder'): marks.append((BARS, int(round((XW - (0.6 if style == 'ladder' else 0.0)) * 100)), line))

    # ── driveways: where the walk drops and the kerb opens ──
    aprons = collections.defaultdict(list)
    def side_at(ri, k, other):
        r = roads[ri]; i = min(k, len(r['p']) - 2); f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); rn = right(f)
        return 1 if (other[0] - r['p'][k][0]) * rn[0] + (other[1] - r['p'][k][1]) * rn[1] > 0 else -1
    for sv in service:
        m = len(sv['nd'])
        for e, n in enumerate(sv['nd']):
            if n not in use or n in jnode: continue
            for ri, k in use[n]:
                r = roads[ri]; w = 2 * sv['hw'] + 1.4
                for other in ([sv['p'][e + 1]] if e < m - 1 else []) + ([sv['p'][e - 1]] if e > 0 else []):
                    aprons[(ri, side_at(ri, k, other))].append((r['cl'][k] - w / 2, r['cl'][k] + w / 2)); audit['driveways'] += 1
    for name, (x, z), w in drives:                                                 # ways in that the map does not have
        best = None
        for ri, r in enumerate(roads):
            if r['name'] != name: continue
            for i, (a, b) in enumerate(zip(r['p'], r['p'][1:])):
                dist, t = seg_dist((x, z), a, b)
                if best is None or dist < best[0]: best = (dist, ri, r['cl'][i] + (r['cl'][i + 1] - r['cl'][i]) * t, i)
        if best:
            _, ri, d, i = best; r = roads[ri]; f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); rn = right(f); (cx, cz), _ = at(r['p'], r['cl'], d)
            aprons[(ri, 1 if (x - cx) * rn[0] + (z - cz) * rn[1] > 0 else -1)].append((d - w / 2, d + w / 2)); audit['driveways'] += 1

    # ── each road: its paving, its lines, its kerbs and walks, its median ──
    sides = {}
    def band(kind, r, d0, d1, fa, fb, more=(), flip=False):
        """a strip along road r from d0 to d1 between the offsets fa(d) and fb(d) (more: further places along it to set a
        point at; flip: listed against the road's way, so that what lay on its right lies on its left)"""
        if d1 - d0 < 0.3: return
        L = r['cl'][-1]; ds = {d0, d1} | {c for c in more if d0 < c < d1}
        for k, c in enumerate(r['cl']):
            if d0 < c < d1: ds.add(c)
        if r['hwe'][0] != r['hw'] or r['hwe'][1] != r['hw']:
            for t in range(0, int(TAPER) + 1, 2):
                for c in (float(t), L - t):
                    if d0 < c < d1: ds.add(c)
        ds = sorted(ds); pts = []
        ds = [ds[0]] + [d for d in ds[1:-1] if d - ds[0] >= 0.05 and ds[-1] - d >= 0.05] + [ds[-1]]
        ds = [d for k, d in enumerate(ds) if k in (0, len(ds) - 1) or d - ds[k - 1] >= 0.05]
        for d in ds:
            (x, z), n = frame(r, d); a, b = fa(d), fb(d); lo, hi = min(a, b), max(a, b)
            pts.append([x, z, x + n[0] * lo, z + n[1] * lo, x + n[0] * hi, z + n[1] * hi])
        # Inside a bend an edge kept far from the line comes to its corner before the line does, and a point set just
        # past the bend would lie behind it: such points are brought together (the strip's two ends stay where they are —
        # the corners and the next strip start from them)
        own = set(r['cl']); rank = [2 if k in (0, len(ds) - 1) else 1 if d in own else 0 for k, d in enumerate(ds)]     # (… and of the others, the road's own points, where the edge's corner is)
        for o in (2, 4):
            for _ in range(12):
                moved = False
                for i in range(len(pts) - 1):
                    a, b = pts[i], pts[i + 1]; tx, tz = b[0] - a[0], b[1] - a[1]
                    ex, ez = b[o] - a[o], b[o + 1] - a[o + 1]
                    if ex * tx + ez * tz >= -1e-9 and (math.hypot(ex, ez) >= 0.2 or (ex == 0 and ez == 0)): continue      # (neither behind the one before nor all but upon it)
                    q = (a[o], a[o + 1]) if rank[i] > rank[i + 1] else (b[o], b[o + 1]) if rank[i + 1] > rank[i] else ((a[o] + b[o]) / 2, (a[o + 1] + b[o + 1]) / 2)
                    a[o], a[o + 1], b[o], b[o + 1] = q[0], q[1], q[0], q[1]; moved = True
                if not moved: break
        pts = [tuple(q) for q in pts]
        if flip: pts = [(x, z, rx, rz, lx, lz) for x, z, lx, lz, rx, rz in reversed(pts)]
        def thin(a):                                                               # as rdp, on both edges at once
            if len(a) < 3: return list(a)
            p0, p1 = a[0], a[-1]; worst, wi = 0.0, 0
            for i in range(1, len(a) - 1):
                e = max(seg_dist(a[i][2:4], p0[2:4], p1[2:4])[0], seg_dist(a[i][4:6], p0[4:6], p1[4:6])[0])
                if e > worst: worst, wi = e, i
            return thin(a[:wi + 1])[:-1] + thin(a[wi:]) if worst > 0.03 else [p0, p1]
        bands.append((kind, thin(pts)))
    def paint(ty, wcm, r, d0, d1, off):
        if d1 - d0 < 0.6: return
        seg = sub(r['p'], r['cl'], d0, d1)
        if len(seg) >= 2: marks.append((ty, wcm, rdp(offset(seg, off), 0.03)))
    for ri, r in enumerate(roads):
        L = r['cl'][-1]; P, e = r['prof'], lane_edges(r); N = len(P); fast = r['v'] > 20.5
        if r['bridge']: continue
        band(STREET_BOX if r['esa'] else STREET, r, 0.0, L, lambda d: -hwf(r, d), lambda d: hwf(r, d))
        # what each crossing on this road takes away: from the lines with the way, against it, down the middle; from each side
        cutF, cutB, cutM, cutS, solidF, solidB = [], [], [], {1: [], -1: []}, [], []
        ks = [k for k, n in enumerate(r['nd']) if n in jat]
        for a, b in zip(ks, ks[1:]):
            if jat[r['nd'][a]] == jat[r['nd'][b]] and r['cl'][b] - r['cl'][a] <= 45:
                for c in (cutF, cutB, cutM, cutS[1], cutS[-1]): c.append((r['cl'][a], r['cl'][b]))
        for k in ks:
            d0 = r['cl'][k]; lm, lp = legat.get((ri, k, -1)), legat.get((ri, k, 1)); sg = junctions[jat[r['nd'][k]]]['signal']
            A = lambda l, key: l[key] if l else 0.0
            cutF.append((d0 - A(lm, 'lineA'), d0 + A(lp, 'lineD'))); cutB.append((d0 - A(lm, 'lineD'), d0 + A(lp, 'lineA')))
            cutM.append((d0 - max(A(lm, 'lineA'), A(lm, 'lineD')), d0 + max(A(lp, 'lineA'), A(lp, 'lineD'))))
            cutS[1].append((d0 - A(lm, 'kendL'), d0 + A(lp, 'kendR'))); cutS[-1].append((d0 - A(lm, 'kendR'), d0 + A(lp, 'kendL')))
            if sg and lm and lm['stopd'] is not None: solidF.append((d0 - lm['lineA'] - 30.0, d0 - lm['lineA']))
            if sg and lp and lp['stopd'] is not None: solidB.append((d0 + lp['lineA'], d0 + lp['lineA'] + 30.0))
        for d, mk in r['mid']:
            if mk:
                for c in (cutF, cutB, cutM): c.append((d - XW / 2 - 0.2, d + XW / 2 + 0.2))
        if r['oneway'] and r['rev']: cutF, cutB, solidF, solidB = cutB, cutF, solidB, solidF
        taper = [(0.0, TAPER)] * (abs(r['hwe'][0] - r['hw']) > 0.2) + [(L - TAPER, L)] * (abs(r['hwe'][1] - r['hw']) > 0.2)
        quiet = r['cls'] in QUIET and N <= 2 and not any(t for _, t in P)
        def pieces(a, b, zones):
            """[a, b] cut where it crosses the zones → [(a, b, in a zone?)]"""
            cuts = sorted({a, b} | {c for z in zones for c in z if a < c < b}); out = []
            for c0, c1 in zip(cuts, cuts[1:]):
                mid = (c0 + c1) / 2; out.append((c0, c1, any(z[0] <= mid <= z[1] for z in zones)))
            return out
        if not quiet and r['cls'] != 'motorway_link':
            for i in range(1, N):
                x = e[i]; a, b = P[i - 1], P[i]; da, db = a[0], b[0]
                turner = lambda l: bool(l[1]) and 'through' not in l[1]
                if da == 'b' and db == 'f':                                        # opposite ways: the double yellow
                    for c0, c1 in keep(L, cutM, 2.0):
                        paint(YEL, 11, r, c0, c1, x - 0.12); paint(YEL, 11, r, c0, c1, x + 0.12)
                elif 'c' in (da, db):                                              # beside the middle lane: solid outside, broken inside; before a signal the lane is the arriving side's to turn left from
                    sgn = 1 if db == 'c' else -1                                   # the middle lane lies to this side of the line
                    mine, theirs = (solidF, solidB) if db == 'f' else (solidB, solidF)   # (the traffic whose lane this line bounds; the traffic on the lane's far side)
                    for c0, c1 in keep(L, cutM, 2.0):
                        for p0, p1, own in pieces(c0, c1, mine):
                            for q0, q1, other in pieces(p0, p1, theirs):
                                if own: paint(WHT, 15, r, q0, q1, x)                # this side's own pocket: a white line beside it
                                elif other: paint(YEL, 11, r, q0, q1, x - 0.12); paint(YEL, 11, r, q0, q1, x + 0.12)
                                else: paint(YEL, 11, r, q0, q1, x - sgn * 0.1); paint(YEL_DASH, 11, r, q0, q1, x + sgn * 0.12)
                else:                                                              # the same way: broken white, solid before a signal and beside a lane to turn from
                    cuts, solid = (cutF, solidF) if da in ('f', 'x') else (cutB, solidB)
                    hard = turner(a) != turner(b) or (turner(a) and a[1] != b[1])
                    for c0, c1 in keep(L, cuts + taper, 2.0):
                        for p0, p1, s in pieces(c0, c1, solid):
                            if hard or s: paint(WHT, 15, r, p0, p1, x)
                            else: paint(WHT_LONG if fast else WHT_DASH, 12, r, p0, p1, x)
        if r['oneway'] and (r['pair'] or r['cls'] == 'motorway') and not quiet:    # a divided road's left edge: yellow
            for c0, c1 in keep(L, cutM + [(a - 3.0, b + 3.0) for a, b in aprons.get((ri, -1), ())], 2.0): paint(YEL, 11, r, c0, c1, -r['hw'] + r.get('inset', 0.0) + 0.35)
        if r['cls'] == 'motorway':
            for c0, c1 in keep(L, cutM, 2.0): paint(WHT, 12, r, c0, c1, r['hw'] - 0.35)
        # arrows in the lanes to turn from, where their traffic comes to a crossing
        for k in ks:
            for sgn in (-1, 1):
                l = legat.get((ri, k, sgn))
                if l is None or not l['arrives']: continue
                idx, _ = arriving(r, sgn); u = (-l['d'][0], -l['d'][1]); room = (r['cl'][k] if sgn < 0 else L - r['cl'][k]) - l['lineA']
                lanes = [(i, P[i][1]) for i in idx if P[i][1]]
                if l['j']['signal'] and l['stopd'] is not None and not any(t for _, t in P): lanes += [(i, {'left'}) for i in range(N) if P[i][0] == 'c']
                for i, t in lanes:
                    t = {'left' if v in ('reverse', 'slight_left', 'sharp_left') else 'right' if v in ('slight_right', 'sharp_right') else v for v in t} & {'left', 'through', 'right'}
                    kind = {frozenset(['left']): A_LEFT, frozenset(['through']): A_THRU, frozenset(['right']): A_RIGHT, frozenset(['left', 'through']): A_LEFT_THRU,
                            frozenset(['through', 'right']): A_THRU_RIGHT, frozenset(['left', 'right']): A_LEFT_RIGHT, frozenset(['left', 'through', 'right']): A_THRU}.get(frozenset(t))
                    if kind is None: continue
                    for back in (6.0, 26.0):
                        if room < back + 6: continue
                        (q, _) = on_way(r, r['cl'][k] + sgn * (l['lineA'] + back), (e[i] + e[i + 1]) / 2)
                        figures.append((kind, q[0], q[1], math.degrees(math.atan2(u[1], u[0])))); audit['arrows'] += 1
        # kerb, gutter, walk
        for s in (1, -1):
            kerb, w = side_of(r, s)
            if not kerb: continue
            drops = sorted(aprons.get((ri, s), ())); runs = []
            for c0, c1 in keep(L, cutS[s], 0.6):
                for p0, p1, low in pieces(c0, c1, drops):
                    band(APRON if low else WALK, r, p0, p1, lambda d: s * hwf(r, d), lambda d: s * (hwf(r, d) + (w if not low else max(w, WALKW))), flip=s < 0)
                    if not low and w >= 1.2: runs.append((p0, p1))
            sides[(ri, s)] = runs; audit['kerb m'] += sum(b - a for a, b in keep(L, cutS[s], 0.6))
        # the median: each roadway of a divided road carries its half of it — from the middle between the two roadways to
        # its own left edge, or, where they leave less than a median's width between them, that far into the roadway
        if r['pair']:
            run = []; mw = r.get('medw', MEDW)
            def flush():
                if len(run) >= 2:
                    gaps = dict(run); ds = sorted(gaps); wide = max(mw, sum(gaps.values()) / len(gaps)) >= 2.4
                    g = lambda d: gaps[min(ds, key=lambda c: abs(c - d))]
                    band(MEDIAN_GREEN if wide else MEDIAN, r, ds[0], ds[-1], lambda d: -hwf(r, d) - g(d) / 2 - 0.02, lambda d: -hwf(r, d) - g(d) / 2 + max(g(d), mw) / 2, ds, flip=True); audit['median m'] += ds[-1] - ds[0]
                    f0 = unit(r['p'][-1][0] - r['p'][0][0], r['p'][-1][1] - r['p'][0][1])
                    if wide and f0[0] - f0[1] > 0:                                    # down the middle of a planted median, every 22 m (from one of its two roadways only: the one that runs east or north)
                        d = ds[0] + 7.0
                        while d < ds[-1] - 4.0:
                            (x, z), n = frame(r, d); o = -hwf(r, d) - g(d) / 2
                            medians.append(((x + n[0] * o, z + n[1] * o), r['name']))
                            d += 22.0
                run.clear()
            away = [(a - 1.0, b + 1.0) for a, b in cutM] + [(a - 3.0, b + 3.0) for a, b in aprons.get((ri, -1), ())]      # at a crossing; and where a way in crosses the median, which is open there
            for d, gap in r['med']:
                if gap is None or gap < -4.0 or any(a <= d <= b for a, b in away): flush()
                else: run.append((d, min(gap, 30.0)))
            flush()

    audit['crossings'] = len(junctions); audit['signals'] = sum(1 for j in junctions if j['signal'])
    audit['stops'] = sum(1 for j in junctions for l in j['legs'] if l.get('ctl') == 'stop')
    # what must hold of any street laid out by these rules
    audit['limit lines inside a crosswalk'] = sum(1 for j in junctions for l in j['legs'] if l['stopd'] is not None and any(mk and d + XW / 2 + 0.9 > l['stopd'] for d, mk in l['xw']))
    audit['crosswalks at a crossing nobody stops at'] = sum(1 for j in junctions if not j['signal'] and not j['mapped'] and any(l.get('synth') for l in j['legs']))
    audit['signals without a crosswalk'] = sum(1 for j in junctions if j['signal'] and not any(l.get('synth') or any(mk for _, mk in l['xw']) for l in j['legs']))
    audit['corners whose outline crosses itself'] += 0; audit['corners left pointed (an arm curves away)'] += 0; audit['crossings paved out to their outermost points'] += 0
    return dict(bands=bands, polys=polys, corners=corners, marks=marks, figures=figures, poles=poles, signs=signs, medians=medians, junctions=junctions, jat=jat, legat=legat, sides=sides, audit=audit, use=use, hwf=hwf)
