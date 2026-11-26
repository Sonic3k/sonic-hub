"""Lines in the plane, for the scripts that make a world's data (world.py, streets.py).
Metres: x east, z south. A line is a list of (x, z); `cl` is the running length along it (lens)."""
import math, bisect

def lens(p):
    out = [0.0]
    for (x0, z0), (x1, z1) in zip(p, p[1:]): out.append(out[-1] + math.hypot(x1 - x0, z1 - z0))
    return out
def at(p, cl, d):
    d = max(0.0, min(cl[-1], d)); i = min(len(p) - 2, max(0, bisect.bisect_right(cl, d) - 1))
    L = (cl[i + 1] - cl[i]) or 1e-9; t = (d - cl[i]) / L
    return (p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t), i
def sub(p, cl, d0, d1):
    d0 = max(0.0, d0); d1 = min(cl[-1], d1)
    if d1 - d0 < 1e-6: return []
    a, i = at(p, cl, d0); b, j = at(p, cl, d1)
    return [a] + [p[k] for k in range(i + 1, j + 1) if d0 + 1e-6 < cl[k] < d1 - 1e-6] + [b]
def keep(L, cuts, minlen=1.5):
    """the stretches of [0, L] that no cut covers"""
    out, pos = [], 0.0
    for a, b in sorted((max(0.0, a), min(L, b)) for a, b in cuts if b > a):
        if a - pos >= minlen: out.append((pos, a))
        pos = max(pos, b)
    if L - pos >= minlen: out.append((pos, L))
    return out
def unit(dx, dz):
    L = math.hypot(dx, dz) or 1e-9; return dx / L, dz / L
def right(d): return (-d[1], d[0])          # to the right of travel (x east, z south)
def normals(p):
    n, out = len(p), []
    for i in range(n):
        if i == 0: d = unit(p[1][0] - p[0][0], p[1][1] - p[0][1]); k = 1.0
        elif i == n - 1: d = unit(p[-1][0] - p[-2][0], p[-1][1] - p[-2][1]); k = 1.0
        else:
            a = unit(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); b = unit(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1])
            d = unit(a[0] + b[0], a[1] + b[1]) if abs(a[0] + b[0]) + abs(a[1] + b[1]) > 1e-6 else b
            k = 1.0 / max(0.5, d[0] * b[0] + d[1] * b[1])
        r = right(d); out.append((r[0] * k, r[1] * k))
    return out
def offset(p, off):
    if len(p) < 2 or abs(off) < 1e-9: return list(p)
    return [(x + nx * off, z + nz * off) for (x, z), (nx, nz) in zip(p, normals(p))]
def rdp(a, eps):
    if len(a) < 3: return list(a)
    (x0, z0), (x1, z1) = a[0], a[-1]; dx, dz = x1 - x0, z1 - z0; L = math.hypot(dx, dz) or 1e-9
    best, bi = 0.0, 0
    for i in range(1, len(a) - 1):
        d = abs((a[i][0] - x0) * dz - (a[i][1] - z0) * dx) / L
        if d > best: best, bi = d, i
    if best > eps: return rdp(a[:bi + 1], eps)[:-1] + rdp(a[bi:], eps)
    return [a[0], a[-1]]
def ring(pts, eps):
    """an outline without its closing point, thinned, turning the positive way in (x, z)"""
    p = pts[:-1] if pts[0] == pts[-1] else list(pts)
    if len(p) < 3: return None
    k = max(range(len(p)), key=lambda i: (p[i][0] - p[0][0]) ** 2 + (p[i][1] - p[0][1]) ** 2)   # thin the two halves apart
    q = rdp(p[:k + 1], eps)[:-1] + rdp(p[k:] + [p[0]], eps)[:-1]
    if len(q) < 3: return None
    area = sum(q[i][0] * q[(i + 1) % len(q)][1] - q[(i + 1) % len(q)][0] * q[i][1] for i in range(len(q))) / 2
    if abs(area) < 4: return None
    return (q if area > 0 else q[::-1]), abs(area)
def clip(p, x0, z0, x1, z1):
    out, cur = [], None
    for (ax, az), (bx, bz) in zip(p, p[1:]):
        dx, dz = bx - ax, bz - az; t0, t1, ok = 0.0, 1.0, True
        for pp, q in ((-dx, ax - x0), (dx, x1 - ax), (-dz, az - z0), (dz, z1 - az)):
            if pp == 0:
                if q < 0: ok = False; break
            else:
                r = q / pp
                if pp < 0:
                    if r > t1: ok = False; break
                    if r > t0: t0 = r
                else:
                    if r < t0: ok = False; break
                    if r < t1: t1 = r
        if not ok or t1 - t0 < 1e-9: cur = None; continue
        s, e = (ax + dx * t0, az + dz * t0), (ax + dx * t1, az + dz * t1)
        if cur is not None and t0 == 0.0: cur.append(e)
        else: cur = [s, e]; out.append(cur)
        if t1 < 1.0: cur = None
    return out
def resample(p, step):
    cl = lens(p); n = max(1, int(round(cl[-1] / step)))
    return [at(p, cl, cl[-1] * k / n)[0] for k in range(n + 1)]


def clipn(p, x0, z0, x1, z1):
    """as clip, for points that carry more than a place: (x, z, …) — what else they carry is carried along a cut"""
    out, cur = [], None
    for a, b in zip(p, p[1:]):
        ax, az, bx, bz = a[0], a[1], b[0], b[1]; dx, dz = bx - ax, bz - az; t0, t1, ok = 0.0, 1.0, True
        for pp, q in ((-dx, ax - x0), (dx, x1 - ax), (-dz, az - z0), (dz, z1 - az)):
            if pp == 0:
                if q < 0: ok = False; break
            else:
                r = q / pp
                if pp < 0:
                    if r > t1: ok = False; break
                    if r > t0: t0 = r
                else:
                    if r < t0: ok = False; break
                    if r < t1: t1 = r
        if not ok or (t1 - t0 < 1e-9 and (dx or dz)): cur = None; continue
        mix = lambda t: tuple(u + (v - u) * t for u, v in zip(a, b))
        s, e = mix(t0), mix(t1)
        if cur is not None and t0 == 0.0: cur.append(e)
        else: cur = [s, e]; out.append(cur)
        if t1 < 1.0: cur = None
    return out
