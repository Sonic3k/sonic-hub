# -*- coding: utf-8 -*-
"""What runs his Windows games in the browser (the web's /games/win.html), put in the private games bucket
(POST /api/game-runtime/{name}, read back through GET /api/game-runtime/{name}):

- Boxedwine's engine, the web build boxedwine.org runs its own demos with (2020): boxedwine.js and .wasm, and its
  BrowserFS (browserfs.boxedwine.js). Boxedwine is GPL v2: https://github.com/danoon2/Boxedwine
- The Wine files it starts from: Wine 1.7.55 as boxedwine.org serves it (fullWine1.7.55-v8.zip, plus the overlay its
  pages start with, wine1.7.55-v8-min-online.zip), cut down to what his games open (FILES below, found by running each
  of them and noting what Wine asked for) and the parts of Windows such games use besides. Wine is LGPL.

Names carry a version, so browsers keep them; a new cut is a new name (winroot-v2.zip) and win.html says which.

  python3 win_runtime.py /tmp/wine        downloads, cuts, uploads
"""
import os
import re
import sys
import zipfile

import requests

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
SITE = "https://www.boxedwine.org/boxedwine"
ENGINE = {"boxedwine-2020.js": "build/default/boxedwine.js", "boxedwine-2020.wasm": "build/default/boxedwine.wasm",
          "browserfs-2020.js": "build/default/browserfs.boxedwine.js"}
ROOT, OVERLAY, OUT = "fs/fullWine1.7.55-v8.zip", "apps/wine1.7.55-v8-min-online.zip", "winroot-v1.zip"

# what his games asked Wine for, beyond the overlay (Win Games, DX-Ball 2, Sonic & Knuckles, Lines 98, Kawai 2003)
FILES = """
home/username/.wine/drive_c/windows/system.ini home/username/.wine/drive_c/windows/win.ini
home/username/.wine/drive_c/windows/system/mmsystem.dll lib/i386-linux-gnu/libgcc_s.so.1 lib/libjpeg.so.8.0.2
""".split()
DLLS = """comctl32 comdlg32 ddraw dsound mciseq midimap mmdevapi mpr msacm32 msacm32.drv opengl32 usp10 uxtheme
windowscodecs winealsa.drv wined3d wineoss.drv winepulse.drv winevdm.exe winmm winspool.drv
dinput dinput8 dplayx quartz msvfw32 avifil32 mciavi32 msvidc32 iccvid msrle32 mciqtz32 mciwave mcicda imaadp32.acm
msadp32.acm msg711.acm msgsm32.acm l3codeca.acm shell32 shlwapi ole32 oleaut32 olepro32 rpcrt4 imm32 version riched20
riched32 winhlp32.exe devenum amstream dxdiagn d3dxof winex11.drv gdiplus msvcrt advapi32 setupapi cfgmgr32 hid""".split()


def fetch(path, out):
    if not os.path.exists(out):
        r = requests.get(f"{SITE}/{path}", timeout=600)
        r.raise_for_status()
        open(out, "wb").write(r.content)
    return out


def cut(work):
    full = zipfile.ZipFile(fetch(ROOT, os.path.join(work, "root.zip")))
    over = zipfile.ZipFile(fetch(OVERLAY, os.path.join(work, "overlay.zip")))
    names = {i.filename: i for i in full.infolist()}
    want = set(FILES)
    for d in DLLS:
        base = d if "." in d else d + ".dll"                       # comctl32 → comctl32.dll, wineoss.drv stays
        want |= {f"lib/wine/{base}.so", f"home/username/.wine/drive_c/windows/system32/{base}"}
    for n in names:                                                 # every 16-bit module, the old system folder,
        if re.match(r"lib/wine/[^/]+16\.so$", n) or n.startswith(("home/username/.wine/drive_c/windows/system/", "etc/")) \
                or n.endswith("/") or n == "wineVersion.txt":       # every folder (Wine needs /tmp), /etc
            want.add(n)
    path = os.path.join(work, OUT)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        have = set()
        for i in over.infolist():
            z.writestr(i, over.read(i)); have.add(i.filename)
        for n in sorted(want):
            if n in names and n not in have:
                z.writestr(names[n], b"" if n.endswith("/") else full.read(names[n])); have.add(n)
    print(OUT, os.path.getsize(path))
    return path


def upload(name, path):
    with open(path, "rb") as fh:
        r = requests.post(f"{API}/game-runtime/{name}", files={"file": (name, fh)}, timeout=600)
    r.raise_for_status()
    print(name, r.json())


if __name__ == "__main__":
    work = sys.argv[1] if len(sys.argv) > 1 else "/tmp/wine"
    os.makedirs(work, exist_ok=True)
    for name, path in ENGINE.items():
        upload(name, fetch(path, os.path.join(work, name)))
    upload(OUT, cut(work))
