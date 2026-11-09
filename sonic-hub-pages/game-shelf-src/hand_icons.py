# -*- coding: utf-8 -*-
"""His hand-drawn icons from the numbered list of 100 games (2004) as the icons of the games on the shelf.

The list is the scan "Danh sách các trò chơi" (scan0009, game-pack-2). Each icon is cut out of it by its box (in
the coordinates of the scan shown 1400 px wide), the paper made transparent so only the ink stays, and uploaded as
an ICON asset of its game (POST /api/games/{key}/assets). icons.json keeps game → media id; push_to_hub.py makes
each the game's icon.

  python3 hand_icons.py            cuts, uploads, writes icons.json   (needs numpy, pillow, requests)
"""
import io
import json
import os

import numpy as np
import requests
from PIL import Image

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
SCAN = "https://sonic-hub.b-cdn.net/angels-islands/sonic3k-box/1990-2007/marble-garden/game-pack-2/scan0009.jpg?width=2966"
HERE = os.path.dirname(os.path.abspath(__file__))

# number in his list: (game, box in the 1400-wide scan)
ICONS = {
    1: ("taipei", (105, 22, 152, 64)), 2: ("dyna-blaster", (163, 72, 208, 116)), 3: ("lines-98", (143, 122, 188, 170)),
    19: ("rodents-revenge", (158, 840, 210, 895)), 23: ("jazz-jackrabbit", (445, 12, 495, 50)),
    55: ("commandos", (945, 292, 995, 332)), 65: ("dangerous-dave-2", (886, 672, 934, 714)),
    68: ("sonic-3-knuckles", (900, 780, 940, 820)), 69: ("lion-king", (918, 818, 958, 860)),
    81: ("ovo", (1205, 282, 1282, 320)), 82: ("come", (1222, 316, 1254, 356)), 83: ("hercules", (1362, 356, 1398, 392)),
    84: ("tarzan", (1228, 384, 1262, 420)), 85: ("age-of-empires", (1200, 412, 1247, 456)),
    91: ("the-way-chess", (1286, 618, 1326, 656)), 98: ("jezzball", (1206, 850, 1250, 890)),
    99: ("maxwells-maniac", (1170, 882, 1206, 914)), 100: ("get-blue-spheres", (1335, 906, 1398, 950)),
}


def ink_only(img):
    """the drawing without its paper: alpha from how much darker than the paper a pixel is"""
    a = np.asarray(img.convert("RGB")).astype(float)
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    alpha = np.clip((np.percentile(lum, 80) - lum - 12) / 70, 0, 1)
    o = Image.fromarray(np.dstack([np.clip(a * 0.85, 0, 255), alpha * 255]).astype("uint8"), "RGBA")
    bb = o.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    if bb:
        o = o.crop((max(0, bb[0] - 6), max(0, bb[1] - 6), min(o.size[0], bb[2] + 6), min(o.size[1], bb[3] + 6)))
    s = max(o.size)
    c = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    c.paste(o, ((s - o.size[0]) // 2, (s - o.size[1]) // 2))
    return c


def main():
    scan = Image.open(io.BytesIO(requests.get(SCAN, timeout=120).content))
    k = scan.size[0] / 1400
    out = {}
    for n, (game, box) in sorted(ICONS.items()):
        icon = ink_only(scan.crop(tuple(int(v * k) for v in box)))
        buf = io.BytesIO()
        icon.save(buf, "PNG")
        r = requests.post(f"{API}/games/{game}/assets", timeout=120,
                          files={"file": (f"icon-{game}.png", buf.getvalue(), "image/png")},
                          data={"role": "ICON", "label": f"Số {n} trong danh sách 100 trò, 2004", "sortOrder": "0"})
        r.raise_for_status()
        a = r.json()
        out[game] = a["mediaId"]
        print(n, game, "created" if a.get("created") else "kept", a["mediaId"])
    json.dump(out, open(os.path.join(HERE, "icons.json"), "w"), indent=1, sort_keys=True)


if __name__ == "__main__":
    main()
