# -*- coding: utf-8 -*-
"""Push the game shelf (catalog.py) to the hub: POST /api/games/sync.

  python3 push_to_hub.py --dry   prints the payload summary and checks every reference
  python3 push_to_hub.py         sends it

Media, memories and his journal notes are referred to in catalog.py by the first 8 characters of their id; ids.json
maps them to full ids (media by prefix, memories by "e:" + prefix, notes by "n:" + prefix). uploads.json lists the screenshots upload_shots.py put into the hub and
the game each belongs to, so a sync never drops them. Sync replaces each game's plays, links, memories and own pictures
(SCREENSHOT, PHOTO, SCAN); maps, art and icons uploaded through the assets endpoint stay as they are.
"""
import json
import os
import sys
import urllib.request

import catalog

API = os.environ.get("HUB_API", "https://angels-islands-api-production.up.railway.app/api")
HERE = os.path.dirname(os.path.abspath(__file__))


def load(name, default):
    p = os.path.join(HERE, name)
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else default


def build():
    ids = load("ids.json", {})
    uploads = load("uploads.json", [])
    icons = load("icons.json", {})
    missing = []

    def ref(prefix):
        full = ids.get(prefix)
        if not full:
            missing.append(prefix)
        return full

    extra = {}
    for u in uploads:
        extra.setdefault(u["game"], []).append({"mediaId": u["mediaId"], "role": u.get("role", "SCREENSHOT"),
                                                "label": u.get("label")})
    games = []
    for g in catalog.GAMES:
        media = [{"mediaId": ref(p["m"]), "role": p["role"], "label": p.get("label")} for p in g.get("media", [])]
        media += extra.get(g["key"], [])
        games.append({
            "key": g["key"], "title": g["title"], "seriesKey": g.get("series", ""), "seriesOrder": g.get("seriesOrder", 0),
            "kind": g.get("kind", "OFFICIAL"), "basedOnKey": g.get("basedOn", ""), "platform": g.get("platform", ""),
            "releaseYear": g.get("releaseYear", 0), "developer": g.get("developer", ""), "genre": g.get("genre", ""),
            "versions": g.get("versions", ""), "summary": g.get("summary", ""), "note": g.get("note", ""),
            "favorite": bool(g.get("favorite")), "handName": g.get("handName", ""), "handOrder": g.get("handOrder", 0),
            "plays": g.get("plays", []), "links": [{k: v for k, v in l.items() if v is not None} for l in g.get("links", [])],
            "media": media, "memoryIds": [ref(m) for m in g.get("memories", [])], "noteIds": [ref(n) for n in g.get("notes", [])],
        })
        if g["key"] in icons:
            games[-1]["iconMediaId"] = icons[g["key"]]
        if g.get("cover"):
            games[-1]["coverMediaId"] = ref(g["cover"])
    payload = {"source": "game-shelf-src", "series": catalog.SERIES, "games": games, "packages": []}
    return payload, missing


def main():
    payload, missing = build()
    if missing:
        sys.exit("unresolved ids: " + ", ".join(sorted(set(missing))))
    if "--dry" in sys.argv:
        print(len(payload["series"]), "series,", len(payload["games"]), "games,",
              sum(len(g["plays"]) for g in payload["games"]), "plays,",
              sum(len(g["media"]) for g in payload["games"]), "pictures,",
              sum(len(g["memoryIds"]) for g in payload["games"]), "memory links,",
              sum(len(g["noteIds"]) for g in payload["games"]), "notes")
        return
    req = urllib.request.Request(API + "/games/sync", data=json.dumps(payload).encode("utf-8"), method="POST",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        out = json.load(r)
    print(json.dumps(out["counts"], ensure_ascii=False))
    for w in out.get("warnings", []):
        print("warning:", w)


if __name__ == "__main__":
    main()
