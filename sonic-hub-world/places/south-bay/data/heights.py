"""How high the roads that leave the ground lie (freeways on their viaducts, ramps, the streets that bridge them).

The map gives no heights: only which way is a bridge, and where two ways cross which lies above (OSM `layer`). So every
height here is GUESSED, by rule, and the pages say so:

  · where a way crosses over another (or over a track) it clears it: CLEAR between their surfaces (5.0 m beneath,
    a deck 1.6 m deep); a freeway's or a ramp's bridge that crosses nothing the map knows stands BRIDGE_MIN up
  · from there it comes down no steeper than its class goes (GRADE): a freeway 3 %, a ramp 5.5 %, a street 5 %
    (down to a junction of streets: STEEP, a freeway 5 %, a ramp 8 %, a street 7.5 %)
  · where streets meet they lie on the ground; a ramp or a street may come down to such a junction as steeply as STEEP
    allows (where even that is not enough the clearance wins, and the audit counts it; a bridge's guessed BRIDGE_MIN
    never does: a ramp tagged a bridge from the street up does not leap 5 m in its first metres)
  · a stretch of freeway (or of a long ramp) between two raised parts less than 2 × FILL apart stays up, at the lower
    one's height (on fill, as freeways here do)
  · then the freeways and their ramps are given vertical curves along their whole run (OSM cuts a freeway into ways of
    100–300 m: rounding way by way stopped at every cut, and at 100 km/h the car rose and fell like a roller coaster):
    along each chain of ways a profile that is nowhere lower than the rule's (no lower than the highest within 120 m,
    averaged over 240 m; a ramp's over half that), no higher than the junctions it comes down to allow; where a ramp
    runs beside its freeway into a merge (or out of a diverge) the two lie at one height; what is crossed is cleared
    again with the profiles as they then are
  · then each profile is rounded (a triangular kernel: a box's mean steps whenever its edge passes a sample): along
    the chains over 180 m (a ramp's 120 m, through the splits and merges between them, a ramp taking its freeway's
    height where they meet), a street's bridge over 40 m — never taking more than 0.3 m off within 40 m of what it
    crosses (not off a crossing's clearance), 1.5 m elsewhere; the corner that limit leaves rounded again.

solve(roads, rails) → ({road id: [(d, h), …]} along each road's own line, audit). Map data (c) OpenStreetMap contributors."""
import math, heapq, collections, bisect

CLEAR, CLEAR_RAIL, BRIDGE_MIN, FILL = 6.6, 8.2, 5.2, 650.0
FWY = ('motorway', 'motorway_link', 'trunk', 'trunk_link')
def grade(r): return 0.03 if r['cls'] in ('motorway', 'trunk') else 0.055 if r['cls'].endswith('_link') else 0.05
def steep(r): return 0.05 if r['cls'] in ('motorway', 'trunk') else 0.08 if r['cls'].endswith('_link') else 0.075   # (a ramp's 8 %: where the path turns off it into the street it cuts the corner, and climbs a little steeper still)
def smooth_len(r): return 160.0 if r['cls'] in ('motorway', 'trunk') else 60.0 if r['cls'].endswith('_link') else 40.0
STEP = 10.0
EXAMPLES = []
DEBUG, DEBUG_IDS = {}, set()
TIES = []                                                                         # (ramp's sample, freeway's road, where along it): set by vertical_curves, for the rounding after it

def _cross(a, b, c, d):
    """where segment ab crosses cd, strictly inside both → (t on ab, u on cd) or None"""
    rx, rz, sx, sz = b[0] - a[0], b[1] - a[1], d[0] - c[0], d[1] - c[1]; den = rx * sz - rz * sx
    if abs(den) < 1e-9: return None
    t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den; u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den
    return (t, u) if 1e-6 < t < 1 - 1e-6 and 1e-6 < u < 1 - 1e-6 else None

def solve(roads, rails=()):
    """roads: the world's road records (id, nd, p, cl, cls, bridge, layer); rails: [(id, p, layer, deck height)]"""
    audit = collections.Counter()
    lay = lambda r: r['layer'] if r['layer'] or not r['bridge'] else 1
    # ── where ways cross without a node: which lies above, and how far along each ──
    G = collections.defaultdict(list); CELL = 60.0
    segs = [(('r', ri), k, r['p'][k], r['p'][k + 1]) for ri, r in enumerate(roads) for k in range(len(r['p']) - 1)]
    segs += [(('t', ti), k, t[1][k], t[1][k + 1]) for ti, t in enumerate(rails) for k in range(len(t[1]) - 1)]
    for si, (w, k, a, b) in enumerate(segs):
        for gx in range(int(math.floor(min(a[0], b[0]) / CELL)), int(math.floor(max(a[0], b[0]) / CELL)) + 1):
            for gz in range(int(math.floor(min(a[1], b[1]) / CELL)), int(math.floor(max(a[1], b[1]) / CELL)) + 1): G[(gx, gz)].append(si)
    pairs = set(); cross = []                                           # (upper road, d on it, lower: ('r', ri, d) or ('t', ti), clearance)
    for cell in G.values():
        for i in range(len(cell)):
            for j in range(i + 1, len(cell)):
                si, sj = cell[i], cell[j]
                if (si, sj) in pairs: continue
                pairs.add((si, sj)); A, B = segs[si], segs[sj]
                if A[0] == B[0]: continue
                x = _cross(A[2], A[3], B[2], B[3])
                if not x: continue
                ends = []
                for (w, k, a, b), t in ((A, x[0]), (B, x[1])):
                    if w[0] == 'r': r = roads[w[1]]; ends.append((w, r['cl'][k] + (r['cl'][k + 1] - r['cl'][k]) * t, lay(r), r['bridge']))
                    else: ends.append((w, 0.0, rails[w[1]][2], True))
                (wa, da, la, ba), (wb, db, lb, bb) = ends
                if la == lb and ba == bb: audit['crossings with no level between them'] += 1; continue
                up, lo = ((wa, da), (wb, db)) if (la, ba) > (lb, bb) else ((wb, db), (wa, da))
                if up[0][0] == 't':                                     # a track above a road: the road keeps under its deck
                    cross.append((None, None, ('r', lo[0][1], lo[1]), rails[up[0][1]][3] - 1.7 - 5.0)); continue
                cross.append((up[0][1], up[1], (lo[0][0], lo[0][1], lo[1]), CLEAR_RAIL if lo[0][0] == 't' else CLEAR))
    audit['crossings'] = len(cross)
    # ── samples along every road: its nodes, its crossings, and every STEP between ──
    extra = collections.defaultdict(list)
    for ur, ud, lo, c in cross:
        if ur is not None: extra[ur].append(ud)
        if lo[0] == 'r': extra[lo[1]].append(lo[2])
    sid, pos, at_node = {}, [], {}                                      # sample → (road index, d); node id → its sample
    rs = []                                                             # per road: [(d, sample)]
    for ri, r in enumerate(roads):
        ds = set(r['cl']) | set(extra.get(ri, ()))
        for k in range(len(r['cl']) - 1):
            n = int((r['cl'][k + 1] - r['cl'][k]) // STEP)
            for q in range(1, n + 1): ds.add(r['cl'][k] + (r['cl'][k + 1] - r['cl'][k]) * q / (n + 1))
        row = []
        for d in sorted(ds):
            k = bisect.bisect_left(r['cl'], d - 1e-6)
            if k < len(r['cl']) and abs(r['cl'][k] - d) < 1e-6:          # a node: shared with every road through it
                n = r['nd'][k]
                if n not in at_node: at_node[n] = len(pos); pos.append((ri, d))
                row.append((d, at_node[n]))
            else: row.append((d, len(pos))); pos.append((ri, d))
        rs.append(row)
    N = len(pos); adj = [[] for _ in range(N)]
    for ri, row in enumerate(rs):
        g, G2 = grade(roads[ri]), steep(roads[ri])
        for (d0, a), (d1, b) in zip(row, row[1:]): adj[a].append((b, d1 - d0, g, G2)); adj[b].append((a, d1 - d0, g, G2))
    # chains of a freeway's ways (and of its ramps'), each way followed by the one that goes on from its end — the same
    # road where there is a choice — as lists of (distance along, sample)
    starts = collections.defaultdict(list)
    for ri, r in enumerate(roads):
        if r['cls'] in ('motorway', 'motorway_link'): starts[r['nd'][0]].append(ri)
    chains, ccls, seen = [], [], set()
    has_pred = {ri for r in roads for ri in starts.get(r['nd'][-1], ()) if r['cls'] in ('motorway', 'motorway_link')}
    for ri0 in sorted({ri for v in starts.values() for ri in v}, key=lambda ri: ri in has_pred):
        if ri0 in seen: continue
        chain, ri, off = [], ri0, 0.0
        while ri is not None and ri not in seen:
            seen.add(ri); r = roads[ri]
            chain += [(off + d, s) for d, s in (rs[ri] if not chain else rs[ri][1:])]; off += r['cl'][-1]
            nxt = [q for q in starts.get(r['nd'][-1], ()) if roads[q]['cls'] == r['cls']]
            same = [q for q in nxt if roads[q]['tg'].get('ref') == r['tg'].get('ref')]
            ri = (same or nxt or [None])[0]
        if len(chain) > 2: chains.append(chain); ccls.append(roads[ri0]['cls'])
    def sample(ri, d):
        row = rs[ri]; k = bisect.bisect_left([q[0] for q in row], d - 1e-6); return row[min(k, len(row) - 1)][1]
    # ── what pins a road to the ground: where streets meet (not a freeway's or a ramp's node, not on a bridge) ──
    names = collections.defaultdict(set)                               # a node → the streets through it (a street's own ways, cut at a bridge's end, are one street)
    for r in roads:
        for n in set(r['nd']): names[n].add(r['name'] or r['id'])
    U0 = [math.inf] * N
    for ri, r in enumerate(roads):
        if r['cls'] in FWY or r['bridge']: continue
        for k, n in enumerate(r['nd']):
            if len(names[n]) > 1: U0[at_node[n]] = 0.0
    for ur, ud, lo, c in cross:
        if ur is None: s = sample(lo[1], lo[2]); U0[s] = min(U0[s], max(0.0, c))
    def spread(seed, up, steepest=False, gentle=False):
        """the bound each sample takes from the seeds, along the roads: lower bounds fall by the grade (or the steepest),
        upper ones rise by the steepest"""
        val = list(seed); pq = [(-v if up else v, i) for i, v in enumerate(val) if math.isfinite(v) and (v > 0 or not up)]
        heapq.heapify(pq)
        while pq:
            v, i = heapq.heappop(pq); v = -v if up else v
            if v != val[i]: continue
            if up and U0[i] == 0.0: continue                                  # (a junction of streets stays on the ground: what lifts a ramp does not lift the streets beyond it)
            for j, d, g, G2 in adj[i]:
                w = v - (G2 if steepest else g) * d if up else v + (g if gentle else G2) * d
                if (w > val[j] + 1e-9) if up else (w < val[j] - 1e-9): val[j] = w; heapq.heappush(pq, (-w if up else w, j))
        return val
    U = spread(U0, False); Ug = spread(U0, False, gentle=True)            # (Ug: as high as a road may be coming down to a junction at its own gentle grade)
    U2 = list(U0)                                                         # … and the steepest a ramp is ever made, where there is no other way to clear what it passes over: 15 %
    for _ in range(1):
        pq = [(v, i) for i, v in enumerate(U2) if v == 0.0]; heapq.heapify(pq)
        while pq:
            v, i = heapq.heappop(pq)
            if v != U2[i]: continue
            for j, d, g, G2 in adj[i]:
                w = v + 0.15 * d
                if w < U2[j] - 1e-9: U2[j] = w; heapq.heappush(pq, (w, j))
    L0 = [0.0] * N
    for ri, r in enumerate(roads):
        if r['bridge'] and r['cls'] in FWY:
            for d, s in rs[ri]: L0[s] = max(L0[s], BRIDGE_MIN)
    DEBUG_RI = {ri for ri, r in enumerate(roads) if r['id'] in DEBUG_IDS}
    h = [0.0] * N
    for it in range(10):
        L1 = list(L0); H1 = [0.0] * N                                       # H1: only what a crossing needs (the steepest way down is allowed for that, not for a bridge's guessed height)
        for ur, ud, lo, c in cross:
            if ur is None: continue
            below = h[sample(lo[1], lo[2])] if lo[0] == 'r' else rails[lo[1]][3]
            s = sample(ur, ud); L1[s] = max(L1[s], below + c); H1[s] = max(H1[s], below + c)
        L = spread(L1, True)
        # a freeway (or its long ramp) between two raised parts less than 2 × FILL apart stays up: along each chain of
        # its ways, the height at a point is at least the lower of the highest within FILL behind and within FILL ahead
        for chain in chains:
            ds = [d for d, _ in chain]; hs = [L[s] for _, s in chain]; W = FILL; n = len(ds)
            back, ahead = [0.0] * n, [0.0] * n; dq = collections.deque()
            for i in range(n):
                while dq and hs[dq[-1]] <= hs[i]: dq.pop()
                dq.append(i)
                while ds[dq[0]] < ds[i] - W: dq.popleft()
                back[i] = hs[dq[0]]
            dq.clear()
            for i in range(n - 1, -1, -1):
                while dq and hs[dq[-1]] <= hs[i]: dq.pop()
                dq.append(i)
                while ds[dq[0]] > ds[i] + W: dq.popleft()
                ahead[i] = hs[dq[0]]
            for i, (d, s) in enumerate(chain):
                f = min(back[i], ahead[i])
                if f > hs[i] + 0.1: L1[s] = max(L1[s], f)
            if DEBUG_IDS and any(pos[s][0] in DEBUG_RI for _, s in chain): DEBUG['closing'] = [(round(ds[i]), round(hs[i], 1), round(back[i], 1), round(ahead[i], 1), pos[chain[i][1]][0] in DEBUG_RI) for i in range(n)]
        L = spread(L1, True); Ls = spread(H1, True, True)
        nh = [max(min(l, u), min(s, u2)) for l, s, u, u2 in zip(L, Ls, U, U2)]   # as gently as there is room for; down to a junction as steeply as need be
        if max(abs(a - b) for a, b in zip(nh, h)) < 0.01: h = nh; break
        h = nh
    audit['points short of their clearance (no room even at 15 %)'] = sum(1 for s, u in zip(Ls, U2) if s > u + 0.05)
    h = vertical_curves(roads, rails, rs, pos, at_node, chains, ccls, cross, sample, h, Ug, audit, lambda seed: spread(seed, True))   # (what is raised there is raised no higher than a junction's own grade allows: steeper only where the rule itself had to be)
    DEBUG.update({roads[ri]['id']: [(round(d), round(L[s], 1), round(Ls[s], 1), round(U[s], 1), round(U2[s], 1), round(h[s], 1)) for d, s in rs[ri]] for ri in range(len(roads)) if roads[ri]['id'] in DEBUG_IDS})
    DEBUG['chained'] = {roads[ri]['id'] for ri in seen}
    node_of = {s: n for n, s in at_node.items()}
    EXAMPLES[:] = [(round(roads[pos[s][0]]['p'][0][0]), round(roads[pos[s][0]]['p'][0][1]), round(Ls[s], 1), sorted(names.get(node_of.get(s), ()))[:4]) for s in range(N) if Ls[s] > U[s] + 0.05][:400]
    # ── each profile rounded: along the chains (across the cuts between their ways), a street's bridge on its own; the
    #    rounding never takes more than 0.3 m off (not off a crossing's clearance) ──
    rounded = {}
    held = set()                                                             # what stands over a crossing (40 m either way of it): rounding takes no more than 0.3 m off there
    for ur, ud, lo, c in cross:
        if ur is None: continue
        held |= {s for d, s in rs[ur] if abs(d - ud) < 40.0}
    where = collections.defaultdict(list)                                    # a sample → (chain, index) of every chain through it
    for ci, chain in enumerate(chains):
        for i, (_, s) in enumerate(chain): where[s].append((ci, i))
    for ci in sorted(range(len(chains)), key=lambda c: ccls[c] != 'motorway'):   # (the freeways first: a ramp takes their height where it meets them)
        chain0, cls = chains[ci], ccls[ci]
        # where the chain leaves another (a branch at a split) or ends in another (a merge), the other's stretch next to
        # it is taken into the rounding too, so the split or the merge is rounded as well (it is written back only here)
        chain = list(chain0); own0, own1 = 0, len(chain)
        for (cj, j) in where[chain0[0][1]]:
            if cj == ci or j == 0: continue
            other = chains[cj]; d0 = chain0[0][0]; pre = [(d0 - (other[j][0] - other[k][0]), other[k][1]) for k in range(j - 1, -1, -1) if other[j][0] - other[k][0] < 120.0][::-1]
            chain = pre + chain; own0, own1 = len(pre), len(pre) + len(chain0); break
        for (cj, j) in where[chain0[-1][1]]:
            other = chains[cj]
            if cj == ci or j == len(other) - 1: continue
            d1 = chain0[-1][0]; chain = chain + [(d1 + (other[k][0] - other[j][0]), other[k][1]) for k in range(j + 1, len(other)) if other[k][0] - other[j][0] < 120.0]; break
        ds = [d for d, _ in chain]; v = [max(0.0, h[s]) for _, s in chain]; half = (180.0 if cls == 'motorway' else 120.0) / 2; n = len(ds)
        reach = lambda r: (lambda i: 0.0 if U[chain[i][1]] == 0.0 else min(r, ds[i] - ds[0], ds[-1] - ds[i]))   # (as far on either side; a chain's ends and a junction of streets on it stay as they are)
        low = [v[i] - (0.3 if s in held else 1.5) for i, (_, s) in enumerate(chain)]   # (no more off than that: 0.3 m over what is crossed, 1.5 m where nothing is under it)
        r1 = [max(m, q) for m, q in zip(_tri(ds, v, half, reach(half)), low)]
        r2 = [max(m, q) for m, q in zip(_tri(ds, r1, half / 3, reach(half / 3)), low)]   # (the corner the limit leaves, rounded in turn)
        # what is left of a crest's corner (over a crossing, where little may come off) is rounded from above: under
        # no point is the profile sharper than a parabola that pushes a car 1 m/s² at its road's speed (29 m/s; a
        # ramp's 20 — above the 65 km/h a connector is driven at, as a design speed is: at 18 the car felt 1.5 m/s²
        # over the 105–405 connector's crest) — a dilation by that parabola, raising nothing more than 0.35 m; the dips it leaves between
        # two such caps eased upward again
        kap = 1.0 / (29.0 ** 2 if cls == 'motorway' else 20.0 ** 2); R = 0.08 / kap; r3 = []
        for i in range(n):
            if U[chain[i][1]] == 0.0: r3.append(r2[i]); continue
            a, b = bisect.bisect_left(ds, ds[i] - R), bisect.bisect_right(ds, ds[i] + R)
            r3.append(min(r2[i] + 0.35, max(r2[k] - kap / 2 * (ds[k] - ds[i]) ** 2 for k in range(a, b))))
        r2 = [max(a, m) for a, m in zip(r3, _tri(ds, r3, 15.0, reach(15.0)))]
        for i, (d, s) in enumerate(chain):
            if not own0 <= i < own1 or (s in rounded and cls != 'motorway'): continue   # (where a ramp meets its freeway, the freeway's height holds)
            rounded[s] = min(r2[i], max(U[s], v[i]))                         # (and no higher than a junction it comes down to allows: no steeper than STEEP there)
    # The rounding takes each chain on its own, so a ramp beside its freeway (tied to its height, vertical_curves) came
    # out of it up to 0.3 m off the freeway's rounded height — where their decks touch, a step with a parapet on it,
    # across the car's way. So where they are tied the ramp takes the freeway's rounded height again, and what that
    # moves it by is let out over 80 m of the ramp on either side, smoothly (half a metre over 80 m: no change of slope
    # to feel). Where the rounding left them further apart than half a metre the tie is not believed — a connector
    # climbing past a freeway to go over another, touching it in plan only (2.4 m in the 105–405 interchange) — and
    # the rounding's heights stand.
    tie = {s: (rm, d) for s, rm, d in TIES}
    def rounded_at(ri, d):
        row = rs[ri]; ks = [q[0] for q in row]; k = bisect.bisect_left(ks, d)
        if k <= 0: return rounded.get(row[0][1], h[row[0][1]])
        if k >= len(row): return rounded.get(row[-1][1], h[row[-1][1]])
        (d0, s0), (d1, s1) = row[k - 1], row[k]; t = (d - d0) / max(1e-9, d1 - d0)
        return rounded.get(s0, h[s0]) + (rounded.get(s1, h[s1]) - rounded.get(s0, h[s0])) * t
    moved = 0.0
    for chain, cls in zip(chains, ccls):
        if cls == 'motorway' or not any(s in tie for _, s in chain): continue
        ds = [d for d, _ in chain]; fix = [(ds[i], rounded_at(*tie[s]) - rounded[s]) for i, (_, s) in enumerate(chain) if s in tie and s in rounded]
        if not fix or max(abs(q[1]) for q in fix) > 0.5: continue
        if not fix: continue
        fix.sort(); fd = [q[0] for q in fix]
        # (what the tied points are moved by, itself eased along them over 20 m either way: moved by 0.1 m at one point and
        # by 0.5 m 30 m on, the ramp's crest beside the 405 came out sharp enough to push the car 1.5 m/s²)
        fix = [(d, sum(f * max(0.0, 1.0 - abs(d2 - d) / 20.0) for d2, f in fix) / sum(max(0.0, 1.0 - abs(d2 - d) / 20.0) for d2, _ in fix)) for d, _ in fix]
        for i, (d, s) in enumerate(chain):
            if s not in rounded or U[s] == 0.0 or roads[pos[s][0]]['cls'] == 'motorway': continue   # (a street's junction stays where it is, and so does the freeway)
            if fd[0] <= d <= fd[-1]:                                       # (between tied points: what they are moved by, drawn straight between them)
                k2 = min(len(fd) - 1, max(1, bisect.bisect_left(fd, d))); (d0, f0), (d1, f1) = fix[k2 - 1], fix[k2]; df = f0 + (f1 - f0) * ((d - d0) / max(1e-9, d1 - d0)) if d1 > d0 else f1; w = 1.0
            else:                                                          # (beyond them: let out smoothly over 80 m)
                dn, df = (fix[0] if d < fd[0] else fix[-1]); t = max(0.0, 1.0 - abs(dn - d) / 80.0); w = t * t * (3 - 2 * t)
            if w > 0: rounded[s] += df * w; moved = max(moved, abs(df * w))
    audit['ramp heights put back on their freeway\'s after rounding, most m'] = round(moved, 2)
    prof = {}
    for ri, r in enumerate(roads):
        row = rs[ri]; ds = [d for d, _ in row]; hs = [max(0.0, h[s]) for _, s in row]
        if all(s in rounded for _, s in row):                                    # (by what the rounding made of it: a way the rule left on the ground may be lifted at its end, where the way before it comes down)
            if max(rounded[s] for _, s in row) < 0.05: continue
            prof[r['id']] = [(d, rounded[s]) for d, s in row]
            if r['id'] in DEBUG_IDS: DEBUG.setdefault('round', {})[r['id']] = [(round(d), round(h[s], 3), round(rounded[s], 3), s) for d, s in row]
            continue
        if max(hs) < 0.05: continue
        W = smooth_len(r) / 2                                                    # (a street's bridge on its own; its ends stay as they are — they are its neighbours' too)
        m = _tri(ds, hs, W, lambda i: min(W, ds[i] - ds[0], ds[-1] - ds[i])); out = [hs[i] if i in (0, len(ds) - 1) else max(m[i], hs[i] - 0.3) for i in range(len(ds))]   # (never more than 0.3 m off: not off a crossing's clearance)
        prof[r['id']] = list(zip(ds, out))
    audit['roads off the ground'] = len(prof); audit['highest m'] = round(max((h for p in prof.values() for _, h in p), default=0), 1)
    return prof, audit

def _along(ds, v, half, how):
    """along a run of samples (distances ds, values v): the highest within `half` either way, or the mean over it
    (each sample weighted by the stretch it stands for)"""
    n = len(ds)
    if how == 'max':
        out = [-math.inf] * n
        for order in (range(n), range(n - 1, -1, -1)):
            dq = collections.deque()
            for i in order:
                while dq and v[dq[-1]] <= v[i]: dq.pop()
                dq.append(i)
                while abs(ds[dq[0]] - ds[i]) > half: dq.popleft()
                out[i] = max(out[i], v[dq[0]])
        return out
    return _tri(ds, v, half)

def _tri(ds, v, half, reach=None):
    """a weighted mean with a triangular kernel `half` wide either way (each sample weighted by the stretch it stands
    for): a box's mean steps whenever its edge passes a sample — on samples 10 m apart that left ripples of a few cm,
    felt as bumps at 100 km/h. reach(i): how far either way it may look at sample i (default half)"""
    n = len(ds); w = [(ds[min(k + 1, n - 1)] - ds[max(k - 1, 0)]) / 2 or 1e-6 for k in range(n)]; out = []
    for i in range(n):
        r = half if reach is None else reach(i)
        if r <= 1e-6: out.append(v[i]); continue
        a, b = bisect.bisect_left(ds, ds[i] - r), bisect.bisect_right(ds, ds[i] + r); tot = wt = 0.0
        for k in range(a, b):
            q = w[k] * (1.0 - abs(ds[k] - ds[i]) / r)
            if q > 0: tot += q * v[k]; wt += q
        out.append(tot / wt if wt else v[i])
    return out

def vertical_curves(roads, rails, rs, pos, at_node, chains, ccls, cross, sample, h, U, audit, lift):
    """the freeways' and their ramps' profiles made smooth along their whole run, as the module's notes say → heights"""
    N = len(h)
    def xy(ri, d):
        r = roads[ri]; k = max(0, min(len(r['cl']) - 2, bisect.bisect_right(r['cl'], d) - 1)); a, b = r['p'][k], r['p'][k + 1]
        L = (r['cl'][k + 1] - r['cl'][k]) or 1e-9; t = (d - r['cl'][k]) / L
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    # where a ramp runs beside its freeway (touching it) within 350 m of where it joins or leaves it, and does not cross it
    mnodes = collections.defaultdict(set)
    for ri, r in enumerate(roads):
        if r['cls'] == 'motorway':
            for n in r['nd']: mnodes[n].add(ri)
    crossed = {(ur, lo[1]) for ur, ud, lo, c in cross if ur is not None and lo[0] == 'r'}; crossed |= {(b, a) for a, b in crossed}
    grid = collections.defaultdict(list); CELL = 40.0
    for ri, r in enumerate(roads):
        if r['cls'] != 'motorway': continue
        for k in range(len(r['p']) - 1):
            (ax, az), (bx, bz) = r['p'][k], r['p'][k + 1]
            for gx in range(int(math.floor(min(ax, bx) / CELL)) - 1, int(math.floor(max(ax, bx) / CELL)) + 2):
                for gz in range(int(math.floor(min(az, bz) / CELL)) - 1, int(math.floor(max(az, bz) / CELL)) + 2): grid[(gx, gz)].append((ri, k))
    ties = []
    for ri, r in enumerate(roads):
        if r['cls'] != 'motorway_link': continue
        ends = [(0.0, r['nd'][0]), (r['cl'][-1], r['nd'][-1])]
        for d, s in rs[ri]:
            if s in (at_node.get(r['nd'][0]), at_node.get(r['nd'][-1])): continue
            near_end = [(de, n) for de, n in ends if abs(d - de) < 350.0 and mnodes.get(n)]
            if not near_end: continue
            (x, z), (tx, tz) = xy(ri, d); best = None
            for rm, k in grid.get((int(math.floor(x / CELL)), int(math.floor(z / CELL))), ()):
                if (ri, rm) in crossed: continue
                m = roads[rm]; (ax, az), (bx, bz) = m['p'][k], m['p'][k + 1]; L2 = (bx - ax) ** 2 + (bz - az) ** 2 or 1e-9
                t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / L2)); dist = math.hypot(ax + (bx - ax) * t - x, az + (bz - az) * t - z)
                if abs(tx * (bx - ax) + tz * (bz - az)) / math.sqrt(L2) < math.cos(math.radians(20)): continue
                if dist > ((max(r['deck']) + max(m['deck']) - 0.3) if r.get('deck') and m.get('deck') else (r['w'] + m['w']) / 2 + 1.5): continue   # (touching: their decks as drawn, shoulders and all — where they touch they are one pavement, and a step between them stood a parapet across the car's way)
                if best is None or dist < best[0]: best = (dist, rm, m['cl'][k] + (m['cl'][k + 1] - m['cl'][k]) * t)
            if best: ties.append((s, best[1], best[2]))
    audit['ramp points tied to their freeway beside them'] = len(ties); TIES[:] = ties
    def at_road(vals, ri, d):
        row = rs[ri]; k = bisect.bisect_left([q[0] for q in row], d)
        if k <= 0: return vals[row[0][1]], row[0][1]
        if k >= len(row): return vals[row[-1][1]], row[-1][1]
        (d0, s0), (d1, s1) = row[k - 1], row[k]; t = (d - d0) / max(1e-9, d1 - d0)
        return vals[s0] + (vals[s1] - vals[s0]) * t, (s0 if t < 0.5 else s1)
    # Each round: the rule's heights with what earlier rounds added (each such point a lower bound that falls away from
    # it no steeper than its road's grade, as the rule's own do); along each chain the dips narrower than 400 m (a
    # ramp's 300 m) filled — a morphological closing, which leaves a steady climb or fall as it is — and capped by
    # what the junctions allow; then the ramps beside their freeway set to its height, and every crossing checked again.
    base, extra = list(h), [0.0] * N
    for it in range(8):
        up = lift(extra); b = [max(x, min(e, max(u, x))) for x, e, u in zip(base, up, U)]   # (what is lifted stays within what the junctions allow: a street's junction stays on the ground)
        env = list(b)
        for chain, cls in list(zip(chains, ccls)) * 2:                       # (twice: a chain sees what its neighbours' closings filled)
            half = (400.0 if cls == 'motorway' else 300.0) / 2
            ds = [d for d, _ in chain]; v = [env[s] for _, s in chain]
            e = [-q for q in _along(ds, [-q for q in _along(ds, v, half, 'max')], half, 'max')]   # (the highest within half, then the lowest of that within half)
            for _ in range(4 if cls == 'motorway' else 0):                    # … and a freeway's sags eased, only ever upward (a climb in steps — up over one crossing, level, up over the next — becomes one climb; a ramp's sag is where it comes down to its street: that is left to the rounding)
                m = _along(ds, e, (160.0 if cls == 'motorway' else 100.0) / 2, 'mean'); e = [max(a, c) for a, c in zip(e, m)]
            for i, (_, s) in enumerate(chain): env[s] = max(env[s], e[i])
            if DEBUG_IDS and any(roads[pos[s][0]]['id'] in DEBUG_IDS for _, s in chain): DEBUG.setdefault('vc', []).append((it, [(round(ds[i]), round(v[i], 1), round(e[i], 1)) for i in range(len(ds))][:60]))
        env = [min(e, max(u, x)) for e, u, x in zip(env, U, base)]           # not above what the junctions it comes down to allow (unless the rule itself went higher)
        changed = 0
        for s in range(N):                                                    # what a closing raised holds the roads through it up too (a branch leaving a filled stretch falls away by its grade, not off a cliff)
            if env[s] > b[s] + 0.05: extra[s] = max(extra[s], env[s]); changed += 1
        for s, rm, d in ties:
            hm, sm = at_road(env, rm, d)
            if b[s] <= hm + 0.05:
                if env[s] < hm - 0.05: extra[s] = max(extra[s], hm); changed += 1
                env[s] = hm
            else: extra[sm] = max(extra[sm], b[s]); changed += 1
        for ur, ud, lo, c in cross:
            if ur is None: continue
            below = env[sample(lo[1], lo[2])] if lo[0] == 'r' else rails[lo[1]][3]; s = sample(ur, ud)
            if env[s] < below + c - 0.02: extra[s] = max(extra[s], below + c); changed += 1
        audit['vertical curves: rounds'] = it + 1
        if not changed: break
    audit['vertical curves: left to settle'] = changed
    return env

def height(prof, d):
    """the height at d along a road from its profile (0 for a road on the ground)"""
    if not prof: return 0.0
    k = bisect.bisect_left(prof, (d, -1e9))
    if k <= 0: return prof[0][1]
    if k >= len(prof): return prof[-1][1]
    (d0, h0), (d1, h1) = prof[k - 1], prof[k]; return h0 + (h1 - h0) * (d - d0) / max(1e-9, d1 - d0)
