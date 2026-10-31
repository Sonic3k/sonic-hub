# Tag family members on photos only where it is certain: the owner's own captions (as they were before any caption
# was written by us, from the first tree snapshot) and albums that are about one person.
import json, re, sys, urllib.request, collections
API = "https://angels-islands-api-production.up.railway.app"
APPLY = "--apply" in sys.argv
def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        t = r.read(); return json.loads(t) if t else None
SELF, EM, BO, ME, BA = ("00a10ffc-40b4-49c1-b9d3-4d658e234180", "99b66298-adcb-43f6-a2e4-5a1329591438",
                        "674450a0-af25-45ec-b928-df758b3fea54", "a4e727e8-1c7d-48cc-bdff-99fb824ca3e7",
                        "50a6c891-7286-44c4-98e0-f1281e8dec61")
NAME = {SELF: "Ngọc Anh", EM: "Diệu Anh", BO: "Bố", ME: "Mẹ", BA: "Bà ngoại"}
tree = json.load(open("transcripts/media-tree-1990-2007.json"))
items = []          # (album path, media id, owner's caption)
def walk(n, path):
    p = path + "/" + n["name"] if path is not None else ""
    for m in n["mediaItems"]: items.append((p, m["id"], (m.get("caption") or "").strip()))
    for c in n["children"]: walk(c, p)
walk(tree, None)
def year(s):
    y = re.findall(r"(19\d\d|20\d\d)", s); return int(y[-1]) if y else None
plan = collections.defaultdict(set); why = collections.defaultdict(list)
def add(pid, mid, reason): plan[pid].add(mid); why[pid].append(reason)
for path, mid, cap in items:
    c = cap.lower()
    if path.endswith("/Anh cua Jun"): add(EM, mid, "album Ảnh của Jun")
    if not cap: continue
    if "bà ngoại" in c: add(BA, mid, cap)
    if "diệu anh" in c or "em gái" in c: add(EM, mid, cap)
    if re.search(r"\b(2|hai) anh em\b", c): add(EM, mid, cap); add(SELF, mid, cap)
    if "bố mẹ" in c and not c.startswith("bạn bè"): add(BO, mid, cap); add(ME, mid, cap)
    elif re.search(r"(^|[^\w])mẹ([^\w]|$)", c) and "bố mẹ" not in c: add(ME, mid, cap)
    # "bố" alone is not used: in the old family photos it is the grandfather ("Dì Ánh ngóng bố về", 1978)
    # "cả nhà" is his own family only from 1990 on; before that it is his mother's family
    if c.startswith("cả nhà") and (year(cap) or 0) >= 1990:
        add(BO, mid, cap); add(ME, mid, cap); add(SELF, mid, cap)
        if year(cap) >= 1996: add(EM, mid, cap)
for pid, mids in plan.items():
    print(NAME[pid], len(mids), "|", " / ".join(sorted(set(why[pid]))[:12]))
if APPLY:
    for pid, mids in plan.items():
        print(NAME[pid], call("POST", "/api/media-files/batch/persons", {"ids": sorted(mids), "personId": pid}))
