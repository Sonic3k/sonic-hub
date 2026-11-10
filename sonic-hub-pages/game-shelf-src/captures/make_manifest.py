"""Chooses the frames, trims the bars around a DOS picture, names the files and writes captures/captures.json with a
caption and an event date for each (from the game's first play in catalog.py, or the years of the machine it is on)."""
import importlib.util, json, os, sys
from PIL import Image
SRC = "/home/claude/sonic-hub/sonic-hub-pages/game-shelf-src"
spec = importlib.util.spec_from_file_location("catalog", SRC + "/catalog.py"); cat = importlib.util.module_from_spec(spec); spec.loader.exec_module(cat)
GAMES = {g["key"]: g for g in cat.GAMES}
pk = {p["key"]: p for p in json.load(open("/home/claude/shots/school/pk.json"))}
pk.setdefault("textris", {"gameKey": "textris", "title": "Textris"})
pk.setdefault("mario-luigi", {"gameKey": "mario-luigi", "title": "Mario & Luigi"})
TAIL = " Chụp lại ngày 11/11/2026, chạy từ thư mục game trên ổ D: của anh."
DOS = {  # package: [(frame file, kind)]
 "dyna": [("cap2/dyna-title", "title"), ("cap2/dyna-d", "play")], "prince": [("cap2/prince-title", "title"), ("cap2/prince-play", "play")],
 "dave2": [("cap2/dave2-t3", "title"), ("cap2/dave2-play", "play")], "lionking": [("cap2/lionking-title", "title"), ("cap2/lionking-play", "play")],
 "mariobro": [("cap2/mariobro-title", "title"), ("cap2/mariobro-play2", "play")], "hexx": [("cap2/hexx-b", "title"), ("cap2/hexx-d", "play")],
 "rrover": [("cap2/rrover-title", "title"), ("cap2/rrover-play", "play")], "fastfood": [("cap2/fastfood-a", "title"), ("cap2/fastfood-e", "play")],
 "riptide": [("cap2/riptide-title", "title"), ("cap2/riptide-play", "play"), ("cap2/riptide-scores", "scores")],
 "shadow": [("cap2/shadow-title", "title"), ("cap2/shadow-play", "play")], "jazz": [("cap2/jazz-menu", "title"), ("cap2/jazz-d", "play")],
 "textris": [("cap2/textris-title", "title")],
 "mario-luigi": [("cap2/mario-luigi-title", "title"), ("cap2/mario-luigi-play", "play")],
}
WIN = "chips jezzball tetravex taipei rodent maxwell gofigure dots fences pipe-dream golf cruel chess-win noughts amnesia codebreaker hangman jacks lifegen pegged rattler sticks tictactics wordzap lines98 pikachu".split()
OTHER = {"tripeaks": "cap2/tripeaks-b", "blackjack": "cap2/blackjack-b", "minesweeper": "cap3/minesweeper_1", "pinball": "cap3/pinball_1",
         "dxball2": "cap2/dxball2-b", "s3k": "cap2/s3k-b", "skifree": "cap4/skifree_2", "fujigolf": "cap4/fujigolf_2", "dao-vang": "cap/dao-vang_2", "bloxorz": "cap/bloxorz_2", "doodle-god": "cap/doodle-god_2", "doodle-devil": "cap2/doodle-devil-b"}
SCORES = {"riptide": "Bảng High scores của In Search of Dr. Riptide, đọc từ file HIGH.SCR của anh (ghi ngày 04/08/2012): Sonic3k đứng đầu với 235.550 điểm."}
FALLBACK = {"pc-old": 2001, "pc-school": 2003, "pc-xp": 2006, "pc-fujitsu": 2006, "pc-hp": 2011}
# on none of his machines (he said so, 11/11/2026): no period to date its pictures by
NO_MACHINE = {"mariobro"}
SPOT = {"dave2": "pc-old", "lionking": "pc-old", "fastfood": "pc-old", "mariobro": "pc-school", "dao-vang": "pc-xp", "bloxorz": "pc-xp", "doodle-god": "pc-xp", "doodle-devil": "pc-xp", "pinball": "pc-fujitsu"}

def event(game, package):
    plays = sorted(GAMES[game].get("plays", []), key=lambda p: p["start"] if len(p["start"]) == 10 else p["start"] + "-99")
    if not plays and package in NO_MACHINE:
        return {"date": None}
    if not plays:
        return {"date": str(FALLBACK[SPOT.get(package, "pc-old")]), "precision": "YEAR", "approx": True}
    p = plays[0]; st = p["start"]
    if len(st) == 10: return {"date": st, "precision": "DAY", "approx": bool(p.get("approx"))}
    if len(st) == 7: return {"date": st, "precision": "MONTH", "approx": bool(p.get("approx"))}
    y = (int(st) + int(str(p.get("end", st))[:4])) // 2
    return {"date": str(y), "precision": "YEAR", "approx": True}

def trim(im):
    """the black bars a DOS picture gets inside its window, when they are the same on both sides"""
    g = im.convert("L").point(lambda v: 255 if v > 10 else 0); box = g.getbbox()
    if not box: return im
    l, t, r, b = box; W, H = im.size
    cl, cr = (l, r) if abs(l - (W - r)) <= 4 and l >= 8 else (0, W)
    ct, cb = (t, b) if abs(t - (H - b)) <= 4 and t >= 8 else (0, H)
    return im.crop((cl, ct, cr, cb))

out, rows = SRC + "/captures", []
def add(src, name, game, caption, ev, dos=False):
    im = Image.open(f"/home/claude/shots/{src}.png").convert("RGB")
    if dos: im = trim(im)
    im.save(f"{out}/{name}.png", optimize=True)
    rows.append({"file": f"captures/{name}.png", "game": game, "caption": caption, "event": ev})

for key, frames in DOS.items():
    game, title = pk[key]["gameKey"], GAMES[pk[key]["gameKey"]]["title"]
    for src, kind in frames:
        cap = SCORES[key] if kind == "scores" else (f"Màn hình mở đầu của {title}." if kind == "title" else f"{title}, lúc vào chơi.")
        ev = {"date": "2012-08-04", "precision": "DAY", "approx": False} if kind == "scores" else event(game, key)
        add(src, f"{key}-{kind}", game, cap + TAIL, ev, dos=True)
for key in WIN + list(OTHER):
    game = pk[key]["gameKey"]; title = pk[key].get("title") or GAMES[game]["title"]
    src = OTHER.get(key, f"cap3/{key}_2")
    add(src, key, game, f"{title} khi vừa mở." + TAIL, event(game, key))
rows.insert(0, {"file": "captures/textris-best-scores.png", "game": "textris", "event": {"date": "2003-11-09", "precision": "DAY", "approx": False},
    "caption": "Bảng Best Scores của Textris, đọc từ file TEXTRIS.SCO trên ổ D: của anh: Chelsea 1.210 điểm ghi 11-09-03 (09/11/2003), "
               "NGOC ANH 1.029 điểm ghi 01-10-03 (10/01/2003); Everton và Fulham cũng là anh. Chụp lại ngày 10/11/2026, chạy từ thư mục English ABC."})
json.dump(rows, open(out + "/captures.json", "w"), indent=1, ensure_ascii=False)
print(len(rows)); 
for r in rows: print(r["file"][9:], r["game"], r["event"].get("date"), r["event"].get("precision"), "~" if r["event"].get("approx") else "")
