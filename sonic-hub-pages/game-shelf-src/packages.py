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
ROOT = os.environ.get("GAMES_ROOT", "/mnt/user-data/uploads/Games")   # D:\\Games as staged into the session

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

# The ROMs in his emulators' folders and, where he had one, his save (VBA .sav, Snes9x .srm, No$GBA .SAV unpacked).
# key, game, title, engine, emulator on the machines, EmulatorJS core, ROM and save under D:\Games, the save's time (ms)
VBA, SNES9X, NES, NOGBA = "VisualBoyAdvance", "snes9x-1.51-win32", "(Emulator) virtual nes/758 NES Roms", "NO$GBA (NDS)"
ROMS = [
    ("emerald", "pokemon-emerald", "Pokémon Emerald", "GBA", "vba", "gba", f"{VBA}/Pokemon Emerald (U).gba", f"{VBA}/Pokemon Emerald (U).sav", 1246938254000),
    ("firered", "pokemon-firered", "Pokémon FireRed", "GBA", "vba", "gba", f"{VBA}/Pokemon Fire Red (U).gba", f"{VBA}/Pokemon Fire Red (U).sav", 1274494094000),
    ("sonic-advance", "sonic-advance", "Sonic Advance", "GBA", "vba", "gba", f"{VBA}/Sonic Advance.gba", f"{VBA}/Sonic Advance.sav", 1286092752000),
    ("sma", "super-mario-advance", "Super Mario Advance", "GBA", "vba", "gba", f"{VBA}/Super Mario Advance (E).gba", f"{VBA}/Super Mario Advance (E).sav", 1237086448000),
    ("sma3", "yoshis-island", "Super Mario Advance 3: Yoshi's Island", "GBA", "vba", "gba", f"{VBA}/Super Mario Advance 3-Yoshi's Island (U).gba", f"{VBA}/Super Mario Advance 3-Yoshi's Island (U).sav", 1292928396000),
    ("smb-deluxe", "super-mario-bros", "Super Mario Bros. Deluxe", "GBC", "vba", "gb", f"{VBA}/Super Mario Bros.gbc", f"{VBA}/Super Mario Bros.sav", 1292927896000),
    ("pkmn-red", "pokemon-red-blue", "Pokémon Red", "GB", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNRed.gb", None, None),
    ("pkmn-blue", "pokemon-red-blue", "Pokémon Blue", "GB", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNBlue.gb", None, None),
    ("pkmn-yellow", "pokemon-yellow", "Pokémon Yellow", "GB", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNYellow.gb", None, None),
    ("pkmn-gold", "pokemon-gold-silver", "Pokémon Gold", "GBC", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNGold.gb", None, None),
    ("pkmn-silver", "pokemon-gold-silver", "Pokémon Silver", "GBC", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNSilver.gb", None, None),
    ("pkmn-crystal", "pokemon-crystal", "Pokémon Crystal", "GBC", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNCrystal.gbc", None, None),
    ("pkmn-pinball", "pokemon-pinball", "Pokémon Pinball", "GBC", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNPinball.gb", None, None),
    ("pkmn-tcg", "pokemon-tcg", "Pokémon Trading Card Game", "GBC", "vba", "gb", f"{VBA}/Pokemon VBA/PKMNCard.gb", None, None),
    ("smas", "super-mario-all-stars", "Super Mario All-Stars + Super Mario World", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Super Mario All Stars & World (US).smc", f"{SNES9X}/Saves/Super Mario All Stars & World (US).srm", 1292168028000),
    ("yoshi-snes", "yoshis-island", "Super Mario World 2: Yoshi's Island", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Mario_World_2_Yoshi_s_Island_SNES.SMC", f"{SNES9X}/Saves/Mario_World_2_Yoshi_s_Island_SNES.srm", 1294902078000),
    ("smrpg", "super-mario-rpg", "Super Mario RPG", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Smrpg.smc", f"{SNES9X}/Saves/Smrpg.srm", 1292925536000),
    ("mario-paint", "mario-paint", "Mario Paint", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Mario_Paint_SNES.SMC", f"{SNES9X}/Saves/Mario_Paint_SNES.srm", 1292942954000),
    ("sbm3", "super-bomberman-3", "Super Bomberman 3", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Super Bomberman 3 (J)(33874).smc", None, None),
    ("sbm4", "super-bomberman-4", "Super Bomberman 4", "SNES", "snes9x", "snes", f"{SNES9X}/Game snes/Super Bomberman 4 (J).fig", None, None),
    ("nes-mario-bros", "mario-bros", "Mario Bros.", "NES", "virtuanes", "nes", f"{NES}/Mario Bros. (JU) [!].nes", None, None),
    ("rainbow-islands", "rainbow-islands", "Rainbow Islands", "NES", "virtuanes", "nes", f"{NES}/Rainbow Islands - The Story of Bubble Bobble 2 (U).nes", None, None),
    ("nsmb", "new-super-mario-bros", "New Super Mario Bros.", "NDS", "nogba", "nds", f"{NOGBA}/Game NDS/0434 - New Super Mario Bros (U)(pSyDS).nds", f"{NOGBA}/BATTERY/0434 - New Super Mario Bros (U)(pSyDS).SAV", 1294217226000),
]


def save_bytes(path):
    """his save as the emulators of the web read it"""
    d = open(path, "rb").read()
    if d.startswith(b"NocashGbaBackupMediaSavDataFile"):      # No$GBA: a header, then (method 1) runs of bytes
        method, _packed, size = struct.unpack("<III", d[0x44:0x50])
        if method == 0:
            return d[0x4C:0x4C + struct.unpack("<I", d[0x48:0x4C])[0]]
        out, pos = bytearray(), 0x50
        while d[pos]:
            cc = d[pos]
            if cc == 0x80:
                out += bytes([d[pos + 3]]) * struct.unpack("<H", d[pos + 1:pos + 3])[0]; pos += 4
            elif cc > 0x80:
                out += bytes([d[pos + 1]]) * (cc - 0x80); pos += 2
            else:
                out += d[pos + 1:pos + 1 + cc]; pos += cc + 1
        return bytes(out[:size])
    if path.lower().endswith(".sav") and len(d) == 65536 and "Pokemon" in path:
        return d + b"\xff" * 65536                              # VBA kept 64 KB; the games' flash is 128 KB
    return d


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


def push(bundles, only=None):
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
    for key, game, title, engine, emu, core, rom, sav, sav_at in ROMS:
        order += 1
        meta = {"gameKey": game, "engine": engine, "title": title, "portal": False, "sortOrder": order,
                "config": json.dumps({"emu": emu, "core": core}), "note": ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        with open(os.path.join(ROOT, rom), "rb") as fh:
            r = requests.post(f"{API}/game-packages/{key}/file", timeout=600,
                              files={"file": (os.path.basename(rom), fh, "application/octet-stream")})
        r.raise_for_status()
        if sav:
            data = save_bytes(os.path.join(ROOT, sav))
            r = requests.post(f"{API}/game-packages/{key}/save", timeout=120, data={"lastModified": str(sav_at)},
                              files={"file": (os.path.basename(sav), data, "application/octet-stream")})
            r.raise_for_status()
        print(key, "ok", "with save" if sav else "")
    for key, game, title, config in WEB:
        order += 1
        meta = {"gameKey": game, "engine": "WEB", "title": title, "portal": True, "sortOrder": order,
                "config": json.dumps(config), "note": ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        print(key, "ok")


if __name__ == "__main__":
    {"build": lambda: build(sys.argv[2], sys.argv[3]), "flash": lambda: build_flash(sys.argv[2], sys.argv[3]),
     "push": lambda: push(sys.argv[2])}[sys.argv[1]]()
