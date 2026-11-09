# -*- coding: utf-8 -*-
"""His own screenshots of the games, from D:\\Games (staged into the session), into the album Collections → Game.

Each keeps the date the file was written (lastModified), gets a caption, and is listed in uploads.json with the game it
belongs to; push_to_hub.py links it to that game as a SCREENSHOT. BMP and TGA are turned into PNG first.

  python3 upload_shots.py /mnt/user-data/uploads/Games      (needs pillow, requests)
"""
import io
import json
import os
import sys

import requests
from PIL import Image

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
HERE = os.path.dirname(os.path.abspath(__file__))
COLLECTIONS = "3329b4a5-c416-4ab8-9e42-fe449487a980"   # the album "Collections" at the root

# path under D:\Games, the file's time on the drive (ms), game, caption
SHOTS = [
    ("VisualBoyAdvance/Pokemon Emerald (U)_02.png", 1178006028000, "pokemon-emerald",
     "Trận đấu đôi trong Pokémon Emerald: Combusken Lv20 và Zigzagoon Lv14 gặp Meditite và Voltorb, 01/05/2007."),
    ("VisualBoyAdvance/Pokemon Emerald (U)_01.png", 1185452174000, "pokemon-emerald",
     "Pokémon Emerald trên VisualBoyAdvance, 26/07/2007."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_04.png", 1234768152000, "pokemon-firered",
     "Lost Cave ở quần đảo Sevii trong Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_05.png", 1234769136000, "pokemon-firered",
     "Blastoise Lv68 gặp Dewgong Lv64 trong Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_06.png", 1234769138000, "pokemon-firered",
     "Blastoise Lv68 gặp Dewgong Lv64 trong Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_07.png", 1234770074000, "pokemon-firered",
     "“Congratulations, LAN DAN, you and your POKéMON are HALL OF FAMERS!” — vào Hall of Fame Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_02.png", 1234763104000, "pokemon-firered",
     "Blastoise Lv64 đối đầu Mewtwo hoang dã Lv70 trong Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_03.png", 1234763192000, "pokemon-firered",
     "Blastoise còn 93/200 máu trước Mewtwo Lv70, Pokémon FireRed, 16/02/2009."),
    ("VisualBoyAdvance/Pokemon Fire Red (U)_01.png", 1234862066000, "pokemon-firered",
     "Quầy đổi xu ở Game Corner trong Pokémon FireRed, 3.954 xu, 17/02/2009."),
    ("VisualBoyAdvance/Sonic Advance_02.png", 1171615046000, "sonic-advance",
     "Tiny Chao Garden trong Sonic Advance, 16/02/2007."),
    ("VisualBoyAdvance/Sonic Advance_03.png", 1171616544000, "sonic-advance",
     "Sonic ở màn băng tuyết Ice Paradise, Sonic Advance, 16/02/2007."),
    ("VisualBoyAdvance/Sonic Advance_01.png", 1172976676000, "sonic-advance",
     "Tails trong Sonic Advance, 04/03/2007."),
    ("VisualBoyAdvance/Super Mario Advance 3-Yoshi's Island (U)_04.png", 1171619594000, "yoshis-island",
     "Yoshi cõng em bé Mario trong hang, Super Mario Advance 3, 16/02/2007."),
    ("[Adventure Games]/DYNA Blaster/CAPTURE/dyna_000.png", 1295631851375, "dyna-blaster",
     "Màn hình đầu của DYNA Blaster trên DOSBox, 22/01/2011."),
    ("[Adventure Games]/DYNA Blaster/CAPTURE/dyna_001.png", 1295631919078, "dyna-blaster",
     "Một màn DYNA Blaster trên DOSBox, 22/01/2011."),
    ("[Adventure Games]/Sonic 3 & Knuckles/CAP00000.BMP", 1049628718000, "sonic-3-knuckles",
     "Sonic và Tails trong Sonic & Knuckles Collection trên PC Win 98, 06/04/2003."),
    ("WarCraft III (1.23)/Screenshots/WC3ScrnShot_052309_215750_01.tga", 1243090672000, "dota",
     "Kết thúc một ván DotA trên Warcraft III: The Frozen Throne, 21:57 ngày 23/05/2009."),
]


def album():
    kids = requests.get(f"{API}/collections/{COLLECTIONS}/children", timeout=60).json()
    for c in kids:
        if c["name"] == "Game":
            return c["id"]
    r = requests.post(f"{API}/collections", json={"name": "Game", "parentId": COLLECTIONS,
                                                   "description": "Ảnh chụp màn hình game của anh"}, timeout=60)
    r.raise_for_status()
    return r.json()["id"]


def main(root):
    col = album()
    done = {u["file"]: u for u in json.load(open(os.path.join(HERE, "uploads.json")))} if os.path.exists(os.path.join(HERE, "uploads.json")) else {}
    for rel, mtime, game, caption in SHOTS:
        if rel in done:
            continue
        path = os.path.join(root, rel)
        if mtime is None:
            mtime = int(os.path.getmtime(path) * 1000)
        name = os.path.basename(rel)
        data = open(path, "rb").read()
        if name.lower().endswith((".bmp", ".tga")):
            buf = io.BytesIO()
            Image.open(path).convert("RGB").save(buf, "PNG")
            data, name = buf.getvalue(), os.path.splitext(name)[0] + ".png"
        r = requests.post(f"{API}/media-files/upload", timeout=300, files={"file": (name, data, "image/png")},
                          data={"collectionId": col, "lastModified": str(mtime)})
        if not r.ok:
            print("failed", rel, r.status_code, r.text[:300])
            continue
        out = r.json()
        m = out.get("media") or out.get("existing")
        requests.patch(f"{API}/media-files/{m['id']}", json={"caption": caption}, timeout=60).raise_for_status()
        done[rel] = {"file": rel, "mediaId": m["id"], "game": game, "role": "SCREENSHOT"}
        print(game, m["id"], "duplicate" if out.get("duplicate") else "new")
        json.dump(list(done.values()), open(os.path.join(HERE, "uploads.json"), "w"), indent=1, ensure_ascii=False)
    json.dump(list(done.values()), open(os.path.join(HERE, "uploads.json"), "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
