# -*- coding: utf-8 -*-
"""The games' own icons, taken out of their .exe (the first icon group, its most colourful image), as the machines draw
them: desk assets of the folder "games" (POST /api/desk/assets?folder=games), icon/<key>-16.png, -32.png and -96.png
(the 32 px icon three times bigger, pixel for pixel, for sharp enlarged screens). A desk item with glyph "exe:<key>"
shows it.

  python3 exe_icons.py /tmp/bundles        the .exe files from the Windows games' zips (packages.py win), and the
                                           games that are only a shortcut (SHORTCUTS, their files as staged from D:)
                                           needs icoutils
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
GAMES = os.environ.get("GAMES_ROOT", "/mnt/user-data/uploads/Games")   # D:\\Games, staged

# games that are only their shortcut on the machines (PopCap, the heavier ones, the Flash movies): icon key → their
# program (or icon file) under D:\\Games. An installer stands in where only the installer is left (Zuma, Mad Caps,
# Feeding Frenzy); Doodle God and Devil are .swf files, which Windows showed with the Flash icon.
POP = "[Mini Games]/[PopCap Game]"
SHORTCUTS = {
    "astropop": f"{POP}/AstroPop Deluxe/WinAP.exe", "bejeweled-2": f"{POP}/Bejeweled 2 Deluxe/Bejeweled 2 Deluxe/WinBej2.exe",
    "big-money": f"{POP}/Big Money Deluxe/WinBM.exe", "bookworm": f"{POP}/BookWorm Deluxe/BookWorm.exe",
    "bookworm-adventures": f"{POP}/Bookworm Adventures Deluxe/BookwormAdventures.exe", "chuzzle": f"{POP}/Chuzzle Deluxe/Chuzzle.exe",
    "dynomite": f"{POP}/Dynomite 2.01/Dynomite.exe", "iggle-pop": f"{POP}/Iggle Pop Deluxe/IgglePop.exe",
    "insaniquarium": f"{POP}/Insaniquarium/Insaniquarium.exe", "mummy-maze": f"{POP}/Mummy Maze Deluxe/WinMM.exe",
    "noahs-ark": f"{POP}/Noah's Ark Deluxe/WinNoah.exe", "seven-seas": f"{POP}/Seven Seas/WinSS.exe", "tiptop": f"{POP}/TipTop Deluxe/TipTop.exe",
    "zuma": "[Mini Games]/[Gamehouse]/Zuma/ZumaInstall.exe",
    "feeding-frenzy": "Games setup/Feeding Frenzy Series/Feeding Frenzy 1/FeedingFrenzyInstall.exe",
    "feeding-frenzy-2": "[Mini Games]/[Gamehouse]/FEEDING FRENZY® 2 - ShipWreck Showdown 1.0.0/Feeding Frenzy 2.exe",
    "mad-caps": "[Mini Games]/[Gamehouse]/Mad Caps/MadCapsInstall.exe",
    "aoe2": "AOE 2 the conquerors/empires2.exe", "warcraft-3": "WarCraft III (1.23)/Warcraft III.exe",
    "frozen-throne": "WarCraft III (1.23)/Frozen Throne.exe", "nfs2": "[Sports]/Need For Speed II SE/NFS2SEN.ICO",
    "commandos": "Commandos/Commandos - Behind Enemy Lines/Commandos.exe",
    "mario-forever": "[Adventure Games]/Super Mario/Mario Forever 5.0/Mario Forever 5.0.exe",
    "dao-vang": "[Mini Games]/[Flash Games]/Dao vang.exe", "chiec-non": "[Mini Games]/[Flash Games]/Chiec non ky dieu 1.exe",
    "bloxorz": "[Mini Games]/[Flash Games]/Bloxorz.exe", "doodle-god": "[Mini Games]/[Flash Games]/Bloxorz.exe",
    "doodle-devil": "[Mini Games]/[Flash Games]/Bloxorz.exe",
}


def icons(exe_bytes, name):
    """16, 32 and 96 px pictures of the program's icon (or of an .ico file), or None"""
    with tempfile.TemporaryDirectory() as d:
        exe = os.path.join(d, name)
        open(exe, "wb").write(exe_bytes)
        if name.lower().endswith(".ico"):
            found = [exe]
        else:
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


def upload(key, pics, have):
    for size, im in pics.items():
        name = f"icon/{key}-{size}.png"
        if name in have:
            continue
        buf = io.BytesIO()
        im.save(buf, "PNG")
        for attempt in range(3):   # the API sometimes answers 500 to one upload; sent again it goes through
            r = requests.post(f"{API}/desk/assets", params={"folder": "games"}, timeout=120,
                              data={"name": name}, files={"file": (f"{key}-{size}.png", buf.getvalue(), "image/png")})
            if r.status_code < 500:
                break
        r.raise_for_status()


def main(bundles):
    have = {a["fileName"] for a in requests.get(f"{API}/desk/assets", params={"folder": "games"}, timeout=60).json()}
    for key, _game, _title, z, exe, _res, _portal, _note in packages.WIN:
        if not exe or all(f"icon/{key}-{s}.png" in have for s in (16, 32, 96)):
            continue
        holder = z or key
        top = packages.WIN_FILES[holder][2]
        with zipfile.ZipFile(os.path.join(bundles, f"{holder}.zip")) as zf:
            data = zf.read(f"{top}/{exe}")
        pics = icons(data, os.path.basename(exe))
        if not pics:
            print(key, "no icon")
            continue
        upload(key, pics, have)
        print(key, "ok")
    for key, rel in SHORTCUTS.items():
        if all(f"icon/{key}-{s}.png" in have for s in (16, 32, 96)):
            continue
        path = os.path.join(GAMES, rel)
        pics = icons(open(path, "rb").read(), os.path.basename(path))
        if not pics:
            print(key, "no icon")
            continue
        upload(key, pics, have)
        print(key, "ok")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "/tmp/bundles")
