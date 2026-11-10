# -*- coding: utf-8 -*-
"""What plays the games: his DOS games as js-dos bundles, his Windows games for Boxedwine, the Flash movies, the ROMs,
and the game remade for the portal.

A DOS bundle is a zip of the game folder as it is in D:\\Games\\[DOS Games] (his saves and settings included: Prince
of Persia starts the way his Prince.bat did, with the save of 22/11/1998), plus .jsdos/dosbox.conf that mounts it
as C: and runs the game. The bundle goes into the private bucket (PUT /api/game-packages/{key}, then POST its file);
the web plays it with js-dos inside the PC Win 98 window (portal = false: these play only inside the machine).
A WIN package is a Windows game run by Boxedwine in the web's /games/win.html: its file is the game's folder zipped
as it is on D: (with its own dates), under one top folder; config names the program (exe), that folder (dir), the
screen size Wine starts with when not 800x600 (res), and, for the games of [Win Games] that share one folder, the
package that holds the zip (zip). What runs them (Boxedwine and the Wine files) is win_runtime.py.
WEB packages have no file: the web has the game itself (config names it).

  python3 packages.py build /mnt/user-data/uploads/Games/[DOS\\ Games] /tmp/bundles [textris]   writes the bundles (all, or those keys)
  python3 packages.py flash /mnt/user-data/uploads/Games/[Mini\\ Games] /tmp/bundles     the Flash movies out of their .exe
  python3 packages.py win /tmp/bundles                                                   the Windows games' zips (WIN_FILES)
  python3 packages.py push /tmp/bundles [jazz,riptide]                                  metadata + files to the hub (all, or those keys)
"""
import json
import os
import struct
import sys
import time
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
    # ROVER.EXE refuses to run on its own ("You must type START at the DOS prompt"): START.EXE is Softdisk's opening menu
    ("rrover", "rescue-rover", "Rescue Rover", "rrover", "START.EXE", 7, "Kèm bản lưu SAVEGAME.ROV ngày 04/08/2008"),
    ("fastfood", "fast-food", "Fast Food", "fastfood", "FASTFOOD.EXE", 7, None),
    ("jazz", "jazz-jackrabbit", "Jazz Jackrabbit", "jazz", "JAZZ.EXE", 7,
     "Bản CD cài đủ (không có các game tặng kèm), cấu hình âm thanh anh đặt khi chơi lại trên DOSBox ngày 04/08/2012"),
    ("riptide", "dr-riptide", "In Search of Dr. Riptide", "riptide", "RIPTIDE.EXE", 7, "Kèm bảng điểm HIGH.SCR ngày 04/08/2012"),
    ("shadow", "shadow-knights", "Shadow Knights", "shadow", "SHADOW.EXE", 7, None),
    # a DOS program he kept among the Windows games, in [Win Games]\\English ABC (his name for it)
    ("textris", "textris", "Textris", "../[Win Games]/English ABC", "TEXTRIS.EXE", 7,
     "Kèm bảng điểm TEXTRIS.SCO của anh: NGOC ANH 1.029 điểm ghi 01-10-03 (10/01/2003)"),
]

# A DOS prompt with a drive C: of its own: the computer room of his school, where the games were started by typing.
# key, game it is kept under, title, {folder on its C: → folder under [DOS Games]}, what its autoexec does, IRQ, note
SHELLS = [
    ("msdos-school", "rescue-rover", "MS-DOS Prompt", {"GAMES/ROVER": "rrover", "GAMES/MARIO": "mariobro"},
     ["cd \\WINDOWS", "cls", "echo.", "echo Microsoft(R) Windows 98", "echo    (C)Copyright Microsoft Corp 1981-1999.", "echo."], 7,
     "Ổ C: của máy phòng tin học trường THCS Thống Nhất: C:\\GAMES\\ROVER (Rescue Rover, gõ START), C:\\GAMES\\MARIO (Mario Brothers VGA, gõ MARIO)"),
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
]

# The zips of the Windows games, each the way the folder is (dates kept): package → (zip of the folder as it came from
# his drive or his upload, the part of its paths to drop, the top folder in the package's zip, files added)
STAGED = "/mnt/user-data/uploads/Games data/_sonic-hub-tmp"
WIN_FILES = {
    "wingames": (f"{STAGED}/wingames-src.zip", "", "wingames", []),                       # D:\Games\[Win Games]
    "dxball2": (f"{STAGED}/dxball2-src.zip", "", "dxball2", []),                          # [Mini Games]\DXBall2
    "s3k": (f"{STAGED}/s3k-src.zip", "", "s3k", []),                                      # [Adventure Games]\Sonic 3 & Knuckles
    "lines98": ("/mnt/user-data/uploads/0049294d-Lines98-wayback-narod.zip", "Lines98/", "lines98", []),
    # Kawai 2003 is a Visual Basic 5 program: Microsoft's VB5 runtime (msvbvm50.exe, unpacked) goes beside it
    "pikachu": ("/mnt/user-data/uploads/1b09a047-Pikachu-original.zip", "", "pikachu", ["/home/claude/untrusted/vb5/MSVBVM50.DLL"]),
    # C:\\Program Files\\Windows NT\\Pinball of Windows XP SP3, from his upload (its README stays beside it)
    "pinball": ("/mnt/user-data/uploads/a5915bc6-Pinball-WinXP-original.zip", "", "pinball", []),
}

# key, game, title, zip (another package's file; None = its own), program, screen (None = 800x600), portal, note
WG = "wingames"
WIN = [
    ("wingames", "win-games", "Win Games", None, None, None, False, "Thư mục [Win Games] trên D:, chung cho các game bên dưới"),
    ("chips", "chips-challenge", "Chip's Challenge", WG, "CHIPS.EXE", None, False, None),
    ("jezzball", "jezzball", "JezzBall", WG, "JEZZBALL.EXE", None, False, None),
    ("tetravex", "tetravex", "Tetravex", WG, "TETRAVEX.EXE", None, False, None),
    ("tripeaks", "tripeaks", "TriPeaks", WG, "TRIPEAKS.EXE", None, False, None),
    ("taipei", "taipei", "Taipei", WG, "TP.EXE", None, False, None),
    ("klotski", "klotski", "Klotski", WG, "KLOTSKI.EXE", None, False, "Kèm bảng điểm KLOTSKI.SCO trong thư mục"),
    ("rodent", "rodents-revenge", "Rodent's Revenge", WG, "RODENT.EXE", None, False, None),
    ("maxwell", "maxwells-maniac", "Maxwell's Maniac", WG, "MAXWELL.EXE", None, False, None),
    ("gofigure", "go-figure", "Go Figure!", WG, "GOFIGURE.EXE", None, False, None),
    ("dots", "dots", "Dots", WG, "DOTS.EXE", "640x480", False, None),
    ("fences", "fences", "Fences", WG, "FENCES/FENCES.EXE", None, False, None),
    ("pipe-dream", "win-games", "Pipe Dream", WG, "PIPE.EXE", None, False, None),
    ("skifree", "win-games", "SkiFree", WG, "SKI.EXE", None, False, None),
    ("golf", "win-games", "Golf", WG, "GOLF.EXE", "640x480", False, None),
    ("cruel", "win-games", "Cruel", WG, "CRUEL.EXE", "640x480", False, None),
    ("chess-win", "win-games", "Chess", WG, "CHESS.EXE", "640x480", False, None),
    ("noughts", "win-games", "Noughts and Crosses", WG, "0X.EXE", None, False, None),
    ("amnesia", "win-games", "Amnesia", WG, "AMNESIA/AMNESIA.EXE", "640x480", False, None),
    ("blackjack", "win-games", "BlackJack", WG, "BLAKJAK.EXE", None, False, None),
    ("codebreaker", "win-games", "CodeBreaker", WG, "CODEBRAK.EXE", None, False, None),
    ("fujigolf", "win-games", "FujiGolf", WG, "FUJIGOLF.EXE", "640x480", False, None),
    ("hangman", "win-games", "Hangman", WG, "HANGMAN.EXE", "640x480", False, None),
    ("jacks", "win-games", "Jacks", WG, "JACKS.EXE", "640x480", False, None),
    ("lifegen", "win-games", "LifeGenesis", WG, "LIFEGEN.EXE", None, False, None),
    ("pegged", "win-games", "Pegged", WG, "PEGGED.EXE", None, False, None),
    ("rattler", "win-games", "Rattler Race", WG, "RATTLER/RATTLER.EXE", None, False, None),
    ("sticks", "win-games", "Sticks", WG, "STICKS.EXE", None, False, None),
    ("tictactics", "win-games", "TicTactics", WG, "TIC.EXE", None, False, None),
    ("wordzap", "win-games", "WordZap", WG, "WORDZAP.EXE", "640x480", False, None),
    ("dxball2", "dx-ball-2", "DX-Ball 2", None, "DXBall2.exe", None, True, None),
    ("s3k", "sonic-3-knuckles", "Sonic & Knuckles Collection", None, "SONIC3K.EXE", None, True,
     "Bản PC của anh, kèm file lưu SONIC3K.BIN ngày 17/03/2014; mở lên nó hỏi đĩa CD như hồi đó, bấm OK là vào game"),
    ("lines98", "lines-98", "Lines 98", None, "lines98.exe", None, False, "Bản gốc anh tìm lại được (narod.ru, qua Wayback Machine)"),
    ("pikachu", "pikachu", "Pikachu (Kawai 2003)", None, "Kawai2003.exe", None, False,
     "Kawai 2003 của CHEN PROGRAM STUDY (Đài Loan), chạy cùng Visual Basic 5 runtime của Microsoft"),
    ("pinball", "space-cadet-pinball", "3D Pinball for Windows – Space Cadet", None, "PINBALL.EXE", None, False,
     "Bản của Windows XP SP3 (5.1.2600.5512), đúng từng byte với bản gốc"),
]


# the date every file of Windows 98 Second Edition carries (23/04/1999, 10:22 PM): the folders of a prompt's drive C:
WIN98SE = (1999, 4, 23, 22, 22, 0)
SHELL_BEFORE = 1117558800      # 01/06/2005: the last day of the school's computer room for him


def dosbox_conf(run, irq, mount="."):
    """run = the program its autoexec starts, or the lines it runs before leaving the prompt (a list); mount = the
    folder of the bundle that is drive C: (a prompt keeps its drive in C/, so DIR does not show the bundle's own files)"""
    run = run if isinstance(run, str) else "\n".join(run)
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
mount c {mount}
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


def build_win(out):
    """the Windows games' zips: each folder under one top folder, every file with the date it has on his drive"""
    os.makedirs(out, exist_ok=True)
    for key, (src, drop, top, extra) in WIN_FILES.items():
        path = os.path.join(out, f"{key}.zip")
        with zipfile.ZipFile(src) as zi, zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zo:
            zo.writestr(f"{top}/", b"")
            for info in zi.infolist():
                name = info.filename
                if drop and not name.startswith(drop):
                    continue
                name = name[len(drop):]
                if not name:
                    continue
                ni = zipfile.ZipInfo(f"{top}/{name}", info.date_time)
                ni.compress_type = zipfile.ZIP_DEFLATED
                zo.writestr(ni, b"" if info.is_dir() else zi.read(info))
            for f in extra:
                zo.write(f, f"{top}/{os.path.basename(f)}")
        print(key, os.path.getsize(path))


def build(src, out, only=None):
    os.makedirs(out, exist_ok=True)
    for key, _game, _title, folder, run, irq, _note in DOS:
        if only and key not in only:
            continue
        path = os.path.join(out, f"{key}.jsdos")
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            root = os.path.join(src, folder)
            for dirpath, _dirs, files in os.walk(root):
                for f in sorted(files):
                    full = os.path.join(dirpath, f)
                    z.write(full, os.path.relpath(full, root).replace(os.sep, "/"))
            z.writestr(".jsdos/dosbox.conf", dosbox_conf(run, irq))
        print(key, os.path.getsize(path))
    for key, _game, _title, folders, lines, irq, _note in SHELLS:
        if only and key not in only:
            continue
        path = os.path.join(out, f"{key}.jsdos")
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            def folder(name, when):        # each folder before what is in it: js-dos makes none on its own
                info = zipfile.ZipInfo(f"C/{name}/".replace("//", "/"), when)
                info.external_attr = (0o40755 << 16) | 0x10      # a folder anyone may open (none given = none may)
                z.writestr(info, b"")
            for d in ("", "WINDOWS", "WINDOWS/COMMAND", "GAMES"):
                folder(d, WIN98SE)
            for into, src_folder in folders.items():
                root = os.path.join(src, src_folder)
                files = [f for f in sorted(os.listdir(root)) if os.path.getmtime(os.path.join(root, f)) < SHELL_BEFORE]
                newest = max(os.path.getmtime(os.path.join(root, f)) for f in files)
                folder(into, time.localtime(newest)[:6])
                for f in files:        # what he saved later on his own machines (2008) was not on the school's
                    z.write(os.path.join(root, f), f"C/{into}/{f.upper()}")
            z.writestr(".jsdos/dosbox.conf", dosbox_conf(lines, irq, mount="C"))
        print(key, os.path.getsize(path))


def push(bundles, only=None):
    order = 0
    for key, game, title, _folder, run, irq, note in DOS:
        order += 1
        if only and key not in only:
            continue
        meta = {"gameKey": game, "engine": "DOS", "title": title, "portal": False, "sortOrder": order,
                "config": json.dumps({"run": run, "irq": irq}), "note": note or ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        with open(os.path.join(bundles, f"{key}.jsdos"), "rb") as fh:
            r = requests.post(f"{API}/game-packages/{key}/file", timeout=300,
                              files={"file": (f"{key}.jsdos", fh, "application/zip")})
        r.raise_for_status()
        print(key, "ok", r.json().get("fileSize"))
    for key, game, title, _folders, _lines, irq, note in SHELLS:      # a prompt, not a game: last in the list
        if only and key not in only:
            continue
        meta = {"gameKey": game, "engine": "DOS", "title": title, "portal": False, "sortOrder": 900,
                "config": json.dumps({"shell": True, "irq": irq}), "note": note}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        with open(os.path.join(bundles, f"{key}.jsdos"), "rb") as fh:
            r = requests.post(f"{API}/game-packages/{key}/file", timeout=300,
                              files={"file": (f"{key}.jsdos", fh, "application/zip")})
        r.raise_for_status()
        print(key, "ok", r.json().get("fileSize"))
    for key, game, title, _rel, w, h in FLASH:
        order += 1
        if only and key not in only:
            continue
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
        if only and key not in only:
            continue
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
    for key, game, title, z, exe, res, portal, note in WIN:
        order += 1
        if only and key not in only:
            continue
        top = WIN_FILES[z or key][2]
        config = {"dir": top}
        if z:
            config["zip"] = z
        if exe:
            config["exe"] = exe
        if res:
            config["res"] = res
        meta = {"gameKey": game, "engine": "WIN", "title": title, "portal": portal, "sortOrder": order,
                "config": json.dumps(config), "note": note or ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        if not z:
            with open(os.path.join(bundles, f"{key}.zip"), "rb") as fh:
                r = requests.post(f"{API}/game-packages/{key}/file", timeout=600,
                                  files={"file": (f"{key}.zip", fh, "application/zip")})
            r.raise_for_status()
        print(key, "ok")
    for key, game, title, config in WEB:
        order += 1
        if only and key not in only:
            continue
        meta = {"gameKey": game, "engine": "WEB", "title": title, "portal": True, "sortOrder": order,
                "config": json.dumps(config), "note": ""}
        requests.put(f"{API}/game-packages/{key}", json=meta, timeout=60).raise_for_status()
        print(key, "ok")


if __name__ == "__main__":
    {"build": lambda: build(sys.argv[2], sys.argv[3], sys.argv[4].split(",") if len(sys.argv) > 4 else None), "flash": lambda: build_flash(sys.argv[2], sys.argv[3]),
     "win": lambda: build_win(sys.argv[2]),
     "push": lambda: push(sys.argv[2], sys.argv[3].split(",") if len(sys.argv) > 3 else None)}[sys.argv[1]]()
