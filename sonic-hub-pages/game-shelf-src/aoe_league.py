# -*- coding: utf-8 -*-
"""The results kept by AOE League (the office Age of Empires league's own app) into the hub: PUT /api/games/aoe-league/matches.

The data is his: data/aoeleague-data.xml inside the app's folder, never kept in this repo. Each <matches> element is one
"kèo" — two teams, the map, how many games each side took — and becomes one match of the game "aoe-league", matched by
the record's own id, so a re-run changes nothing.

Times. The app wrote three kinds of stamp, all turned into Hà Nội wall-clock time here:
  2016-12-23T17:30:00.000Z        typed into the file by hand before the app could save a result: already local time
  2017-02-02T05:44:41.693Z        saved by the app until 07/02/2017: UTC (12:44 in Hà Nội)
  2017-02-08T12:25:58.010+07:00   saved by the app from 08/02/2017 on: local time

  python3 -I aoe_league.py <aoeleague-data.xml> --self 8 --dry     what would be sent
  python3 -I aoe_league.py <aoeleague-data.xml> --self 8           sends it
"""
import datetime
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
GAME = "aoe-league"


def local(raw):
    """the stamp as the clock in Hà Nội showed it"""
    t = datetime.datetime.fromisoformat(raw[:19])
    if raw.endswith("Z") and raw[17:23] != "00.000":
        t += datetime.timedelta(hours=7)
    return t.isoformat(timespec="seconds")


def side(team, me):
    return [{"name": p.get("name"), "self": int(p.get("id")) == me or None, "rating": round(float(p.get("playerPoint")), 2)}
            for p in team.findall("players")]


def build(path, me):
    out = []
    for m in ET.parse(path).getroot().find("history").findall("matches"):
        a, b = (int(x) for x in m.get("result").split("-"))
        t1, t2 = m.find("team1"), m.find("team2")
        # the weaker side of an uneven split was allowed that many Shang
        shang = [f"Đội {i} được {n} Shang" for i, t in ((1, t1), (2, t2)) for n in [int(t.get("numOfShang") or 0)] if n]
        out.append({"key": m.get("id"), "playedAt": local(m.get("date")), "map": (m.findtext("map") or "").strip() or None,
                    "score1": a, "score2": b, "note": "; ".join(shang) or None, "side1": side(t1, me), "side2": side(t2, me)})
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    me = int(sys.argv[sys.argv.index("--self") + 1]) if "--self" in sys.argv else -1
    if me != -1:
        args.remove(str(me))
    matches = build(args[0], me)
    mine = [m for m in matches if any(p["self"] for p in m["side1"] + m["side2"])]
    print(len(matches), "matches,", matches[0]["playedAt"], "→", matches[-1]["playedAt"], "·", len(mine), "with him")
    if "--dry" in sys.argv:
        print(json.dumps(matches[-1], ensure_ascii=False))
        return
    req = urllib.request.Request(f"{API}/games/{GAME}/matches", data=json.dumps({"matches": matches}).encode("utf-8"),
                                 method="PUT", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        print(json.load(r))


if __name__ == "__main__":
    main()
