# -*- coding: utf-8 -*-
"""The systems' own icons for the machines (desk assets of the folders xp, w7, w10: icon/<name>-<size>.png), taken from
the .ico files he gathered (windows-<system>.zip in his Drive, folder <system>/icons). An .ico holds each size several
times over, from 16 colours up; the picture with the most colours is the one to use (taking the first gave the 16-colour
desktop of a machine in safe mode). 96 px is the 256 px picture made smaller, where the file has one.

  python3 system_icons.py <system>/icons <prefix> <folder> [name ...]
  e.g. python3 system_icons.py xp/icons xp- xp
       python3 system_icons.py w10/icons w10- w10 error information warning     only these
  needs Pillow, requests
"""
import io
import os
import sys

import requests
from PIL import Image

API = "https://angels-islands-api-production.up.railway.app/api"


def pictures(path):
    """size → the picture of that size with the most colours"""
    ico = Image.open(path).ico
    best = {}
    for i, e in enumerate(ico.entry):
        if e.width == e.height and (e.width not in best or e.bpp > best[e.width][0]):
            best[e.width] = (e.bpp, i)
    out = {s: ico.frame(i).convert("RGBA") for s, (_, i) in best.items() if s in (16, 32, 48)}
    big = max((s for s, (bpp, _) in best.items() if s >= 96 and bpp == 32), default=None)
    if big:
        out[96] = ico.frame(best[big][1]).convert("RGBA").resize((96, 96), Image.LANCZOS)
    return out


def main(src, prefix, folder, only):
    for f in sorted(os.listdir(src)):
        if not (f.endswith(".ico") and f.startswith(prefix)):
            continue
        base = f[len(prefix):-4]
        if only and base not in only:
            continue
        for size, im in pictures(os.path.join(src, f)).items():
            buf = io.BytesIO()
            im.save(buf, "PNG")
            for _ in range(3):   # the API sometimes answers 500 to one upload; sent again it goes through
                r = requests.post(f"{API}/desk/assets", params={"folder": folder}, timeout=120, data={"name": f"icon/{base}-{size}.png"},
                                  files={"file": (f"{base}-{size}.png", buf.getvalue(), "image/png")})
                if r.status_code < 500:
                    break
            r.raise_for_status()
        print(base, "ok")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], set(sys.argv[4:]))
