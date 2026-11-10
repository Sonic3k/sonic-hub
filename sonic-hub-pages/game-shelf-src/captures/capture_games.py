"""capture_games.py out_dir worker n_workers [only,keys]
Opens every playable package inside the machine it has a place on (production) and saves frames of the game's own
screen (.dv-game) while it starts: DOS games with a few generic key presses, Windows and Flash games as they open."""
import json, sys, time, urllib.request, urllib.parse
from playwright.sync_api import sync_playwright

API = "https://angels-islands-api-production.up.railway.app/api"
WEB = "https://sonic-hub-web-production.up.railway.app"
out, worker, workers = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
only = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
get = lambda p: json.load(urllib.request.urlopen(API + p, timeout=60))
SCREEN = {d["key"]: (d["screenWidth"], d["screenHeight"]) for d in get("/desk/raw")["devices"] if d.get("screenWidth")}
pk = [p for p in get("/game-packages") if p["engine"] in ("DOS", "WIN", "FLASH", "WEB") and p["key"] not in ("wingames", "msdos-school")]
if only: pk = [p for p in pk if p["key"] in only]
pk = [p for i, p in enumerate(pk) if i % workers == worker]
spots = {}
for g in {p["gameKey"] for p in pk}:
    for s in get("/games/" + urllib.parse.quote(g)).get("spots", []):
        spots.setdefault(s["packageKey"], s)

PRE = {"lionking": [("type", "a"), ("key", "Enter")], "rrover": [("key", "5")]}
def frames(engine):
    if engine == "DOS": return [(24, None), (31, "Enter"), (38, "Enter"), (46, "Space"), (56, "Enter"), (70, None)]
    if engine == "WIN": return [(45, None), (65, None)]
    if engine == "FLASH": return [(16, None), (28, "click")]
    return [(12, None)]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--mute-audio"])
    for q in pk:
        key, s = q["key"], spots.get(q["key"])
        if not s: print(key, "no spot", flush=True); continue
        W, H = SCREEN.get(s["deviceKey"], (800, 600))
        pg = b.new_page(viewport={"width": W * 2, "height": H * 2})
        url = f"{WEB}/pc?at={s['at']}&device={s['deviceKey']}&open=game:{key}"
        t0 = time.time()
        try:
            pg.goto(url, wait_until="load", timeout=60000)
            pg.add_style_tag(content=".dv-notices{display:none!important}")
            el = pg.locator(".dv-game").first
            el.wait_for(timeout=45000)
            wait = lambda sec: pg.wait_for_timeout(max(0, int((t0 + sec - time.time()) * 1000)))
            if q["engine"] == "DOS":
                wait(17); box = el.bounding_box(); pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                for kind, v in PRE.get(key, []):
                    pg.wait_for_timeout(600)
                    if kind == "type":
                        for ch in v: pg.keyboard.down(ch); pg.wait_for_timeout(90); pg.keyboard.up(ch)
                    else: pg.keyboard.down(v); pg.wait_for_timeout(110); pg.keyboard.up(v)
            for n, (sec, act) in enumerate(frames(q["engine"]), 1):
                if act == "click": box = el.bounding_box(); pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2); pg.wait_for_timeout(300)
                elif act: pg.keyboard.down(act); pg.wait_for_timeout(110); pg.keyboard.up(act)
                wait(sec)
                el.screenshot(path=f"{out}/{key}_{n}.png")
            print(key, "ok", s["deviceKey"], s["at"], flush=True)
        except Exception as e:
            print(key, "FAILED", str(e).split("\n")[0][:160], flush=True)
        pg.close()
    b.close()
print("worker", worker, "done", flush=True)
