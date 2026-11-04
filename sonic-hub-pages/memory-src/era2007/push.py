# Write the first part of the 2007–2017 memories (Boom Online, onthi.com and the people met there) into Angels Islands.
# The data sits in data/ next to this script and is never committed: it quotes private chats, and this repo is public.
# The hub is where the memories live; data/ is only the working copy for a push.
#   data/boom.json, data/onthi.json — the curated memories of one import source each: life chapters, episodes (with photos,
#     albums, people, tags and the forum posts / chat messages / notes they are told in), facts and traits.
#     PUT …/memory/sources/<source> replaces only what that source wrote; anything typed by hand elsewhere is untouched.
#   data/captions.json — short captions for onthi photos that have none yet (an existing caption is never overwritten).
#   data/pushed_<source>.json — what the hub held right after the last push. A re-run compares the hub with it and stops
#     when a memory was checked or edited in the admin since then (bring the change into the json first, or use --force).
# Usage: python3 push.py [boom] [onthi] [captions]            dry run: what would change
#        python3 push.py [boom] [onthi] [captions] --apply    write
import json, os, sys, urllib.request, urllib.error, datetime, collections
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
API = "https://angels-islands-api-production.up.railway.app"
SELF = "00a10ffc-40b4-49c1-b9d3-4d658e234180"
APPLY, FORCE = "--apply" in sys.argv, "--force" in sys.argv
WHAT = [a for a in sys.argv[1:] if not a.startswith("--")] or ["boom", "onthi", "captions"]

def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                t = r.read()
                return json.loads(t) if t else None
        except urllib.error.HTTPError: raise
        except Exception:
            if attempt == 2: raise

def hub_state(source):
    """what the hub holds for one source, reduced to what a hand edit would change"""
    eps = call("GET", f"/api/persons/{SELF}/memory/episodes?source={source}")
    return dict(
        episodes={e.get("externalKey") or e["id"]: [e.get("title"), e.get("summary"), e.get("status"), e.get("kind"), e.get("place"),
                                                     e.get("importance"), [m["id"] for m in e.get("media") or []],
                                                     sorted(p["id"] for p in e.get("persons") or []), len(e.get("sourceViews") or [])]
                  for e in eps},
        chapters=sorted([c.get("title"), c.get("summary"), c.get("status")] for c in call("GET", f"/api/persons/{SELF}/memory/chapters") if c.get("source") == source),
        facts=sorted([f.get("key"), f.get("value"), f.get("status")] for f in call("GET", f"/api/persons/{SELF}/memory/facts") if f.get("source") == source),
        traits=sorted([t.get("trait"), t.get("description"), t.get("status")] for t in call("GET", f"/api/persons/{SELF}/memory/traits") if t.get("source") == source))

API_FIELDS = {"episodes": ("source", "externalKey", "kind", "title", "summary", "status", "emotion", "importance", "occurredAt", "precision",
                           "approx", "endAt", "place", "latitude", "longitude", "mediaIds", "collectionIds", "tagIds", "personIds", "sources"),
              "chapters": ("source", "status", "period", "title", "summary", "sentiment", "sortOrder"),
              "facts": ("source", "status", "category", "key", "value", "period", "confidence"),
              "traits": ("source", "status", "trait", "description", "evidence", "period")}

def push(source):
    data = json.load(open(os.path.join(D, source + ".json")))
    body = {k: [{f: x.get(f) for f in fields if x.get(f) is not None} for x in data.get(k, [])] for k, fields in API_FIELDS.items()}
    eps = body["episodes"]
    print(f"[{source}] {len(body['chapters'])} chapters, {len(eps)} episodes, {len(body['facts'])} facts, {len(body['traits'])} traits")
    print("   episode links:", {k: sum(1 for e in eps if e.get(k)) for k in ("mediaIds", "collectionIds", "personIds", "tagIds", "sources", "place")},
          "· sources:", dict(collections.Counter(s["kind"] for e in eps for s in e.get("sources", []))))
    snap = os.path.join(D, f"pushed_{source}.json")
    now = hub_state(source)
    if os.path.exists(snap):
        before = json.load(open(snap))["state"]
        changed = [k for k in set(before["episodes"]) | set(now["episodes"]) if before["episodes"].get(k) != now["episodes"].get(k)]
        changed += [k for k in ("chapters", "facts", "traits") if before[k] != now[k]]
    else:
        changed = list(now["episodes"])[:5] + [k for k in ("chapters", "facts", "traits") if now[k]]
    if changed and not FORCE:
        print(f"   STOP: the hub's '{source}' memories differ from the last push (edited in the admin?):", changed[:12])
        print("   Bring those changes into", source + ".json", "first, or run with --force to replace them.")
        return False
    if not APPLY:
        e = next((e for e in eps if e.get("sources")), eps[0] if eps else None)
        if e: print("   e.g.", json.dumps({k: v for k, v in e.items() if k not in ("mediaIds", "summary")}, ensure_ascii=False)[:700])
        return True
    print("  ", call("PUT", f"/api/persons/{SELF}/memory/sources/{source}", body))
    json.dump(dict(at=datetime.datetime.now().isoformat(timespec="seconds"), state=hub_state(source)),
              open(snap, "w"), ensure_ascii=False, indent=0)
    # the photos picked for a memory carry its tags
    batches = collections.defaultdict(set)
    for e in eps:
        for t in e.get("tagIds", []): batches[t].update(e.get("mediaIds", []))
    for t, ids in batches.items():
        if ids: call("POST", "/api/media-files/batch/tags", {"ids": sorted(ids), "tagId": t})
    print("   photo tags:", {t[:8]: len(ids) for t, ids in batches.items()})
    return True

def captions():
    caps = json.load(open(os.path.join(D, "captions.json")))           # media id -> {"album": collection id, "caption": text}
    current = {}
    for album in sorted({c["album"] for c in caps.values()}):
        for m in call("GET", f"/api/collections/{album}/media"): current[m["id"]] = m.get("caption")
    todo = {i: c["caption"] for i, c in caps.items() if i in current and not (current[i] or "").strip()}
    print(f"[captions] {len(todo)} photos without a caption get one ({len(caps) - len(todo)} skipped: captioned already or moved)")
    if APPLY:
        for i, t in todo.items(): call("PATCH", f"/api/media-files/{i}", {"caption": t})
        print("   written:", len(todo))

ok = True
for w in WHAT:
    if w in ("boom", "onthi"): ok = push(w) and ok
    elif w == "captions": captions()
sys.exit(0 if ok else 1)
