# -*- coding: utf-8 -*-
"""Icons of his old desktops that survive only in his screenshots, cut out of them: the desktop behind an icon is
grown in from the edges of a box around it, what is left is the icon (with the shortcut mark it had there). They become
desk assets of the folder "games" (icon/<key>-16/-32/-96.png); a desk item with glyph "cut:<key>" shows one, without
another arrow over it. The Fujitsu's own shortcut mark (a small green disc) goes to "machines" as fujitsu/shortcut-*.

  python3 cut_icons.py        needs Pillow, requests
"""
import io
from collections import deque

import requests
from PIL import Image

API = "https://angels-islands-api-production.up.railway.app/api"
CDN = "https://sonic-hub.b-cdn.net/angels-islands/"
FUJITSU = "carnival-night/nana1102/nana.bmp"           # 4/8/2007 22:59, 1024×768
FAMILY = "carnival-night/o0o_sa0bang/saobang.bmp"      # 6/8/2007 16:31, 1152×864 (PC Win XP)

# key → (screenshot, box around the icon x,y,w,h, how the desktop is told apart, the icon's own 32×32 in that box)
#   ("near", t): neighbouring pixels within t of each other (a smooth wallpaper)
#   ("grass", d): anything greenish and darker than d (Stonehenge's lawn)
ICONS = {
    "boom-online": (FUJITSU, (94, 650, 48, 48), ("near", 10), (8, 9)),
    "turbo-pascal": (FUJITSU, (94, 0, 48, 40), ("near", 12), (7, 2)),
    "vietkey-fj": (FUJITSU, (14, 648, 48, 48), ("near", 12), (9, 10)),
    "vietkey-xp": (FAMILY, (14, 670, 48, 44), ("grass", 80), (8, 7)),
    "bkav2006": (FAMILY, (14, 745, 48, 44), ("grass", 80), (8, 7)),
    "jewel-quest": (FAMILY, (90, 744, 48, 48), ("grass", 80), (8, 8)),
}
BADGE = (FUJITSU, (179, 27), (11, 27, 61), (22, 105, 14))   # where it sits clear of an icon; the wallpaper there; its rim

_shots = {}


def shot(path):
    if path not in _shots:
        _shots[path] = Image.open(io.BytesIO(requests.get(CDN + path, timeout=120).content)).convert("RGB")
    return _shots[path]


def cut(im, box, how):
    x0, y0, w, h = box
    reg = im.crop((x0, y0, x0 + w, y0 + h))
    px = reg.load()
    kind, v = how
    if kind == "near":
        passes = lambda a, b: max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2])) <= v
    else:
        passes = lambda a, b: max(b) < v and b[1] >= b[0] + 3 and b[1] >= b[2] + 3
    back = [[False] * w for _ in range(h)]
    q = deque([(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)])
    for x, y in q:
        back[y][x] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not back[ny][nx] and passes(px[x, y], px[nx, ny]):
                back[ny][nx] = True
                q.append((nx, ny))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            if not back[y][x]:
                op[x, y] = px[x, y] + (255,)
    return out


def tidy(im):
    """drop the specks left beside the icon (a streak of the wallpaper, a letter of the label)"""
    w, h = im.size
    px = im.load()
    seen, groups = set(), []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] and (x, y) not in seen:
                q, g = deque([(x, y)]), [(x, y)]
                seen.add((x, y))
                while q:
                    cx, cy = q.popleft()
                    for nx in (cx - 1, cx, cx + 1):
                        for ny in (cy - 1, cy, cy + 1):
                            if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and (nx, ny) not in seen:
                                seen.add((nx, ny)); q.append((nx, ny)); g.append((nx, ny))
                groups.append(g)
    for g in sorted(groups, key=len, reverse=True)[1:]:
        if len(g) < 12:
            for x, y in g:
                px[x, y] = (0, 0, 0, 0)
    return im


def badge():
    path, (bx, by), back, rim = BADGE
    px = shot(path).load()
    dist = lambda a, b: sum((a[i] - b[i]) ** 2 for i in range(3)) ** .5
    full = dist(rim, back)
    out = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    op = out.load()
    for y in range(7):
        for x in range(7):
            c = px[bx + x, by + y]
            d = dist(c, back)
            if d < 14:
                continue
            if d >= full * .92 or max(c) > 120:
                op[1 + x, 25 + y] = c + (255,)
            else:   # its soft edge: taken back off the wallpaper it was drawn over
                t = min(1, d / full)
                op[1 + x, 25 + y] = tuple(max(0, min(255, int((c[i] - back[i] * (1 - t)) / t))) for i in range(3)) + (int(t * 255),)
    return out


def send(folder, name, im):
    buf = io.BytesIO()
    im.save(buf, "PNG")
    for _ in range(3):   # the API sometimes answers 500 to one upload; sent again it goes through
        r = requests.post(f"{API}/desk/assets", params={"folder": folder}, timeout=120, data={"name": name},
                          files={"file": (name.replace("/", "-"), buf.getvalue(), "image/png")})
        if r.status_code < 500:
            break
    r.raise_for_status()


def main():
    for key, (path, box, how, (ix, iy)) in ICONS.items():
        im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        im.paste(cut(shot(path), box, how).crop((ix, iy, ix + 32, iy + 32)), (0, 0))
        im = tidy(im)
        send("games", f"icon/{key}-32.png", im)
        send("games", f"icon/{key}-16.png", im.convert("RGBa").resize((16, 16), Image.LANCZOS).convert("RGBA"))
        send("games", f"icon/{key}-96.png", im.resize((96, 96), Image.NEAREST))
        print(key, "ok")
    b = badge()
    send("machines", "fujitsu/shortcut-32.png", b)
    send("machines", "fujitsu/shortcut-16.png", b.resize((16, 16), Image.LANCZOS))
    print("fujitsu shortcut mark ok")


if __name__ == "__main__":
    main()
