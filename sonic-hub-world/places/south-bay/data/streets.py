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
  · Cars at the kerb. A street of one lane each way has a strip along each kerb where cars park (2.4 m; no line marks
    it) — where there is room for it between the buildings, and the map does not say parking is forbidden.
  · Islands. Where a place knows them (`islands`), the middle lane holds raised, planted islands; between an island's
    end and a crossing the lane is a pocket to turn left from, with a white line on its traffic's side and an arrow.
  · Where roads meet. The kerbs are joined by a round corner (4.5 m between quiet streets, 7.5 m between big ones); the
    lines stop for the crossing. At a signal: a crosswalk on each arm the map marks one on (two white lines 3 m apart,
    or bars where the map says so), a limit line 1.2 m before it across the lanes that arrive, an arrow in each lane
    to turn from. At a stop sign: a limit line and the word STOP, no crosswalk unless the map has one. Elsewhere nothing.
  · Kerb and walk. A kerb with a concrete gutter along every street, a sidewalk at the kerb (none where the map says
    there is none: then the kerb alone), carried round each corner, with a yellow pad where the kerb is cut for wheels;
    at a driveway the walk drops to the road and the kerb opens.
  · Medians. Between the two roadways of a divided road, a raised median (planted where it is 2.4 m wide or more). It
    is one thing: laid from one of the two roadways across the whole room between them, running on from one piece of
    a roadway to the next, open only where something crosses both roadways (a street, a way in, a crosswalk in
    mid-block) — a side street on one roadway's kerb side does not open it — and its ends are round. Where it is
    open the room between the roadways is paved.
  · Where a street's width changes from one piece to the next it tapers over 24 m.

Everything is in metres in the world's frame (x east, z south). Sides: +1 is the right of a line's own direction."""
import bisect, math, collections
from geom import lens, at, sub, keep, unit, right, offset, rdp

GUT, WALKW, KERBW, XW = 0.5, 2.0, 0.3, 3.0              # the gutter; a walk at the kerb; a kerb with no walk; a crosswalk
PARK = 2.4                                             # the strip along a kerb where cars park
QUIETW, QUIETL = 11.0, 3.1                             # a quiet street with cars parked along both kerbs: 36 feet from kerb to kerb, and what is left to drive in each way
MEDW = 1.2                                             # a raised median, at the least
TAPER = 12.0                                           # either side of the point where a street's width changes
EASE = 24.0                                            # … and of the point where its centre line moves sideways (a turn lane beginning: 1 in 28)
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

def parks(tg, cls, prof, oneway):
    """does a street have a strip for parked cars along each kerb: one lane each way, no lanes to turn from, of a class
    that people park on, and the map not saying otherwise"""
    if oneway or cls not in QUIET + ('tertiary',) or [d for d, _ in prof] != ['b', 'f'] or any(t for _, t in prof): return False
    said = ' '.join(tg.get(k, '') for k in ('parking:both', 'parking:left', 'parking:right', 'parking:lane:both', 'parking:lane:left', 'parking:lane:right'))
    return 'no' not in said and 'separate' not in said

def lane_edges(r):
    """the edges of a road's lanes: metres to the right of its line, from the left kerb's lane to the right kerb's
    (a roadway whose median stands in from its left edge — r['inset'] — has its lanes in what is left; a strip for
    parked cars — 'q' at the left kerb, 'p' at the right — is r['park'] wide, the lanes share the rest)"""
    P = r['prof']; pk = r.get('park', PARK); strips = sum(1 for d, _ in P if d in 'pq'); margin = 0.8 if r['oneway'] else 1.2; ins = r.get('inset', 0.0)
    lw = (r['w'] - margin - ins - pk * strips) / max(1, len(P) - strips); e = [-r['w'] / 2 + margin / 2 + ins]
    for d, _ in P: e.append(e[-1] + (pk if d in 'pq' else lw))
    return e

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

def layout(W, roads, service, drives=(), median_w=None, islands=None, crosswalks=()):
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
    median_w: {a road's name: how wide its median is, where the map's two roadways leave less}.
    islands: {a road's name: [(one end, the other end)]}: the raised islands in its middle lane, as two points each.
    crosswalks: [(one end, the other end)]: crosswalks the map does not have, each a line across a street."""
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
        for k, (a, b) in enumerate(zip(r['p'], r['p'][1:])):
            for gx in range(int(min(a[0], b[0]) // CELL), int(max(a[0], b[0]) // CELL) + 1):
                for gz in range(int(min(a[1], b[1]) // CELL), int(max(a[1], b[1]) // CELL) + 1): grid[(gx, gz)].append((ri, k, a, b))
    for ri, r in enumerate(roads):
        if not r['oneway'] or r['bridge'] or not r['name'] or r['cls'] in NOKERB or r['cls'].endswith('_link'): continue
        L = r['cl'][-1]; got = 0; seen = 0
        for d in [4.0 * k for k in range(int(L / 4.0) + 1)] + ([L] if L - 4.0 * int(L / 4.0) > 0.3 else []):      # (every 4 m, and at its end)
            (x, z), i = at(r['p'], r['cl'], d); f = unit(r['p'][i + 1][0] - r['p'][i][0], r['p'][i + 1][1] - r['p'][i][1]); ln = (f[1], -f[0]); best = None
            for gx in range(int((x - 45) // CELL), int((x + 45) // CELL) + 1):
                for gz in range(int((z - 45) // CELL), int((z + 45) // CELL) + 1):
                    for rj, kk, a, b in grid.get((gx, gz), ()):
                        o = roads[rj]
                        if rj == ri or o['name'] != r['name']: continue
                        g = unit(b[0] - a[0], b[1] - a[1])
                        if g[0] * f[0] + g[1] * f[1] > -0.6: continue                  # the other roadway runs the other way
                        dist, t = seg_dist((x, z), a, b); px, pz = a[0] + (b[0] - a[0]) * t - x, a[1] + (b[1] - a[1]) * t - z
                        if dist > 45 or px * ln[0] + pz * ln[1] < 0.7 * dist: continue    # … and lies to the left
                        if best is None or dist < best[0]: best = (dist, o['hw'], rj, o['cl'][kk] + t * math.hypot(b[0] - a[0], b[1] - a[1]))
            gap = best[0] - r['hw'] - best[1] if best else None
            r['med'].append((d, gap, best[2], best[3]) if best else (d, None, None, None)); seen += 1; got += best is not None
        r['pair'] = got >= max(2, 0.3 * seen)
        # The map's lane counts make many a divided road's two roadways as wide as the space between their lines, or
        # wider: the median then stands in from each roadway's left edge, and the lanes share what is left.
        gs = sorted(m[1] for m in r['med'] if m[1] is not None and m[1] > -4.0)
        if r['pair'] and gs:
            mw = (median_w or {}).get(r['name'], MEDW)
            if isinstance(mw, (list, tuple)):                                      # known stretch by stretch: [((x from, x to, z from, z to; None: anywhere), its width)]
                mx = sum(q[0] for q in r['p']) / len(r['p']); mz = sum(q[1] for q in r['p']) / len(r['p'])
                mw = next((w for (xa, xb, za, zb), w in mw if (xa is None or xa <= mx) and (xb is None or mx <= xb) and (za is None or za <= mz) and (zb is None or mz <= zb)), MEDW)
            r['medw'] = mw; r['inset'] = max(0.0, min(2.0, (r['medw'] - gs[len(gs) // 2]) / 2))

    # ── a street's half-width along it: where its width changes from one way to the next it tapers ──
    ends = collections.defaultdict(list)
    for ri, r in enumerate(roads):
        ends[r['nd'][0]].append((ri, 0)); ends[r['nd'][-1]].append((ri, 1))
    for ri, r in enumerate(roads):
        r['hwe'] = [r['hw'], r['hw']]; r['on'] = [None, None]; r['onr'] = [None, None]   # its half-width at either end; which way it goes on from there; as which road, by which of that road's ends
        if r['bridge']: continue
        for e, n in ((0, r['nd'][0]), (1, r['nd'][-1])):                            # the same street going on from this end, as another way
            p = r['p']; mine = unit(p[1][0] - p[0][0], p[1][1] - p[0][1]) if e == 0 else unit(p[-1][0] - p[-2][0], p[-1][1] - p[-2][1]); on = []
            for x, e2 in ends[n]:
                o = roads[x]
                if x == ri or o['name'] != r['name'] or o['cls'] != r['cls'] or o['oneway'] != r['oneway'] or o['bridge']: continue
                q = o['p']; away = unit(q[1][0] - q[0][0], q[1][1] - q[0][1]) if e2 == 0 else unit(q[-2][0] - q[-1][0], q[-2][1] - q[-1][1])
                g = away if e == 1 else (-away[0], -away[1])                       # … along this road's own way
                if g[0] * mine[0] + g[1] * mine[1] >= 0.5: on.append((o, g, (x, e2)))   # (not the other roadway of a divided road, which ends on the same point coming back)
            if len(on) == 1 and (r['name'] or len(use[n]) == 2): r['hwe'][e] = (r['hw'] + on[0][0]['hw']) / 2; r['on'][e] = on[0][1]; r['onr'][e] = on[0][2]
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

    # ── the islands in a road's middle lane: from where to where along each of its ways ──
    for r in roads:
        r['isl'] = []
        if r['bridge'] or r['oneway'] or not any(d == 'c' for d, _ in r['prof']): continue
        def where(q):
            best = (1e18, 0.0)
            for i, (a, b) in enumerate(zip(r['p'], r['p'][1:])):
                dist, t = seg_dist(q, a, b)
                if dist < best[0]: best = (dist, r['cl'][i] + (r['cl'][i + 1] - r['cl'][i]) * t)
            return best[1]
        for a, b in (islands or {}).get(r['name'], ()):
            lo, hi = sorted((where(a), where(b)))
            if hi - lo >= 1.5 and seg_dist(at(r['p'], r['cl'], (lo + hi) / 2)[0], a, b)[0] < 4.0: r['isl'].append((lo, hi))
        r['isl'].sort()

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
            rnA, rnB = right(dA), right(dB); cr = cross2(dA, dB); mA = mB = 8.0
            for _ in range(3):                                                     # (each street's width is taken where the corner turns out to begin: a street may taper to its end)
                hA = hwf(A['r'], A['r']['cl'][A['k']] + A['sgn'] * max(0.0, mA)); hB = hwf(B['r'], B['r']['cl'][B['k']] + B['sgn'] * max(0.0, mB))
                A0 = (A['cP'][0] + rnA[0] * hA, A['cP'][1] + rnA[1] * hA); B0 = (B['cP'][0] - rnB[0] * hB, B['cP'][1] - rnB[1] * hB)
                e = (B0[0] - A0[0], B0[1] - A0[1])
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

    # ── … and those a place knows of that the map has not: each across the street it crosses, a pad at either kerb ──
    for a, b in crosswalks:
        for ri, r in enumerate(roads):
            if r['bridge']: continue
            for i, (u, v) in enumerate(zip(r['p'], r['p'][1:])):
                den = cross2((v[0] - u[0], v[1] - u[1]), (b[0] - a[0], b[1] - a[1]))
                if abs(den) < 1e-9: continue
                t = cross2((a[0] - u[0], a[1] - u[1]), (b[0] - a[0], b[1] - a[1])) / den; q = cross2((a[0] - u[0], a[1] - u[1]), (v[0] - u[0], v[1] - u[1])) / den
                if not (0 <= t <= 1 and 0 <= q <= 1): continue
                d = r['cl'][i] + (r['cl'][i + 1] - r['cl'][i]) * t; (x, z), n = frame(r, d); h = hwf(r, d)
                r['mid'].append((d, True)); xings.append(([(x - n[0] * (h - GUT), z - n[1] * (h - GUT)), (x + n[0] * (h - GUT), z + n[1] * (h - GUT))], 'lines')); audit['crosswalks a place knows'] += 1
                for sd in (-1, 1):
                    if side_of(r, sd)[0] and side_of(r, sd)[1] >= 1.2: figures.append((PAD, x + n[0] * sd * (h + 0.62), z + n[1] * sd * (h + 0.62), math.degrees(math.atan2(n[1] * sd, n[0] * sd))))

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
            near = lambda p, q: math.hypot(p[0] - q[0], p[1] - q[1]) <= 1.2     # (a kerb's end that near the arc's is the arc's end: no jog of a hand's breadth)
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
        kerb = 'pq' if r['oneway'] else 'q' if own == 'b' else 'p'                  # (the strip where cars park on that traffic's side: the line reaches the kerb across it)
        idx = [i for i in range(len(P)) if P[i][0] in (own, 'x')]; span = [i for i in range(len(P)) if P[i][0] in (own, 'x', 'c') or P[i][0] in kerb]
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
    # Where a street goes on as another way between crossings and its yellow lines do not meet the next way's (the next has
    # a lane more on one side: a lane to turn from begins), the lines are not broken off and begun again a lane's width to
    # the side: over EASE metres either side they run across to each other, each way's by half; and a middle lane that the
    # next way has not opens out of its double line (and closes into it) the same way. At a crossing the lines stop
    # anyway — the two approaches' centre lines do stand a lane apart there, each side's turn lane facing the other's.
    def yellows(r):
        P, e = r['prof'], lane_edges(r)
        for i, (d, _) in enumerate(P):
            if d == 'c': return [e[i], e[i + 1]]
        return [e[i] for i in range(1, len(P)) if P[i - 1][0] == 'b' and P[i][0] == 'f'][:1]
    for r in roads: r['ease'] = []                                                  # [(from, to along it, the end the lines come in by, how far sideways there, a middle lane's middle and half-width, metres already run, of how many)]
    def joint(r, e):
        """at its end e road r goes on, between crossings, as a way whose yellow lines do not meet its own → (its lines,
        the next way's as they lie in r's frame), else None"""
        if r['onr'][e] is None or r['nd'][0 if e == 0 else -1] in jnode or r['bridge']: return None
        o, e2 = roads[r['onr'][e][0]], r['onr'][e][1]; ya = yellows(r); yb = [y if e != e2 else -y for y in yellows(o)]
        return None if not ya or not yb or o['bridge'] or any(abs(a - b) < 0.3 for a in ya for b in yb) else (ya, yb)
    def lead(r, e, delta, c, hc):
        """the lines of road r run sideways by delta at its end e (or its middle lane closes there), easing out over EASE
        metres along the street — through the ways it goes on as, where those are shorter; of a way whose other end has
        lines of its own to lead, it has half"""
        run, got = 0.0, []
        while True:
            L = r['cl'][-1]; far = 1 - e; half = joint(r, far) is not None; take = min(L / 2 if half else L, EASE - run); got.append((r, e, take, run, delta, c)); run += take
            if half or run >= EASE - 0.05 or r['onr'][far] is None or r['nd'][0 if far == 0 else -1] in jnode: break
            o, e2 = roads[r['onr'][far][0]], r['onr'][far][1]; same = far != e2
            if o['bridge'] or not yellows(o): break
            if not same: delta, c = -delta, -c
            r, e = o, e2
        for r, e, take, at0, delta, c in got: L = r['cl'][-1]; r['ease'].append((0.0, take, 0, delta, c, hc, at0, run) if e == 0 else (L - take, L, 1, delta, c, hc, at0, run))
    for r in list(roads):
        for e in (0, 1):
            j = joint(r, e)
            if not j: continue
            ya, yb = j; ca, cb = sum(ya) / len(ya), sum(yb) / len(yb)
            if len(ya) != len(yb) and abs(ca - cb) < 0.3:
                if len(ya) == 2: lead(r, e, 0.0, ca, (ya[1] - ya[0]) / 2); audit['middle lanes opening out of a double line'] += 1
                continue
            a, b = min(((a, b) for a in ya for b in yb), key=lambda q: abs(q[0] - q[1]))
            lead(r, e, (b - a) / 2, 0.0, 0.0); audit['centre lines led across to the next way\'s'] += 1
    def led(r, d, off):
        """where a line kept `off` to the right of road r's own line really runs at d along it"""
        x = off
        for a, b, e, delta, c, hc, run, T in r['ease']:
            if not a - 1e-6 <= d <= b + 1e-6: continue
            k = max(0.0, min(1.0, (run + (d - a if e == 0 else b - d)) / T)); k = k * k * (3 - 2 * k)      # 0 where the two ways meet, 1 where the street is itself again
            if hc and abs(abs(off - c) - hc) < 0.3: x = c + math.copysign(max(0.12, abs(off - c) * k), off - c)
            x += delta * (1 - k)
        return x
    steps = []
    for ri, r in enumerate(roads):                                                 # what is left of the steps (for the checks: none)
        for e in (0, 1):
            if r['onr'][e] is None or r['onr'][e][0] < ri or r['nd'][0 if e == 0 else -1] in jnode or r['bridge']: continue
            o, e2 = roads[r['onr'][e][0]], r['onr'][e][1]
            ya = [led(r, 0.0 if e == 0 else r['cl'][-1], y) for y in yellows(r)]; yb = [(1 if e != e2 else -1) * led(o, 0.0 if e2 == 0 else o['cl'][-1], y) for y in yellows(o)]
            if ya and yb and not o['bridge']:
                audit['ways joined between crossings'] += 1
                if min(abs(a - b) for a in ya for b in yb) > 0.15: audit['centre lines that step between two ways'] += 1; steps.append((r['p'][0 if e == 0 else -1], r['name'], ya, yb, ''.join(d for d, _ in r['prof']), ''.join(d for d, _ in o['prof']), r['cl'][-1], o['cl'][-1], r['ease'], o['ease']))
    audit['centre lines that step between two ways'] += 0
    def paint(ty, wcm, r, d0, d1, off):
        if d1 - d0 < 0.6: return
        zs = [z for z in r['ease'] if z[0] < d1 and z[1] > d0]
        if not zs:
            seg = sub(r['p'], r['cl'], d0, d1)
            if len(seg) >= 2: marks.append((ty, wcm, rdp(offset(seg, off), 0.03)))
            return
        ds = {d0, d1} | {c for c in r['cl'] if d0 < c < d1}
        for a, b, *_ in zs:
            t = max(a, d0)
            while t < min(b, d1): ds.add(t); t += 2.0
            ds |= {c for c in (a, b) if d0 < c < d1}
        pts = []
        for d in sorted(ds): (px, pz), n = frame(r, d); x = led(r, d, off); pts.append((px + n[0] * x, pz + n[1] * x))
        marks.append((ty, wcm, rdp(pts, 0.03)))
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
        # where this roadway's median is open: at a crossing the other roadway is part of too (a street across both, a
        # way round), at a crosswalk in mid-block, where a way in crosses it. A side street on this roadway's kerb side
        # alone does not open the median.
        if r['pair']:
            def both(k):
                o = {l['r']['ri'] for l in junctions[jat[r['nd'][k]]]['legs'] if l['r'] is not r and l['r']['oneway'] and l['r']['name'] == r['name']}
                return bool(o & {m[2] for m in r['med'] if m[2] is not None})
            A = lambda l, key: l[key] if l else 0.0
            op = [(r['cl'][a] - 1.0, r['cl'][b] + 1.0) for a, b in zip(ks, ks[1:]) if jat[r['nd'][a]] == jat[r['nd'][b]] and r['cl'][b] - r['cl'][a] <= 45]
            for k in ks:
                if not both(k): continue
                d0 = r['cl'][k]; lm, lp = legat.get((ri, k, -1)), legat.get((ri, k, 1))
                op.append((d0 - max(A(lm, 'lineA'), A(lm, 'lineD')) - 1.0, d0 + max(A(lp, 'lineA'), A(lp, 'lineD')) + 1.0))
            op += [(d - XW / 2 - 1.2, d + XW / 2 + 1.2) for d, mk in r['mid'] if mk] + [(a - 3.0, b + 3.0) for a, b in aprons.get((ri, -1), ())]
            r['open'] = op
        taper = [(0.0, TAPER)] * (abs(r['hwe'][0] - r['hw']) > 0.2) + [(L - TAPER, L)] * (abs(r['hwe'][1] - r['hw']) > 0.2)
        quiet = r['cls'] in QUIET and sum(1 for d, _ in P if d not in 'pq') <= 2 and not any(t for _, t in P)
        # between an island's end and a crossing the middle lane is a pocket for the traffic that comes to the crossing
        # there and has an arm to its left to turn into
        pockF, pockB = list(solidF), list(solidB)
        def left_turn(l):
            u = (-l['d'][0], -l['d'][1])
            return any(m is not l and m['leaves'] and cross2(u, m['d']) < -0.5 for m in l['j']['legs'])
        if r['isl']:                                                               # (… or the way's end, where the street goes on as another way that has the turn's own lane)
            if r['on'][0] is not None and 2.0 <= r['isl'][0][0] <= 45.0: pockB.append((0.0, r['isl'][0][0]))
            if r['on'][1] is not None and 2.0 <= L - r['isl'][-1][1] <= 45.0: pockF.append((r['isl'][-1][1], L))
        for k in ks:
            d0 = r['cl'][k]; lm, lp = legat.get((ri, k, -1)), legat.get((ri, k, 1))
            if lm and r['isl'] and left_turn(lm):
                tips = [b for a, b in r['isl'] if b < d0 - lm['lineA']]
                if tips and 6.0 <= d0 - lm['lineA'] - max(tips) <= 60.0: pockF.append((max(tips), d0 - lm['lineA'])); lm['pocket'] = d0 - lm['lineA'] - max(tips)
            if lp and r['isl'] and left_turn(lp):
                starts = [a for a, b in r['isl'] if a > d0 + lp['lineA']]
                if starts and 6.0 <= min(starts) - d0 - lp['lineA'] <= 60.0: pockB.append((d0 + lp['lineA'], min(starts))); lp['pocket'] = min(starts) - d0 - lp['lineA']
        def pieces(a, b, zones):
            """[a, b] cut where it crosses the zones → [(a, b, in a zone?)]"""
            cuts = sorted({a, b} | {c for z in zones for c in z if a < c < b}); out = []
            for c0, c1 in zip(cuts, cuts[1:]):
                mid = (c0 + c1) / 2; out.append((c0, c1, any(z[0] <= mid <= z[1] for z in zones)))
            return out
        if not quiet and r['cls'] != 'motorway_link':
            for i in range(1, N):
                x = e[i]; a, b = P[i - 1], P[i]; da, db = a[0], b[0]
                if da in 'pq' or db in 'pq': continue                              # beside the strip where cars park: no line
                turner = lambda l: bool(l[1]) and 'through' not in l[1]
                if da == 'b' and db == 'f':                                        # opposite ways: the double yellow
                    for c0, c1 in keep(L, cutM, 2.0):
                        paint(YEL, 11, r, c0, c1, x - 0.12); paint(YEL, 11, r, c0, c1, x + 0.12)
                elif 'c' in (da, db):                                              # beside the middle lane: solid outside, broken inside; before a signal the lane is the arriving side's to turn left from
                    sgn = 1 if db == 'c' else -1                                   # the middle lane lies to this side of the line
                    mine, theirs = (pockF, pockB) if db == 'f' else (pockB, pockF)   # (the traffic whose lane this line bounds; the traffic on the lane's far side)
                    for c0, c1 in keep(L, cutM, 2.0):
                        for i0, i1, island in pieces(c0, c1, r['isl']):
                            if island: paint(YEL, 11, r, i0, i1, x - sgn * 0.1); continue      # past an island: the solid line alone
                            for p0, p1, own in pieces(i0, i1, mine):
                                for q0, q1, other in pieces(p0, p1, theirs):
                                    if own: paint(WHT, 15, r, q0, q1, x)            # this side's own pocket: a white line beside it
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
            for c0, c1 in keep(L, r['open'] if r['pair'] else cutM, 2.0): paint(YEL, 11, r, c0, c1, -r['hw'] + r.get('inset', 0.0) + 0.35)   # (along a median the line runs as far as the median does)
        if r['cls'] == 'motorway':
            for c0, c1 in keep(L, cutM, 2.0): paint(WHT, 12, r, c0, c1, r['hw'] - 0.35)
        # arrows in the lanes to turn from, where their traffic comes to a crossing
        for k in ks:
            for sgn in (-1, 1):
                l = legat.get((ri, k, sgn))
                if l is None or not l['arrives']: continue
                idx, _ = arriving(r, sgn); u = (-l['d'][0], -l['d'][1]); room = (r['cl'][k] if sgn < 0 else L - r['cl'][k]) - l['lineA']
                lanes = [(i, P[i][1]) for i in idx if P[i][1]]
                if ((l['j']['signal'] and l['stopd'] is not None) or l.get('pocket')) and not any(t for _, t in P): lanes += [(i, {'left'}) for i in range(N) if P[i][0] == 'c']
                for i, t in lanes:
                    t = {'left' if v in ('reverse', 'slight_left', 'sharp_left') else 'right' if v in ('slight_right', 'sharp_right') else v for v in t} & {'left', 'through', 'right'}
                    kind = {frozenset(['left']): A_LEFT, frozenset(['through']): A_THRU, frozenset(['right']): A_RIGHT, frozenset(['left', 'through']): A_LEFT_THRU,
                            frozenset(['through', 'right']): A_THRU_RIGHT, frozenset(['left', 'right']): A_LEFT_RIGHT, frozenset(['left', 'through', 'right']): A_THRU}.get(frozenset(t))
                    if kind is None: continue
                    for back in (6.0, 26.0):
                        if room < back + 6 or (P[i][0] == 'c' and l.get('pocket') and back > l['pocket'] - 8.0): continue
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
        # the islands in the middle lane: raised, planted, their ends rounded; two halves, each with its kerb on the lane's side
        ic = next((i for i in range(N) if P[i][0] == 'c'), None)
        for d0, d1 in (r['isl'] if ic is not None else ()):
            mid = (e[ic] + e[ic + 1]) / 2; full = (e[ic + 1] - e[ic]) / 2 - 0.3
            def half(d):
                t = max(0.0, min(1.0, min(d - d0, d1 - d) / full)); return max(0.1, full * math.sqrt(1 - (1 - t) ** 2))
            nose = [d0 + full * k for k in (0.06, 0.2, 0.45, 0.72, 1.0)] + [d1 - full * k for k in (0.06, 0.2, 0.45, 0.72, 1.0)]
            band(MEDIAN_GREEN, r, d0, d1, lambda d: mid - half(d), lambda d: mid, nose)
            band(MEDIAN_GREEN, r, d0, d1, lambda d: mid, lambda d: mid + half(d), nose, flip=True)
            audit['islands'] += 1; audit['island m'] += d1 - d0
            d = d0 + 4.5
            while d < d1 - 3.5:                                                    # … and what grows on them
                (x, z), n = frame(r, d); medians.append(((x + n[0] * mid, z + n[1] * mid), r['name'])); d += 11.0

    # ── the medians of divided roads ──
    # A median is one thing, though it lies between two roadways: it is laid from one of them (the one that runs east
    # or north where it is), across the whole room between the two roadways' left edges — or, where they leave less
    # than a median's width between them, that far into each. It is there as long as neither roadway has it open, its
    # ends are round, and where one way of a roadway is followed by the next it runs on.
    def beside(r, d):
        """the other roadway beside r at d metres along: (how far apart the two lines are, the other road, where along it)"""
        m = r['med']; i = max(0, min(len(m) - 2, bisect.bisect_right([q[0] for q in m], d) - 1)) if len(m) > 1 else 0
        a, b = m[i], m[min(i + 1, len(m) - 1)]
        if a[1] is None or b[1] is None or a[2] != b[2] or b[0] - a[0] < 1e-6:           # (no two samples of one roadway to go between: from the nearer one, the other roadway running the other way)
            q = a if (b[1] is None or (a[1] is not None and abs(d - a[0]) <= abs(d - b[0]))) else b
            return None if q[1] is None else (q[1] + r['hw'] + roads[q[2]]['hw'], roads[q[2]], q[3] - (d - q[0]))
        t = max(0.0, min(1.0, (d - a[0]) / (b[0] - a[0]))); o = roads[a[2]]
        return (a[1] + (b[1] - a[1]) * t + r['hw'] + o['hw'], o, a[3] + (b[3] - a[3]) * t)
    def shut(r, d):
        """is there a median beside r at d: the other roadway is there, and neither has it open"""
        q = beside(r, d)
        if q is None or q[0] - r['hw'] - q[1]['hw'] < -4.0 or any(a <= d <= b for a, b in r.get('open', ())): return False
        return not any(a <= q[2] <= b for a, b in q[1].get('open', ()))
    def leads(r, d):
        """is r the roadway its median is laid from, at d: of the two, the one that runs east or north there (judged by
        the way the pair runs — this roadway's heading less the other's — so that the two never both think so, nor neither)"""
        way = lambda o, c: (lambda i: unit(o['p'][i + 1][0] - o['p'][i][0], o['p'][i + 1][1] - o['p'][i][1]))(at(o['p'], o['cl'], max(0.0, min(o['cl'][-1], c)))[1])
        f = way(r, d); q = beside(r, d); g = way(q[1], q[2]) if q else (-f[0], -f[1])
        return (f[0] - g[0]) - (f[1] - g[1]) > 0
    for ri, r in enumerate(roads):
        if not r['pair'] or r['bridge'] or len(r['med']) < 2: continue
        L = r['cl'][-1]; mw = r.get('medw', MEDW); ds = [m[0] for m in r['med']]; there = [shut(r, d) for d in ds]; ok = [t and leads(r, d) for t, d in zip(there, ds)]; i = 0
        def edge(a, b, test):
            """between a (where the test holds) and b (where it does not): where it stops holding, to a few centimetres"""
            for _ in range(7):
                c = (a + b) / 2
                if test(c): a = c
                else: b = c
            return a
        def goes_on(end):
            """does the median run on past this end of the way (0 its start, 1 its end), along the roadway's next way"""
            for rj, e in ends[r['nd'][-1 if end else 0]]:
                o = roads[rj]
                if rj != ri and o['pair'] and o['oneway'] and o['name'] == r['name'] and len(o['med']) > 1 and shut(o, o['cl'][-1] if e else 0.0): return True
            return False
        def gt(d): q = beside(r, d); return max(-4.0, min(30.0, q[0] - hwf(r, d) - hwf(q[1], q[2]))) if q else mw      # the room between the two roadways as they are paved
        def mid(d): return -hwf(r, d) - gt(d) / 2
        # where the median is open the room between the two roadways is road: paved across, from under the one round
        # end to under the other
        for a, b in r.get('open', ()):
            a, b = max(0.0, a - max(gt(max(0.0, a)), mw) / 2 - 0.5), min(L, b + max(gt(min(L, b)), mw) / 2 + 0.5); run = []; d = a
            while d <= b + 1.0:
                c = min(d, b); q = beside(r, c)
                if q is not None and q[0] - hwf(r, c) - hwf(q[1], q[2]) > 0.05 and leads(r, c): run.append(c)
                if (q is None or d >= b or run[-1:] != [c]) and run:
                    if len(run) >= 2:                                               # (an outline, not a strip: by a crossing the two roadways run together to a point)
                        out = [on_way(r, c, -hwf(r, c) - max(0.0, gt(c)) - 0.05)[0] for c in run] + [on_way(r, c, -hwf(r, c) + 0.05)[0] for c in reversed(run)]
                        clean = [p for k, p in enumerate(out) if math.hypot(p[0] - out[k - 1][0], p[1] - out[k - 1][1]) > 0.15]
                        if len(clean) >= 3: polys.append((STREET_BOX if r['esa'] else STREET, clean if simple(clean) else hull(clean)))
                    run = []
                d += 1.0
        while i < len(ds):
            if not ok[i]: i += 1; continue
            j = i
            while j + 1 < len(ds) and ok[j + 1]: j += 1
            # an end is round where the median itself stops — not where the way ends and the median runs on along the
            # next, nor where the other roadway takes over the laying of it
            n0 = not there[i - 1] if i > 0 else not goes_on(0); n1 = not there[j + 1] if j + 1 < len(ds) else not goes_on(1)
            e0 = ds[i] if i == 0 else edge(ds[i], ds[i - 1], (lambda d: shut(r, d)) if n0 else (lambda d: leads(r, d)))
            e1 = ds[j] if j + 1 == len(ds) else edge(ds[j], ds[j + 1], (lambda d: shut(r, d)) if n1 else (lambda d: leads(r, d)))
            i = j + 1
            if e1 - e0 < 1.5: continue
            def half(d, e0=e0, e1=e1, n0=n0, n1=n1):
                h = max(gt(d), mw) / 2; t = min((d - e0) if n0 else 9e9, (e1 - d) if n1 else 9e9) / max(h, 0.3)
                return h if t >= 1 else max(0.08, h * math.sqrt(1 - (1 - max(0.0, t)) ** 2))
            inside = [d for d in ds if e0 < d < e1]; mean = sum(gt(d) for d in inside + [e0, e1]) / (len(inside) + 2); wide = max(mw, mean) >= 2.4
            h0, h1 = max(gt(e0), mw) / 2, max(gt(e1), mw) / 2
            more = [d for d in inside + ([e0 + h0 * k for k in (0.06, 0.2, 0.45, 0.72, 1.0)] if n0 else []) + ([e1 - h1 * k for k in (0.06, 0.2, 0.45, 0.72, 1.0)] if n1 else []) if e0 < d < e1]
            kind = MEDIAN_GREEN if wide else MEDIAN
            band(kind, r, e0, e1, lambda d: mid(d) - half(d), lambda d: mid(d) + 0.02, more)                 # the far half: its kerb to the other roadway
            band(kind, r, e0, e1, lambda d: mid(d) - 0.02, lambda d: mid(d) + half(d), more, flip=True)      # the near half: its kerb to this one
            audit['median m'] += e1 - e0
            if wide:                                                                # down the middle of a planted median, every 22 m
                d = e0 + 7.0
                while d < e1 - 4.0:
                    (x, z), n = frame(r, d); o = mid(d)
                    medians.append(((x + n[0] * o, z + n[1] * o), r['name']))
                    d += 22.0

    audit['crossings'] = len(junctions); audit['signals'] = sum(1 for j in junctions if j['signal'])
    audit['stops'] = sum(1 for j in junctions for l in j['legs'] if l.get('ctl') == 'stop')
    # what must hold of any street laid out by these rules
    audit['limit lines inside a crosswalk'] = sum(1 for j in junctions for l in j['legs'] if l['stopd'] is not None and any(mk and d + XW / 2 + 0.9 > l['stopd'] for d, mk in l['xw']))
    audit['crosswalks at a crossing nobody stops at'] = sum(1 for j in junctions if not j['signal'] and not j['mapped'] and any(l.get('synth') for l in j['legs']))
    audit['signals without a crosswalk'] = sum(1 for j in junctions if j['signal'] and not any(l.get('synth') or any(mk for _, mk in l['xw']) for l in j['legs']))
    audit['corners whose outline crosses itself'] += 0; audit['corners left pointed (an arm curves away)'] += 0; audit['crossings paved out to their outermost points'] += 0
    audit['islands'] += 0; audit['streets with cars at the kerb m'] = round(sum(r['cl'][-1] for r in roads if any(d in 'pq' for d, _ in r['prof']) and not r['bridge']))
    return dict(bands=bands, polys=polys, corners=corners, marks=marks, figures=figures, poles=poles, signs=signs, medians=medians, junctions=junctions, jat=jat, legat=legat, sides=sides, audit=audit, use=use, hwf=hwf, steps=steps)
