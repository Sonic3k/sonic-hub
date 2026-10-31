# Merge the three caption files and write them to the hub — only onto photos whose caption is still empty (fresh read).
import json, sys, urllib.request
API = "https://angels-islands-api-production.up.railway.app"
APPLY = "--apply" in sys.argv
def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        t = r.read(); return json.loads(t) if t else None
caps = {}
for f in ("transcripts/photo-captions-1990-2007.json",):
    caps.update({k: v.strip() for k, v in json.load(open(f)).items() if v and v.strip()})
work = json.load(open("transcripts/caption-albums.json"))
current = {}
for path, a in work.items():
    for m in call("GET", f"/api/collections/{a['albumId']}/media"): current[m["id"]] = m.get("caption")
todo = {i: c for i, c in caps.items() if i in current and not (current[i] or "").strip()}
print(len(caps), "captions,", len(todo), "onto empty photos,", len([i for i in caps if i not in current]), "not found,",
      len([i for i in caps if i in current and (current[i] or "").strip()]), "already captioned (kept)")
if APPLY:
    for i, c in todo.items(): call("PATCH", f"/api/media-files/{i}", {"caption": c})
    print("written", len(todo))
