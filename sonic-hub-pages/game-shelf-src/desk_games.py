# -*- coding: utf-8 -*-
"""His games inside the old machines (POST /api/desk/sync): where each machine had them, they open there for real.

- The icons that were already on his desktops (REAL) now open something: Lines 98 plays, the others show the game's
  card from the shelf. Only app and target are sent, so what he set (label, place, period, source) stays.
- New Start-menu entries (Programs ▸ Games) are RECONSTRUCTED: the game folders on D:\\Games and their dates say the
  machine had them, not a screenshot of the menu; each note says what that rests on.

  python3 desk_games.py
"""
import os

import requests

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")

# his own icons: key → (app, target)
UPGRADE = {
    "pc-old/desktop/_/006-lines-98": ("game", "lines"),
    "pc-old/desktop/_/007-pikachu": ("gamecard", "pikachu"),
    "pc-xp/desktop/empires2": ("gamecard", "aoe2"),
    "pc-xp/desktop/feeding-frenzy": ("gamecard", "feeding-frenzy"),
    "pc-xp/desktop/luxor": ("gamecard", "luxor"),
    "pc-xp/desktop/chuzzle-deluxe": ("gamecard", "chuzzle"),
    "pc-fujitsu/desktop/2005/006-grandmaster-chess": ("gamecard", "grandmaster-chess"),
    "pc-fujitsu/desktop/2005/008-feeding-frenzy": ("gamecard", "feeding-frenzy"),
}

# device, label, package, glyph, from, to, note
START = [
    ("pc-old", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows 98"),
    ("pc-old", "DYNA Blaster", "dyna", "dos", None, None, "Thư mục dyna trong [DOS Games]; “Dyna (com)” và “DYANNA” trong danh sách trò chơi năm 2004"),
    ("pc-old", "Prince of Persia", "prince", "dos", None, None, "File lưu PRINCE.SAV ngày 22/11/1998"),
    ("pc-old", "Hexxagon", "hexx", "dos", None, None, "File cấu hình CONFIG.HXG ngày 31/03/1998"),
    ("pc-old", "Dangerous Dave", "dave2", "dos", None, None, "“DAVE” số 65 trong danh sách 100 trò, 2004"),
    ("pc-old", "Jazz Jackrabbit", "jazz", "dos", None, None, "“JAZZ” số 23 trong danh sách 100 trò, 2004"),
    ("pc-old", "The Lion King", "lionking", "dos", None, None, "“LIONKING” số 69 trong danh sách 100 trò, 2004"),
    ("pc-old", "Mario Brothers", "mariobro", "dos", None, None, "Thư mục mariobro trong [DOS Games]"),
    ("pc-old", "Fast Food", "fastfood", "dos", None, None, "Thư mục fastfood trong [DOS Games]"),
    ("pc-xp", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows XP"),
    ("pc-xp", "Đào vàng", "dao-vang", "game", "2004-11-16", None, "File game đề ngày 16/11/2004"),
    ("pc-xp", "Chiếc nón kỳ diệu", "chiec-non", "game", "2005-06-02", None, "File game đề ngày 02/06/2005"),
    ("pc-fujitsu", "Rescue Rover", "rrover", "dos", None, None, "Bản lưu SAVEGAME.ROV ngày 04/08/2008"),
    ("pc-fujitsu", "Dangerous Dave", "dave2", "dos", None, None, "File cấu hình CTLPANEL.DD2 ngày 02/08/2008"),
    ("pc-hp", "Minesweeper", "minesweeper", "mine", None, None, "Có sẵn trong Windows"),
    ("pc-hp", "The Lion King", "lionking", "dos", None, None, "File cấu hình LIONKING.CFG ngày 06/11/2008"),
    ("pc-hp", "DYNA Blaster", "dyna", "dos", "2011-01-01", None, "Ảnh chụp màn hình DOSBox ngày 22/01/2011"),
    ("pc-hp", "Bloxorz", "bloxorz", "game", "2010-09-10", None, "File game đề ngày 10/09/2010"),
    ("pc-hp", "Doodle Devil", "doodle-devil", "game", "2010-11-24", None, "File game đề ngày 24/11/2010"),
    ("pc-hp", "Doodle God", "doodle-god", "game", "2011-04-15", None, "File game đề ngày 15/04/2011"),
    ("pc-hp", "Jazz Jackrabbit", "jazz", "dos", "2012-08-04", None, "Chơi lại trên DOSBox: CONFIG.000 ngày 04/08/2012"),
    ("pc-hp", "In Search of Dr. Riptide", "riptide", "dos", "2012-08-04", None, "Chơi lại trên DOSBox: bảng điểm HIGH.SCR ngày 04/08/2012"),
    ("pc-hp", "Shadow Knights", "shadow", "dos", "2012-08-04", None, "Chơi lại trên DOSBox: CTLPANEL.NIN ngày 04/08/2012"),
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
    items = [{"key": k, "app": app, "target": target} for k, (app, target) in UPGRADE.items()]
    for n, (device, label, pkg, glyph, start, end, note) in enumerate(START):
        items.append({"key": f"{device}/start/games/{pkg}", "device": device, "place": "START", "label": label, "glyph": glyph,
                      "app": "game", "target": pkg, "sort": 100 + n, "from": start, "to": end, "note": note,
                      "source": "RECONSTRUCTED"})
    for n, (device, label, emu, start, end, note) in enumerate(EMULATORS):
        items.append({"key": f"{device}/start/games/emu-{emu}", "device": device, "place": "START", "label": label, "glyph": "game",
                      "app": "emulator", "target": emu, "sort": 200 + n, "from": start, "to": end, "note": note,
                      "source": "RECONSTRUCTED"})
    r = requests.post(f"{API}/desk/sync", json={"items": items}, timeout=120)
    r.raise_for_status()
    out = r.json()
    print(out["counts"])
    for w in out.get("warnings", []):
        print("warning:", w)


if __name__ == "__main__":
    main()
