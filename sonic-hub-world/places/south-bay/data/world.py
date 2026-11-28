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
        ../../esa-el-segundo-2015/streets.js   the streets of the hotel place's ground, for that place's own page: the
                                   same tiles cut to it, with nothing but streets in them, and the lanes its cars keep
Data (c) OpenStreetMap contributors, ODbL.

Metres: x east, z south, y up; the origin is 33.92290 N, 118.39500 W — the frame of places/esa-el-segundo-2015, which
this world holds as a site. What that place draws itself — the buildings, lots and service ways whose points' mean
lies in its box (the rule of its own data/osm2js.py) — is left out of the tiles; the world loads the place there
instead. The STREETS of the box are the world's all the same: one set of rules lays out every street (streets.py),
and the place draws none of its own (its town.js) — not on its own page either, which gets these streets from here.

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
  p  [[type, x, z, a, s]]           things: 0 tree (s: crown radius; a: its kind) 1 palm (s: height) 2 street light (a: the way
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
  turns     [[from, to, ±1, at]]    where an indicator blinks (+1 right); at: where the turn itself begins
  names     [[from, street]]
  straight  [[from, to]]            where the street is straight: the lane's own line turns by no more than 0.6° within
                                    20 m either way. There the wheel is held still — checks.mjs holds the drive to it.
  stray                             the furthest the path leaves the lane's line, metres

index.json also holds `streets`: what streets.py counted of what it laid out (crossings, crosswalks from the map and
by the rule, limit lines, corners, kerb…) and of what must never be (a limit line inside a crosswalk, a corner whose
outline crosses itself…) — places/south-bay/checks.mjs holds the tiles to it.
"""
import sys, os, math, time, json, heapq, bisect, hashlib, collections, xml.etree.ElementTree as ET

LAT0, LON0 = 33.92290, -118.39500
KX = math.cos(math.radians(LAT0)) * 111320.0; KZ = 110574.0
T = 500.0
LANE = 3.4
FWY_LANE, FWY_SH = 3.66, {'motorway': (2.4, 3.0), 'motorway_link': (1.2, 2.4), 'trunk_link': (1.2, 2.4)}   # a freeway's lane (12 ft); its shoulders, inside and outside (Caltrans HDM 307: 10 ft outside; 4–10 ft inside)
HT_UP = 0.15                              # a road higher than this anywhere is a structure
HAUDIT = collections.Counter()
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
import heights as HT

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

    # ── where the buildings stand (a street is not laid wider than the room between them; nothing is planted in one) ──
    CELL = 30.0
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

    def room(p, hw):
        """is there room for a street hw to either side of this line, with its walks: no building within that"""
        cl = lens(p); d = 0.0
        while d <= cl[-1]:
            (x, z), i = at(p, cl, d); rt = right(unit(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]))
            if any(built(x + rt[0] * o, z + rt[1] * o) for o in (hw + 0.4, -hw - 0.4, hw + ST.WALKW + 0.3, -hw - ST.WALKW - 0.3)): return False
            d += 5.0
        return True

    # ── the roads ──
    def make_roads():
        """the world's road records (and its service ways) from the map's ways as they stand in W"""
        roads, service, lanes_by_name = [], [], collections.defaultdict(list)
        for wid, (tg, nd) in W.ways.items():
            hw = tg.get('highway')
            if hw in ROAD and tg.get('area') != 'yes' and 'lanes' in tg and tg['lanes'].split(';')[0].isdigit():
                lanes_by_name[(tg.get('name', ''), hw, tg.get('oneway') == 'yes')].append(int(tg['lanes'].split(';')[0]))
        for wid, (tg, nd) in sorted(W.ways.items()):
            hw = tg.get('highway')
            if hw not in ROAD and hw != 'service': continue
            if tg.get('area') == 'yes' or tg.get('access') == 'no' or tg.get('tunnel') == 'building_passage' or (tg.get('tunnel') == 'yes' and not hw.startswith('motorway')): continue   # (a freeway's ramp that dives under another is kept: heights.py lifts what passes over it)
            nd = [n for n in nd if n in W.xz]; p = [W.xz[n] for n in nd]
            if len(p) < 2 or not near(p): continue
            esa = W.esa(nd)
            if hw == 'service':
                if tg.get('service') == 'drive-through': continue
                kind = tg.get('service', '')
                service.append(dict(id=wid, nd=nd, p=p, cl=lens(p), kind=kind, hw=SERVICE_HW.get(wid, {'parking_aisle': 3.1, 'driveway': 2.6, 'alley': 2.5}.get(kind, 3.0)), esa=esa,
                                    oneway=tg.get('oneway') == 'yes'))
                continue
            ow = tg.get('oneway') in ('yes', '1', 'true') or hw == 'motorway'
            l0 = tg.get('lanes', '').split(';')[0]
            if l0.isdigit(): lanes = int(l0)
            elif esa: lanes = 2                                                      # the hotel place's own rule
            else:
                same = lanes_by_name.get((tg.get('name', ''), hw, ow)) if tg.get('name') and hw not in ST.QUIET else None   # (a quiet street has its class's lanes: what it widens to at a signal is not what it is along its length)
                lanes = min(same) if same else ROAD[hw][1 if ow else 0]
            lanes = max(1, min(lanes, 10))
            prof = ST.lanes_of(tg, lanes, ow)                                        # its lanes from kerb to kerb
            if esa:
                if len(prof) != lanes: prof = ST.lanes_of({}, lanes, ow)             # (the hotel place's own widths stand: the lanes are fitted into them)
            else: lanes = max(1, min(len(prof), 10)); prof = prof[:lanes]
            mx = sum(x for x, _ in p) / len(p); mz = sum(z for _, z in p) / len(p); inbox = lambda b: b is None or ((b[0] is None or b[0] <= mx) and (b[1] is None or mx <= b[1]) and (b[2] is None or b[2] <= mz) and (b[3] is None or mz <= b[3]))
            known = [s for nm, n, span, s in STRIPES if nm == tg.get('name') and (n is None or n == lanes) and inbox(span)]
            if known and not any(k.startswith(('lanes:', 'turn:')) for k in tg):
                prof = [(c, set()) for c in known[0]]
                if not esa: lanes = len(prof)                                        # (in the hotel place's box the street keeps that place's width; elsewhere the lanes make the width)
            w = lanes * (FWY_LANE if hw.startswith('motorway') else LANE) + (0.8 if ow else 1.2); park = None
            wk = WIDTHS.get(tg.get('name'))
            if isinstance(wk, list): wk = next(((w_, s_) for box, w_, s_ in wk if inbox(box)), None)
            if wk and wk[1] is None:                                                 # a street whose width is known, with the map's lanes: cars park along both kerbs in what is left
                w = wk[0]; prof = [('q', set())] + prof + [('p', set())]; park = (w - (0.8 if ow else 1.2) - lanes * LANE) / 2
            elif wk:                                                                 # a street whose width and lanes are known (the satellite picture)
                w, known = wk; prof = [(c, set()) for c in known]; lanes = sum(1 for c in known if c not in 'pq')
                park = (w - (0.8 if ow else 1.2) - lanes * LANE) / max(1, len(known) - lanes) if len(known) > lanes else None
            elif not esa and not tg.get('bridge') and ST.parks(tg, hw, prof, ow) and room(p, (ST.QUIETW if hw in ST.QUIET else w + 2 * ST.PARK) / 2):      # cars park along both kerbs
                prof = [('q', set())] + prof + [('p', set())]
                if hw in ST.QUIET: w = ST.QUIETW; park = (w - 1.2 - 2 * ST.QUIETL) / 2  # (a quiet street: 36 feet from kerb to kerb, and no lines)
                else: w += 2 * ST.PARK; park = ST.PARK
            v = ROAD[hw][2]; ms = tg.get('maxspeed', '')
            if ms.endswith('mph') and ms.split()[0].isdigit(): v = int(ms.split()[0]) * 0.44704
            try: layer = int(tg.get('layer', '1' if tg.get('bridge') else '0'))
            except ValueError: layer = 0
            roads.append(dict(id=wid, nd=nd, p=p, cl=lens(p), name=tg.get('name', ''), cls=hw, lanes=lanes, oneway=ow, w=w,
                              bridge=bool(tg.get('bridge')) and tg.get('bridge') != 'no', layer=layer, esa=esa, v=v, rev=tg.get('oneway') == '-1', tg=tg, prof=prof))
            if park is not None: roads[-1]['park'] = park
        return roads, service, lanes_by_name
    roads, service, lanes_by_name = make_roads()
    # ── how high the roads lie that leave the ground (heights.py: by rule — the map gives no heights). A way that is
    # partly up and partly on the ground is cut where it leaves it; what is up (and every freeway) is a structure,
    # drawn by the tiles' own builder (f), and the streets' layout leaves it alone (as it leaves a bridge) ──
    rails = [(wid, W.pts(nd), int(tg.get('layer', '1') if tg.get('layer', '1').lstrip('-').isdigit() else 1), 9.0) for wid, (tg, nd) in W.ways.items()
             if tg.get('railway') == 'light_rail' and tg.get('bridge') and not W.esa(nd) and near(W.pts(nd))]
    for r in roads:                                                                # (a freeway's and a ramp's deck as drawn — lanes and shoulders, as deck() below has it — for heights.py to see where a ramp's deck touches its freeway's)
        if r['cls'] in FWY_SH or r['cls'] == 'trunk': tw = r['lanes'] * FWY_LANE; shl, shr = FWY_SH.get(r['cls'], (1.2, 2.4)); r['deck'] = (tw / 2 + shl, tw / 2 + shr)
    hprof, haudit = HT.solve(roads, rails); HAUDIT.update({'heights: ' + k: v for k, v in haudit.items()})
    pieces = split_by_height(W, roads, hprof)
    # (the streets whose width changes along them are cut only now: they lie on the ground, and the heights above are
    # worked out over the whole network in an order that the cut ways would change — 10 km off, a ramp would rise)
    cuts = HAUDIT['streets: ways cut where a known width begins'] = cut_ways(W, CUTS)
    if pieces or cuts: roads, service, lanes_by_name = make_roads()
    for r in roads:
        hp = hprof.get(r['id'])
        if r['id'] in pieces:
            o, d0, d1 = pieces[r['id']]; full = hprof.get(o) or []
            hp = [(0.0, HT.height(full, d0))] + [(d - d0, h) for d, h in full if d0 < d < d1] + [(d1 - d0, HT.height(full, d1))]
        up = bool(hp) and max(h for _, h in hp) > HT_UP
        r['struct'] = r['cls'] == 'motorway' or up; r['hp'] = hp if up else None
        r['bridge'] = r['struct']                                                # (the streets' layout passes over structures as it passed over bridges)
    for ri, r in enumerate(roads): r['hw'] = r['w'] / 2; r['ri'] = ri

    # ── where the paving is, to keep other things off it: segments by 30 m square ──
    seggrid = collections.defaultdict(list)
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
    # ── the streets: lanes and their lines, where roads meet, kerbs and walks (streets.py) ──
    S = ST.layout(W, roads, service, DRIVES, MEDIAN_W, ISLANDS, CROSSWALKS, WALKS, MEDIANS)

    # ── tiles ── (two sheets of them are laid: the world's, and — the streets only, within that place's ground — the
    # hotel place's, for its own page: SHEET is the one being laid, and the rectangle it keeps to)
    tiles = collections.defaultdict(lambda: collections.defaultdict(list))
    SHEET = [tiles, None]
    def loc(p, i, j): return [v for x, z in p for v in (int(round((x - i * T) * 10)), int(round((z - j * T) * 10)))]
    def inb(x, z): return BX0 <= x < BX1 and BZ0 <= z < BZ1 and (SHEET[1] is None or (SHEET[1][0] <= x < SHEET[1][2] and SHEET[1][1] <= z < SHEET[1][3]))
    def square(i, j):
        """the square (i, j), cut to the sheet's rectangle: x0, z0, x1, z1 — or None where the sheet has none of it"""
        if not (BX0 <= i * T + 1 < BX1 and BZ0 <= j * T + 1 < BZ1): return None
        q = (i * T, j * T, (i + 1) * T, (j + 1) * T); R = SHEET[1]
        if R is not None: q = (max(q[0], R[0]), max(q[1], R[1]), min(q[2], R[2]), min(q[3], R[3]))
        return q if q[2] > q[0] and q[3] > q[1] else None
    def lines(key, head, p, k=10):
        xs = [q[0] for q in p]; zs = [q[1] for q in p]
        for i in range(int(math.floor(min(xs) / T)), int(math.floor(max(xs) / T)) + 1):
            for j in range(int(math.floor(min(zs) / T)), int(math.floor(max(zs) / T)) + 1):
                sq = square(i, j)
                if sq is None: continue
                for piece in clip(p, *sq):
                    if lens(piece)[-1] > 0.15: SHEET[0][(i, j)][key].append(head + [v for x, z in piece for v in (int(round((x - i * T) * k)), int(round((z - j * T) * k)))])
    def strip(kind, pts):
        xs = [q[0] for q in pts]; zs = [q[1] for q in pts]
        for i in range(int(math.floor(min(xs) / T)), int(math.floor(max(xs) / T)) + 1):
            for j in range(int(math.floor(min(zs) / T)), int(math.floor(max(zs) / T)) + 1):
                sq = square(i, j)
                if sq is None: continue
                for piece in clipn(pts, *sq):
                    if len(piece) < 2: continue
                    # centimetres: the left edge's first point, then its steps from point to point; each time, the step across to the right edge
                    c = [[int(round((v - (i if n % 2 == 0 else j) * T) * 100)) for n, v in enumerate(q[2:])] for q in piece]; out = [kind]
                    for n, q in enumerate(c): out += [q[0] - (c[n - 1][0] if n else 0), q[1] - (c[n - 1][1] if n else 0), q[2] - q[0], q[3] - q[1]]
                    SHEET[0][(i, j)]['k'].append(out)
    sgrid = collections.defaultdict(list)                                         # the structures' footprints by 30 m square
    for r in roads:
        if r.get('struct') and r.get('hp'):
            k = 0 if r['cls'] == 'motorway' else 1; hw = max(FWY_SH.get(r['cls'], (2.1, 2.1))) + (r['lanes'] * FWY_LANE if r['cls'].startswith('motorway') else r['w']) / 2
            for (ax, az), (bx, bz) in zip(r['p'], r['p'][1:]):
                for gx in range(int(math.floor((min(ax, bx) - hw - 4) / CELL)), int(math.floor((max(ax, bx) + hw + 4) / CELL)) + 1):
                    for gz in range(int(math.floor((min(az, bz) - hw - 4) / CELL)), int(math.floor((max(az, bz) + hw + 4) / CELL)) + 1): sgrid[(gx, gz)].append((ax, az, bx, bz, hw, r['tg'].get('bridge') not in (None, 'no')))
    def overdeck(x, z, m, fill_only=False):
        """under or beside a raised deck (within m of its edge): no tree grows there, no light stands; under fill nothing at all"""
        for ax, az, bx, bz, hw, br in sgrid.get((int(math.floor(x / CELL)), int(math.floor(z / CELL))), ()):
            if (not fill_only or not br) and ST.seg_dist((x, z), (ax, az), (bx, bz))[0] < hw + m: return True
        return False
    def point(key, x, z, rest, head=()):
        if key == 'p' and head and (overdeck(x, z, 2.5) if head[0] in (0, 1, 2) else overdeck(x, z, 0.5, True)): return   # (head[0]: what it is — 0 a tree, 1 a palm, 2 a light, 4 a stop sign, 5 a parked car)
        i, j = int(math.floor(x / T)), int(math.floor(z / T))
        if inb(x, z): SHEET[0][(i, j)][key].append(list(head) + [int(round((x - i * T) * 10)), int(round((z - j * T) * 10))] + rest)
    def area(key, head, p):
        cx = sum(q[0] for q in p) / len(p); cz = sum(q[1] for q in p) / len(p); i, j = int(math.floor(cx / T)), int(math.floor(cz / T))
        if inb(cx, cz): SHEET[0][(i, j)][key].append(head + loc(p, i, j))
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
                sq = square(i, j)
                if sq is None: continue
                q = cut_poly(p, *sq)
                if q and len(q) >= 3: SHEET[0][(i, j)][key].append(head + loc(q, i, j))

    counts = collections.Counter(); counts.update(HAUDIT)
    def piers(p, h, kind, every, seed):
        cl = lens(p); d = 6.0 + seed % 10
        while d < cl[-1] - 3:
            for shift in (0.0, 5.0, -5.0, 9.0, -9.0, 13.0, -13.0):                 # a pier that would stand in a road moves along the deck; a long span has none
                (x, z), i = at(p, cl, d + shift)
                if not paved(x, z, 1.3) and 0 < d + shift < cl[-1]:
                    point('q', x, z, [int(round(math.degrees(math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0])))), int(round(h * 10)), kind]); counts['piers'] += 1; break
            d += every
    snode = collections.defaultdict(list)                                         # a node → the structures through it
    stgrid = collections.defaultdict(list)                                        # a 50 m square → (structure, segment) passing within 30 m of it
    for r in roads:
        if r.get('struct'):
            for n in r['nd']: snode[n].append(r)
            P = r['p']
            for k in range(len(P) - 1):
                (ax, az), (bx, bz) = P[k], P[k + 1]
                for gx in range(int((min(ax, bx) - 30) // 50), int((max(ax, bx) + 30) // 50) + 1):
                    for gz in range(int((min(az, bz) - 30) // 50), int((max(az, bz) + 30) // 50) + 1): stgrid[(gx, gz)].append((r, k))
    def deck(r):
        """a structure's kind (0 a freeway, 1 a ramp, 2 a street's bridge) and its deck: travelled way, left and right edges"""
        kind = 0 if r['cls'] == 'motorway' else 1 if r['cls'].endswith('_link') or r['cls'] == 'trunk' else 2
        tw = r['lanes'] * FWY_LANE if kind < 2 else r['w']; shl, shr = FWY_SH.get(r['cls'], (1.2, 2.4)) if kind < 2 else (2.1, 2.1)   # (a street's bridge: a walk of 1.8 m each side, and the parapet's foot)
        return kind, tw, tw / 2 + shl, tw / 2 + shr
    def structure(r):
        """a road off the ground, or a freeway, for the tiles' own builder (f): its line every 6 m with its height and,
        for each point, which parapets stand (bit 0 left, 1 right), whether its deck is raised 3 cm over another's
        (bit 2) or not drawn at all, lying wholly in a wider one's (bit 3) — where a ramp leaves or joins; and its piers"""
        kind, tw, wl, wr = deck(r); bridge = r['tg'].get('bridge') not in (None, 'no')
        pp = resample(r['p'], 6.0); cl = lens(pp); ys = [HT.height(r['hp'], d) if r['hp'] else 0.0 for d in cl]; fl = [3] * len(pp)
        # where another structure leaves or joins at a node of this one and runs beside it, the side facing it is open
        near_ = {id(q): q for n in r['nd'] for q in snode[n] if q is not r and (n in (q['nd'][0], q['nd'][-1]) or n in (r['nd'][0], r['nd'][-1]))}
        for q in near_.values():
            qk, qtw, qwl, qwr = deck(q); qp = q['p']
            for i, (x, z) in enumerate(pp):
                best = None
                for k, ((ax, az), (bx, bz)) in enumerate(zip(qp, qp[1:])):
                    d, t = ST.seg_dist((x, z), (ax, az), (bx, bz))
                    if best is None or d < best[0]: best = (d, ax + (bx - ax) * t, az + (bz - az) * t, q['cl'][k] + (q['cl'][k + 1] - q['cl'][k]) * t, (k == 0 and t <= 1e-6) or (k == len(qp) - 2 and t >= 1 - 1e-6))
                d, qx, qz, qd, past = best
                if d > 40: continue
                if abs(ys[i] - (HT.height(q['hp'], qd) if q.get('hp') else 0.0)) > 0.15: continue   # (decks at two heights beside each other: each keeps its parapets, and both are drawn)
                a = pp[max(0, i - 1)]; b = pp[min(len(pp) - 1, i + 1)]; ux, uz = unit(b[0] - a[0], b[1] - a[1]); side = (qx - x) * -uz + (qz - z) * ux   # > 0: q lies to the right
                mine, theirs = (wr if side > 0 else wl), max(qwl, qwr)
                if d < mine + theirs - 0.3: fl[i] &= ~(2 if side > 0 else 1)
                if not past and d + (wl if side > 0 else wr) < theirs - 0.2: fl[i] &= ~(1 if side > 0 else 2)   # (… and so is the far side, where it stands inside the other's deck: a ramp the map begins at a freeway's middle line had its parapet across the freeway's lanes, and the car went through it)
        # and no parapet stands inside any other deck at its height, met at a node or not: two carriageways the map draws
        # closer than their lanes need overlap, and the median's parapet of the one stood in the other's fast lane
        for i, (x, z) in enumerate(pp):
            best = {}
            for q, k in stgrid.get((int(x // 50), int(z // 50)), ()):
                if q is r or id(q) in near_: continue
                (ax, az), (bx, bz) = q['p'][k], q['p'][k + 1]; d, t = ST.seg_dist((x, z), (ax, az), (bx, bz))
                if d < 40 and (id(q) not in best or d < best[id(q)][0]): best[id(q)] = (d, ax + (bx - ax) * t, az + (bz - az) * t, q['cl'][k] + (q['cl'][k + 1] - q['cl'][k]) * t, q, (k == 0 and t <= 1e-6) or (k == len(q['p']) - 2 and t >= 1 - 1e-6))
            for d, qx, qz, qd, q, past in best.values():
                if past or abs(ys[i] - (HT.height(q['hp'], qd) if q.get('hp') else 0.0)) > 0.15: continue
                _, _, qwl, qwr = deck(q); theirs = max(qwl, qwr)
                a = pp[max(0, i - 1)]; b = pp[min(len(pp) - 1, i + 1)]; ux, uz = unit(b[0] - a[0], b[1] - a[1]); side = (qx - x) * -uz + (qz - z) * ux
                mine, far = (wr, wl) if side > 0 else (wl, wr)
                if abs(d - mine) < theirs - 0.3: fl[i] &= ~(2 if side > 0 else 1)
                if d + far < theirs - 0.2: fl[i] &= ~(1 if side > 0 else 2)
                if wl + wr < qwl + qwr and d < mine + theirs: fl[i] |= 4
                if wl + wr < qwl + qwr and not past and d + (wl if side > 0 else wr) < theirs - 0.2: fl[i] |= 8   # (alongside it: a point past the other's end is not in it)
        # each segment goes to the tile its middle lies in; a tile's run of them is one entry
        cur, run, s0 = None, [], 0.0
        def flush():
            if cur and len(run) > 1:
                i, j = cur
                if square(i, j) is not None: SHEET[0][(i, j)]['f'].append([kind, 1 if bridge else 0, int(round(wl * 10)), int(round(wr * 10)), r['lanes'], int(round(run0[0] * 10))] + [v for k in run for v in (int(round((pp[k][0] - i * T) * 10)), int(round((pp[k][1] - j * T) * 10)), int(round(ys[k] * 100)), fl[k])])
        run0 = [0.0]
        for k in range(len(pp) - 1):
            mx, mz = (pp[k][0] + pp[k + 1][0]) / 2, (pp[k][1] + pp[k + 1][1]) / 2; t = (int(math.floor(mx / T)), int(math.floor(mz / T)))
            if t != cur:
                flush(); cur, run, run0 = t, [k], [cl[k]]
            run.append(k + 1)
        flush(); counts['structures'] += 1; counts['structure m'] += cl[-1]
        if bridge:                                                                # its piers: every 34 m or so, never in a street beneath
            d = 12.0 + h32('pier', r['id']) % 14
            while d < cl[-1] - 8:
                for shift in (0.0, 5.0, -5.0, 9.0, -9.0):
                    (x, z), i = at(pp, cl, d + shift); y = HT.height(r['hp'], d + shift) if r['hp'] else 0
                    if y > 4.0 and not paved(x, z, 1.4):
                        point('q', x, z, [int(round(math.degrees(math.atan2(pp[i + 1][1] - pp[i][1], pp[i + 1][0] - pp[i][0])))), int(round(y * 10)), 2, int(round((wl + wr) * 10)), int(round((wr - wl) / 2 * 10))]); counts['piers'] += 1; break
                d += 34.0
    def lay_streets():
        """what the streets are made of and what stands along them, into the sheet being laid"""
        for ri, r in enumerate(roads):
            if r['bridge']:
                if not r['esa']: structure(r)
                continue
            counts['roads'] += 1; counts['road_m'] += r['cl'][-1]
            # (the streets of the hotel place's box too: the kerbs there are the world's now, and what stands along a kerb
            # goes where the kerb is. What that place knew of its streets' trees is in TREES; its own block stays its own.)
            p, cl = r['p'], r['cl']; seed = h32('road', r['name'] or r['id'])
            species = TREES.get(r['name'], -1 if seed % 100 < 4 else (1 if seed % 100 < 28 else 0))                       # a street is planted with one kind: none, palms, or trees —
            kind = TREE_KIND.get(r['name'], 0 if (seed >> 12) % 100 < 38 else (1 if (seed >> 12) % 100 < 86 else 2))        # figs, round-headed trees or gums (engine/plants.js)
            own = lambda x, z: ESA_BLOCK[0] < x < ESA_BLOCK[1] and ESA_BLOCK[2] < z < ESA_BLOCK[3]
            every = 12.0 + (seed >> 8) % 7
            for side in (1, -1):
                for a, b in S['sides'].get((ri, side), ()):
                    seg = sub(p, cl, a, b)
                    if len(seg) < 2: continue
                    if species >= 0 and r['cls'] != 'motorway':
                        back = offset(seg, side * (r['hw'] + ST.side_of(r, side)[1] + TREE_BACK.get(r['name'], 1.6))); bl = lens(back); d = 5.0 + (seed >> 4) % 6
                        while d < bl[-1] - 3:
                            (x, z), _ = at(back, bl, d); hh = h32('t', round(x), round(z))
                            if not paved(x, z, 0.8) and not own(x, z): point('p', x, z, [kind, tree_size(kind, hh)] if species == 0 else [0, int((11 + hh % 70 / 10.0) * 10)], [species])
                            d += every
                    if r['prof'][-1 if side > 0 else 0][0] in 'pq':                      # cars parked along the kerb, nose the way that side's traffic goes; about one place in three taken
                        line = offset(seg, side * (r['hw'] - 1.2)); ll = lens(line); d = 7.5 + h32('kerb', r['id'], side, round(a)) % 50 / 10.0
                        while d < ll[-1] - 7.5:
                            (x, z), i = at(line, ll, d); hh = h32('kerb car', round(x * 2), round(z * 2))
                            if hh % 100 < 34 and not own(x, z):
                                f = unit(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1])
                                point('p', x, z, [int(round(math.degrees(math.atan2(side * f[1], side * f[0])))), (hh >> 12) % 10], [5]); counts['cars at the kerb'] += 1
                            d += 6.4
                    if r['cls'] in ('trunk', 'primary', 'secondary', 'tertiary'):
                        kerb = offset(seg, side * (r['hw'] + 0.6)); kl = lens(kerb); d = 9.0 if side > 0 else 31.0
                        while d < kl[-1] - 2:
                            (x, z), i = at(kerb, kl, d); f = unit(kerb[i + 1][0] - kerb[i][0], kerb[i + 1][1] - kerb[i][1]); rt = right(f)
                            if not own(x, z): point('p', x, z, [int(round(math.degrees(math.atan2(-side * rt[1], -side * rt[0])))), 0], [2])
                            d += 44.0
        for (x, z), name in S['medians']:                                               # palms down the planted medians that have them
            hh = h32('t', round(x), round(z))
            if name in MEDIANS and 'tree' in MEDIANS[name]: point('p', x, z, [MEDIANS[name]['tree'], tree_size(MEDIANS[name]['tree'], hh)], [0])
            elif any(n in name for n in MEDIAN_PALMS): point('p', x, z, [0, int((14 + hh % 60 / 10.0) * 10)], [1])
        for kind, pts in S['bands']: strip(kind, pts)
        for kind, pts in S['polys']: area('o', [kind], pts)
        for kerb, back in S['corners']:                                                 # centimetres: how many points the kerb has; the outline — its first point, then the steps
            mx, mz = kerb[len(kerb) // 2]; i, j = int(math.floor(mx / T)), int(math.floor(mz / T))
            if not inb(mx, mz): continue
            c = [(int(round((x - i * T) * 100)), int(round((z - j * T) * 100))) for x, z in kerb + back]; out = [len(kerb), c[0][0], c[0][1]]
            for a, b in zip(c, c[1:]): out += [b[0] - a[0], b[1] - a[1]]
            SHEET[0][(i, j)]['c'].append(out)
        for ty, wcm, pts in S['marks']: lines('m', [ty, wcm], pts, 100)
        for kind, x, z, a in S['figures']:
            i, j = int(math.floor(x / T)), int(math.floor(z / T))
            if inb(x, z): SHEET[0][(i, j)]['y'].append([kind, int(round((x - i * T) * 100)), int(round((z - j * T) * 100)), int(round(a))])
        for x, z, a, arm, grp, ji in S['poles']: point('s', x, z, [int(round(a)), int(round(arm * 10)), grp, ji]); counts['signal poles'] += 1
        for x, z, a in S['signs']: point('p', x, z, [int(round(a)), 0], [4]); counts['stop signs'] += 1
    lay_streets()
    # … and once more for the hotel place's own page: the same streets, cut to that place's ground (ESA_GROUND), with
    # nothing but streets in them. So its page draws its streets from these tiles too, and the one set of rules holds
    # whether the place is seen from a car in the world or on foot from its own page.
    keep = counts.copy(); place = collections.defaultdict(lambda: collections.defaultdict(list)); SHEET[:] = [place, ESA_GROUND]
    lay_streets()
    SHEET[:] = [tiles, None]; counts.clear(); counts.update(keep)
    place = {ij: {k: v for k, v in t.items() if k in 'kocmyps'} for ij, t in place.items()}
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
        if len(p) < 4 or not near(p) or W.esa(nd) or tg.get('location') == 'underground' or tg.get('building') in ('no',) or wid in SITE_WAYS: return
        if wid in CARPORTS:                                                        # the strip on the alley is the site's (its carport, the floor over it)
            X, q = CARPORTS[wid], p[:-1] if p[0] == p[-1] else p; out = []
            for a, b in zip(q, q[1:] + q[:1]):
                if a[0] <= X: out.append(a)
                if (a[0] <= X) != (b[0] <= X): t = (X - a[0]) / (b[0] - a[0]); out.append((X, a[1] + (b[1] - a[1]) * t))
            if len(out) < 3: return
            p = out + out[:1]
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
                    if ins and n > 0: kd = (1, 0, 1, 2)[(hh >> 20) % 4]; point('p', x, z, [kd, tree_size(kd, hh)], [0]); n -= 1
    for rid, (tg, mem) in W.rels.items():
        if len(mem) == 1 and mem[0] in W.ways: add_building('r' + rid, tg, W.ways[mem[0]][1])
    for n, tg in W.ntag.items():
        if tg.get('natural') == 'tree' and n in W.xz:
            x, z = W.xz[n]
            if not (ESA_BOX[0] < x < ESA_BOX[1] and ESA_BOX[2] < z < ESA_BOX[3]):
                hh = h32('n', round(x / 90), round(z / 90)); kd = (1, 0, 1, 2)[hh % 4]                                   # (trees the map has one by one: of a kind with their neighbours)
                point('p', x, z, [kd, tree_size(kd, h32('t', round(x), round(z)))], [0])
    return tiles, roads, service, counts, S, place

# ── a route: the lane a car keeps, and the path it drives along it ─────────────────────────────────────────────────────────
def lane_plan(los, Ls, before, after, change=100.0, near_cost=None):
    """Which lane a car keeps on each piece of a street (the pieces differ in their lanes): [(the lane it comes into the
    piece in, the lane it leaves it in)], a lane being its metres to the right of the centre line. Of all plans the one
    that moves the car sideways least, given that it ends in the lane its next turn is made from (the left one for a
    left turn, the right one for a right), that a lane is changed within a piece only where the piece is `change` long
    (100 m on a street; on a freeway's ramps, cut into short pieces where others join and leave, 40 m), and
    that a turn is finished in the near lane (the kerb's after a right turn — that counts for more — the middle's after
    a left) where that lane goes on for 60 m (where a ramp has joined, side by side, `near_cost` a metre: it comes in in
    its own lane, not across the gore).   los: each piece's lanes · Ls: its length · before, after: the turns (±1, 0)"""
    best = {}                                                                      # the lane a plan leaves the piece in → (what it costs, the plan)
    for j, lo in enumerate(los):
        nxt = {}
        for e in lo:
            if j == 0:
                near = lo[-1] if before > 0 else lo[0] if before < 0 else None
                c, pl = ((near_cost or (1.2 if before > 0 else 0.3)) * abs(e - near) if near is not None and (Ls[0] >= 60 or near_cost) else 0.0), []
            else: c, pl = min(((c + abs(x - e), pl) for x, (c, pl) in best.items()), key=lambda t: t[0])
            for x in lo:
                if x != e and Ls[j] < change: continue
                cc = c + (abs(x - e) + 0.5 if x != e else 0.0)
                if x not in nxt or cc < nxt[x][0]: nxt[x] = (cc, pl + [(e, x)])
        best = nxt
    want = los[-1][0] if after < 0 else los[-1][-1] if after > 0 else None
    return best[want][1] if want in best else min(best.values(), key=lambda t: t[0])[1]

def cut_ways(W, cuts):
    """cuts each way of the streets in `cuts` ({name: [(x, z)]}) at each point: at its node within 1.5 m of the way's
    nearest point to it, or at a new node there (none within 2 m of the way's ends, none farther than 6 m from the way)
    → how many cuts. The pieces are ways '<id>~<k>' with the way's tags."""
    made = 0
    for wid, (tg, nd) in sorted(W.ways.items()):
        pts = cuts.get(tg.get('name')) if tg.get('highway') in ROAD else None
        if not pts: continue
        nd = [n for n in nd if n in W.xz]; p = [W.xz[n] for n in nd]
        if len(p) < 2: continue
        cl = lens(p); at_ = set()
        for c in pts:
            best = None
            for k in range(len(p) - 1):
                d, t = ST.seg_dist(c, p[k], p[k + 1])
                if best is None or d < best[0]: best = (d, k, t)
            d, k, t = best; s = cl[k] + (cl[k + 1] - cl[k]) * t
            if d > 6.0 or s < 2.0 or s > cl[-1] - 2.0: continue
            near_k = min(range(len(p)), key=lambda i: abs(cl[i] - s))
            if abs(cl[near_k] - s) < 1.5: at_.add(near_k); continue
            n = '%s~n%d' % (wid, len(at_)); (x, z), _ = at(p, cl, s); W.xz[n] = (x, z); W.nodes[n] = (LAT0 - z / KZ, LON0 + x / KX)
            nd.insert(k + 1, n); p.insert(k + 1, (x, z)); cl = lens(p); at_ = {i + 1 if i > k else i for i in at_}; at_.add(k + 1)
        if not at_: continue
        del W.ways[wid]; ks = sorted(at_)
        for j, (a, b) in enumerate(zip([0] + ks, ks + [len(nd) - 1])): W.ways['%s~%d' % (wid, j)] = (tg, nd[a:b + 1])
        made += len(ks)
    return made

def split_by_height(W, roads, prof):
    """cuts each way that is partly up and partly on the ground where it leaves the ground (a node is put there) →
    {piece's way id: (the way's id, from d, to d)}. A freeway is a structure all along: it is not cut."""
    pieces = {}
    for r in roads:
        hp = prof.get(r['id'])
        if r['cls'] == 'motorway' or not hp or max(h for _, h in hp) <= HT_UP or min(h for _, h in hp) > HT_UP: continue
        cuts = []
        for (d0, h0), (d1, h1) in zip(hp, hp[1:]):
            if (h0 > HT_UP) != (h1 > HT_UP): cuts.append(d0 + (d1 - d0) * (HT_UP - h0) / (h1 - h0))
        cuts = [d for d in cuts if 2.0 < d < r['cl'][-1] - 2.0]
        if not cuts: continue
        tg, nd = W.ways.pop(r['id']); ends = [0.0] + cuts + [r['cl'][-1]]; out = [nd[0]]; k = 1; part = 0
        for c in cuts + [None]:
            while k < len(nd) and (c is None or r['cl'][k] < c - 1e-6): out.append(nd[k]); k += 1
            if c is None: break
            (x, z), i = at(r['p'], r['cl'], c); n = '%s@%d' % (r['id'], part)
            W.xz[n] = (x, z); W.nodes[n] = (LAT0 - z / KZ, LON0 + x / KX); out.append(n)
            W.ways['%s#%d' % (r['id'], part)] = (tg, out); pieces['%s#%d' % (r['id'], part)] = (r['id'], ends[part], ends[part + 1]); part += 1; out = [n]
        W.ways['%s#%d' % (r['id'], part)] = (tg, out); pieces['%s#%d' % (r['id'], part)] = (r['id'], ends[part], ends[part + 1])
    return pieces

def via_test(t, rec):
    """does a way belong to a stage of a route: ('name', names…), ('ref', ref) (a motorway), ('way', id)"""
    if t[0] == 'name': return rec.get('name') in t[1:]
    if t[0] == 'ref': return rec.get('cls') == 'motorway' and rec.get('tg', {}).get('ref') == t[1]
    return rec['id'] == t[1]

def plan(W, roads, service, a, b, via=None):
    """the cheapest way over roads and service ways between the nodes nearest two points → [(way, node ids in travel order)].
    via: the stages it runs through, in order (via_test); between two stages a ramp may come, or the few metres across a
    divided road's middle (a way shorter than 40 m)"""
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
    if via: return staged(g, W, roads, service, snap, a, b, via)
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

def staged(g, W, roads, service, snap, a, b, via):
    rec = {('r', r['id']): r for r in roads}; rec.update({('s', s['id']): s for s in service})
    glue = lambda r: r.get('cls', '').endswith('_link') or (r['cl'][-1] < 40.0 and 'cls' in r)
    S = len(via); s = snap(a)
    ends = {n for n in g for m, w, way in g[n] if via_test(via[-1], rec[way])} | {m for n in g for m, w, way in g[n] if via_test(via[-1], rec[way])}
    e = min(ends, key=lambda n: math.hypot(W.xz[n][0] - b[0], W.xz[n][1] - b[1]))
    pq, cost, prev = [(0.0, s, 0)], {(s, 0): 0.0}, {}
    while pq:
        c, n, st = heapq.heappop(pq)
        if n == e and st == S - 1: break
        if c > cost.get((n, st), 1e18): continue
        for m, w, way in g[n]:
            r = rec[way]
            for t in (st, st + 1):
                if t >= S or not (via_test(via[t], r) or (t == st and glue(r))): continue
                if c + w < cost.get((m, t), 1e18): cost[(m, t)] = c + w; prev[(m, t)] = (n, st, way); heapq.heappush(pq, (c + w, m, t))
    k = (e, S - 1)
    if k not in prev:
        far = collections.Counter(t for (n, t) in cost); tip = [W.xz[n] for (n, t) in cost if t == max(far)]
        raise SystemExit('no way through the stages %s: reached stage %d (%s) at %d nodes, e.g. %s; the end node %s at %s' % (via, max(far), via[max(far)], far[max(far)], [tuple(round(c) for c in q) for q in tip[:6]], e, tuple(round(c) for c in W.xz[e])))
    path, ways = [e], []
    while k in prev: n, st, way = prev[k]; ways.append(way); path.append(n); k = (n, st)
    path.reverse(); ways.reverse(); legs = []
    for k, way in enumerate(ways):
        if legs and legs[-1][0] == way: legs[-1][1].append(path[k + 1])
        else: legs.append((way, [path[k], path[k + 1]]))
    return legs

def parked(roads, service, spec):
    """the car standing at the end of a route home, and him beside it looking at it: {x, z, a (radians: the way the nose
    points, as atan2(dz, dx)), eye: [x, z], at: [x, z]}"""
    key, side, nose, stand = spec['park'][:4]; b = spec['b']
    cands = [r for r in roads if r['name'] == key] + [s for s in service if s['id'] == key]
    best = None
    for r in cands:
        for k in range(len(r['p']) - 1):
            d, t = ST.seg_dist(b, r['p'][k], r['p'][k + 1])
            if best is None or d < best[0]: best = (d, r, k, t)
    _, r, k, t = best; (ax, az), (bx, bz) = r['p'][k], r['p'][k + 1]; u = unit(bx - ax, bz - az); rt = (-u[1], u[0])
    px, pz = ax + (bx - ax) * t, az + (bz - az) * t
    want = {'north': (0, -1), 'south': (0, 1), 'east': (1, 0), 'west': (-1, 0)}[side]; sg = 1 if rt[0] * want[0] + rt[1] * want[1] > 0 else -1   # which of the way's sides that is
    if nose == 0:                                                                  # square to an alley, nose in, its middle 2.9 m beyond the alley's edge
        hw = r.get('hw', 2.5); o = spec['park'][4] if len(spec['park']) > 4 else hw + 2.9; x, z = px + rt[0] * sg * o, pz + rt[1] * sg * o; a = math.atan2(rt[1] * sg, rt[0] * sg)
        eye = (x - rt[0] * sg * 5.5 + u[0] * 2.0, z - rt[1] * sg * 5.5 + u[1] * 2.0)       # before the stall, a little to one side of it
    else:                                                                          # along the kerb, 1.1 m off it, on the walk beside it to look at it from
        hw = r['hw']; o = hw - 1.15; x, z = px + rt[0] * sg * o, pz + rt[1] * sg * o; dirn = {'north': (0, -1), 'south': (0, 1), 'east': (1, 0), 'west': (-1, 0)}[nose]
        f = 1 if u[0] * dirn[0] + u[1] * dirn[1] > 0 else -1; a = math.atan2(u[1] * f, u[0] * f)
        e = hw + 1.6 if stand == 'walk' else -1.4                                  # on the walk beside it, or out in the way
        eye = (px + rt[0] * sg * e - u[0] * f * 3.8, pz + rt[1] * sg * e - u[1] * f * 3.8)
    return dict(x=round(x, 2), z=round(z, 2), a=round(a, 4), eye=[round(eye[0], 2), round(eye[1], 2)], at=[round(x, 2), round(z, 2)])

def shown(rec):
    """what the screen calls a road: a street its name; a freeway its number and name; a ramp where it goes"""
    tg = rec.get('tg', {}); en = lambda s: s.replace(' ', '-', 1).replace('-East', ' Đông').replace('-West', ' Tây').replace('-North', ' Bắc').replace('-South', ' Nam').replace(' East', ' Đông').replace(' West', ' Tây').replace(' North', ' Bắc').replace(' South', ' Nam')
    if rec.get('cls') == 'motorway': return (en(tg['ref'].split(';')[0]) + (' · ' + rec['name'] if rec['name'] else '')) if tg.get('ref') else rec['name']
    if rec.get('cls', '').endswith('_link'):
        d = tg.get('destination:ref', '').split(';'); st = tg.get('destination:street') or tg.get('destination', '')
        if d[0]: return 'Nhánh lên ' + ' / '.join(en(x) for x in d if x)
        return ('Lối ra ' + st.split(';')[0]) if st else 'Nhánh nối'
    return rec['name']

def fwy_offsets(pts, sidx, los, before, after):
    """A freeway's lane, point by point (metres right of its line). The car comes in on the side it joined by (before:
    +1 the right, −1 the left), keeps that lane, and moves over one lane at a time to the side it leaves by (after) —
    each move centred 300 m from the next, the last one centred 450 m before it leaves; then the whole is eased (a
    Gaussian, σ 45 m), so that a move takes some 150 m: five seconds at 65 mph, as a driver does it."""
    cl = lens(pts); L = cl[-1]; lo0, lo1 = los[sidx[0]], los[sidx[-1]]
    r_in = 0 if before >= 0 else len(lo0) - 1; r_out = 0 if after >= 0 else len(lo1) - 1   # lanes counted from the right
    m = abs(r_out - r_in); sg = 1 if r_out > r_in else -1
    end = max(0.35 * L, L - 450.0); gap = min(300.0, (end - min(300.0, 0.2 * L)) / max(1, m))
    centres = [end - gap * (m - 1 - c) for c in range(m)]
    raw = []
    for i, d in enumerate(cl):
        lo = los[sidx[i]]; r = max(0, min(len(lo) - 1, r_in + sg * sum(1 for c in centres if d >= c))); raw.append(lo[len(lo) - 1 - r])
    out, S = [], 45.0
    for i, d in enumerate(cl):
        a, b = bisect.bisect_left(cl, d - 3 * S), bisect.bisect_right(cl, d + 3 * S); w = [math.exp(-0.5 * ((cl[j] - d) / S) ** 2) for j in range(a, b)]
        out.append(sum(raw[j] * w[j - a] for j in range(a, b)) / sum(w))
    return out

def blend(A, B, D, Db=None, r=0.0):
    """joins line A's end to line B's start where they run side by side at a slant (a ramp leaving a freeway or joining
    it, a street's lanes moving over where its pieces meet): A is cut back by D, B by Db (D too if not given), and an S
    runs between; where the two head apart where A ends, an arc of radius r (less where there is no room) turns from the
    one to the other → (points, where B's part begins)

    The S goes from a point of A to the point of B abreast of it, more of B and less of A as it goes (smoothly: no turn
    at either end), so it keeps between the two lines as they curve and where one begins before the other ends. Past
    A's end A is run on with B's shape (moved over onto A's end: the kink between them rounded), and before B's start
    B is run back straight. Straight lines run on from where each was cut and mixed — a cubic through the cuts'
    tangents before that — bowed out wherever a line curved between its cut and the joint or the two met at an angle:
    11 m past a freeway's lanes where a ramp curved up to it, 10 m out over the grass between two ramps, 9 m into the
    far lanes of Inglewood Avenue where it bends 13°."""
    la, lb = lens(A), lens(B); D = max(5.0, min(D, 0.45 * la[-1])); Db = max(5.0, min(D if Db is None else Db, 0.45 * lb[-1]))
    q = at(B, lb, min(lb[-1], 2.0))[0]; b = unit(q[0] - B[0][0], q[1] - B[0][1]); E = 400.0
    Be = [(B[0][0] - b[0] * E, B[0][1] - b[1] * E)] + list(B); le = lens(Be)       # B run back straight before its start
    def proj(pt, k0=None):                                                         # → (distance, where along Be, segment) of Be's point nearest pt
        best = None
        for k in (range(len(Be) - 1) if k0 is None else range(max(0, k0 - 8), min(len(Be) - 1, k0 + 9))):
            d, t = ST.seg_dist(pt, Be[k], Be[k + 1])
            if best is None or d < best[0]: best = (d, le[k] + (le[k + 1] - le[k]) * t, k)
        return best
    _, xa, _ = proj(A[-1]); PB = at(Be, le, xa)[0]; dA = (PB[0] - A[-1][0], PB[1] - A[-1][1])   # B abreast of A's end
    Bsh = [(x - dA[0], z - dA[1]) for x, z in sub(Be, le, xa, le[-1])]             # B on from there, moved over onto A's end
    pa = at(A, la, max(0.0, la[-1] - 2.0))[0]; a = unit(A[-1][0] - pa[0], A[-1][1] - pa[1])
    q = at(Be, le, min(le[-1], xa + 2.0))[0]; bb = unit(q[0] - PB[0], q[1] - PB[1])
    th = math.acos(max(-1.0, min(1.0, a[0] * bb[0] + a[1] * bb[1])))
    e = Db - (xa - E)                                                              # how far past A's end the S ends (less than 0: before)
    ref = A + Bsh[1:]
    if r > 0 and th > math.radians(1.5) and e > 2.0:
        tau = min(r * math.tan(th / 2), D - 1.0, e - 1.0)
        if tau > 0.5: ref = fillet(A, Bsh, tau / math.tan(th / 2))
    lr = lens(ref); c0 = la[-1] - D; c1 = max(c0 + 5.0, lr[-1] - (lb[-1] - Db) if e > 0 else la[-1] + e)
    n = max(4, int(c1 - c0)); mid = []; k0 = None; x = Db + E
    for i in range(1, n + 1):
        t = i / n; w = t * t * t * (t * (6 * t - 15) + 10); pt, _ = at(ref, lr, c0 + (c1 - c0) * t)   # (smoother than smoothstep: no step in the bend at either end, so no kick to the wheel)
        _, x, k0 = proj(pt, k0); qb = at(Be, le, x)[0]
        mid.append((pt[0] + (qb[0] - pt[0]) * w, pt[1] + (qb[1] - pt[1]) * w))
    A2, B2 = sub(A, la, 0, c0), sub(B, lb, max(0.0, x - E), lb[-1])
    return A2 + mid[:-1] + B2, len(A2) + len(mid) - 1

def straight_cuts(A, la, B, lb, Da, Db, least=5.0, force=False, least_b=None):
    """how far back along A and on along B an S joining them may reach (at most Da, Db): as far as each runs on
    straight from the joint (within 10°) — an S laid into a piece that bends away (a ramp curving up onto its freeway
    from where it was joined) bowed outwards by metres — and on to `least` where it bends a little more (within
    25°: an S much shorter than that the car cannot keep to) → (Da, Db)"""
    def heading(L, ll, d): _, i = at(L, ll, d); j = min(i + 1, len(L) - 1); return unit(L[j][0] - L[i][0], L[j][1] - L[i][1])
    ta, tb = heading(A, la, la[-1] - 1.0), heading(B, lb, 1.0); ok = lambda u, t, deg=10: u[0] * t[0] + u[1] * t[1] > math.cos(math.radians(deg))
    lb_ = least if least_b is None else least_b                                    # (`least_b`: B's own, where the S is laid mostly in one of them)
    def reach(L, ll, at_end, t, most, lst):
        d = min(5.0, most)
        while d + 2.0 <= min(most, 0.45 * ll[-1]) and ok(heading(L, ll, ll[-1] - d - 2.0 if at_end else d + 2.0), t): d += 2.0
        while d + 2.0 <= min(lst, most, 0.45 * ll[-1]) and ok(heading(L, ll, ll[-1] - d - 2.0 if at_end else d + 2.0), t, 25): d += 2.0   # (up to `least` where it bends a little more, not where it turns)
        return d
    if force: return max(reach(A, la, True, ta, Da, least), min(least, Da, 0.45 * la[-1])), max(reach(B, lb, False, tb, Db, lb_), min(lb_, Db, 0.45 * lb[-1]))   # (`force`: to `least` whatever the bend — joining a piece too short for an S of its own)
    return reach(A, la, True, ta, Da, least), reach(B, lb, False, tb, Db, lb_)

def fillet(A, B, r):
    """joins line A's end to line B's start with an arc of radius r (less where there is no room) → points"""
    a = unit(A[-1][0] - A[-2][0], A[-1][1] - A[-2][1]); b = unit(B[1][0] - B[0][0], B[1][1] - B[0][1])
    cross = a[0] * b[1] - a[1] * b[0]; dot = max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1])); th = math.acos(dot)
    if th < math.radians(10 if r < 50 else 1.5) or abs(cross) < 1e-6: return A + B   # (a wide arc rounds a kink of a few degrees too)
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
    STRAY_AT[:] = [None]
    while step < 60000:
        best = None; d = sp
        while d <= min(el[-1], sp + 1.5):                                           # where on the line the axle now is (it never goes back)
            (qx, qz), _ = at(ext, el, d); e2 = (qx - x) ** 2 + (qz - z) ** 2
            if best is None or e2 < best[0]: best = (e2, d)
            d += 0.05
        sp = best[1]; dev = math.sqrt(best[0])
        if dev > stray: stray = dev; STRAY_AT[0] = (round(dev, 2), round(sp, 1), round(x, 1), round(z, 1))
        if dev > 1.2: STRAY_AT.append((round(dev, 2), round(sp, 1), round(x, 1), round(z, 1)))
        if sp >= L - 0.01: x -= math.cos(th) * (sp - L); z -= math.sin(th) * (sp - L); break   # there, to the centimetre
        v = max(1.0, vref[min(len(vref) - 1, int(sp / L * (len(vref) - 1)))])
        ahead = min(24.0, max(3.0, 0.8 * v)); (tx, tz), _ = at(ext, el, sp + ahead)   # (0.8 s ahead: at 100 km/h a point 12 m off had the car weave as it settled after a change of lane)
        dx, dz = tx - x, tz - z; dist = math.hypot(dx, dz) or 1e-6
        alpha = (math.atan2(dz, dx) - th + math.pi) % (2 * math.pi) - math.pi
        want = max(-0.59, min(0.59, math.atan(WHEELBASE * 2 * math.sin(alpha) / dist)))
        turn = 0.43 * ds / v; delta += max(-turn, min(turn, want - delta))
        if step % 2 == 0: out.append((x, z, th, math.tan(delta) / WHEELBASE)); on.append(min(L, sp))
        th += math.tan(delta) / WHEELBASE * ds; x += math.cos(th) * ds; z += math.sin(th) * ds; step += 1
    out.append((x, z, th, math.tan(delta) / WHEELBASE)); on.append(L)
    return out, on, stray

STRAY_AT = [None]                                                                  # (for a look at it: the worst stray, then every stretch over 1.2 m)

def route(W, roads, service, S, spec):
    rid = {r['id']: r for r in roads}; sid = {s['id']: s for s in service}
    at_end = collections.defaultdict(list)                                         # a node → the roads that begin or end at it
    for q_ in roads:
        for nd_ in (q_['nd'][0], q_['nd'][-1]): at_end[nd_].append(q_)
    legs = plan(W, roads, service, spec['a'], spec['b'], spec.get('via'))
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
    elif spec.get('via') and merged: trim_end(merged[-1], spec['b'])               # (a route through stages ends where it is told, not at the map's node)
    # the turn each leg ends with (+1 right, −1 left, 0 straight on)
    def heading_out(q): p = q['segs'][-1]['p']; return unit(p[-1][0] - p[-2][0], p[-1][1] - p[-2][1])
    def heading_in(q): p = q['segs'][0]['p']; return unit(p[1][0] - p[0][0], p[1][1] - p[0][1])
    seq = ([dict(manual=head, v=spec.get('head_v', 3.2), name=spec.get('head_name', ''))] if head else []) + merged + ([dict(manual=tail, v=spec.get('tail_v', 3.2), name=spec.get('tail_name', ''))] if tail else [])
    def hin(q): return unit(q['manual'][1][0] - q['manual'][0][0], q['manual'][1][1] - q['manual'][0][1]) if 'manual' in q else heading_in(q)
    def hout(q): return unit(q['manual'][-1][0] - q['manual'][-2][0], q['manual'][-1][1] - q['manual'][-2][1]) if 'manual' in q else heading_out(q)
    turns = []
    def street(q, end): return '' if 'manual' in q or q['segs'][end]['kind'] != 'r' else (q['segs'][end]['rec']['name'] or '')
    for k in range(len(seq) - 1):
        a, b = hout(seq[k]), hin(seq[k + 1]); c = a[0] * b[1] - a[1] * b[0]; d = a[0] * b[0] + a[1] * b[1]
        same = street(seq[k], -1) and street(seq[k], -1) == street(seq[k + 1], 0)   # (the same street bending at a junction is gone along, not turned into: a turn there only past 60°)
        turns.append(0 if d > (0.5 if same else 0.87) else (1 if c > 0 else -1))
    FW = ('motorway', 'motorway_link', 'trunk_link')
    fwy = [('segs' in q and q['segs'][0]['kind'] == 'r' and q['segs'][0]['rec']['cls'] in FW) for q in seq]
    fjoin = [False] * len(turns)
    for k in range(len(seq) - 1):
        a, b = seq[k], seq[k + 1]
        if 'manual' in a or 'manual' in b or not (fwy[k] and fwy[k + 1]): continue          # (both a freeway's or its ramps': a slip from one to the other)
        A, B = hout(a), hin(b)
        if A[0] * B[0] + A[1] * B[1] < 0.87: continue                              # (a ramp's end at a street: a turn as any other)
        # a ramp leaves a freeway or joins it, at a slant: which side it does so on — where the other's line lies, some 60 m on,
        # seen from the freeway's (or, ramp to ramp, the first's) line at the joint
        main_first = not (a['segs'][0]['rec']['cls'] == 'motorway_link' and b['segs'][0]['rec']['cls'] == 'motorway')
        if main_first:
            o = b['segs'][0]['p'] if len(b['segs'][0]['p']) > 1 else b['segs'][-1]['p']; c0 = lens(o); P = at(o, c0, min(60.0, c0[-1]))[0]; R = a['segs'][-1]['p'][-1]; U = A
        else:
            o = a['segs'][-1]['p']; c0 = lens(o); P = at(o, c0, max(0.0, c0[-1] - 60.0))[0]; R = b['segs'][0]['p'][0]; U = B
        side = (P[0] - R[0]) * -U[1] + (P[1] - R[1]) * U[0]
        turns[k] = 1 if side > 0 else -1; fjoin[k] = True
    # each leg's lane line
    lines_, meta = [], []
    for k, q in enumerate(seq):
        if 'manual' in q: lines_.append(list(q['manual'])); meta.append(dict(v=q['v'], lo=-1.0, hi=1.0, name=q['name'])); continue
        before = turns[k - 1] if k > 0 else 0; after = turns[k] if k < len(turns) else 0
        pts, offs, sidx = [], [], []; segs = list(q['segs']); to = 'left' if after < 0 else 'right' if after > 0 else None
        if to == 'left' and segs[-1]['kind'] == 'r' and any(c == 'c' for c, _ in segs[-1]['rec']['prof']):   # a left turn from a street with a middle lane: into that lane for the last 70 m
            s = segs[-1]; c0 = lens(s['p'])
            segs[-1:] = [dict(s, p=sub(s['p'], c0, 0, c0[-1] - 70)), dict(s, p=sub(s['p'], c0, c0[-1] - 70, c0[-1]), to=to)] if c0[-1] > 95 else [dict(s, to=to)]
        else: segs[-1] = dict(segs[-1], to=to)
        los = [[1.3] if s['kind'] == 's' else ST.lane_offsets(s['rec'], s['fwd'], s.get('to')) for s in segs]; Ls = [lens(s['p'])[-1] for s in segs]
        pin = {}                                                                   # past an island in the middle lane the car keeps to a lane beside it: index in pts → the lane there
        for s, L, (first, last) in zip(segs, Ls, lane_plan(los, Ls, before, after, 40.0 if fwy[k] else 100.0, 3.0 if fwy[k] and k and fjoin[k - 1] else None)):
            p = resample(s['p'], 2.0); cl = lens(p); k0 = len(pts)
            d0 = max(0.15 * L, L - 145.0); d1 = min(max(d0 + 30.0, L - 80.0), L - 12.0)   # a change of lane is over well before the piece is
            for i, pt in enumerate(p):
                t = 0.0 if d1 <= d0 else max(0.0, min(1.0, (cl[i] - d0) / (d1 - d0))); t = t * t * (3 - 2 * t)
                o = first + (last - first) * t
                if pts and math.hypot(pt[0] - pts[-1][0], pt[1] - pts[-1][1]) < 0.3: offs[-1] = (offs[-1] + o) / 2; continue   # where two pieces of the street meet
                pts.append(pt); offs.append(o); sidx.append(len(los) and segs.index(s))
            if s['kind'] == 'r' and s['rec'].get('isl'):
                beside = ST.lane_offsets(s['rec'], s['fwd'], None)[0]
                for a, b in s['rec']['isl']:
                    ends = [at(s['rec']['p'], s['rec']['cl'], d)[0] for d in (a, b)]
                    for i in range(k0, len(pts)):
                        if ST.seg_dist(pts[i], ends[0], ends[1])[0] < 2.6: pin[i] = max(offs[i], beside)
        # What kinks are left in the centre line (World.curve leaves those where roads meet): eased, about 5 m to
        # either side; the line's ends, at the junctions, stay put.
        for _ in range(12): pts = [pts[0]] + [((pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4) for i in range(1, len(pts) - 1)] + [pts[-1]]
        # … and where one of the street's ways gives way to the next at a slant (a divided road's carriageway running
        # into the undivided road: the map's lines meet in a Y), eased over some 40 m either way: the lanes shift there
        # in a taper (about 60 m at 35 mph), not in an S of 25 m
        zone = set()
        for i in range(1, len(pts) - 1):
            if sidx[i] != sidx[i - 1]:
                a0 = math.atan2(pts[i][1] - pts[max(0, i - 4)][1], pts[i][0] - pts[max(0, i - 4)][0]); a1 = math.atan2(pts[min(len(pts) - 1, i + 4)][1] - pts[i][1], pts[min(len(pts) - 1, i + 4)][0] - pts[i][0])
                if abs((a1 - a0 + math.pi) % (2 * math.pi) - math.pi) > math.radians(4): zone |= set(range(max(1, i - 20), min(len(pts) - 1, i + 21)))
        for _ in range(60 if zone else 0): pts = [pts[0]] + [((pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4) if i in zone else pts[i] for i in range(1, len(pts) - 1)] + [pts[-1]]
        # where a street's pieces differ in lanes the lane's place in it steps sideways: taken over some 60 m, as a driver drifts across
        # … but not across an island: beside one the car is in its lane, and drifts into the pocket only once past it
        for i, o in pin.items(): offs[i] = o
        vleg = q['segs'][0]['rec']['v'] if q['segs'][0]['kind'] == 'r' else 4.2       # (… and as long as the speed asks: some 5 s of driving — at 40 mph some 90 m, not the 60 m of a 25 mph street, where it pushed the car sideways at 3.5 m/s³)
        for _ in range(max(130, int(130 * (vleg / 12.0) ** 2))): offs = [offs[0]] + [pin[i] if i in pin else (offs[i - 1] + 2 * offs[i] + offs[i + 1]) / 4 for i in range(1, len(offs) - 1)] + [offs[-1]]
        if pin:                                                                    # (… and the corner that leaves at the island's end is rounded: a hand does not snap the wheel over)
            for _ in range(24): offs = [offs[0]] + [(offs[i - 1] + 2 * offs[i] + offs[i + 1]) / 4 for i in range(1, len(offs) - 1)] + [offs[-1]]
        if fwy[k] and q['segs'][0]['rec']['cls'] == 'motorway': offs = fwy_offsets(pts, sidx, los, before, after)
        N = normals(pts); line_k = [(x + nx * o, z + nz * o) for (x, z), (nx, nz), o in zip(pts, N, offs)]
        if vleg >= 15.0 and len(line_k) > 40:                                       # at 35 mph and more the map's small kinks are eased further (some 8 m either way: a 3° kink at 40 mph pushed the car sideways at 5 m/s³); the ends stay put
            sm = list(line_k)
            for _ in range(3):
                P = [(0.0, 0.0)]
                for x, z in sm: P.append((P[-1][0] + x, P[-1][1] + z))
                sm = [((P[min(len(sm), i + 5)][0] - P[max(0, i - 4)][0]) / (min(len(sm), i + 5) - max(0, i - 4)), (P[min(len(sm), i + 5)][1] - P[max(0, i - 4)][1]) / (min(len(sm), i + 5) - max(0, i - 4))) for i in range(len(sm))]
            m = len(line_k); w = [min(1.0, max(0.0, (min(i, m - 1 - i) - 12) / 8.0)) for i in range(m)]
            line_k = [(a[0] + (s[0] - a[0]) * t, a[1] + (s[1] - a[1]) * t) for a, s, t in zip(line_k, sm, w)]
        lines_.append(line_k)
        rec = q['segs'][0]['rec']
        if q['kind'] == 's': meta.append(dict(v=4.2, lo=-1.1, hi=1.1, name=''))
        else: meta.append(dict(v=rec['v'], rec=rec, name=shown(rec)))
    # join them with arcs
    line = lines_[0]; marks = [0]                                                  # marks: index in `line` where each leg begins
    for k in range(1, len(lines_)):
        if fjoin[k - 1] and lens(line)[-1] > 30 and lens(lines_[k])[-1] > 30:
            # An exit ramp the map begins at its freeway's middle line: its line first crosses the freeway's lanes to the
            # side it leaves by. That stretch is no lane: the ramp's line is taken from where it has crossed the car's
            # lane (its line run on), within its first 120 m — followed from the middle line, the car swung in across a
            # lane and back out where the 405 lets off for Hawthorne Blvd.
            ra = seq[k - 1]['segs'][-1]['rec'] if seq[k - 1].get('segs') and seq[k - 1]['segs'][-1]['kind'] == 'r' else None
            rb = seq[k]['segs'][0]['rec'] if seq[k].get('segs') and seq[k]['segs'][0]['kind'] == 'r' else None
            if ra and rb and ra['cls'] == 'motorway' and rb['cls'] != 'motorway':
                la_ = lens(line); q0 = at(line, la_, max(0.0, la_[-1] - 10.0))[0]; ta_ = unit(line[-1][0] - q0[0], line[-1][1] - q0[1])
                Bk = lines_[k]; lbk = lens(Bk); sd = 1 if turns[k - 1] >= 0 else -1      # (the side it leaves by: right, or left)
                off = lambda pt: sd * ((pt[0] - line[-1][0]) * -ta_[1] + (pt[1] - line[-1][1]) * ta_[0])   # (> 0: beyond the car's lane, on that side)
                if off(Bk[0]) < -1.0:
                    j = 1
                    while j < len(Bk) - 1 and lbk[j] < 120.0 and off(Bk[j]) < 0.0: j += 1
                    if j < len(Bk) - 1 and lbk[j] < 120.0 and lbk[-1] - lbk[j] > 30.0: lines_[k] = Bk[j:]
            la, lb = lens(line), lens(lines_[k]); short = lb[-1] < 40.0 or la[-1] - la[min(marks[-1], len(la) - 1)] < 40.0   # (a piece too short for an S of its own on either side)
            vj = max(meta[k - 1].get('v', 10.0), meta[k].get('v', 10.0) if k < len(meta) else 10.0)   # (at speed a longer S: some 2.5 s of driving on either side)
            Da, Db = straight_cuts(line, la, lines_[k], lb, max(70.0, 2.5 * vj), max(70.0, 2.5 * vj), max(30.0, 2.5 * vj), short)
            line, at_b = blend(line, lines_[k], Da, Db, vj * vj / 1.5); marks.append(at_b); continue
        # straight on along the same street, from one piece of it to the next, where their lanes do not meet (one
        # piece has more lanes, or is a carriageway of its own): the car drifts across in an S over some 25–60 m,
        # instead of stepping sideways (or back) at the seam
        A, B = line, lines_[k]; ta = unit(A[-1][0] - A[-2][0], A[-1][1] - A[-2][1]); tb = unit(B[1][0] - B[0][0], B[1][1] - B[0][1])
        if ta[0] * tb[0] + ta[1] * tb[1] > math.cos(math.radians(25)):
            ex, ez = B[0][0] - A[-1][0], B[0][1] - A[-1][1]; side = abs(ta[0] * ez - ta[1] * ex); ahead = ta[0] * ex + ta[1] * ez
            if (side > 0.4 or ahead < -0.5) and lens(A)[-1] > 30 and lens(B)[-1] > 30:
                # (A is cut back no further than its last piece goes — not into the turn before it — and B takes
                # the rest: the S is as long either way)
                vj = max(meta[k - 1].get('v', 10.0), meta[k].get('v', 10.0))   # (at speed a longer S)
                la = lens(A); lb = lens(B); D = max(25.0, min(max(60.0, 2.5 * vj), 20.0 + 12.0 * side)); Da = min(D, 0.45 * (la[-1] - la[min(marks[-1], len(la) - 1)]))
                wa = seq[k - 1]['segs'][-1]['rec']['w'] if seq[k - 1].get('segs') and seq[k - 1]['segs'][-1]['kind'] == 'r' else 0.0
                wb = seq[k]['segs'][0]['rec']['w'] if seq[k].get('segs') and seq[k]['segs'][0]['kind'] == 'r' else 0.0
                if wa and wb and wb > wa + 1.0: Da = 5.0                          # (a piece widening into a lane more: the car moves over once it is there)
                elif wa and wb and wa > wb + 1.0: Da = min(2 * D - 5.0, 0.45 * (la[-1] - la[min(marks[-1], len(la) - 1)]))   # (narrowing: it is over before)
                # (… and only as far as either runs on in the direction of the joint: an S laid into a piece that
                # bends away — a ramp curving up onto its freeway — bowed outwards by metres)
                widen, narrow = wa and wb and wb > wa + 1.0, wa and wb and wa > wb + 1.0
                Da, Db = straight_cuts(A, la, B, lb, Da, 2 * D - Da, 5.0, False, 5.0)   # (on a street only as far as each piece runs straight: an S laid into a bend bowed out by metres, onto the walk)
                line, at_b = blend(A, B, Da, Db, max(13.0, vj * vj / 1.5)); marks.append(at_b); continue   # (where the pieces meet at an angle, an arc for the street's speed: 1.5 m/s² sideways)
        slow = 'manual' in seq[k - 1] or 'manual' in seq[k] or seq[k - 1].get('kind') == 's' or seq[k].get('kind') == 's'
        r = 5.0 if slow else (6.5 if turns[k - 1] > 0 else 13.0)
        ua = unit(line[-1][0] - line[-2][0], line[-1][1] - line[-2][1]); ub = unit(lines_[k][1][0] - lines_[k][0][0], lines_[k][1][1] - lines_[k][0][1])
        if not slow and turns[k - 1] == 0 and ua[0] * ub[0] + ua[1] * ub[1] > math.cos(math.radians(25)):   # (straight on where the street's pieces meet a few degrees apart: an arc for the street's speed, 1.5 m/s² sideways, as far as there is room — not a corner)
            vj = max(meta[k - 1].get('v', 10.0), meta[k].get('v', 10.0)); r = max(r, vj * vj / 1.5)
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
    lgrid = {}                                                                     # (a leg's segments by 25 m square: the nearest is looked for among a few)
    for k, ln in enumerate(lines_):
        for i in range(len(ln) - 1):
            (ax, az), (bx, bz) = ln[i], ln[i + 1]
            for gx in range(int((min(ax, bx) - 30) // 25), int((max(ax, bx) + 30) // 25) + 1):
                for gz in range(int((min(az, bz) - 30) // 25), int((max(az, bz) + 30) // 25) + 1): lgrid.setdefault((gx, gz), []).append((k, i))
    def leg_of(pt, hint):
        best = None
        for k, i in lgrid.get((int(pt[0] // 25), int(pt[1] // 25)), ()):
            if not (hint - 1 <= k < hint + 3): continue
            ax, az = lines_[k][i]; bx, bz = lines_[k][i + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
            t = max(0.0, min(1.0, ((pt[0] - ax) * (bx - ax) + (pt[1] - az) * (bz - az)) / L2)); d = math.hypot(ax + (bx - ax) * t - pt[0], az + (bz - az) * t - pt[1])
            if best is None or d < best[0] - 1e-6 or (abs(d - best[0]) <= 1e-6 and k < best[1]): best = (d, k)
        return best[1] if best else hint
    def legs_of(pts):
        out, hint = [], 0
        for pt in pts: hint = max(hint, leg_of(pt, hint)); out.append(hint)
        return out
    # The lane's line is not yet a path a car can keep: it is the map's line, with the map's small kinks, and its arcs
    # begin at once. So a car is driven along it here (drive_line), and what its back axle traces is the route.
    rl = lens(raw); rleg = legs_of(raw); n = len(raw)
    # How far the joined line is ever outside the pavement of the streets it goes along (each street's half width
    # from its middle line, by the map, of the leg it is on and the legs either side, and of the streets that begin or
    # end where theirs do: a freeway's next way, where the map begins its exit ramp at the freeway's middle line and the
    # car keeps to the outer lane until the ramp leaves): an arc into a turn and an S between lanes keep within it.
    # places/south-bay/checks.mjs holds the route to that. (An S made of straight lines run on from its ends swung 10 m
    # out over the grass between two ramps, and no other check saw it.)
    rgrid = {}
    for k, q in enumerate(seq):
        recs = {}
        for s in q.get('segs', []):
            recs[id(s['rec'])] = s['rec']
            if s['kind'] == 'r':
                for nd_ in (s['rec']['nd'][0], s['rec']['nd'][-1]):
                    for q_ in at_end[nd_]: recs[id(q_)] = q_
        for rec_ in recs.values():
            P, hw_ = rec_['p'], rec_.get('hw', 3.0)
            for i in range(len(P) - 1):
                (ax, az), (bx, bz) = P[i], P[i + 1]
                for gx in range(int((min(ax, bx) - 30) // 25), int((max(ax, bx) + 30) // 25) + 1):
                    for gz in range(int((min(az, bz) - 30) // 25), int((max(az, bz) + 30) // 25) + 1): rgrid.setdefault((gx, gz), []).append((k, ax, az, bx, bz, hw_))
    def outside_at(pt, k):
        best = None
        for kk, ax, az, bx, bz, hw_ in rgrid.get((int(pt[0] // 25), int(pt[1] // 25)), ()):
            if not (k - 1 <= kk <= k + 1): continue
            d, _ = ST.seg_dist(pt, (ax, az), (bx, bz)); best = d - hw_ if best is None else min(best, d - hw_)
        return 0.0 if best is None else best                                       # (a part drawn by hand has no street of the map's)
    outside = max([(outside_at(raw[i], rleg[i]), rl[i]) for i in range(0, n, 2) if 'manual' not in seq[rleg[i]]] or [(0.0, 0.0)])   # (not on a part drawn by hand: a garage's floors, a hotel's lot)
    rh = [math.atan2(raw[min(i + 4, n - 1)][1] - raw[max(i - 4, 0)][1], raw[min(i + 4, n - 1)][0] - raw[max(i - 4, 0)][0]) for i in range(n)]
    vref = []
    for i in range(n):
        a, b = max(0, i - 4), min(n - 1, i + 4); k = abs((rh[b] - rh[a] + math.pi) % (2 * math.pi) - math.pi) / max(1e-6, rl[b] - rl[a])
        vref.append(min(meta[rleg[i]]['v'], math.sqrt(1.9 / max(1e-4, k))))
    for i in range(n - 2, -1, -1): vref[i] = min(vref[i], math.sqrt(vref[i + 1] ** 2 + 2 * 1.7 * (rl[i + 1] - rl[i])))
    for i in range(1, n): vref[i] = min(vref[i], math.sqrt(vref[i - 1] ** 2 + 2 * 1.45 * (rl[i] - rl[i - 1])) if i > 1 else vref[i])
    sim, on, stray = drive_line(raw, rl, vref)
    if os.environ.get('STRAYS'):                                                   # (STRAYS=1: where the driven path leaves the lane's line by more than 1.2 m, printed)
        runs = []
        for dev, sp, x, z in STRAY_AT[1:]:
            if runs and sp - runs[-1][1] < 5: runs[-1] = (max(runs[-1][0], dev), sp, runs[-1][2], runs[-1][3], runs[-1][4] if runs[-1][0] >= dev else (x, z))
            else: runs.append((dev, sp, sp, 0, (x, z)))
        print(' strays of', spec['id'], 'worst', STRAY_AT[0], 'stretches', [(r[0], r[2], r[1], r[4]) for r in runs][:20], flush=True)
    if spec.get('dbg') is not None: spec['dbg'].update(seq=seq, lines=lines_, raw=raw, turns=turns, fjoin=fjoin, sim=sim)   # for tools that look into a route
    p = [(x, z) for x, z, th, k in sim]; th = [q[2] for q in sim]; kap = [q[3] for q in sim]
    cl = lens(p); PM = 2                                                           # points to a metre
    # Where the street is straight: for 20 m either way — or, faster, for 2 s of driving either way — the lane's line
    # turns by no more than 0.6° all told (so not where it changes lane either: at 100 km/h a change of lane is spread
    # over 150 m, and 20 m of it hardly turn). There a car's wheel is held still — places/south-bay/checks.mjs holds the
    # drive to that.
    tv = [0.0]
    for i in range(1, n): tv.append(tv[-1] + abs((rh[i] - rh[i - 1] + math.pi) % (2 * math.pi) - math.pi))
    hw = [max(40, int(round(4 * vref[i]))) for i in range(n)]                       # (points: two to a metre)
    calm = [i >= hw[i] and i + hw[i] < n and tv[i + hw[i]] - tv[i - hw[i]] < math.radians(0.6) for i in range(n)]
    straight, i = [], 0
    while i < n:
        if not calm[i]: i += 1; continue
        j2 = i
        while j2 + 1 < n and calm[j2 + 1]: j2 += 1
        if rl[j2] - rl[i] >= 40:                                                    # … in the path's own metres; at a freeway's speed (over 20 m/s) less a second's driving at either end (coming out of a bend the wheel is still being given back)
            a = next(k for k in range(len(on)) if on[k] >= rl[i]); b = next(k for k in range(len(on) - 1, -1, -1) if on[k] <= rl[j2])
            sa, sb = cl[a] + (vref[i] if vref[i] > 20 else 0.0), cl[b] - (vref[j2] if vref[j2] > 20 else 0.0)
            if sb - sa >= 40: straight.append([round(sa, 1), round(sb, 1)])
        i = j2 + 1
    legi = legs_of(p)
    # Heights. A part drawn by hand may climb (the floors of a parking structure): the path's points take its heights in
    # the order they come — such a part lies over itself in plan, level above level — and where the slope changes the
    # height is eased over some 6 m, as a floor is rounded where a ramp begins.
    yy = [0.0] * len(p)
    for which, ys in ((0, spec.get('head_y')), (len(seq) - 1, spec.get('tail_y'))):
        if not ys: continue
        M = seq[which]['manual']; j = 0; assert len(M) == len(ys)
        for i, pt in enumerate(p):
            if legi[i] != which: continue
            best = None
            for k in range(j, min(len(M) - 1, j + 14)):
                dist, t = ST.seg_dist(pt, M[k], M[k + 1])
                if best is None or dist < best[0] - 1e-9: best = (dist, k, t)
            _, j, t = best; yy[i] = ys[j] + (ys[j + 1] - ys[j]) * t
    # … and where the route runs on a structure (a freeway, a ramp, a street's bridge: heights.py, guessed), its deck's
    def deck(pt, segs, near):
        """the structure among segs nearest pt: (distance, where along it, its road, its segment, whether pt lies beyond its first or last point)"""
        best = None
        for s in segs:
            rec = s['rec']
            if s['kind'] != 'r' or not rec.get('hp'): continue
            P, cl0 = rec['p'], rec['cl']; k0 = near.get(rec['id'], None); rng = range(len(P) - 1) if k0 is None else range(max(0, k0 - 6), min(len(P) - 1, k0 + 7))
            for kk in rng:
                dd, t = ST.seg_dist(pt, P[kk], P[kk + 1])
                if best is None or dd < best[0]: best = (dd, cl0[kk] + (cl0[kk + 1] - cl0[kk]) * t, rec, kk, (kk == 0 and t <= 0.0) or (kk == len(P) - 2 and t >= 1.0))
        return best
    # A leg's ends are not where its road's are: the turn's arc and the joins cut the corner, so the path is already on
    # the next leg's road before its own leg ends, or still on the last one's after. Within 30 m of where a leg begins
    # or ends, then, the neighbouring leg's structure is looked at too: a point beyond its own road's end takes the
    # deck it lies along, and a point of a street on the ground that lies on a ramp's deck (within its half width)
    # takes the ramp's height — no step of half a metre where a street turns onto a ramp or one ramp runs on as the next.
    near_, nearx = {}, {}                                                          # (a road's segment nearest the last point: looked for near it)
    found = [False] * len(p)
    bnd = [i for i in range(1, len(p)) if legi[i] != legi[i - 1]]; bi = 0
    for i, pt in enumerate(p):
        q = seq[legi[i]]
        if 'manual' in q: continue
        best = deck(pt, q['segs'], near_)
        mine = best is not None and best[0] < max(15.0, best[2]['hw'] + 5.0)
        if mine: near_[best[2]['id']] = best[3]
        if not mine or best[4]:
            while bi < len(bnd) and cl[bnd[bi]] < cl[i] - 30.0: bi += 1
            for b in bnd[bi:]:
                if cl[b] > cl[i] + 30.0: break
                for k in (legi[b - 1], legi[b]):
                    if k == legi[i] or 'manual' in seq[k]: continue
                    alt = deck(pt, seq[k]['segs'], nearx.setdefault((k, b), {}))
                    if alt is None or alt[4]: continue
                    if alt[0] < (max(15.0, alt[2]['hw'] + 5.0) if mine else alt[2]['hw'] + 0.5):
                        nearx[(k, b)][alt[2]['id']] = alt[3]
                        if not mine or best[4]: best, mine = alt, True
        if mine: yy[i] = HT.height(best[2]['hp'], best[1]); found[i] = True
    # where the path crosses from one structure's line to the next's (merging, a lane or two out from either) and
    # neither is near enough: its height runs on from the one to the other, not down to the ground and back
    i = 0
    while i < len(p):
        if found[i] or yy[i]: i += 1; continue
        j = i
        while j < len(p) and not found[j] and not yy[j]: j += 1
        if 0 < i and j < len(p) and found[i - 1] and found[j] and cl[j] - cl[i - 1] < 120.0:
            for k in range(i, j): yy[k] = yy[i - 1] + (yy[j] - yy[i - 1]) * (cl[k] - cl[i - 1]) / (cl[j] - cl[i - 1])
        i = j
    if spec.get('dbg') is not None: spec['dbg'].update(yraw=list(yy), found=list(found), legi=list(legi), p=list(p), cl=list(cl))
    if any(yy):
        for _ in range(2): yy = [sum(yy[max(0, i - 6):i + 7]) / len(yy[max(0, i - 6):i + 7]) for i in range(len(yy))]
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
            lo = (-rec['hw'] + 1.2 if rec['oneway'] else 1.1) - off; hi = rec['hw'] - 1.2 - off - (rec.get('park', 0.0) if any(c in 'pq' for c, _ in rec['prof']) else 0.0)   # (not in among the parked cars)
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
            assert -0.8 < bump < -0.05, ('the car would not stop at the line', spec['id'], round(at_stop, 1), round(bump, 2))
            ctl.append([round(at_stop, 1), 0 if j['signal'] else 1, j['ctl'], 0 if abs(u[1]) >= abs(u[0]) else 1])
    # a gate on a part drawn by hand (the arm at a parking structure's portal): the bumper stops half a metre short of it
    for gx, gz in spec.get('gates', ()):
        c = next((i for i in range(1, len(p)) if abs(p[i][1] - gz) < 2.0 and (p[i - 1][0] - gx) * (p[i][0] - gx) <= 0 and yy[i] < 0.5), None)
        assert c is not None, ('the path does not pass a gate', spec['id'], gx, gz)
        ctl.append([round(cl[c] - 4.25, 1), 2, 0, 0])
    # the turns, for the indicators: where the heading swings more than 35°
    hd, W12 = th, 12 * PM                                                          # 12 m of line
    tl, i = [], 0
    while i < len(p) - W12:
        dh = hd[min(i + W12, len(p) - 1)] - hd[i]
        if abs(dh) > math.radians(22):
            j2 = i
            while j2 < len(p) - W12 and abs(hd[j2 + W12] - hd[j2]) > math.radians(8): j2 += 1
            tot = hd[min(j2 + W12, len(p) - 1)] - hd[i]
            lead = 38.0 if meta[legi[i]]['v'] > 6.0 else 9.0                         # (some three seconds before the wheel turns: 38 m on a street, a few metres at a walk)
            if abs(tot) > math.radians(35): tl.append([round(max(tl[-1][1] if tl else 0, cl[i] - lead), 1), round(cl[min(j2 + W12, len(p) - 1)], 1), 1 if tot > 0 else -1, round(cl[i], 1)])
            i = j2 + W12
        else: i += 1
    names = []
    for i, k in enumerate(legi):
        nm = meta[k].get('name', '')
        if not names or names[-1][1] != nm: names.append([round(cl[i], 1), nm])
    park = parked(roads, service, spec) if spec.get('park') else None
    return dict(id=spec['id'], name=spec['name'], frm=spec['from'], to=spec['to'], home=spec.get('home'), park=park, by=spec.get('by'), note=spec.get('note'), length=round(cl[-1], 1), stray=round(stray, 2), outside=[round(outside[0], 2), round(outside[1], 1)],
                pts=[int(round(v * 1000)) for pt in p for v in pt], hd=[int(round(a * 1e5)) for a in th], k=[int(round(c * 1e6)) for c in kap],
                lim=lim, band=band, ctl=sorted(ctl), turns=tl, names=[[s, (names[k - 1][1] if n == 'Nhánh nối' and k and names[k - 1][1].startswith(('Nhánh', 'Lối ra')) else n)] for k, (s, n) in enumerate(names)], straight=straight, **(dict(y=[int(round(v * 1000)) for v in yy]) if any(yy) else {}))

# ── what the map does not say about this world's streets ──
# East Mariposa Avenue where the map gives it six lanes and no more: the satellite picture has two lanes each way and
# a middle lane for left turns between them (the kerb lanes wide), from Pacific Coast Highway to Nash Street.
# Maple between Pacific Coast Highway and Nash has the same five (the map has no lanes there); east of Nash and west of
# the highway it has not. Nash along the parking structure at number 940 (Atwood Way to Imperial Highway) likewise: two
# lanes each way and the middle lane, 18.5 m from kerb to kerb (Street View 12/2023; the map says four lanes).
# Each: the street, the lanes the map gives it (or any), where (x from, x to, z from, z to; None: anywhere), its lanes.
STRIPES = [('East Mariposa Avenue', 6, None, 'bbcff'),
           ('East Maple Avenue', None, (-60.0, 660.0, None, None), 'bbcff'),
           ('North Nash Street', 4, (None, None, -830.0, -610.0), 'bbcff')]
# What places/esa-el-segundo-2015 knows of the trees along its streets (his photographs, Street View), for the rule that
# plants every street's: 0 broad-leaved, 1 palms, -1 none. And the medians that carry a row of palms.
TREES = {'East Mariposa Avenue': 0, 'Continental Boulevard': 0, 'North Nash Street': 1, 'North Pacific Coast Highway': -1}
# … and of which kind its trees are (0 an Indian laurel fig, 1 a round-headed tree, 2 a gum): the figs of Mariposa and
# Continental are in his photographs of 2015. Elsewhere a street's kind is drawn by lot, one kind to a street.
TREE_KIND = {'East Mariposa Avenue': 0, 'Continental Boulevard': 0}
def tree_size(kind, hh):
    """a tree's crown radius in decimetres: a fig's 3.0–5.1 m, a round-headed tree's 2.0–3.1 m, a gum's 2.5–3.4 m (its
    height is five times that)"""
    return int(((3.0, 2.0, 2.5)[kind] + hh % 22 / 10.0 * (1.0, 0.52, 0.42)[kind]) * 10)
MEDIAN_PALMS = ('Pacific Coast Highway', 'East Maple Avenue')
# Continental Boulevard as his photographs of 22/9/2015 show it (IMG_1783–1786): its median is a bed of bark mulch
# with the big Indian laurel figs standing IN it, some 13 m apart; more figs stand back on the lawns that slope up from
# the walks (TREE_BACK: how far behind a street's walk its trees stand, 1.6 m where nothing is known).
MEDIANS = {'Continental Boulevard': dict(ground='mulch', every=13.0, tree=0)}
TREE_BACK = {'Continental Boulevard': 4.5}
# The walks that are known (streets.py lays a walk at the kerb, as wide as its kind of street has it): Continental's
# is one flag of 5 ft, scored across (the same photographs); Nash's west walk under the Green Line is about 2.5 m, a
# strip for the posts and the walk behind it (IMG_1787). {street: width, or [(box, width, side or None)]}
WALKS = {'Continental Boulevard': 1.5, 'North Nash Street': [((None, None, -100.0, 720.0), 2.5, 'w')]}
# Streets whose width and lanes are known from the satellite picture: kerb to kerb, and its strips from the left kerb
# to the right ('q', 'p': where cars park; None: the map's own lanes, with a strip for parked cars along each kerb) —
# the whole street, or stretch by stretch: [((x from, x to, z from, z to; None: anywhere), width, strips)], a stretch
# taking each way of the street whose middle lies in its box (CUTS cuts a way where a stretch begins; between two
# widths the street tapers, as streets.py has it). Lairport: 16 m, a double yellow line, cars parked along both kerbs.
# Round home (the satellite picture at its closest, 28/11/2026, kerb to kerb to about half a metre): Emerald St is
# 14.7 m from Anza to Ladeene, 15.1 m along the church's lawn, 16.5 m from there to Earl, some 13.3 m beyond (seen
# from further off); Spencer St 16.2 m from Anza past the alley, 15.1 m by the business park at Earl; Anza Ave by
# number 20606 24.4 m — two lanes each way, the middle lane for left turns, a bike lane (these rules have none: it is
# in the strip by the kerb) and cars parked along both kerbs (Street View 2025) — and as wide where it comes to
# Spencer and to Emerald, where the map's lanes to turn from are kept (beyond those two it is not measured yet).
WIDTHS = {'Lairport Street': (16.0, 'qbfp'),
          'Emerald Street': [((3000.0, 3213.5, 8990.0, 9040.0), 14.7, 'qbfp'), ((3213.5, 3312.0, 8990.0, 9040.0), 15.1, 'qbfp'),
                             ((3312.0, 3415.0, 8990.0, 9040.0), 16.5, 'qbfp'), ((3415.0, 3810.0, 8990.0, 9040.0), 13.3, 'qbfp')],
          'Spencer Street': [((3000.0, 3250.0, 8590.0, 8640.0), 16.2, 'qbfp'), ((3250.0, 3415.0, 8590.0, 8640.0), 15.1, 'qbfp')],
          'Anza Avenue': [((3000.0, 3025.0, 8650.0, 8980.0), 24.4, 'qbbcffp'), ((3000.0, 3025.0, 8600.0, 9035.0), 24.4, None)]}
# … and where those stretches begin, a way of the street is cut (at its node nearest each point, or at a new one):
# Emerald at Ladeene, at the lawn's east end and at Earl; Spencer between the alley and Earl, and at Earl.
CUTS = {'Emerald Street': [(3213.0, 9017.0), (3312.0, 9017.0), (3415.0, 9017.0)], 'Spencer Street': [(3250.0, 8616.0), (3415.0, 8616.0)]}
# Service ways whose width is known: the alley behind 20606 Anza (the satellite picture and Street View): its asphalt
# runs from the block wall on its east to the buildings' aprons on its west — the site (anza.json) lays all of that;
# the tiles' own strip stays inside it.
SERVICE_HW = {'365566065': 2.0}
# The home site, built by hand (anza.js from anza.json: the alley behind the building, the church's grounds on Emerald,
# the business park's front by Spencer and Earl). Buildings whose back on the alley the site builds (Street View: a
# carport under the floor above, closed garage doors, a plain wall): the tiles build each without the strip the site
# builds — {way: the x beyond which the site builds} (0.4–0.5 m more than the strip: the tiles' outline is simplified to
# 0.35 m, and their wall must not stand in front of the site's).
ANZA = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'anza.json')))
CARPORTS = {f['way']: f['x'] - (f['depth'] + 0.4 if f['kind'] == 'carport' else 0.5) for f in ANZA['faces'] if f.get('way')}
# The planted islands in Maple's middle lane between Lairport and Nash (the satellite picture, 26/11/2026; x to about a
# metre): each from one end to the other. The one at x 383–397 is the refuge of the crosswalk in mid-block.
ISLANDS = {'East Maple Avenue': [((x0, -441.6), (x1, -441.6)) for x0, x1 in ((160.0, 197.6), (255.2, 268.6), (314.7, 348.5), (383.2, 391.2), (395.4, 397.6), (497.3, 538.2), (604.4, 640.1))]}
# Crosswalks that the map does not have (the satellite picture): [(one end, the other end)], across the street from kerb
# to kerb. Maple's, in mid-block, between the two parts of its refuge island.
CROSSWALKS = [((393.3, -455.0), (393.3, -428.0))]
# Sepulveda's median is planted (lawn and palms) north of Mariposa; south of it, along the hotel and the shops, it is a
# narrow paved one (the satellite picture of today; no picture of 2015 shows it).
MEDIAN_W = {'North Pacific Coast Highway': [((None, None, None, -80.0), 2.4)], 'South Pacific Coast Highway': 1.2}
# The parking structure at 940 N Nash St (garage.json: its plan and where that comes from). The world's place builds it
# by hand (garage.js), so the map's own block for it is left out of the tiles; the car's way in, up to level 3 and down
# again is drawn here from the same plan.
GARAGE = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'garage.json')))
SITE_WAYS = {GARAGE['way']} | set(ANZA['ways'])
def garage_ways(G=GARAGE):
    """the way from Nash in at the south portal, up the sloping bay to the stall on level 3 — and the way down and out
    again: each [(x, z, y)], keeping to the right of every aisle, its bends arcs a car can take"""
    F, R, ln = G['floor'], G['turn'], G['lane']; zS, zN = G['aisleS'], G['aisleN']; xW, xE = G['crossW'], G['crossE']; r0, r1 = G['rampW'], G['rampE']
    def slope(x, k): return (k - 1 + max(0.0, min(1.0, (x - r0) / (r1 - r0)))) * F          # the south bay's k-th run: level k at its west end, k + 1 at its east
    def arc(cx, cz, a0, a1, y, n=7): return [(cx + R * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + R * math.sin(math.radians(a0 + (a1 - a0) * i / n)), y) for i in range(n + 1)]
    def run(x0, x1, z, k):                                                          # along the south bay's k-th run, a point every 6 m
        n = max(1, int(abs(x1 - x0) / 6.0)); return [(x0 + (x1 - x0) * i / n, z, slope(x0 + (x1 - x0) * i / n, k)) for i in range(n + 1)]
    bay = G['x0'] + G['grid'] * G['park']['bay']; xs = bay + 0.4 + G['stallW'] * (G['park']['stall'] + 0.5); top = (G['park']['level'] - 1) * F   # his stall: its middle
    zin = zN - G['aisleW'] / 2; home = zin - 2.85                                   # the mouth of the stalls along the north wall; where the car's middle stands in one
    up = [(G['x0'] - 9.3, G['laneIn'], 0.0), (G['gateX'] + 7.0, G['laneIn'], 0.0), (r0 - 4.0, zS + ln, 0.0)]
    for k in (1, 2):
        up += run(r0, r1, zS + ln, k)                                               # east, up the slope
        y = k * F
        up += arc(xE + ln - R, zS + ln - R, 90, 0, y) + arc(xE + ln - R, zN - ln + R, 0, -90, y)       # round to the north bay, and west along it
        if k == 1: up += arc(xW - ln + R, zN - ln + R, -90, -180, y) + arc(xW - ln + R, zS + ln - R, 180, 90, y)   # round the west end to the next run
    up += [(xs + R + 19.0, zN - ln, top), (xs + R + 6.0, zin + 0.9 + R, top)] + arc(xs + R, zin + 0.9, 90, 180, top) + [(xs, home, top)]   # a swing out to the aisle's far side, and nose first into the stall
    down = [(xs, home, top), (xs, zin + 0.2, top)] + arc(xs + R, zin + 0.2, 180, 90, top)[1:]                      # out of it nose first (the car is not driven backwards here), east
    for k in (2, 1):
        y = k * F
        down += arc(xE - ln - R, zN + ln + R, -90, 0, y) + arc(xE - ln - R, zS - ln - R, 0, 90, y)       # round the east end to the south bay
        down += run(r1, r0, zS - ln, k)                                             # west, down the slope
        if k == 2: down += arc(xW + ln + R, zS - ln - R, 90, 180, F) + arc(xW + ln + R, zN + ln + R, 180, 270, F)   # round the west end, east along the north bay
    down += [(G['gateX'] + 9.0, G['lanesOut'][0], 0.0), (G['x0'] - 9.3, G['lanesOut'][0], 0.0)]
    return up, down
ESA_GROUND = (-300.0, -280.0, 800.0, 260.0)   # the ground that place lays under itself (town.js): x0, z0, x1, z1 — its own page shows the streets within it
ESA_BLOCK = (-95.0, 52.0, -66.4, 132.0)   # the hotel's and the shops' own ground, behind the sidewalks (site.js): nothing of the streets' is planted there
# The hotel's way in from Mariposa (places/esa-el-segundo-2015/plan.js LOT.drive: x 28.5 … 37.5): the walk drops for it.
# … and the two portals of the parking structure on Nash (the visitors' two lanes; the three lanes of the south bay).
DRIVES = [('East Mariposa Avenue', (33.0, -66.0), 10.0),
          ('North Nash Street', (GARAGE['x0'] - 4.0, sum(GARAGE['lanesVisitor']) / 2, ), 8.4),
          ('North Nash Street', (GARAGE['x0'] - 4.0, (GARAGE['laneIn'] + GARAGE['lanesOut'][1]) / 2), 13.6)]

# ── the routes of this world ───────────────────────────────────────────────────────────────────────────────────────
# Extended Stay's lot is the hotel place's own (plan.js LOT, and site.js as built: looked at from above on 26/11/2026).
# The aisle on the east side is paved from x 37.5 to 43.5; north of z −54 the paving steps west: the forecourt
# (x 24–37, z −59…−54) and the way in between the sign's island and the planting on the boundary (x 29–37, z −68…−60).
# A car leaving keeps right up the aisle, swings west across the forecourt's mouth and leaves by the east half of the
# way in; a car arriving takes the west half and swings east into the aisle.
_UP, _DOWN = garage_ways(); _NASH = (692.1, -795.5); _GATES = lambda lane: [(GARAGE['gateX'], lane)]   # (the node of Nash just north of the structure: the car's lane passes the portal)
ROUTES = [
    dict(id='esa-att', name='Extended Stay → nhà để xe 940 N Nash', **{'from': 'Extended Stay America, El Segundo', 'to': 'AT&T (DirecTV) · nhà để xe 940 N Nash St, tầng 3'},
         a=(34.6, -74.0), b=_NASH,
         head=[(40.8, 6.0), (40.8, -45.5), (40.0, -49.5), (36.0, -54.3), (34.8, -57.2), (34.6, -60.0), (34.6, -67.8)], head_v=3.4,
         tail=[(x, z) for x, z, _ in _UP], tail_y=[y for _, _, y in _UP], tail_v=4.5, tail_name='Nhà để xe 940 N Nash', gates=_GATES(GARAGE['laneIn'])),
    dict(id='att-esa', name='Nhà để xe 940 N Nash → Extended Stay', **{'from': 'AT&T (DirecTV) · nhà để xe 940 N Nash St, tầng 3', 'to': 'Extended Stay America, El Segundo'},
         a=_NASH, b=(31.0, -74.0),
         head=[(x, z) for x, z, _ in _DOWN], head_y=[y for _, _, y in _DOWN], head_v=4.5, head_name='Nhà để xe 940 N Nash', gates=_GATES(GARAGE['lanesOut'][0]),
         tail=[(31.0, -67.8), (31.0, -59.5), (32.5, -56.0), (38.6, -51.0), (39.3, -47.0), (39.3, -20.0), (39.3, 4.0)], tail_v=3.4),
]

# Home in Torrance, 2019–2022: 20606 Anza Ave (Anza Townhomes; where his photographs at home were taken: 33.84296 N,
# 118.36198 W). He drove home from the parking structure two ways (27/11/2026): "Atwood Way -> 105 -> 405 -> Inglewood
# Ave -> W 190 -> Anza Ave -> Spencer -> đường phía sau dãy nhà" and "Atwood Way -> 105 -> 405 -> Hawthorn Blvd ->
# Spencer -> đường phía sau dãy nhà", and parked at one of three places: behind the building, on the alley (A); at the
# kerb of Spencer St by Earl St (B: his photograph of 14/12/2022); at the kerb of Emerald St by the church's grounds
# (C: his photographs of the same night). Where each of those is (world metres) is from those photographs' places;
# behind the building the car stands in a stall of the carport under it (anza.json: home), and which stall is GUESSED
# (no picture shows his space: the one by the gate with the bins, where the way in is).
HOME = (3049.9, 8839.3)
_HF = ANZA['faces'][ANZA['home']['face']]; _HZ = round(_HF['z0'] + (ANZA['home']['stall'] + 0.5) * (_HF['z1'] - _HF['z0']) / _HF['stalls'], 2)   # (his stall's middle)
ENDS = {'a': ((3113.7, _HZ), [('way', '365566065')], '20606 Anza Ave · sau nhà', 'Xe đỗ trong nhà xe dưới dãy nhà, cạnh cổng có thùng rác.'),
        'b': ((3379.6, 8623.3), [], '20606 Anza Ave · đỗ ở Spencer St', 'Xe đỗ sát lề Spencer St, cạnh Earl St.'),
        'c': ((3292.7, 9010.3), [('name', 'Earl Street'), ('name', 'Emerald Street')], '20606 Anza Ave · đỗ ở Emerald St',
              'Xe đỗ sát lề Emerald St, chỗ công viên lối vào Nova Community Church.')}
# Where the car stands once there (the page fades and shows it so: no parking is driven), and where he stands looking
# at it: (the way it stands by, the side of that way, the way its nose points: +1 along the way, −1 against, 0 square
# to it, nose away from the way). At the kerb (B, C) as his photographs of 14/12/2022 show it: by the right-hand kerb.
# Behind the building (A): nose in, in the carport under the floor above (Street View: a row of stalls square to the
# alley), its middle 3 m inside the building's face; he stands in the alley. (A fifth number: how far the car's middle
# is from the way's line.)
PARK = {'a': ('365566065', 'west', 0, 'road', round(3113.7 - (_HF['x'] - 3.0), 2)), 'b': ('Spencer Street', 'south', 'east', 'walk'), 'c': ('Emerald Street', 'north', 'west', 'walk')}
WALK_AREAS = [(HOME[0] - 480, HOME[0] + 1650, HOME[1] - 660, HOME[1] + 650), (3810.0, 4140.0, 7950.0, 8250.0)]   # where he may walk round home (his two boxes on the map): x0, x1, z0, z1
_TRUNK = [('name', 'North Nash Street'), ('name', 'Atwood Way'), ('ref', 'I 105'), ('ref', 'I 405')]
_WAYS = {'1': ('Inglewood Ave', _TRUNK + [('name', 'Inglewood Avenue', 'South Inglewood Avenue'), ('name', 'West 190th Street'), ('name', 'Anza Avenue'), ('name', 'Spencer Street')]),
         '2': ('Hawthorne Blvd', _TRUNK + [('name', 'Hawthorne Boulevard'), ('name', 'Spencer Street')])}
for _k, (_by, _via) in _WAYS.items():
    for _e, (_at, _more, _to, _note) in ENDS.items():
        ROUTES.append(dict(id='att-anza-%s%s' % (_k, _e), name='Nhà để xe 940 N Nash → %s (qua 105, 405, %s)' % (_to, _by), **{'from': 'AT&T (DirecTV) · nhà để xe 940 N Nash St, tầng 3', 'to': _to},
                           by='qua 105, 405, ' + _by, note=_note,
                           a=_NASH, b=_at, via=_via + _more, head=[(x, z) for x, z, _ in _DOWN], head_y=[y for _, _, y in _DOWN], head_v=4.5, head_name='Nhà để xe 940 N Nash',
                           gates=_GATES(GARAGE['lanesOut'][0]), home=_e, park=PARK[_e]))

# The cars of the hotel place's own page: from where to where each lane of them runs (Sepulveda south and north,
# Mariposa east and west: the ends of those roadways just beyond that place's ground), and the speed they keep (m/s).
ESA_TRAFFIC = [((-125.6, -279.9), (-116.5, 281.2), 15.0), ((-100.7, 267.9), (-108.5, -335.6), 15.0), ((-309.0, -79.5), (781.4, -80.3), 12.0), ((781.4, -80.3), (-309.0, -79.5), 12.0)]
ESA_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'esa-el-segundo-2015'))
def main():
    out = sys.argv[1]; W = World(sys.argv[2:])
    # The tiles this run makes: El Segundo's square as before (x −1000…2000, z −2000…1000), and every tile within 1 km of
    # a route or in the ground round home where he may walk. (Its data: fetch.py, blocks.txt.)
    bounds = (-1000.0, 5000.0, -2000.0, 10500.0); t0 = time.time()
    tiles, roads, service, counts, S, place = build(W, bounds); print('built in %.0f s' % (time.time() - t0), flush=True)
    routes = []
    for spec in [s for s in ROUTES if not os.environ.get('ONLY') or s['id'] in os.environ['ONLY'].split(',')]:   # (ONLY=id,…: a quick bake of some routes, while working on them)
        spec = dict(spec)
        for k in ('a', 'b'):
            if spec.get(k) is None: la, lo = spec[k + '_ll']; spec[k] = ((lo - LON0) * KX, -(la - LAT0) * KZ)
        t1 = time.time(); routes.append(route(W, roads, service, S, spec)); print(' route %s in %.0f s' % (spec['id'], time.time() - t1), flush=True)
    # where his car is put at the end of a route home no car of the street's stands (those were put along the kerbs
    # first): none within a car's length and a metre of it, front or back, in its own lane of parking
    gone = 0
    for P in [r['park'] for r in routes if r.get('park')]:
        ca, sa = math.cos(P['a']), math.sin(P['a'])
        for i in range(int((P['x'] - 20) // T), int((P['x'] + 20) // T) + 1):
            for j in range(int((P['z'] - 20) // T), int((P['z'] + 20) // T) + 1):
                t = tiles.get((i, j))
                if not t: continue
                left = []
                for q in t.get('p', []):
                    if q[0] == 5:
                        dx, dz = q[1] / 10 + i * T - P['x'], q[2] / 10 + j * T - P['z']
                        if abs(dx * ca + dz * sa) < 5.8 and abs(dz * ca - dx * sa) < 2.4: gone += 1; continue
                    left.append(q)
                t['p'] = left
    counts['cars at the kerb'] -= gone
    keep = {(i, j) for i in range(-2, 4) for j in range(-4, 2)}
    for r in routes:
        for k in range(0, len(r['pts']) // 2, 40):
            x, z = r['pts'][2 * k] / 1000.0, r['pts'][2 * k + 1] / 1000.0
            for i in range(int((x - 1000) // T), int((x + 1000) // T) + 1):
                for j in range(int((z - 1000) // T), int((z + 1000) // T) + 1):
                    if max(T * i - x, 0, x - T * (i + 1)) ** 2 + max(T * j - z, 0, z - T * (j + 1)) ** 2 < 1000.0 ** 2: keep.add((i, j))
    for x0, x1, z0, z1 in WALK_AREAS:
        keep |= {(i, j) for i in range(int(x0 // T), int(x1 // T) + 1) for j in range(int(z0 // T), int(z1 // T) + 1)}
    tiles = {k: v for k, v in tiles.items() if k in keep}
    os.makedirs(os.path.join(out, 'tiles'), exist_ok=True)
    for f in os.listdir(os.path.join(out, 'tiles')): os.remove(os.path.join(out, 'tiles', f))
    index, total = [], 0
    for (i, j), t in sorted(tiles.items()):
        homes = sum(1 for b in t['b'] if b[1] in (0, 1))
        body = json.dumps(dict(v=1, i=i, j=j, g=1 if homes * 2 > len(t['b']) and len(t['b']) > 20 else 0, **{k: t[k] for k in sorted(t)}), separators=(',', ':'))
        with open(os.path.join(out, 'tiles', f'{i}_{j}.json'), 'w') as f: f.write(body)
        index.append([i, j, len(body), len(t['b'])]); total += len(body)
    # the hotel place's streets, for its own page (a module of its own: that page is one file) — and the lanes the cars
    # of that page keep: each a route like the car's own (the lane's line as a car drives it), cut to that place's
    # ground, a point every 2 m; with it the speed they keep and where a car's middle stops for which signal
    body = json.dumps({f'{i}_{j}': dict(v=1, i=i, j=j, n=1, **{k: t[k] for k in sorted(t)}) for (i, j), t in sorted(place.items()) if any(t.values())}, separators=(',', ':'))
    lanes = []; G = ESA_GROUND
    for n, (a, b, v) in enumerate(ESA_TRAFFIC):
        r = route(W, roads, service, S, dict(id='esa-traffic-%d' % n, name='', a=a, b=b, **{'from': '', 'to': ''}))
        p = [(r['pts'][2 * k] / 1000.0, r['pts'][2 * k + 1] / 1000.0) for k in range(len(r['pts']) // 2)]
        ins = [k for k, (x, z) in enumerate(p) if G[0] + 2 <= x < G[2] - 2 and G[1] + 2 <= z < G[3] - 2]; k0, k1 = ins[0], ins[-1]
        assert k1 - k0 == len(ins) - 1 and (k1 - k0) / 2 > 400, ('a lane of the hotel place\'s traffic leaves its ground', n, k0, k1, len(ins))
        assert all(kind == 0 for _, kind, _, _ in r['ctl']), ('a stop sign on a lane of the hotel place\'s traffic', n, r['ctl'])
        # (a route's stop is its back axle's, 3.75 m behind the bumper; a car here is placed by its middle, 2.3 m behind its own)
        stops = [[round(s + 1.45 - k0 / 2.0, 1), j, g] for s, kind, j, g in r['ctl'] if k0 / 2.0 + 8 < s + 1.45 < k1 / 2.0]
        lanes.append(dict(v=v, stops=stops, p=[int(round(c * 10)) for pt in p[k0:k1 + 1:4] for c in pt]))
    with open(os.path.join(ESA_DIR, 'streets.js'), 'w') as f:
        f.write('/* Written by places/south-bay/data/world.py: do not edit. The streets of this place\'s ground as the South Bay world lays\n'
                '   them out (its tiles, cut to this ground, with nothing but streets in them: see TILE in that script), so that this\n'
                '   place\'s own page and the world draw one and the same street; and the lanes this page\'s cars keep along Sepulveda\n'
                '   and Mariposa (p: x, z in decimetres every 2 m; v: metres a second; stops: [metres along, junction, group] — where a\n'
                '   car\'s middle stops while that signal is not green). Map data (c) OpenStreetMap contributors, ODbL. */\n'
                'export const TILES = ' + body + ';\n'
                'export const LANES = ' + json.dumps(lanes, separators=(',', ':')) + ';\n')
    # each route in a file of its own (a page loads the one it drives); routes.json lists them
    os.makedirs(os.path.join(out, 'routes'), exist_ok=True)
    for f in os.listdir(os.path.join(out, 'routes')): os.remove(os.path.join(out, 'routes', f))
    for r in routes:
        with open(os.path.join(out, 'routes', r['id'] + '.json'), 'w') as f: json.dump(r, f, separators=(',', ':'))
    with open(os.path.join(out, 'routes.json'), 'w') as f:
        json.dump([dict(id=r['id'], name=r['name'], frm=r['frm'], to=r['to'], length=r['length'], home=r.get('home'), by=r.get('by')) for r in routes], f, separators=(',', ':'), ensure_ascii=False)
    with open(os.path.join(out, 'index.json'), 'w') as f:
        json.dump(dict(v=1, tile=T, origin=[LAT0, LON0], bounds=bounds, tiles=index, signals=S['audit']['signals'], counts={k: round(v) for k, v in counts.items()}, streets={k: round(v) for k, v in sorted(S['audit'].items())}), f, separators=(',', ':'))
    print(len(index), 'tiles,', total // 1024, 'kB;', dict(counts))
    print(' the hotel place\'s own streets: %d squares, %d kB; its cars\' lanes:' % (len(place), len(body) // 1024), ['%d m at %.1f m/s, stops %s' % (len(l['p']) - 2, l['v'], l['stops']) for l in lanes])
    print(' roads eased into curves: %d (of their points %d moved, %.2f m at most; %d added)' % W.eased)
    print(' streets:', dict(sorted(S['audit'].items())))
    for r in routes: print(' route', r['id'], r['length'], 'm · strays', r['stray'], 'm from the lane\'s line at most · the line', r['outside'][0], 'm outside the streets\' pavement at most (at', r['outside'][1], 'm) ·', round(sum(b - a for a, b in r['straight'])), 'm straight ·', len(r['ctl']), 'controls', r['ctl'], '· turns', r['turns'])

if __name__ == '__main__': main()
