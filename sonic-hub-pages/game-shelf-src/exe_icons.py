# -*- coding: utf-8 -*-
"""The games' own icons, taken out of their .exe (the first icon group, its most colourful image), as the machines draw
them: desk assets of the folder "games" (POST /api/desk/assets?folder=games), icon/<key>-16.png, -32.png and -96.png
(the 32 px icon three times bigger, pixel for pixel, for sharp enlarged screens). A desk item with glyph "exe:<key>"
shows it.

  python3 exe_icons.py /tmp/bundles        the .exe files from the Windows games' zips (packages.py win)   needs icoutils
"""
import glob
import io
import os
import subprocess
import sys
import tempfile
import zipfile

import requests
from PIL import Image

import packages

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")


def icons(exe_bytes, name):
    """16, 32 and 96 px pictures of the program's icon, or None"""
    with tempfile.TemporaryDirectory() as d:
        exe = os.path.join(d, name)
        open(exe, "wb").write(exe_bytes)
        subprocess.run(["wrestool", "-x", "-t14", "-o", d, exe], capture_output=True)
        found = sorted(glob.glob(os.path.join(d, "*.ico")), key=group_id)
        if not found:
            return None
        im = Image.open(found[0])
        entries = list(enumerate(im.ico.entry))
        big_i = max(entries, key=lambda e: (e[1].width >= 32, e[1].bpp, e[1].width))[0]
        big = im.ico.frame(big_i).convert("RGBA")
        if big.size != (32, 32):
            big = big.resize((32, 32), Image.LANCZOS)
        small_e = [e for e in entries if e[1].width == 16]
        small = im.ico.frame(max(small_e, key=lambda e: e[1].bpp)[0]).convert("RGBA") if small_e else big.resize((16, 16), Image.LANCZOS)
        return {16: small, 32: big, 96: big.resize((96, 96), Image.NEAREST)}


def group_id(path):
    """the icon groups by their number (the program's own comes first), named ones after"""
    n = path.rsplit("_14_", 1)[-1].split(".")[0].split("_")[0]
    return (0, int(n), "") if n.isdigit() else (1, 0, n)


def upload(key, pics):
    for size, im in pics.items():
        buf = io.BytesIO()
        im.save(buf, "PNG")
        r = requests.post(f"{API}/desk/assets", params={"folder": "games"}, timeout=120,
                          data={"name": f"icon/{key}-{size}.png"}, files={"file": (f"{key}-{size}.png", buf.getvalue(), "image/png")})
        r.raise_for_status()


def main(bundles):
    for key, _game, _title, z, exe, _res, _portal, _note in packages.WIN:
        if not exe:
            continue
        holder = z or key
        top = packages.WIN_FILES[holder][2]
        with zipfile.ZipFile(os.path.join(bundles, f"{holder}.zip")) as zf:
            data = zf.read(f"{top}/{exe}")
        pics = icons(data, os.path.basename(exe))
        if not pics:
            print(key, "no icon")
            continue
        upload(key, pics)
        print(key, "ok")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/bundles")
