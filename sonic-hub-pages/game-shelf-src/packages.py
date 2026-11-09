# -*- coding: utf-8 -*-
"""What plays the games: his DOS games as js-dos bundles, and the games remade for the portal.

A DOS bundle is a zip of the game folder as it is in D:\\Games\\[DOS Games] (his saves and settings included: Prince
of Persia starts the way his Prince.bat did, with the save of 22/11/1998), plus .jsdos/dosbox.conf that mounts it
as C: and runs the game. The bundle goes into the private bucket (PUT /api/game-packages/{key}, then POST its file);
the web plays it with js-dos inside the PC Win 98 window (portal = false: these play only inside the machine).
WEB packages have no file: the web has the game itself (config names it).

  python3 packages.py build /mnt/user-data/uploads/Games/[DOS\\ Games] /tmp/bundles    writes the bundles
  python3 packages.py flash /mnt/user-data/uploads/Games/[Mini\\ Games] /tmp/bundles     the Flash movies out of their .exe
  python3 packages.py push /tmp/bundles                                                  metadata + files to the hub
"""
import json
import os
import struct
import sys
import zipfile

import requests

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")

# key, game, title, folder under [DOS Games], what autoexec runs, Sound Blaster IRQ, note
DOS = [
    ("dyna", "dyna-blaster", "DYNA Blaster", "dyna", "DYNA.EXE", 7, None),
    ("prince", "prince-of-persia", "Prince of Persia", "prince", "PRINCE.BAT", 7,
     "Chạy như Prince.bat của anh (prince megahit), kèm file lưu PRINCE.SAV ngày 22/11/1998"),
    ("dave2", "dangerous-dave-2", "Dangerous Dave in the Haunted Mansion", "dave2", "HAUNTED.EXE", 7, None),
    ("lionking", "lion-king", "The Lion King", "lionking", "LIONKING.EXE", 5, "Theo LIONKING.CFG của anh: Sound Blaster 220, IRQ 5, DMA 1"),
    ("mariobro", "mario-brothers-vga", "Mario Brothers VGA", "mariobro", "MARIO.EXE", 7, None),
    ("hexx", "hexxagon", "Hexxagon", "hexx", "HEXX.EXE", 7, None),
    ("rrover", "rescue-rover", "Rescue Rover", "rrover", "ROVER.EXE", 7, "Kèm bản lưu SAVEGAME.ROV ngày 04/08/2008"),
    ("fastfood", "fast-food", "Fast Food", "fastfood", "FASTFOOD.EXE", 7, None),
]

# key, game, title, file under D:\Games\[Mini Games] (a Flash projector .exe or a .swf), stage size
FLASH = [
    ("dao-vang", "dao-vang", "Đào vàng", "[Flash Games]/Dao vang.exe", 550, 400),
    ("chiec-non", "chiec-non-ky-dieu", "Chiếc nón kỳ diệu", "[Flash Games]/Chiec non ky dieu 1.exe", 400, 300),
    ("bloxorz", "bloxorz", "Bloxorz", "[Flash Games]/Bloxorz.exe", 550, 300),
    ("doodle-devil", "doodle-devil", "Doodle Devil", "doodle-devil.swf", 640, 480),
    ("doodle-god", "doodle-god", "Doodle God", "Doodle God.swf", 640, 480),
]

# key, game, title, what the web runs
WEB = [
    ("minesweeper", "minesweeper", "Minesweeper", {"replica": "minesweeper"}),
    ("lines", "lines-98", "Lines 98", {"replica": "lines"}),
]


def dosbox_conf(run, irq):
    return f"""[sdl]
autolock=false

[dosbox]
machine=svga_s3
memsize=16

[cpu]
core=auto
cputype=auto
cycles=auto

[mixer]
rate=44100

[sblaster]
sbtype=sb16
sbbase=220
irq={irq}
dma=1
hdma=5

[autoexec]
echo off
mount c .
c:
cls
{run}
"""


def swf_of(data):
    """the .swf inside a Flash projector: it ends with 0xFA123456 and the movie's length"""
    if data[:3] in (b"FWS", b"CWS", b"ZWS"):
        return data
    if len(data) > 8 and struct.unpack("<I", data[-8:-4])[0] == 0xFA123456:
        n = struct.unpack("<I", data[-4:])[0]
        return data[-8 - n:-8]
    raise ValueError("no Flash movie in this file")


def build_flash(src, out):
    os.makedirs(out, exist_ok=True)
    for key, _game, _title, rel, _w, _h in FLASH:
        swf = swf_of(open(os.path.join(src, rel), "rb").read())
        open(os.path.join(out, f"{key}.swf"), "wb").write(swf)
        print(key, len(swf))


def build(src, out):
    os.makedirs(out, exist_ok=True)
    for key, _game, _title, folder, run, irq, _note in DOS:
        path = os.path.join(out, f"{key}.jsdos")
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            root = os.path.join(src, folder)
            for dirpath, _dirs, files in os.walk(root):
                for f in sorted(files):
                    full = os.path.join(dirpath, f)
                    z.write(full, os.path.relpath(full, root).replace(os.sep, "/"))
            z.writestr(".jsdos/dosbox.conf", dosbox_conf(run, irq))
        print(key, os.path.getsize(path))


def push(bundles):
    order = 0
    for key, game, title, _folder, run, irq, note in DOS:
        order += 1
        meta = {"gameKey": game, "engine": "DOS", "title": title, "portal": False, "sortOrder": order,
                "config": json.dumps({"run": run, "irq": irq}), "note": note or ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        with open(os.path.join(bundles, f"{key}.jsdos"), "rb") as fh:
            r = requests.post(f"{API}/game-packages/{key}/file", timeout=300,
                              files={"file": (f"{key}.jsdos", fh, "application/zip")})
        r.raise_for_status()
        print(key, "ok", r.json().get("fileSize"))
    for key, game, title, _rel, w, h in FLASH:
        order += 1
        meta = {"gameKey": game, "engine": "FLASH", "title": title, "portal": False, "sortOrder": order,
                "config": json.dumps({"width": w, "height": h}), "note": ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        with open(os.path.join(bundles, f"{key}.swf"), "rb") as fh:
            r = requests.post(f"{API}/game-packages/{key}/file", timeout=300,
                              files={"file": (f"{key}.swf", fh, "application/x-shockwave-flash")})
        r.raise_for_status()
        print(key, "ok", r.json().get("fileSize"))
    for key, game, title, config in WEB:
        order += 1
        meta = {"gameKey": game, "engine": "WEB", "title": title, "portal": True, "sortOrder": order,
                "config": json.dumps(config), "note": ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        print(key, "ok")


if __name__ == "__main__":
    {"build": lambda: build(sys.argv[2], sys.argv[3]), "flash": lambda: build_flash(sys.argv[2], sys.argv[3]),
     "push": lambda: push(sys.argv[2])}[sys.argv[1]]()
