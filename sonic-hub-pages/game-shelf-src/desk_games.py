# -*- coding: utf-8 -*-
"""His games inside the old machines (POST /api/desk/sync): where each machine had them, they open there for real.

- The icons that were already on his desktops (REAL) now open something: Lines 98, Pikachu, Sticks play; the others
  show the game's card from the shelf. Only app, target and the icon are sent, so what he set (label, place, period,
  source) stays.
- New Start-menu entries (Programs ▸ Games, Programs ▸ Win Games) are RECONSTRUCTED: the game folders on D:\\Games and
  their dates, or what he said, put them there, not a screenshot of the menu; each note says what that rests on.
  Entries moved to other machines are deleted where they were (GONE).

  python3 desk_games.py
"""
import os

import requests

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")

# Where his games are, by machine (his rules, 09/11/2026): DOS games only on PC Win 98; the games of [Win Games] on
# PC Win 98 and PC Win XP; Sonic 3 & Knuckles from 2001 on PC Win 98 until PC Win XP was retired; every Flash game and
# Pikachu (Kawai 2003) on the XP machines; Lines 98 and DYNA only on PC Win 98; PopCap and the heavier games only as
# the icons that were on his desktops.

# his own icons: key → (app, target, glyph); glyph None keeps the one he set ("exe:<key>" = the game's own icon)
UPGRADE = {
    "pc-old/desktop/_/006-lines-98": ("game", "lines98", "exe:lines98"),
    "pc-old/desktop/_/007-pikachu": ("gamecard", "pikachu", None),
    "pc-xp/desktop/picachu2004": ("game", "pikachu", "exe:pikachu"),
    "pc-xp/desktop/sticks": ("game", "sticks", "exe:sticks"),
    "pc-xp/desktop/empires2": ("gamecard", "aoe2", None),
    "pc-xp/desktop/feeding-frenzy": ("gamecard", "feeding-frenzy", None),
    "pc-xp/desktop/luxor": ("gamecard", "luxor", None),
    "pc-xp/desktop/chuzzle-deluxe": ("gamecard", "chuzzle", None),
    "pc-fujitsu/desktop/2005/006-grandmaster-chess": ("gamecard", "grandmaster-chess", None),
    "pc-fujitsu/desktop/2005/007-shortcut-to-chiec-non-ky-dieu": ("game", "chiec-non", None),
    "pc-fujitsu/desktop/2005/008-feeding-frenzy": ("gamecard", "feeding-frenzy", None),
    "pc-fujitsu/desktop/2005/011-shortcut-to-picachu": ("game", "pikachu", "exe:pikachu"),
}

WIN98, XP = "Theo anh: game DOS chỉ chơi trên PC Win 98", "Theo anh: game Flash ở các máy Windows XP"
# folder of Programs, device, label, package, glyph, from, to, note  (key: <device>/start/<folder>/<package>)
START = [
    ("games", "pc-old", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows 98"),
    ("games", "pc-old", "DYNA Blaster", "dyna", "dos", None, None, "Thư mục dyna trong [DOS Games]; “Dyna (com)” và “DYANNA” trong danh sách trò chơi năm 2004"),
    ("games", "pc-old", "Prince of Persia", "prince", "dos", None, None, "File lưu PRINCE.SAV ngày 22/11/1998"),
    ("games", "pc-old", "Hexxagon", "hexx", "dos", None, None, "File cấu hình CONFIG.HXG ngày 31/03/1998"),
    ("games", "pc-old", "Dangerous Dave", "dave2", "dos", None, None, "“DAVE” số 65 trong danh sách 100 trò, 2004"),
    ("games", "pc-old", "Jazz Jackrabbit", "jazz", "dos", None, None, "“JAZZ” số 23 trong danh sách 100 trò, 2004"),
    ("games", "pc-old", "The Lion King", "lionking", "dos", None, None, "“LIONKING” số 69 trong danh sách 100 trò, 2004"),
    ("games", "pc-old", "Mario Brothers", "mariobro", "dos", None, None, "Thư mục mariobro trong [DOS Games]"),
    ("games", "pc-old", "Fast Food", "fastfood", "dos", None, None, "Thư mục fastfood trong [DOS Games]"),
    ("games", "pc-old", "Rescue Rover", "rrover", "dos", None, None, WIN98),
    ("games", "pc-old", "In Search of Dr. Riptide", "riptide", "dos", None, None, WIN98),
    ("games", "pc-old", "Shadow Knights", "shadow", "dos", None, None, WIN98),
    ("games", "pc-old", "Sonic & Knuckles Collection", "s3k", "exe:s3k", "2001-01-01", None, "Theo anh: có từ năm 2001"),
    ("games", "pc-xp", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows XP"),
    ("games", "pc-xp", "Sonic & Knuckles Collection", "s3k", "exe:s3k", None, None, "Theo anh: có tới khi thôi dùng PC Win XP"),
    ("games", "pc-xp", "Đào vàng", "dao-vang", "game", "2004-11-16", None, "File game đề ngày 16/11/2004"),
    ("games", "pc-xp", "Chiếc nón kỳ diệu", "chiec-non", "game", "2005-06-02", None, "File game đề ngày 02/06/2005"),
    ("games", "pc-xp", "Bloxorz", "bloxorz", "game", None, None, XP),
    ("games", "pc-xp", "Doodle Devil", "doodle-devil", "game", None, None, XP),
    ("games", "pc-xp", "Doodle God", "doodle-god", "game", None, None, XP),
    ("games", "pc-hp", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows"),
    ("games", "pc-hp", "DX-Ball 2", "dxball2", "exe:dxball2", None, None, "Thư mục DXBall2 trong [Mini Games]"),
]
# the games of D:\Games\[Win Games] (Windows 3.1), in a Win Games folder of Programs on both desktops
WIN_GAMES = [
    ("Chip's Challenge", "chips"), ("JezzBall", "jezzball"), ("Tetravex", "tetravex"), ("TriPeaks", "tripeaks"),
    ("Taipei", "taipei"), ("Klotski", "klotski"), ("Rodent's Revenge", "rodent"), ("Maxwell's Maniac", "maxwell"),
    ("Go Figure!", "gofigure"), ("Dots", "dots"), ("Fences", "fences"), ("Pipe Dream", "pipe-dream"), ("SkiFree", "skifree"),
    ("Golf", "golf"), ("Cruel", "cruel"), ("Chess", "chess-win"), ("Noughts and Crosses", "noughts"), ("Amnesia", "amnesia"),
    ("BlackJack", "blackjack"), ("CodeBreaker", "codebreaker"), ("FujiGolf", "fujigolf"), ("Hangman", "hangman"),
    ("Jacks", "jacks"), ("LifeGenesis", "lifegen"), ("Pegged", "pegged"), ("Rattler Race", "rattler"), ("Sticks", "sticks"),
    ("TicTactics", "tictactics"), ("WordZap", "wordzap"),
]
for dev in ("pc-old", "pc-xp"):
    for label, pkg in WIN_GAMES:
        START.append(("win-games", dev, label, pkg, f"exe:{pkg}", None, None, "Thư mục [Win Games] trên ổ D:"))

# entries that were put elsewhere before and are not there any more
GONE = [
    "pc-fujitsu/start/games/dave2", "pc-fujitsu/start/games/rrover",
    "pc-hp/start/games/lionking", "pc-hp/start/games/dyna", "pc-hp/start/games/jazz", "pc-hp/start/games/riptide",
    "pc-hp/start/games/shadow", "pc-hp/start/games/bloxorz", "pc-hp/start/games/doodle-devil", "pc-hp/start/games/doodle-god",
]


# device, label, emulator, from, to, note
EMULATORS = [
    ("pc-fujitsu", "VisualBoyAdvance", "vba", "2007-01-01", None, "VisualBoyAdvance 1.7: bản lưu nhanh Super Mario Advance 3 từ 02/2007, Pokémon Emerald từ 05/2007"),
    ("pc-fujitsu", "No$GBA", "nogba", "2007-12-01", None, "Các file save Nintendo DS từ 22/12/2007 đến 26/01/2008"),
    ("pc-hp", "VisualBoyAdvance", "vba", None, None, "Bản lưu nhanh Pokémon FireRed từ 15/10/2008, file save cuối 22/05/2010"),
    ("pc-hp", "Snes9x", "snes9x", "2010-11-21", None, "Tải Snes9x 1.51 ngày 21/11/2010"),
    ("pc-hp", "No$GBA", "nogba", "2010-12-01", None, "File save New Super Mario Bros. ngày 05/01/2011"),
    ("pc-hp", "VirtuaNES", "virtuanes", "2012-09-03", None, "Cài VirtuaNES cùng 758 ROM NES ngày 03/09/2012"),
    ("pc-asus", "VirtuaNES", "virtuanes", None, None, "Bản lưu trạng thái Mario Bros. và Rainbow Islands ngày 16/02/2016"),
]


def main():
    items = [{"key": k, "app": app, "target": target, **({"glyph": glyph} if glyph else {})} for k, (app, target, glyph) in UPGRADE.items()]
    for n, (folder, device, label, pkg, glyph, start, end, note) in enumerate(START):
        items.append({"key": f"{device}/start/{folder}/{pkg}", "device": device, "place": "START", "label": label, "glyph": glyph,
                      "app": "game", "target": pkg, "sort": 100 + n, "from": start, "to": end, "note": note,
                      "source": "RECONSTRUCTED"})
    for n, (device, label, emu, start, end, note) in enumerate(EMULATORS):
        items.append({"key": f"{device}/start/games/emu-{emu}", "device": device, "place": "START", "label": label, "glyph": "game",
                      "app": "emulator", "target": emu, "sort": 200 + n, "from": start, "to": end, "note": note,
                      "source": "RECONSTRUCTED"})
    r = requests.post(f"{API}/desk/sync", json={"items": items, "delete": {"items": GONE}}, timeout=120)
    r.raise_for_status()
    out = r.json()
    print(out["counts"])
    for w in out.get("warnings", []):
        print("warning:", w)


if __name__ == "__main__":
    main()
