# -*- coding: utf-8 -*-
"""The computer room of his school, THCS Thống Nhất, as a machine of the desk (POST /api/desk/sync).

Not his own machine ("elsewhere"): it never starts by itself, it stands beside PC Win 98 and PC Win XP in the years he
had computer lessons there (lớp 7 đến lớp 9, born 1990: 9/2002 – 5/2005) and starts when picked. All RECONSTRUCTED,
from what he said on 11/11/2026: Windows 98 on machines older than their time, nothing but the basic Microsoft
programs, DOS to type in, the games of Windows 98, and the games he could only play there — Rescue Rover, Mario Bros,
the Mario typing game, a Chinese-chess game whose name he does not know. The games' entries are in
game-shelf-src/desk_games.py; the prompt's drive C: is the package msdos-school (game-shelf-src/packages.py).

  python3 school_pc.py
"""
import os

import requests

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
KEY, SAID = "pc-school", "Theo lời anh ngày 11/11/2026"

DEVICE = {"key": KEY, "kind": "DESKTOP", "name": "PC trường Thống Nhất", "model": "Phòng tin học trường THCS Thống Nhất",
          "screenWidth": 800, "screenHeight": 600, "from": "2002-09-01T00:00", "to": "2005-06-01T00:00", "elsewhere": True,
          "note": "Máy phòng tin học trường THCS Thống Nhất, anh học tin ở đó từ lớp 7 đến lớp 9 (anh sinh năm 1990: 9/2002 – 5/2005). "
                  "Windows 98, máy cũ hơn máy cùng thời, chỉ có các chương trình Microsoft cơ bản. " + SAID,
          "source": "RECONSTRUCTED"}
SYSTEM = {"key": f"{KEY}/os/WIN98/2002", "device": KEY, "os": "WIN98", "from": "2002-09-01T00:00", "source": "RECONSTRUCTED"}
WALLPAPER = {"key": f"{KEY}/wall/desktop/default", "device": KEY, "place": "DESKTOP", "builtin": "win98-teal", "fit": "FILL",
             "isDefault": True, "source": "RECONSTRUCTED"}

# place, key, label, glyph, app, target, note
ITEMS = [
    ("DESKTOP", "desktop/_/000-my-computer", "My Computer", "computer", "computer", None, None),
    ("DESKTOP", "desktop/_/001-my-documents", "My Documents", "documents", "documents", None, None),
    ("DESKTOP", "desktop/_/002-internet-explorer", "Internet Explorer", "globe-blue", "none", None, None),
    ("DESKTOP", "desktop/_/003-network-neighborhood", "Network Neighborhood", "network", "none", None, None),
    ("DESKTOP", "desktop/_/004-recycle-bin", "Recycle Bin", "recycle", "recycle", None, None),
    ("DESKTOP", "desktop/_/005-ms-dos-prompt", "MS-DOS Prompt", "dos", "dos", "msdos-school",
     "“có phần mở DOS gõ gõ”: ổ C: có C:\\GAMES\\ROVER và C:\\GAMES\\MARIO. " + SAID),
    ("START", "start/_/word", "Microsoft Word", "doc-blue", "word", None, "“các trình microsoft cơ bản”. " + SAID),
    ("START", "start/_/notepad", "Notepad", "notepad", "notepad", None, None),
]


def main():
    items = [{"key": f"{KEY}/{key}", "device": KEY, "place": place, "label": label, "glyph": glyph, "app": app, "target": target,
              "sort": n, "note": note, "source": "RECONSTRUCTED"} for n, (place, key, label, glyph, app, target, note) in enumerate(ITEMS)]
    r = requests.post(f"{API}/desk/sync", json={"devices": [DEVICE], "systems": [SYSTEM], "wallpapers": [WALLPAPER], "items": items}, timeout=120)
    if r.status_code >= 400:
        print(r.status_code, r.text[:500])
    r.raise_for_status()
    out = r.json()
    print(out["counts"])
    for w in out.get("warnings", []):
        print("warning:", w)


if __name__ == "__main__":
    main()
