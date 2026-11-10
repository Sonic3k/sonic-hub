"""capture_dos.py out_dir key[,key]  — the DOS games again, each with its own steps, the desktop's notices hidden."""
import json, sys, time, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright
API = "https://angels-islands-api-production.up.railway.app/api"; WEB = "https://sonic-hub-web-production.up.railway.app"
out, keys = sys.argv[1], sys.argv[2].split(",")
get = lambda p: json.load(urllib.request.urlopen(API + p, timeout=60))
E, S, D, X = "Enter", "Space", "ArrowDown", "Escape"
# ("w", second since the page opened) · ("k", key) · ("t", text) · ("s", frame name)
PLAN = {
 "dyna": [("w",24),("s","title"),("k",E),("w",40),("k",E),("w",50),("s","a"),("k",E),("w",60),("s","b"),("w",75),("s","c"),("w",90),("s","d")],
 "prince": [("w",24),("s","title"),("k",E),("w",33),("s","play")],
 "dave2": [("w",24),("k",E),("w",31),("k",E),("w",35),("s","t1"),("w",37),("s","t2"),("w",39),("s","t3"),("w",41),("s","t4"),("k",S),("w",50),("s","play")],
 "lionking": [("w",18),("t","a"),("k",E),("w",24),("k",E),("w",31),("k",E),("w",38),("s","title"),("k",S),("w",46),("k",E),("w",70),("s","play"),("w",76),("s","play2")],
 "mariobro": [("w",24),("s","title"),("k",S),("w",28),("k",S),("w",31),("k","1"),("w",38),("s","play"),("w",46),("s","play2")],
 "hexx": [("w",27),("s","a"),("w",31),("s","b"),("w",36),("s","c"),("w",42),("s","d")],
 "rrover": [("w",18),("k","5"),("w",31),("s","title"),("k",E),("w",38),("s","house"),("k",E),("w",46),("s","room"),("k",E),("w",54),("k",E),("w",60),("s","play")],
 "fastfood": [("w",22),("k",S),("w",30),("s","a"),("w",38),("s","b"),("w",46),("s","c"),("k",S),("w",54),("s","d"),("k",E),("w",62),("s","e"),("k",S),("w",72),("s","f")],
 "riptide": [("w",24),("k",E),("w",27),("s","m0"),("k",D),("w",28),("k",D),("w",29),("k",D),("w",30),("k",D),("w",31),("s","m4"),("k",E),("w",35),("s","scores"),("w",38),("s","scores2")],
 "tripeaks": [("w",48),("k",E),("w",58),("s","a"),("w",64),("s","b")],
 "blackjack": [("w",48),("k",E),("w",58),("s","a"),("w",64),("s","b")],
 "klotski": [("w",48),("k",E),("w",58),("s","a"),("k",E),("w",66),("s","b")],
 "chiec-non": [("w",30),("s","a"),("w",40),("s","b")],
 "doodle-devil": [("w",40),("s","a"),("w",55),("s","b")],
 "textris": [("w",24),("s","title"),("k",S),("w",31),("s","play")],
 "s3k": [("w",50),("s","a"),("k",E),("w",62),("s","b"),("k",E),("w",75),("s","c"),("w",90),("s","d")],
 "dxball2": [("w",50),("s","a"),("k",E),("w",58),("s","b"),("k",S),("w",66),("s","c"),("w",76),("s","d")],
 "shadow": [("w",24),("s","title"),("k",S),("w",31),("k",E),("w",38),("k",E),("w",47),("s","play")],
 "jazz": [("w",24),("k",E),("w",31),("k",E),("w",38),("k",E),("w",46),("k",S),("w",56),("s","menu"),("k",E),("w",60),("s","a"),("k",E),("w",65),("s","b"),("k",E),("w",70),("s","c"),("k",E),("w",84),("s","d"),("w",94),("s","e")],
}
SCREEN = {d["key"]: (d["screenWidth"], d["screenHeight"]) for d in get("/desk/raw")["devices"] if d.get("screenWidth")}
pk = {p["key"]: p for p in get("/game-packages")}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--mute-audio", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for key in keys:
        s = next((x for x in get("/games/" + urllib.parse.quote(pk[key]["gameKey"])).get("spots", []) if x["packageKey"] == key), None)
        W, H = SCREEN.get(s["deviceKey"], (800, 600))
        pg = b.new_page(viewport={"width": W * 2, "height": H * 2}); t0 = time.time()
        try:
            pg.goto(f"{WEB}/pc?at={s['at']}&device={s['deviceKey']}&open=game:{key}", wait_until="load", timeout=60000)
            pg.add_style_tag(content=".dv-notices{display:none!important}")
            el = pg.locator(".dv-game").first; el.wait_for(timeout=45000)
            pg.wait_for_timeout(max(0, int((t0 + 16 - time.time()) * 1000)))
            box = el.bounding_box(); pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2); pg.mouse.move(4, 4)   # the pointer off the game: its menus follow it
            for kind, v in PLAN[key]:
                if kind == "w": pg.wait_for_timeout(max(0, int((t0 + v - time.time()) * 1000)))
                elif kind == "s": el.screenshot(path=f"{out}/{key}-{v}.png")
                elif kind == "t":
                    for ch in v: pg.keyboard.down(ch); pg.wait_for_timeout(90); pg.keyboard.up(ch); pg.wait_for_timeout(150)
                else: pg.keyboard.down(v); pg.wait_for_timeout(110); pg.keyboard.up(v); pg.wait_for_timeout(350)
            print(key, "ok", flush=True)
        except Exception as e: print(key, "FAILED", str(e).split("\n")[0][:160], flush=True)
        pg.close()
    b.close()
