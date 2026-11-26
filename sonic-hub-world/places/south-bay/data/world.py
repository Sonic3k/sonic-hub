#!/usr/bin/env python3
"""Turns OpenStreetMap extracts into the data of the South Bay world: its tiles and the paths a car drives.

usage: python3 world.py <out dir> <extract.osm> [more.osm …]
       (extracts: the OSM API's /map?bbox=…, about a square kilometre or two each; ways are whole in each, so
        overlapping extracts merge cleanly)

       The five extracts of 26/11/2026 (bbox = west,south,east,north):
         -118.4010,33.9175,-118.3760,33.9345 · -118.4075,33.9345,-118.3715,33.9406 · -118.4075,33.9129,-118.3715,33.9175
         -118.4075,33.9175,-118.4010,33.9345 · -118.3760,33.9175,-118.3715,33.9345
       then: python3 world.py ../world *.osm

Writes  <out>/tiles/<i>_<j>.json   one per 500 m square that holds anything (see TILE below)
        <out>/index.json           which tiles exist, and the counts
        <out>/routes.json          the routes (see route() below)
Data (c) OpenStreetMap contributors, ODbL.

Metres: x east, z south, y up; the origin is 33.92290 N, 118.39500 W — the frame of places/esa-el-segundo-2015, which
this world holds as a site. What that place draws itself — the buildings, lots and service ways whose points' mean
lies in its box (the rule of its own data/osm2js.py) — is left out of the tiles; the world loads the place there
instead. The STREETS of the box are the world's all the same: one set of rules lays out every street (streets.py),
and inside a world the place draws none of its own (its town.js).

Everything about the streets that needs the whole network is worked out here and in streets.py — lanes and their
lines, where roads meet, crosswalks, limit lines, arrows, kerbs, gutters, walks, round corners, driveways, medians,
where the signal poles, the stop signs, the lights and the street trees stand — so that the page only has to turn
lines into triangles.

TILE (lengths in decimetres, local to the tile's north-west corner; angles in degrees):
  b  [[height, kind, x,z,…]]        buildings (outline, positive shoelace in x,z). kind: 0 house 1 apartments 2 glass
                                    tower 3 office 4 industrial 5 retail 6 parking structure 7 hotel 8 open roof
  g  0 | 1                          what lies under everything where nothing else says: 0 paved lots 1 yards
  u  [[kind, x,z,…]]                land use, under the areas: 0 works, offices, shops (paved) 1 homes (yards)
  a  [[kind, x,z,…]]                areas: 0 parking lot 1 green 2 concrete 3 bare ground 4 water
  r  [[halfwidth, kind, x,z,…]]     paved ribbons along a centre line: kind 1 service way 2 runway/taxiway
  k  [[kind, lx,lz, wx,wz, …]]      the streets' strips, in CENTIMETRES: for each point the left edge (the first as it
                                    is, the others as the step from the one before) and the step across to the right
                                    edge, looking along the list. kind: 0 a street · 1 a street in the hotel place's
                                    box (it lies 2 cm higher, as that place's lots are fitted to) · 3 a walk · 5 a
                                    driveway's apron · 6 half of a paved median · 7 half of a planted one. Of 3, 5, 6, 7
                                    the left edge is the kerb; a walk's and an apron's gutter lies beyond it, in the road
  o  [[kind, x,z,…]]                outlines: the paving where roads meet (kind as k: 0 or 1)
  c  [[n, x,z, dx,dz, …]]           the round corners of the walks, in CENTIMETRES: the outline's first point and the
                                    steps to the others; its first n points are the kerb (from where one street's kerb
                                    ends, round the arc, to where the next one's begins), the rest the walk's back edge
  m  [[type, width_cm, x,z,…]]      painted lines, in CENTIMETRES: 0 yellow 1 white 2 white, broken 12 ft in 48
                                    3 a crosswalk's bars 4 yellow, broken 12 in 48 5 white, broken 7 ft in 24
                                    6 yellow, broken 7 in 24
  y  [[kind, x_cm, z_cm, degrees]]  painted figures, read by traffic travelling that way: 0 left arrow 1 through
                                    2 right 3 left + through 4 through + right 5 the word STOP 6 left + right
                                    8 the yellow pad at a corner
  e  [[kind, height, halfwidth, x,z,…]]   decks in the air: 0 a track of the light rail 1 a road bridge
  p  [[type, x, z, a, s]]           things: 0 tree (s: crown radius) 1 palm (s: height) 2 street light (a: the way
                                    its arm reaches) 4 stop sign (a: the way it faces) 5 a parked car (a: the way its
                                    nose points; s: which colour)
  q  [[x, z, a, height, kind]]      the piers under the decks (a: along the deck; kind as e), none standing in a road
  s  [[x, z, a, arm, group, junction]]   signal poles: a = the way the traffic it governs travels; the arm reaches
                                    to that traffic's left; group 0 north–south 1 east–west

Roads bend. The map draws a bend as a few straight strokes; before anything is made of the roads, World.curve eases
each road's line into a curve (no point of it moved further than a metre; where roads meet nothing moves).

ROUTE (routes.json holds a list of them). A route is not the lane's line but what a car's back axle traces when the
car is driven along that line (drive_line) — so the page gets a heading and a curvature that are a car's, and not
differences between the points of a line, which made the car twitch on a straight street. Lengths along: metres of
the path.
  pts       [x,z,…]                 the path, a point every half metre, in millimetres (the world's frame)
  hd        [h,…]                   the heading at each point, 1e-5 rad (atan2(dz, dx), running on past ±180°)
  k         [k,…]                   the curvature at each point, 1e-6 per metre (+ bends to the right)
  lim       [[from, m/s]]           the speed each stretch allows
  band      [[from, left, right]]   the room a hand on the wheel has: metres to either side of the path
  ctl       [[at, kind, controller, group]]   where the car stands for a signal (kind 0) or a stop sign (1): its
                                    bumper half a metre short of the line
  turns     [[from, to, ±1]]        where an indicator blinks (+1 right)
  names     [[from, street]]
  straight  [[from, to]]            where the street is straight: the lane's own line turns by no more than 0.6° within
                                    20 m either way. There the wheel is held still — checks.mjs holds the drive to it.
  stray                             the furthest the path leaves the lane's line, metres

index.json also holds `streets`: what streets.py counted of what it laid out (crossings, crosswalks from the map and
by the rule, limit lines, corners, kerb…) and of what must never be (a limit line inside a crosswalk, a corner whose
outline crosses itself…) — places/south-bay/checks.mjs holds the tiles to it.
"""
import sys, os, math, json, heapq, bisect, hashlib, collections, xml.etree.ElementTree as ET

LAT0, LON0 = 33.92290, -118.39500
KX = math.cos(math.radians(LAT0)) * 111320.0; KZ = 110574.0
T = 500.0
LANE = 3.4
ESA_BOX = (-280, 780, -270, 250)          # X0, X1, Z0, Z1 of places/esa-el-segundo-2015/data/osm2js.py
ROAD = {  # class: (lanes when the map does not say: two-way, one-way · metres a second)
    'motorway': (8, 4, 29.0), 'motorway_link': (2, 1, 18.0), 'trunk': (6, 3, 22.0), 'trunk_link': (2, 1, 16.0),
    'primary': (6, 3, 20.1), 'primary_link': (2, 1, 13.0), 'secondary': (4, 2, 17.9), 'secondary_link': (2, 1, 12.0),
    'tertiary': (2, 2, 15.6), 'tertiary_link': (2, 1, 11.0), 'residential': (2, 1, 11.2), 'unclassified': (2, 1, 11.2),
    'living_street': (2, 1, 5.0)}
H_DEFAULT = {'house': 5.5, 'residential': 6.5, 'apartments': 8.5, 'garage': 3.0, 'garages': 3.0, 'roof': 4.5, 'retail': 6.0,
             'commercial': 9.0, 'industrial': 8.0, 'warehouse': 9.0, 'hotel': 12.0, 'office': 15.0, 'yes': 7.0}

def h32(*a): return int(hashlib.md5('|'.join(map(str, a)).encode()).hexdigest()[:8], 16)

from geom import lens, at, sub, keep, unit, right, normals, offset, rdp, ring, clip, clipn, resample
import streets as ST

# ── reading ────────────────────────────────────────────────────────────────────────────────────────────────────────
class World:
    def __init__(self, files):
        self.nodes, self.ntag, self.ways, self.rels = {}, {}, {}, {}
        for fn in files:
            root = ET.parse(fn).getroot()
            for n in root.findall('node'):
                i = n.get('id'); self.nodes[i] = (float(n.get('lat')), float(n.get('lon')))
                tg = {g.get('k'): g.get('v') for g in n.findall('tag')}
                if tg: self.ntag[i] = tg
            for w in root.findall('way'):
                i = w.get('id'); nd = [x.get('ref') for x in w.findall('nd')]
                if i not in self.ways or len(nd) > len(self.ways[i][1]): self.ways[i] = ({g.get('k'): g.get('v') for g in w.findall('tag')}, nd)
            for r in root.findall('relation'):
                tg = {g.get('k'): g.get('v') for g in r.findall('tag')}
                if tg.get('type') == 'multipolygon' and 'building' in tg:
                    self.rels[r.get('id')] = (tg, [m.get('ref') for m in r.findall('member') if m.get('type') == 'way' and m.get('role') in ('outer', '')])
        self.xz = {i: ((lo - LON0) * KX, -(la - LAT0) * KZ) for i, (la, lo) in self.nodes.items()}
        self.eased = self.curve()
    def pts(self, nd): return [self.xz[n] for n in nd if n in self.xz]
    def curve(self, sigma=9.0, step=2.0, most=1.0):
        """The map draws a bend in a road as a few straight strokes with a kink at each of its points; a road bends.
        Here every road's line is eased as a draughtsman would ease it — each point drawn towards the mean of the line
        about it, some `sigma` metres either way: a kink of 12° becomes a bend 40 m long of 120 m radius — and gets
        the points in between that hold the curve (their names: <way>~<n>). A street cut into several ways is eased
        as one line. No point of a road is moved further than `most` metres (a sharp bend is eased less). Left where
        they are: where roads meet, where a road ends or turns a real corner (30° and more), and the streets the
        hotel place draws itself. A straight road comes out as it went in.
        → (roads eased, points moved, the furthest a point moved, points added)"""
        road = {w: [n for n in nd if n in self.xz] for w, (tg, nd) in self.ways.items() if tg.get('highway') in ROAD and tg.get('area') != 'yes'}
        road = {w: nd for w, nd in road.items() if len(nd) >= 2}
        uses, ends, fixed = collections.Counter(), collections.defaultdict(list), set()
        for w, nd in road.items():
            for n in nd: uses[n] += 1
            ends[nd[0]].append(w); ends[nd[-1]].append(w)
            if self.esa(nd): fixed.update(nd)
        held = {w for w, nd in road.items() if self.esa(nd)}
        def link(n):
            """the two ways that are one street carried on through point n, or None"""
            if uses[n] != 2 or len(ends[n]) != 2 or ends[n][0] == ends[n][1] or n in fixed: return None
            ta, tb = self.ways[ends[n][0]][0], self.ways[ends[n][1]][0]
            return ends[n] if ta.get('name', '') == tb.get('name', '') and ta.get('highway') == tb.get('highway') else None
        done, eased, moved, far, added = set(), 0, 0, 0.0, 0
        for w0 in sorted(road):
            if w0 in done or w0 in held: continue
            chain = [(w0, False)]; done.add(w0)                                     # (way, taken backwards)
            while True:                                                            # on from its end …
                w, rev = chain[-1]; n = road[w][0] if rev else road[w][-1]; l = link(n)
                o = (l[0] if l[1] == w else l[1]) if l else None
                if o is None or o in done or o in held: break
                chain.append((o, road[o][0] != n)); done.add(o)
            while True:                                                            # … and back from its start
                w, rev = chain[0]; n = road[w][-1] if rev else road[w][0]; l = link(n)
                o = (l[0] if l[1] == w else l[1]) if l else None
                if o is None or o in done or o in held: break
                chain.insert(0, (o, road[o][-1] != n)); done.add(o)
            ids, span = [], []                                                     # the line's points; for each way, which of them are its own
            for w, rev in chain:
                nd = road[w][::-1] if rev else road[w]; a = len(ids) - 1 if ids else 0
                ids.extend(nd[1:] if ids else nd); span.append((a, len(ids) - 1))
            P = [self.xz[n] for n in ids]
            if len(P) < 3: continue
            def kink(i):
                a = math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]); b = math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0])
                return abs((b - a + math.pi) % (2 * math.pi) - math.pi)
            pin = [True] + [ids[i] in fixed or (uses[ids[i]] > 1 and not link(ids[i])) or kink(i) >= math.radians(30) for i in range(1, len(P) - 1)] + [True]
            if not any(not pin[i] and kink(i) > math.radians(0.3) for i in range(1, len(P) - 1)): continue
            D, node_at, hold = [P[0]], [0], [True]                                 # a point every `step` metres
            for i in range(1, len(P)):
                L = math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); m = max(1, int(round(L / step)))
                for k in range(1, m): t = k / m; D.append((P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t)); hold.append(False)
                D.append(P[i]); hold.append(pin[i]); node_at.append(len(D) - 1)
            D0, give, reach = D, [0.0 if h else 1.0 for h in hold], int(round(sigma / step))   # give: how freely each point moves
            for _ in range(12):
                D = D0
                for _ in range(int(round(2 * (sigma / step) ** 2))):
                    D = [D[i] if hold[i] else (D[i][0] + give[i] * ((D[i - 1][0] + D[i + 1][0]) / 2 - D[i][0]) / 2, D[i][1] + give[i] * ((D[i - 1][1] + D[i + 1][1]) / 2 - D[i][1]) / 2) for i in range(len(D))]
                over = {j for i in range(len(D)) if math.hypot(D[i][0] - D0[i][0], D[i][1] - D0[i][1]) > most for j in range(max(0, i - reach), min(len(D), i + reach + 1))}
                if not over: break
                for j in over: give[j] *= 0.7
            new, where = [ids[0]], [0]                                             # the line with its new points; where each old point now is in it
            for i in range(1, len(P)):
                for q in rdp(D[node_at[i - 1]:node_at[i] + 1], 0.03)[1:-1]:
                    nid = '%s~%d' % (chain[0][0], added); added += 1; self.xz[nid] = q; new.append(nid)
                d = math.hypot(D[node_at[i]][0] - P[i][0], D[node_at[i]][1] - P[i][1])
                if d > 1e-6: self.xz[ids[i]] = D[node_at[i]]; moved += 1; far = max(far, d)
                new.append(ids[i]); where.append(len(new) - 1)
            for (w, rev), (a, b) in zip(chain, span):
                nd = new[where[a]:where[b] + 1]; self.ways[w] = (self.ways[w][0], nd[::-1] if rev else nd)
            eased += 1
        assert held == {w for w in road if self.esa(self.ways[w][1])}, 'easing the roads moved a street into or out of the hotel place'
        return eased, moved, round(far, 2), added
    def esa(self, nd):
        """does places/esa-el-segundo-2015 hold this way (its own rule: the mean of the way's points, to 0.1 m)"""
        p = [(round(x, 1), round(z, 1)) for x, z in self.pts([n for n in nd if '~' not in n])]
        if len(p) < 2: return False
        cx = sum(q[0] for q in p) / len(p); cz = sum(q[1] for q in p) / len(p)
        return ESA_BOX[0] < cx < ESA_BOX[1] and ESA_BOX[2] < cz < ESA_BOX[3]

def build(W, bounds):
    """→ (tiles, roads, junctions, service): everything the tiles hold, and the network for the routes"""
    BX0, BX1, BZ0, BZ1 = bounds
    def near(p): return any(BX0 - 80 < x < BX1 + 80 and BZ0 - 80 < z < BZ1 + 80 for x, z in p)

    # ── the roads ──
    roads, service, lanes_by_name = [], [], collections.defaultdict(list)
    for wid, (tg, nd) in W.ways.items():
        hw = tg.get('highway')
        if hw in ROAD and tg.get('area') != 'yes' and 'lanes' in tg and tg['lanes'].split(';')[0].isdigit():
            lanes_by_name[(tg.get('name', ''), hw, tg.get('oneway') == 'yes')].append(int(tg['lanes'].split(';')[0]))
    for wid, (tg, nd) in sorted(W.ways.items()):
        hw = tg.get('highway')
        if hw not in ROAD and hw != 'service': continue
        if tg.get('area') == 'yes' or tg.get('access') == 'no' or tg.get('tunnel') in ('yes', 'building_passage'): continue
        nd = [n for n in nd if n in W.xz]; p = [W.xz[n] for n in nd]
        if len(p) < 2 or not near(p): continue
        esa = W.esa(nd)
        if hw == 'service':
            if tg.get('service') == 'drive-through': continue
            kind = tg.get('service', '')
            service.append(dict(id=wid, nd=nd, p=p, cl=lens(p), kind=kind, hw={'parking_aisle': 3.1, 'driveway': 2.6, 'alley': 2.5}.get(kind, 3.0), esa=esa,
                                oneway=tg.get('oneway') == 'yes'))
            continue
        ow = tg.get('oneway') in ('yes', '1', 'true') or hw == 'motorway'
        l0 = tg.get('lanes', '').split(';')[0]
        if l0.isdigit(): lanes = int(l0)
        elif esa: lanes = 2                                                      # the hotel place's own rule
        else:
            same = lanes_by_name.get((tg.get('name', ''), hw, ow)) if tg.get('name') else None
            lanes = min(same) if same else ROAD[hw][1 if ow else 0]
        lanes = max(1, min(lanes, 10))
        prof = ST.lanes_of(tg, lanes, ow)                                        # its lanes from kerb to kerb
        if esa:
            if len(prof) != lanes: prof = ST.lanes_of({}, lanes, ow)             # (the hotel place's own widths stand: the lanes are fitted into them)
        else: lanes = max(1, min(len(prof), 10)); prof = prof[:lanes]
        if (tg.get('name', ''), lanes) in STRIPES and not any(k.startswith(('lanes:', 'turn:')) for k in tg): prof = [(c, set()) for c in STRIPES[(tg.get('name', ''), lanes)]]
        v = ROAD[hw][2]; ms = tg.get('maxspeed', '')
        if ms.endswith('mph') and ms.split()[0].isdigit(): v = int(ms.split()[0]) * 0.44704
        try: layer = int(tg.get('layer', '1' if tg.get('bridge') else '0'))
        except ValueError: layer = 0
        roads.append(dict(id=wid, nd=nd, p=p, cl=lens(p), name=tg.get('name', ''), cls=hw, lanes=lanes, oneway=ow, w=lanes * LANE + (0.8 if ow else 1.2),
                          bridge=bool(tg.get('bridge')) and tg.get('bridge') != 'no', layer=layer, esa=esa, v=v, rev=tg.get('oneway') == '-1', tg=tg, prof=prof))
    for ri, r in enumerate(roads): r['hw'] = r['w'] / 2; r['ri'] = ri

    # ── where the paving is, to keep other things off it: segments by 30 m square ──
    CELL = 30.0; seggrid = collections.defaultdict(list)
    def lay(p, hw, tag):
        for (ax, az), (bx, bz) in zip(p, p[1:]):
            for gx in range(int(math.floor((min(ax, bx) - hw - 6) / CELL)), int(math.floor((max(ax, bx) + hw + 6) / CELL)) + 1):
                for gz in range(int(math.floor((min(az, bz) - hw - 6) / CELL)), int(math.floor((max(az, bz) + hw + 6) / CELL)) + 1): seggrid[(gx, gz)].append((ax, az, bx, bz, hw, tag))
    for r in roads:
        if not r['bridge']: lay(r['p'], r['hw'], r['id'])
    for sv in service: lay(sv['p'], sv['hw'], sv['id'])
    def paved(x, z, margin, skip=None):
        for ax, az, bx, bz, hw, tag in seggrid.get((int(math.floor(x / CELL)), int(math.floor(z / CELL))), ()):
            if tag == skip: continue
            L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9; t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L2))
            if math.hypot(ax + (bx - ax) * t - x, az + (bz - az) * t - z) < hw + margin: return True
        return False
    bgrid = collections.defaultdict(list)
    for wid, (tg, nd) in W.ways.items():
        if 'building' in tg and tg.get('building') != 'no':
            p = W.pts(nd)
            if len(p) > 3 and near(p):
                xs = [q[0] for q in p]; zs = [q[1] for q in p]
                for gx in range(int(math.floor(min(xs) / CELL)), int(math.floor(max(xs) / CELL)) + 1):
                    for gz in range(int(math.floor(min(zs) / CELL)), int(math.floor(max(zs) / CELL)) + 1): bgrid[(gx, gz)].append(p)
    def built(x, z):
        for p in bgrid.get((int(math.floor(x / CELL)), int(math.floor(z / CELL))), ()):
            ins = False
            for (x0, z0), (x1, z1) in zip(p, p[1:]):
                if (z0 > z) != (z1 > z) and x < x0 + (z - z0) / (z1 - z0) * (x1 - x0): ins = not ins
            if ins: return True
        return False

    # ── the streets: lanes and their lines, where roads meet, kerbs and walks (streets.py) ──
    S = ST.layout(W, roads, service, DRIVES, MEDIAN_W)

    # ── tiles ──
    tiles = collections.defaultdict(lambda: collections.defaultdict(list))
    def loc(p, i, j): return [v for x, z in p for v in (int(round((x - i * T) * 10)), int(round((z - j * T) * 10)))]
    def inb(x, z): return BX0 <= x < BX1 and BZ0 <= z < BZ1
    def lines(key, head, p, k=10):
        xs = [q[0] for q in p]; zs = [q[1] for q in p]
        for i in range(int(math.floor(min(xs) / T)), int(math.floor(max(xs) / T)) + 1):
            for j in range(int(math.floor(min(zs) / T)), int(math.floor(max(zs) / T)) + 1):
                if not inb(i * T + 1, j * T + 1): continue
                for piece in clip(p, i * T, j * T, (i + 1) * T, (j + 1) * T):
                    if lens(piece)[-1] > 0.15: tiles[(i, j)][key].append(head + [v for x, z in piece for v in (int(round((x - i * T) * k)), int(round((z - j * T) * k)))])
    def strip(kind, pts):
        xs = [q[0] for q in pts]; zs = [q[1] for q in pts]
        for i in range(int(math.floor(min(xs) / T)), int(math.floor(max(xs) / T)) + 1):
            for j in range(int(math.floor(min(zs) / T)), int(math.floor(max(zs) / T)) + 1):
                if not inb(i * T + 1, j * T + 1): continue
                for piece in clipn(pts, i * T, j * T, (i + 1) * T, (j + 1) * T):
                    if len(piece) < 2: continue
                    # centimetres: the left edge's first point, then its steps from point to point; each time, the step across to the right edge
                    c = [[int(round((v - (i if n % 2 == 0 else j) * T) * 100)) for n, v in enumerate(q[2:])] for q in piece]; out = [kind]
                    for n, q in enumerate(c): out += [q[0] - (c[n - 1][0] if n else 0), q[1] - (c[n - 1][1] if n else 0), q[2] - q[0], q[3] - q[1]]
                    tiles[(i, j)]['k'].append(out)
    def point(key, x, z, rest, head=()):
        i, j = int(math.floor(x / T)), int(math.floor(z / T))
        if inb(x, z): tiles[(i, j)][key].append(list(head) + [int(round((x - i * T) * 10)), int(round((z - j * T) * 10))] + rest)
    def area(key, head, p):
        cx = sum(q[0] for q in p) / len(p); cz = sum(q[1] for q in p) / len(p); i, j = int(math.floor(cx / T)), int(math.floor(cz / T))
        if inb(cx, cz): tiles[(i, j)][key].append(head + loc(p, i, j))
    def cut_poly(p, x0, z0, x1, z1):
        """the part of an outline inside a square (Sutherland–Hodgman)"""
        for axis, lim, keep_low in ((0, x0, False), (0, x1, True), (1, z0, False), (1, z1, True)):
            out = []
            for a, b in zip(p, p[1:] + p[:1]):
                ia = (a[axis] <= lim) if keep_low else (a[axis] >= lim); ib = (b[axis] <= lim) if keep_low else (b[axis] >= lim)
                if ia != ib:
                    t = (lim - a[axis]) / ((b[axis] - a[axis]) or 1e-9); m = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                    if ia: out.append(m)
                    else: out.append(m); out.append(b); continue
                if ib and ia: out.append(b)
            p = out
            if len(p) < 3: return None
        return p
    def big_area(key, head, p):
        xs = [q[0] for q in p]; zs = [q[1] for q in p]
        for i in range(int(math.floor(min(xs) / T)), int(math.floor(max(xs) / T)) + 1):
            for j in range(int(math.floor(min(zs) / T)), int(math.floor(max(zs) / T)) + 1):
                if not inb(i * T + 1, j * T + 1): continue
                q = cut_poly(p, i * T, j * T, (i + 1) * T, (j + 1) * T)
                if q and len(q) >= 3: tiles[(i, j)][key].append(head + loc(q, i, j))

    counts = collections.Counter()
    def piers(p, h, kind, every, seed):
        cl = lens(p); d = 6.0 + seed % 10
        while d < cl[-1] - 3:
            for shift in (0.0, 5.0, -5.0, 9.0, -9.0, 13.0, -13.0):                 # a pier that would stand in a road moves along the deck; a long span has none
                (x, z), i = at(p, cl, d + shift)
                if not paved(x, z, 1.3) and 0 < d + shift < cl[-1]:
                    point('q', x, z, [int(round(math.degrees(math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0])))), int(round(h * 10)), kind]); counts['piers'] += 1; break
            d += every
    for ri, r in enumerate(roads):
        if r['bridge']:
            if not r['esa']:
                h = 4.5 + 3.5 * max(1, r['layer']); q = rdp(r['p'], 0.3)
                lines('e', [1, int(round(h * 10)), int(round((r['hw'] + 0.7) * 10))], q); piers(q, h, 1 if r['hw'] >= 6.3 else 2, 32.0, h32('pier', r['id'])); counts['bridges'] += 1
            continue
        counts['roads'] += 1; counts['road_m'] += r['cl'][-1]
        # (the streets of the hotel place's box too: the kerbs there are the world's now, and what stands along a kerb
        # goes where the kerb is. What that place knew of its streets' trees is in TREES; its own block stays its own.)
        p, cl = r['p'], r['cl']; seed = h32('road', r['name'] or r['id'])
        species = TREES.get(r['name'], -1 if seed % 100 < 4 else (1 if seed % 100 < 28 else 0))
        own = lambda x, z: ESA_BLOCK[0] < x < ESA_BLOCK[1] and ESA_BLOCK[2] < z < ESA_BLOCK[3]
        every = 12.0 + (seed >> 8) % 7
        for side in (1, -1):
            for a, b in S['sides'].get((ri, side), ()):
                seg = sub(p, cl, a, b)
                if len(seg) < 2: continue
                if species >= 0 and r['cls'] != 'motorway':
                    back = offset(seg, side * (r['hw'] + 3.6)); bl = lens(back); d = 5.0 + (seed >> 4) % 6
                    while d < bl[-1] - 3:
                        (x, z), _ = at(back, bl, d); hh = h32('t', round(x), round(z))
                        if not paved(x, z, 0.8) and not own(x, z): point('p', x, z, [0, int((3.0 + hh % 22 / 10.0) * 10)] if species == 0 else [0, int((11 + hh % 70 / 10.0) * 10)], [species])
                        d += every
                if r['cls'] in ('trunk', 'primary', 'secondary', 'tertiary'):
                    kerb = offset(seg, side * (r['hw'] + 0.6)); kl = lens(kerb); d = 9.0 if side > 0 else 31.0
                    while d < kl[-1] - 2:
                        (x, z), i = at(kerb, kl, d); f = unit(kerb[i + 1][0] - kerb[i][0], kerb[i + 1][1] - kerb[i][1]); rt = right(f)
                        if not own(x, z): point('p', x, z, [int(round(math.degrees(math.atan2(-side * rt[1], -side * rt[0])))), 0], [2])
                        d += 44.0
    for (x, z), name in S['medians']:                                               # palms down the planted medians that have them
        if any(n in name for n in MEDIAN_PALMS): hh = h32('t', round(x), round(z)); point('p', x, z, [0, int((14 + hh % 60 / 10.0) * 10)], [1])
    for kind, pts in S['bands']: strip(kind, pts)
    for kind, pts in S['polys']: area('o', [kind], pts)
    for kerb, back in S['corners']:                                                 # centimetres: how many points the kerb has; the outline — its first point, then the steps
        mx, mz = kerb[len(kerb) // 2]; i, j = int(math.floor(mx / T)), int(math.floor(mz / T))
        if not inb(mx, mz): continue
        c = [(int(round((x - i * T) * 100)), int(round((z - j * T) * 100))) for x, z in kerb + back]; out = [len(kerb), c[0][0], c[0][1]]
        for a, b in zip(c, c[1:]): out += [b[0] - a[0], b[1] - a[1]]
        tiles[(i, j)]['c'].append(out)
    for ty, wcm, pts in S['marks']: lines('m', [ty, wcm], pts, 100)
    for kind, x, z, a in S['figures']:
        i, j = int(math.floor(x / T)), int(math.floor(z / T))
        if inb(x, z): tiles[(i, j)]['y'].append([kind, int(round((x - i * T) * 100)), int(round((z - j * T) * 100)), int(round(a))])
    for x, z, a, arm, grp, ji in S['poles']: point('s', x, z, [int(round(a)), int(round(arm * 10)), grp, ji]); counts['signal poles'] += 1
    for x, z, a in S['signs']: point('p', x, z, [int(round(a)), 0], [4]); counts['stop signs'] += 1
    counts['corners'] = S['audit']['corners']
    for sv in service:
        if sv['esa']: continue
        lines('r', [int(round(sv['hw'] * 10)), 1], rdp(sv['p'], 0.3)); counts['service'] += 1
        if sv['kind'] != 'parking_aisle': continue
        # stalls on both sides of a lot's aisle, nose in; a little over half of them taken (a working morning)
        p = sv['p']; cl = lens(p)
        for side in (-1, 1):
            d = 4.0 + (h32('lot', sv['id'], side) % 20) / 10.0
            while d < cl[-1] - 4.0:
                (x, z), i = at(p, cl, d); f = unit(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); rt = right(f); off = sv['hw'] + 2.55
                cx, cz = x + rt[0] * side * off, z + rt[1] * side * off; fx, fz = x + rt[0] * side * (off + 2.2), z + rt[1] * side * (off + 2.2)
                hh = h32('car', round(cx * 2), round(cz * 2))
                if hh % 100 < 58 and not paved(cx, cz, 2.2, sv['id']) and not paved(fx, fz, 0.4, sv['id']) and not built(cx, cz) and not built(fx, fz):
                    k = side if (hh >> 8) % 4 else -side                                    # mostly nose in to the kerb, away from the aisle
                    point('p', cx, cz, [int(round(math.degrees(math.atan2(rt[1] * k, rt[0] * k)))), (hh >> 12) % 10], [5]); counts['parked cars'] += 1
                d += 2.75

    # ── buildings, lots, greens, the railway ──
    def bkind(tg, h, area):
        b = tg.get('building', 'yes'); nm = tg.get('name', '')
        if b in ('roof', 'carport', 'canopy') or tg.get('amenity') == 'fuel': return 8
        if b in ('parking', 'garage', 'garages') or tg.get('parking') == 'multi-storey' or tg.get('amenity') == 'parking': return 6 if area > 500 else 4
        if b in ('house', 'detached', 'residential', 'semidetached_house', 'bungalow', 'terrace', 'shed', 'hut'): return 0
        if b in ('apartments', 'dormitory'): return 1 if h >= 7 or area > 320 else 0
        if b == 'hotel' or tg.get('tourism') == 'hotel': return 7
        if b in ('industrial', 'warehouse', 'manufacture', 'hangar'): return 4
        if b in ('retail', 'supermarket', 'kiosk') or tg.get('shop') or tg.get('amenity') in ('restaurant', 'fast_food', 'cafe', 'bank', 'pharmacy'): return 5
        if b in ('office', 'commercial') or 'DIRECTV' in nm: return 2 if h >= 22 else 3
        if h >= 22: return 2
        if area < 330 and h < 9.5: return 0
        if area > 1800: return 4 if h32('k', tg.get('name', ''), int(area)) % 3 else 3
        return 3
    def add_building(wid, tg, nd):
        p = W.pts(nd)
        if len(p) < 4 or not near(p) or W.esa(nd) or tg.get('location') == 'underground' or tg.get('building') in ('no',): return
        sd = tg.get('start_date', '')
        if sd[:4].isdigit() and int(sd[:4]) > 2022: return
        rg = ring(p, 0.35)
        if not rg: return
        q, ar = rg
        hv = tg.get('height', '').replace(' m', '')
        try: h = float(hv)
        except ValueError:
            lv = tg.get('building:levels', '')
            h = float(lv) * 3.3 if lv.replace('.', '').isdigit() and float(lv) > 0 else H_DEFAULT.get(tg.get('building'), 7.0) * (0.9 + (h32('h', wid) % 30) / 100.0)
        h = max(2.4, min(h, 300.0))
        area('b', [int(round(h * 10)), bkind(tg, h, ar)], q); counts['buildings'] += 1
    for wid, (tg, nd) in sorted(W.ways.items()):
        if 'building' in tg: add_building(wid, tg, nd); continue
        if 'highway' in tg: continue
        if tg.get('railway') == 'light_rail' and tg.get('bridge') and not W.esa(nd):
            p = W.pts(nd)
            if len(p) > 1 and near(p): q = rdp(p, 0.15); lines('e', [0, 90, 20], q); piers(q, 9.0, 0, 28.0, h32('pier', wid)); counts['rail bridges'] += 1
            continue
        if tg.get('aeroway') in ('runway', 'taxiway') and tg.get('area') != 'yes':
            p = W.pts(nd)
            if len(p) > 1 and near(p): lines('r', [300 if tg['aeroway'] == 'runway' else 120, 2], rdp(p, 0.5))
            continue
        if len(nd) < 4 or nd[0] != nd[-1] or W.esa(nd): continue
        kind = None
        if tg.get('amenity') == 'parking' and tg.get('parking') not in ('multi-storey', 'underground', 'rooftop'): kind = 0
        elif tg.get('landuse') in ('grass', 'meadow', 'recreation_ground', 'village_green', 'cemetery') or tg.get('leisure') in ('park', 'pitch', 'garden', 'golf_course', 'dog_park') or tg.get('natural') in ('scrub', 'grassland', 'wood'): kind = 1
        elif tg.get('aeroway') == 'apron' or (tg.get('highway') == 'pedestrian'): kind = 2
        elif tg.get('landuse') in ('construction', 'brownfield', 'railway'): kind = 3
        elif tg.get('natural') == 'water' or tg.get('leisure') == 'swimming_pool': kind = 4
        if kind is None and tg.get('landuse') in ('industrial', 'commercial', 'retail', 'residential', 'military'):
            p = W.pts(nd); rg = ring(p, 1.5) if near(p) else None
            if rg and len(rg[0]) <= 400: big_area('u', [1 if tg['landuse'] == 'residential' else 0], rg[0]); counts['land use'] += 1
            continue
        if kind is None: continue
        p = W.pts(nd)
        if not near(p): continue
        rg = ring(p, 0.8 if kind != 4 else 0.3)
        if rg and len(rg[0]) <= 220:
            (big_area if rg[1] > 20000 else area)('a', [kind], rg[0]); counts['areas'] += 1
            if kind == 1 and rg[1] > 150:                                          # a few trees on a green, where its own outline allows
                q = rg[0]; xs = [v[0] for v in q]; zs = [v[1] for v in q]; n = min(30, int(rg[1] / 420))
                for k in range(n * 3):
                    hh = h32('g', wid, k); x = min(xs) + (hh % 1000) / 1000 * (max(xs) - min(xs)); z = min(zs) + ((hh >> 10) % 1000) / 1000 * (max(zs) - min(zs))
                    ins = False
                    for a in range(len(q)):
                        (x0, z0), (x1, z1) = q[a], q[(a + 1) % len(q)]
                        if (z0 > z) != (z1 > z) and x < x0 + (z - z0) / (z1 - z0) * (x1 - x0): ins = not ins
                    if ins and n > 0: point('p', x, z, [0, int((3.2 + hh % 20 / 10.0) * 10)], [0]); n -= 1
    for rid, (tg, mem) in W.rels.items():
        if len(mem) == 1 and mem[0] in W.ways: add_building('r' + rid, tg, W.ways[mem[0]][1])
    for n, tg in W.ntag.items():
        if tg.get('natural') == 'tree' and n in W.xz:
            x, z = W.xz[n]
            if not (ESA_BOX[0] < x < ESA_BOX[1] and ESA_BOX[2] < z < ESA_BOX[3]):
                point('p', x, z, [0, 40], [0])
    return tiles, roads, service, counts, S

# ── a route: the lane a car keeps, and the path it drives along it ─────────────────────────────────────────────────────────
def lane_plan(los, Ls, before, after):
    """Which lane a car keeps on each piece of a street (the pieces differ in their lanes): [(the lane it comes into the
    piece in, the lane it leaves it in)], a lane being its metres to the right of the centre line. Of all plans the one
    that moves the car sideways least, given that it ends in the lane its next turn is made from (the left one for a
    left turn, the right one for a right), that a lane is changed within a piece only where the piece is 100 m long, and
    that a turn is finished in the near lane (the kerb's after a right turn — that counts for more — the middle's after
    a left) where that lane goes on for 60 m.   los: each piece's lanes · Ls: its length · before, after: the turns (±1, 0)"""
    best = {}                                                                      # the lane a plan leaves the piece in → (what it costs, the plan)
    for j, lo in enumerate(los):
        nxt = {}
        for e in lo:
            if j == 0:
                near = lo[-1] if before > 0 else lo[0] if before < 0 else None
                c, pl = ((1.2 if before > 0 else 0.3) * abs(e - near) if near is not None and Ls[0] >= 60 else 0.0), []
            else: c, pl = min(((c + abs(x - e), pl) for x, (c, pl) in best.items()), key=lambda t: t[0])
            for x in lo:
                if x != e and Ls[j] < 100: continue
                cc = c + (abs(x - e) + 0.5 if x != e else 0.0)
                if x not in nxt or cc < nxt[x][0]: nxt[x] = (cc, pl + [(e, x)])
        best = nxt
    want = los[-1][0] if after < 0 else los[-1][-1] if after > 0 else None
    return best[want][1] if want in best else min(best.values(), key=lambda t: t[0])[1]

def plan(W, roads, service, a, b):
    """the cheapest way over roads and service ways between the nodes nearest two points → [(way, node ids in travel order)]"""
    g = collections.defaultdict(list)
    def link(rec, kind, v, ow, rev):
        nd = rec['nd']
        for k in range(len(nd) - 1):
            d = rec['cl'][k + 1] - rec['cl'][k]; c = d / v
            if not rev: g[nd[k]].append((nd[k + 1], c, (kind, rec['id'])))
            if not ow or rev: g[nd[k + 1]].append((nd[k], c, (kind, rec['id'])))
    for r in roads:
        if not r['bridge'] or True: link(r, 'r', r['v'], r['oneway'], r['rev'])
    for s in service: link(s, 's', 3.5, False, False)
    def snap(p, only=None):
        best = None
        for n in g:
            x, z = W.xz[n]; d = math.hypot(x - p[0], z - p[1])
            if best is None or d < best[0]: best = (d, n)
        return best[1]
    s, e = snap(a), snap(b)
    pq, cost, prev = [(0.0, s)], {s: 0.0}, {}
    while pq:
        c, n = heapq.heappop(pq)
        if n == e: break
        if c > cost.get(n, 1e18): continue
        for m, w, way in g[n]:
            if c + w < cost.get(m, 1e18): cost[m] = c + w; prev[m] = (n, way); heapq.heappush(pq, (c + w, m))
    if e not in prev and e != s: raise SystemExit('no way between the two points')
    path, ways = [e], []
    while path[-1] != s: n, way = prev[path[-1]]; ways.append(way); path.append(n)
    path.reverse(); ways.reverse()
    legs = []
    for k, way in enumerate(ways):
        if legs and legs[-1][0] == way: legs[-1][1].append(path[k + 1])
        else: legs.append((way, [path[k], path[k + 1]]))
    return legs

def fillet(A, B, r):
    """joins line A's end to line B's start with an arc of radius r (less where there is no room) → points"""
    a = unit(A[-1][0] - A[-2][0], A[-1][1] - A[-2][1]); b = unit(B[1][0] - B[0][0], B[1][1] - B[0][1])
    cross = a[0] * b[1] - a[1] * b[0]; dot = max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1])); th = math.acos(dot)
    if th < math.radians(10) or abs(cross) < 1e-6: return A + B
    ex, ez = B[0][0] - A[-1][0], B[0][1] - A[-1][1]
    t = (ex * b[1] - ez * b[0]) / cross; u = (ex * a[1] - ez * a[0]) / cross      # A.end + a·t = B.start + b·u
    la, lb = lens(A), lens(B)
    tau = r * math.tan(th / 2); room = min(la[-1] + t, lb[-1] - u) * 0.92
    if room < 1.0: return A + B
    if tau > room: tau = room; r = tau / math.tan(th / 2)
    def cutA(d):                                                                   # A, ending d before the corner
        L = la[-1] + t - d
        if L <= la[-1]: return sub(A, la, 0, L)
        return A + [(A[-1][0] + a[0] * (L - la[-1]), A[-1][1] + a[1] * (L - la[-1]))]
    def cutB(d):
        s = u + d
        if s >= 0: return sub(B, lb, s, lb[-1])
        return [(B[0][0] + b[0] * s, B[0][1] + b[1] * s)] + B
    A2, B2 = cutA(tau), cutB(tau)
    sg = 1 if cross > 0 else -1; nr = right(a); t1 = A2[-1]; ox, oz = t1[0] + nr[0] * r * sg, t1[1] + nr[1] * r * sg
    f0 = math.atan2(t1[1] - oz, t1[0] - ox); n = max(3, int(r * th / 0.8)); arc = [(ox + r * math.cos(f0 + sg * th * k / n), oz + r * math.sin(f0 + sg * th * k / n)) for k in range(1, n)]
    return A2 + arc + B2

WHEELBASE = 2.775                                                                 # a 2014 Camry
def drive_line(raw, rl, vref):
    """A car's path along a line: its back axle is steered at a point of the line a little way ahead (the faster, the
    further: 0.8 s of travel, 3 m at least, 12 m at most), with wheels that turn no further than a Camry's and hands
    that turn the wheel no faster than a turn a second. What comes out bends smoothly into every turn and holds
    straight where the line only wavers — which the line itself, taken as the path, did not. The car's middle goes
    from the line's start to its end: the axle starts half a wheelbase behind the line and stops as far short of it.
    → ([(x, z, heading, curvature)] every half metre of the axle's travel, for each of them where on the line the
       car's middle then is (metres along it), the furthest the axle strays from the line)

    Headings: atan2(dz, dx), running on past ±180°; curvature + bends to the right (x east, z south)."""
    A = WHEELBASE / 2
    b = unit(raw[1][0] - raw[0][0], raw[1][1] - raw[0][1]); e = unit(raw[-1][0] - raw[-2][0], raw[-1][1] - raw[-2][1])
    ext = [(raw[0][0] - b[0] * A, raw[0][1] - b[1] * A)] + raw + [(raw[-1][0] + e[0] * d, raw[-1][1] + e[1] * d) for d in (4.0, 8.0, 12.0, 16.0)]
    el = lens(ext); L = rl[-1]                                                     # along ext, the axle is at sp and the car's middle at sp + A: on the line itself, at sp
    x, z = ext[0]; th = math.atan2(b[1], b[0]); delta, sp, ds, out, on, stray, step = 0.0, 0.0, 0.25, [], [], 0.0, 0
    while step < 60000:
        best = None; d = sp
        while d <= min(el[-1], sp + 1.5):                                           # where on the line the axle now is (it never goes back)
            (qx, qz), _ = at(ext, el, d); e2 = (qx - x) ** 2 + (qz - z) ** 2
            if best is None or e2 < best[0]: best = (e2, d)
            d += 0.05
        sp = best[1]; stray = max(stray, math.sqrt(best[0]))
        if sp >= L - 0.01: x -= math.cos(th) * (sp - L); z -= math.sin(th) * (sp - L); break   # there, to the centimetre
        v = max(1.0, vref[min(len(vref) - 1, int(sp / L * (len(vref) - 1)))])
        ahead = min(12.0, max(3.0, 0.8 * v)); (tx, tz), _ = at(ext, el, sp + ahead)
        dx, dz = tx - x, tz - z; dist = math.hypot(dx, dz) or 1e-6
        alpha = (math.atan2(dz, dx) - th + math.pi) % (2 * math.pi) - math.pi
        want = max(-0.59, min(0.59, math.atan(WHEELBASE * 2 * math.sin(alpha) / dist)))
        turn = 0.43 * ds / v; delta += max(-turn, min(turn, want - delta))
        if step % 2 == 0: out.append((x, z, th, math.tan(delta) / WHEELBASE)); on.append(min(L, sp))
        th += math.tan(delta) / WHEELBASE * ds; x += math.cos(th) * ds; z += math.sin(th) * ds; step += 1
    out.append((x, z, th, math.tan(delta) / WHEELBASE)); on.append(L)
    return out, on, stray

def route(W, roads, service, S, spec):
    rid = {r['id']: r for r in roads}; sid = {s['id']: s for s in service}
    legs = plan(W, roads, service, spec['a'], spec['b'])
    head, tail = spec.get('head'), spec.get('tail')
    if head:
        while legs and legs[0][0][0] == 's': legs.pop(0)
    if tail:
        while legs and legs[-1][0][0] == 's': legs.pop()
    parts = []                                                                     # dicts: p (centre line in travel order), rec, kind
    for (kind, wid), nd in legs:
        rec = rid[wid] if kind == 'r' else sid[wid]
        p = [W.xz[n] for n in nd]
        fwd = rec['nd'].index(nd[0]) < rec['nd'].index(nd[1]) if nd[0] != nd[1] else True
        parts.append(dict(p=p, rec=rec, kind=kind, fwd=fwd, nd=nd))
    # consecutive pieces of one street read as one leg (a way is often cut where its lane count changes)
    merged = []
    for q in parts:
        if merged and q['kind'] == 'r' and merged[-1]['kind'] == 'r' and merged[-1]['rec']['name'] == q['rec']['name'] and q['rec']['name']:
            m = merged[-1]; a = unit(m['p'][-1][0] - m['p'][-2][0], m['p'][-1][1] - m['p'][-2][1]); b = unit(q['p'][1][0] - q['p'][0][0], q['p'][1][1] - q['p'][0][1])
            if a[0] * b[0] + a[1] * b[1] > 0.9: m['segs'].append(q); continue
        q['segs'] = [q]; merged.append(q)
    def trim_start(q, pt):
        """starts leg q at the point of its centre line nearest pt"""
        s0 = q['segs'][0]; p = s0['p']; cl = lens(p); best = (1e18, 0.0)
        for k in range(len(p) - 1):
            ax, az = p[k]; bx, bz = p[k + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
            t = max(0.0, min(1.0, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / L2)); d = math.hypot(ax + (bx - ax) * t - pt[0], az + (bz - az) * t - pt[1])
            if d < best[0]: best = (d, cl[k] + math.sqrt(L2) * t)
        s0['p'] = sub(p, cl, best[1], cl[-1])
    def trim_end(q, pt):
        s0 = q['segs'][-1]; p = s0['p']; cl = lens(p); best = (1e18, 0.0)
        for k in range(len(p) - 1):
            ax, az = p[k]; bx, bz = p[k + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
            t = max(0.0, min(1.0, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / L2)); d = math.hypot(ax + (bx - ax) * t - pt[0], az + (bz - az) * t - pt[1])
            if d < best[0]: best = (d, cl[k] + math.sqrt(L2) * t)
        s0['p'] = sub(p, cl, 0, best[1])
    if head and merged: trim_start(merged[0], head[-1])
    if tail and merged: trim_end(merged[-1], tail[0])
    # the turn each leg ends with (+1 right, −1 left, 0 straight on)
    def heading_out(q): p = q['segs'][-1]['p']; return unit(p[-1][0] - p[-2][0], p[-1][1] - p[-2][1])
    def heading_in(q): p = q['segs'][0]['p']; return unit(p[1][0] - p[0][0], p[1][1] - p[0][1])
    seq = ([dict(manual=head, v=spec.get('head_v', 3.2))] if head else []) + merged + ([dict(manual=tail, v=spec.get('tail_v', 3.2))] if tail else [])
    def hin(q): return unit(q['manual'][1][0] - q['manual'][0][0], q['manual'][1][1] - q['manual'][0][1]) if 'manual' in q else heading_in(q)
    def hout(q): return unit(q['manual'][-1][0] - q['manual'][-2][0], q['manual'][-1][1] - q['manual'][-2][1]) if 'manual' in q else heading_out(q)
    turns = []
    for k in range(len(seq) - 1):
        a, b = hout(seq[k]), hin(seq[k + 1]); c = a[0] * b[1] - a[1] * b[0]; d = a[0] * b[0] + a[1] * b[1]
        turns.append(0 if d > 0.87 else (1 if c > 0 else -1))
    # each leg's lane line
    lines_, meta = [], []
    for k, q in enumerate(seq):
        if 'manual' in q: lines_.append(list(q['manual'])); meta.append(dict(v=q['v'], lo=-1.0, hi=1.0, name='')); continue
        before = turns[k - 1] if k > 0 else 0; after = turns[k] if k < len(turns) else 0
        pts, offs = [], []; segs = list(q['segs']); to = 'left' if after < 0 else 'right' if after > 0 else None
        if to == 'left' and segs[-1]['kind'] == 'r' and any(c == 'c' for c, _ in segs[-1]['rec']['prof']):   # a left turn from a street with a middle lane: into that lane for the last 70 m
            s = segs[-1]; c0 = lens(s['p'])
            segs[-1:] = [dict(s, p=sub(s['p'], c0, 0, c0[-1] - 70)), dict(s, p=sub(s['p'], c0, c0[-1] - 70, c0[-1]), to=to)] if c0[-1] > 95 else [dict(s, to=to)]
        else: segs[-1] = dict(segs[-1], to=to)
        los = [[1.3] if s['kind'] == 's' else ST.lane_offsets(s['rec'], s['fwd'], s.get('to')) for s in segs]; Ls = [lens(s['p'])[-1] for s in segs]
        for s, L, (first, last) in zip(segs, Ls, lane_plan(los, Ls, before, after)):
            p = resample(s['p'], 2.0); cl = lens(p)
            d0 = max(0.15 * L, L - 145.0); d1 = min(max(d0 + 30.0, L - 80.0), L - 12.0)   # a change of lane is over well before the piece is
            for i, pt in enumerate(p):
                t = 0.0 if d1 <= d0 else max(0.0, min(1.0, (cl[i] - d0) / (d1 - d0))); t = t * t * (3 - 2 * t)
                o = first + (last - first) * t
                if pts and math.hypot(pt[0] - pts[-1][0], pt[1] - pts[-1][1]) < 0.3: offs[-1] = (offs[-1] + o) / 2; continue   # where two pieces of the street meet
                pts.append(pt); offs.append(o)
        # What kinks are left in the centre line (World.curve leaves those where roads meet): eased, about 5 m to
        # either side; the line's ends, at the junctions, stay put.
        for _ in range(12): pts = [pts[0]] + [((pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4) for i in range(1, len(pts) - 1)] + [pts[-1]]
        # where a street's pieces differ in lanes the lane's place in it steps sideways: taken over some 60 m, as a driver drifts across
        for _ in range(130): offs = [offs[0]] + [(offs[i - 1] + 2 * offs[i] + offs[i + 1]) / 4 for i in range(1, len(offs) - 1)] + [offs[-1]]
        N = normals(pts); lines_.append([(x + nx * o, z + nz * o) for (x, z), (nx, nz), o in zip(pts, N, offs)])
        rec = q['segs'][0]['rec']
        if q['kind'] == 's': meta.append(dict(v=4.2, lo=-1.1, hi=1.1, name=''))
        else: meta.append(dict(v=rec['v'], rec=rec, name=rec['name']))
    # join them with arcs
    line = lines_[0]; marks = [0]                                                  # marks: index in `line` where each leg begins
    for k in range(1, len(lines_)):
        slow = 'manual' in seq[k - 1] or 'manual' in seq[k] or seq[k - 1].get('kind') == 's' or seq[k].get('kind') == 's'
        r = 5.0 if slow else (6.5 if turns[k - 1] > 0 else 13.0)
        n0 = len(line); line = fillet(line, lines_[k], r); marks.append(min(len(line) - 1, max(0, n0 - 1)))
    raw = resample(line, 0.5)
    for _ in range(10):                                                            # take the kinks out; the ends stay put
        raw = [raw[0]] + [((raw[i - 1][0] + 2 * raw[i][0] + raw[i + 1][0]) / 4, (raw[i - 1][1] + 2 * raw[i][1] + raw[i + 1][1]) / 4) for i in range(1, len(raw) - 1)] + [raw[-1]]
    # which leg a point belongs to: the nearest leg's own line
    def leg_of(pt, hint):
        best = None
        for k in range(max(0, hint - 1), min(len(lines_), hint + 3)):
            for i in range(0, len(lines_[k]) - 1):
                ax, az = lines_[k][i]; bx, bz = lines_[k][i + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
                t = max(0.0, min(1.0, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / L2)); d = math.hypot(ax + (bx - ax) * t - pt[0], az + (bz - az) * t - pt[1])
                if best is None or d < best[0] - 1e-6: best = (d, k)
        return best[1]
    def legs_of(pts):
        out, hint = [], 0
        for pt in pts: hint = max(hint, leg_of(pt, hint)); out.append(hint)
        return out
    # The lane's line is not yet a path a car can keep: it is the map's line, with the map's small kinks, and its arcs
    # begin at once. So a car is driven along it here (drive_line), and what its back axle traces is the route.
    rl = lens(raw); rleg = legs_of(raw); n = len(raw)
    rh = [math.atan2(raw[min(i + 4, n - 1)][1] - raw[max(i - 4, 0)][1], raw[min(i + 4, n - 1)][0] - raw[max(i - 4, 0)][0]) for i in range(n)]
    vref = []
    for i in range(n):
        a, b = max(0, i - 4), min(n - 1, i + 4); k = abs((rh[b] - rh[a] + math.pi) % (2 * math.pi) - math.pi) / max(1e-6, rl[b] - rl[a])
        vref.append(min(meta[rleg[i]]['v'], math.sqrt(1.9 / max(1e-4, k))))
    for i in range(n - 2, -1, -1): vref[i] = min(vref[i], math.sqrt(vref[i + 1] ** 2 + 2 * 1.7 * (rl[i + 1] - rl[i])))
    for i in range(1, n): vref[i] = min(vref[i], math.sqrt(vref[i - 1] ** 2 + 2 * 1.45 * (rl[i] - rl[i - 1])) if i > 1 else vref[i])
    sim, on, stray = drive_line(raw, rl, vref)
    if spec.get('dbg') is not None: spec['dbg'].update(seq=seq, lines=lines_, raw=raw, turns=turns, sim=sim)   # for tools that look into a route
    p = [(x, z) for x, z, th, k in sim]; th = [q[2] for q in sim]; kap = [q[3] for q in sim]
    cl = lens(p); PM = 2                                                           # points to a metre
    # Where the street is straight: for 20 m either way the lane's line turns by no more than 0.6° all told (so not where
    # it changes lane either). There a car's wheel is held still — places/south-bay/checks.mjs holds the drive to that.
    tv = [0.0]
    for i in range(1, n): tv.append(tv[-1] + abs((rh[i] - rh[i - 1] + math.pi) % (2 * math.pi) - math.pi))
    calm = [i >= 40 and i + 40 < n and tv[i + 40] - tv[i - 40] < math.radians(0.6) for i in range(n)]
    straight, i = [], 0
    while i < n:
        if not calm[i]: i += 1; continue
        j2 = i
        while j2 + 1 < n and calm[j2 + 1]: j2 += 1
        if rl[j2] - rl[i] >= 40:                                                    # … in the path's own metres
            a = next(k for k in range(len(on)) if on[k] >= rl[i]); b = next(k for k in range(len(on) - 1, -1, -1) if on[k] <= rl[j2])
            straight.append([round(cl[a], 1), round(cl[b], 1)])
        i = j2 + 1
    legi = legs_of(p)
    lim, band = [], []
    for i, k in enumerate(legi):
        m = meta[k]
        if not lim or lim[-1][1] != round(m['v'], 1): lim.append([round(cl[i], 1), round(m['v'], 1)])
    # the room a hand on the wheel has: how far left and right of the line the car's middle may go
    for i, pt in enumerate(p):
        m = meta[legi[i]]
        if 'rec' not in m: lo, hi = m['lo'], m['hi']
        else:
            rec = m['rec']; q = seq[legi[i]]; best = None
            for s in q['segs']:
                for a in range(len(s['p']) - 1):
                    ax, az = s['p'][a]; bx, bz = s['p'][a + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
                    t = max(0.0, min(1.0, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / L2)); cx, cz = ax + (bx - ax) * t, az + (bz - az) * t
                    d = math.hypot(cx - pt[0], cz - pt[1])
                    if best is None or d < best[0]: f = unit(bx - ax, bz - az); rt = right(f); best = (d, (pt[0] - cx) * rt[0] + (pt[1] - cz) * rt[1], s['rec'])
            off, rec = best[1], best[2]
            lo = (-rec['hw'] + 1.2 if rec['oneway'] else 1.1) - off; hi = rec['hw'] - 1.2 - off
            lo, hi = min(lo, -0.2), max(hi, 0.2)
        if not band or abs(band[-1][1] - lo) > 0.25 or abs(band[-1][2] - hi) > 0.25: band.append([round(cl[i], 1), round(lo, 2), round(hi, 2)])
    # signals and stop signs on the way: where the arm we come in along has its limit line (streets.py), there the bumper stops
    ctl = []
    for (kind, wid), nd in legs:
        if kind != 'r': continue
        rec = rid[wid]
        for a, n in zip(nd, nd[1:]):
            if n not in S['jat']: continue
            k = rec['nd'].index(n); sgn = -1 if rec['nd'].index(a) < k else 1      # the arm leaves the crossing this way along the road's own line
            l = S['legat'].get((rec['ri'], k, sgn))
            if l is None or l['stopd'] is None: continue
            j = l['j']; (qx, qz), i = at(rec['p'], rec['cl'], rec['cl'][k] + sgn * l['stopd'])
            f = unit(rec['p'][i + 1][0] - rec['p'][i][0], rec['p'][i + 1][1] - rec['p'][i][1]); u = (-f[0] * sgn, -f[1] * sgn)   # the way we travel
            over = lambda i: (p[i][0] - qx) * u[0] + (p[i][1] - qz) * u[1]            # how far past the line a point of the path is
            c = next((i for i in range(1, len(p)) if math.hypot(p[i][0] - qx, p[i][1] - qz) < 25 and over(i - 1) <= 0 < over(i) and math.cos(th[i]) * u[0] + math.sin(th[i]) * u[1] > 0.5), None)
            if c is None: continue
            if ctl and ctl[-1][2] == j['ctl'] and cl[c] - ctl[-1][0] < 60: continue    # (the same crossing again)
            # the path is the back axle's and the bumper is 3.75 m ahead of it: it stops half a metre short of the line
            cross = cl[c - 1] + (cl[c] - cl[c - 1]) * -over(c - 1) / max(1e-9, over(c) - over(c - 1))
            at_stop = cross - 4.25; bx, bz = at(p, cl, at_stop)[0]; bump = (bx + u[0] * 3.75 - qx) * u[0] + (bz + u[1] * 3.75 - qz) * u[1]
            assert -0.8 < bump < -0.2, ('the car would not stop at the line', spec['id'], round(at_stop, 1), round(bump, 2))
            ctl.append([round(at_stop, 1), 0 if j['signal'] else 1, j['ctl'], 0 if abs(u[1]) >= abs(u[0]) else 1])
    # the turns, for the indicators: where the heading swings more than 35°
    hd, W12 = th, 12 * PM                                                          # 12 m of line
    tl, i = [], 0
    while i < len(p) - W12:
        dh = hd[min(i + W12, len(p) - 1)] - hd[i]
        if abs(dh) > math.radians(22):
            j2 = i
            while j2 < len(p) - W12 and abs(hd[j2 + W12] - hd[j2]) > math.radians(8): j2 += 1
            tot = hd[min(j2 + W12, len(p) - 1)] - hd[i]
            if abs(tot) > math.radians(35): tl.append([round(max(0, cl[i] - 38), 1), round(cl[min(j2 + W12, len(p) - 1)], 1), 1 if tot > 0 else -1])
            i = j2 + W12
        else: i += 1
    names = []
    for i, k in enumerate(legi):
        nm = meta[k].get('name', '')
        if not names or names[-1][1] != nm: names.append([round(cl[i], 1), nm])
    return dict(id=spec['id'], name=spec['name'], frm=spec['from'], to=spec['to'], length=round(cl[-1], 1), stray=round(stray, 2),
                pts=[int(round(v * 1000)) for pt in p for v in pt], hd=[int(round(a * 1e5)) for a in th], k=[int(round(c * 1e6)) for c in kap],
                lim=lim, band=band, ctl=sorted(ctl), turns=tl, names=names, straight=straight)

# ── what the map does not say about this world's streets ──
# East Mariposa Avenue where the map gives it six lanes and no more: the satellite picture has two lanes each way and
# a middle lane for left turns between them (the kerb lanes wide), from Pacific Coast Highway to Nash Street.
STRIPES = {('East Mariposa Avenue', 6): 'bbcff'}
# What places/esa-el-segundo-2015 knows of the trees along its streets (his photographs, Street View), for the rule that
# plants every street's: 0 broad-leaved, 1 palms, -1 none. And the medians that carry a row of palms.
TREES = {'East Mariposa Avenue': 0, 'Continental Boulevard': 0, 'North Nash Street': 1, 'North Pacific Coast Highway': -1}
MEDIAN_PALMS = ('Pacific Coast Highway',)
MEDIAN_W = {'North Pacific Coast Highway': 2.4, 'South Pacific Coast Highway': 2.4}      # Sepulveda's median is planted (lawn and palms: the satellite picture)
ESA_BLOCK = (-95.0, 52.0, -66.4, 132.0)   # the hotel's and the shops' own ground, behind the sidewalks (site.js): nothing of the streets' is planted there
# The hotel's way in from Mariposa (places/esa-el-segundo-2015/plan.js LOT.drive: x 28.5 … 37.5): the walk drops for it.
DRIVES = [('East Mariposa Avenue', (33.0, -66.0), 10.0)]

# ── the routes of this world ───────────────────────────────────────────────────────────────────────────────────────
# Extended Stay's lot is the hotel place's own (plan.js LOT, and site.js as built: looked at from above on 26/11/2026).
# The aisle on the east side is paved from x 37.5 to 43.5; north of z −54 the paving steps west: the forecourt
# (x 24–37, z −59…−54) and the way in between the sign's island and the planting on the boundary (x 29–37, z −68…−60).
# A car leaving keeps right up the aisle, swings west across the forecourt's mouth and leaves by the east half of the
# way in; a car arriving takes the west half and swings east into the aisle.
ROUTES = [
    dict(id='esa-att', name='Extended Stay → tòa AT&T', **{'from': 'Extended Stay America, El Segundo', 'to': 'AT&T (DirecTV) · bãi xe LA4'},
         a=(34.6, -74.0), b=None, b_ll=(33.92981, -118.38479),
         head=[(40.8, 6.0), (40.8, -45.5), (40.0, -49.5), (36.0, -54.3), (34.8, -57.2), (34.6, -60.0), (34.6, -67.8)], head_v=3.4),
    dict(id='att-esa', name='Tòa AT&T → Extended Stay', **{'from': 'AT&T (DirecTV) · bãi xe LA4', 'to': 'Extended Stay America, El Segundo'},
         a=None, a_ll=(33.92981, -118.38479), b=(31.0, -74.0),
         tail=[(31.0, -67.8), (31.0, -59.5), (32.5, -56.0), (38.6, -51.0), (39.3, -47.0), (39.3, -20.0), (39.3, 4.0)], tail_v=3.4),
]

def main():
    out = sys.argv[1]; W = World(sys.argv[2:])
    bounds = (-1000.0, 2000.0, -2000.0, 1000.0)                                     # the tiles this run makes: x0, x1, z0, z1
    tiles, roads, service, counts, S = build(W, bounds)
    os.makedirs(os.path.join(out, 'tiles'), exist_ok=True)
    for f in os.listdir(os.path.join(out, 'tiles')): os.remove(os.path.join(out, 'tiles', f))
    index, total = [], 0
    for (i, j), t in sorted(tiles.items()):
        homes = sum(1 for b in t['b'] if b[1] in (0, 1))
        body = json.dumps(dict(v=1, i=i, j=j, g=1 if homes * 2 > len(t['b']) and len(t['b']) > 20 else 0, **{k: t[k] for k in sorted(t)}), separators=(',', ':'))
        with open(os.path.join(out, 'tiles', f'{i}_{j}.json'), 'w') as f: f.write(body)
        index.append([i, j, len(body), len(t['b'])]); total += len(body)
    routes = []
    for spec in ROUTES:
        spec = dict(spec)
        for k in ('a', 'b'):
            if spec.get(k) is None: la, lo = spec[k + '_ll']; spec[k] = ((lo - LON0) * KX, -(la - LAT0) * KZ)
        routes.append(route(W, roads, service, S, spec))
    with open(os.path.join(out, 'routes.json'), 'w') as f: json.dump(routes, f, separators=(',', ':'))
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump(dict(v=1, tile=T, origin=[LAT0, LON0], bounds=bounds, tiles=index, signals=S['audit']['signals'], counts={k: round(v) for k, v in counts.items()}, streets={k: round(v) for k, v in sorted(S['audit'].items())}), f, separators=(',', ':'))
    print(len(index), 'tiles,', total // 1024, 'kB;', dict(counts))
    print(' roads eased into curves: %d (of their points %d moved, %.2f m at most; %d added)' % W.eased)
    print(' streets:', dict(sorted(S['audit'].items())))
    for r in routes: print(' route', r['id'], r['length'], 'm · strays', r['stray'], 'm from the lane\'s line at most ·', round(sum(b - a for a, b in r['straight'])), 'm straight ·', len(r['ctl']), 'controls', r['ctl'], '· turns', r['turns'])

if __name__ == '__main__': main()
