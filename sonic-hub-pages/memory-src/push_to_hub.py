# Write the 1990–2007 knowledge straight into Angels Islands (the hub), using the API that already exists:
#   1. Memory of the self person, under the import source "era1990" (PUT …/memory/sources/era1990 replaces only
#      what that source wrote; anything typed by hand is untouched): life chapters, episodes (moments, milestones,
#      trips…), facts.
#   2. Captions on photos that have none yet: the text read from each document scan, and a short title on the
#      photos picked for a memory. Existing captions are never overwritten.
#   3. Existing tags (exact name match only) on the photos picked for a memory.
# Usage: python3 push_to_hub.py            (dry run: prints what would change)
#        python3 push_to_hub.py --apply
import json, os, sys, urllib.request, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
D = os.path.dirname(os.path.abspath(__file__))
API = "https://angels-islands-api-production.up.railway.app"
SELF = "00a10ffc-40b4-49c1-b9d3-4d658e234180"
SOURCE = "era1990"
APPLY = "--apply" in sys.argv

def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        t = r.read()
        return json.loads(t) if t else None

data = json.load(open(os.path.join(D, "..", "assets", "memory-1990-2008.json")))
mems = data["memories"]

# ── 1. memory ────────────────────────────────────────────────────────────────
SORT = {"roots": 1949010, "early": 1990010, "primary": 1996090, "secondary": 2001090, "highschool": 2005090}
chapters = [dict(source=SOURCE, period=c["period"], title=c["title"], summary=c["summary"], sentiment="warm", sortOrder=SORT[c["key"]])
            for c in data["chapters"]]
EMO = {"Vui": "vui", "Bồi hồi": "bồi hồi", "Nghịch ngợm": "nghịch ngợm", "Ấm áp": "ấm áp"}
IMP = {"MILESTONE": 7, "CREATION": 6, "TRIP": 5, "MOMENT": 5, "PLACE": 4, "KEEPSAKE": 4, "DOCUMENT": 4}   # 1–10, as on every episode
def when(m):
    d = m.get("date")
    if not d: return None
    d = d[:10]
    if len(d) == 4: d += "-01-01"
    elif len(d) == 7: d += "-01"
    return d + "T00:00:00"
def episode_text(m):
    """the summary under the title: what happened, and for a trip each leg (the title, dates and place have their own fields)"""
    s = m.get("summary") or ""
    if m.get("stops"):
        legs = []
        for st in m["stops"]:
            bits = [st["name"]] + [b for b in (st.get("transport") and "đi " + st["transport"], st.get("lodging") and "ở " + st["lodging"], st.get("note")) if b]
            legs.append(" – ".join(bits[:1]) + (" (" + ", ".join(bits[1:]) + ")" if len(bits) > 1 else ""))
        s += (" " if s else "") + "Lộ trình: " + "; ".join(legs) + "."
    return s or None
def end_at(m):
    e = m.get("end")
    if not e: return None
    e = e[:10]
    if len(e) == 4: e += "-12-31"          # "2008" as an end = to the end of 2008
    elif len(e) == 7:
        y, mo = int(e[:4]), int(e[5:7])
        e += "-%02d" % [31, 29 if y % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1]
    return e + "T00:00:00"
def place_of(m):
    if m.get("place"): return m["place"]["name"], m["place"].get("lat"), m["place"].get("lng")
    stops = [st for st in m.get("stops") or [] if not st["name"].startswith("Hà Nội")]
    if not stops: return None, None, None
    first = next((st for st in stops if st.get("lat") is not None), {})
    return " – ".join(dict.fromkeys(st["name"].split(",")[0] for st in stops)), first.get("lat"), first.get("lng")

TAG_ALIAS = {"Gia đình": "Gia đình", "Tết": "Tết", "Sinh nhật": "Sinh nhật", "Đám cưới": "Đám cưới", "Cờ vua": "Cờ vua",
             "Xe buýt": "Xe buýt Hà Nội", "Du lịch": "Du lịch gia đình", "Kỷ vật": "Kỷ vật", "Đồ chơi": "Đồ chơi", "Vẽ": "Vẽ tranh",
             "Làm game": "Game tự chế", "Lớp C2": "C2 PĐP", "Lớp 9G": "THCS Thống Nhất", "Vạn Bảo": "Hàng xóm Vạn Bảo", "Bóng đá": "Bóng đá"}

# people, only where the memory says who: Mẹ is the person the hub calls "Mẹ" (nickname), Bố and Bà ngoại by name
_all = call("GET", "/api/persons?size=1000"); _all = _all.get("content", _all) if isinstance(_all, dict) else _all
BY_NICK = {(p.get("nickname") or "").strip().lower(): p["id"] for p in _all}
BY_NAME = {p["name"]: p["id"] for p in _all}
BO, ME, BA_NGOAI, EM_GAI = BY_NAME.get("Bố"), BY_NICK.get("mẹ"), BY_NAME.get("Bà ngoại"), BY_NAME.get("Vũ Diệu Anh")
PEOPLE_TAG = {"Ông bà ngoại": [BA_NGOAI], "Bố mẹ": [BO, ME], "Em gái": [EM_GAI]}
def persons_of(m):
    out = []
    for x in m.get("tags", {}).get("PEOPLE", []): out += PEOPLE_TAG.get(x, [])
    if m["kind"] == "TRIP" and m.get("who") == "family": out += [BO, ME]   # the trip notebook: "đi cùng bố mẹ"
    return [i for i in dict.fromkeys(out) if i]

TAG_IDS = {t["name"]: t["id"] for t in call("GET", "/api/tags")}
def tag_ids_of(m):
    names = [TAG_ALIAS.get(x) for v in m.get("tags", {}).values() for x in v]
    return [TAG_IDS[n] for n in dict.fromkeys(names) if n and n in TAG_IDS]

episodes = []
for m in mems:
    if m["kind"] == "TRIP" and (not m.get("date") or m["date"][:4] > "2008"): continue   # later trips belong to later eras
    if m["kind"] == "TRIP" and (m.get("skip_map") or m.get("who") == "university"): continue   # university trips belong to the next era
    mood = next((EMO[x] for x in m.get("tags", {}).get("MOOD", []) if x in EMO), None)
    place, lat, lng = place_of(m)
    episodes.append(dict(source=SOURCE, externalKey=m["key"], kind=m["kind"], title=m["title"], summary=episode_text(m) or m["title"],   # the API keeps the title as the summary of a memory without one
                         status=m.get("status") or "DRAFT", emotion=mood, importance=IMP.get(m["kind"], 5),
                         occurredAt=when(m), precision=m.get("precision"), endAt=end_at(m),
                         place=place, latitude=lat, longitude=lng,
                         mediaIds=[p["id"] for p in m.get("photos", []) if p.get("id")],
                         collectionIds=[m["album"]] if m.get("album") else [],
                         tagIds=tag_ids_of(m), personIds=persons_of(m)))
facts = [dict(source=SOURCE, category=f["category"], key=f["key"], value=f["value"], confidence=0.8) for f in data["facts"]]
facts += [
    dict(source=SOURCE, category="hobby", key="Cờ vua", value="đội tuyển cờ Trường TTTN 10-10; đánh giải cờ vua – cờ tướng học sinh quận Ba Đình 11/2004 (ván 2 hoà 39 nước, cầm Đen) và giải cờ chớp nhoáng – cờ nhanh TTTN 10-10 mở rộng 1/2005", confidence=1.0),
    dict(source=SOURCE, category="habit", key="Đi chơi cùng gia đình", value="gần như năm nào cũng đi (1993 – 2007, trừ 1996): Sầm Sơn, Huế – Đà Nẵng, Sài Gòn – Đà Lạt, Kim Bôi, Cửa Lò, Hạ Long – Cát Bà – Trà Cổ, Quảng Bình, Côn Minh, Cát Bà; tự ghi lại trong cuốn sổ \"Visit in\"", confidence=1.0),
]
facts = [f for f in facts if f["key"] not in ("Du lịch hè", "Cờ")]
# what he told us himself is checked; the rest stays a draft until he confirms it in the admin
OWNER_SAID = {"THPT"}
for f in facts: f["status"] = "CONFIRMED" if f["key"] in OWNER_SAID else "DRAFT"

# ── 2–3. photos ──────────────────────────────────────────────────────────────
tree = json.load(open(os.path.join(D, "transcripts", "media-tree-1990-2007.json")))
coll_of = {}
def walk(n):
    for m in n["mediaItems"]: coll_of.setdefault(m["id"], n["id"])
    for c in n["children"]: walk(c)
walk(tree)
def find(album, fn, parent=None):
    out = []
    def w(n, p):
        if n["name"] == album and (parent is None or p == parent):
            out.extend(m["id"] for m in n["mediaItems"] if m["fileName"] == fn)
        for c in n["children"]: w(c, n["name"])
    w(tree, None)
    return out[0] if out else None

captions = {}                              # media id -> text (document scans first, they win)
S = json.load(open(os.path.join(D, "transcripts", "docs_school.json")))
S2 = json.load(open(os.path.join(D, "transcripts", "docs_school2.json")))
G = json.load(open(os.path.join(D, "transcripts", "docs_games.json")))
B = json.load(open(os.path.join(D, "transcripts", "docs_bus.json")))
# text for captions: only what is written on the paper — reading notes and English glosses are left out
import re
DROP = {"orientation", "columns_legend", "game_type", "reconstruction_of_moves_16_to_19", "basis", "what_kind", "description",
        "physical", "inferred_rules", "how_to_read", "summary", "what_it_is", "code_meaning", "how_it_seems_to_work", "tier_meaning",
        "overview", "notes_on_marks", "missing", "value_distribution", "families", "format", "purpose", "sheet", "file", "files",
        "mediaId", "mediaIds", "class_statistics", "personalised_footer", "page", "legibility"}
LABEL = {"nhan_xet_giao_vien": "Nhận xét của giáo viên", "y_kien_phu_huynh": "Ý kiến phụ huynh", "hoc_luc": "Học lực", "hanh_kiem": "Hạnh kiểm",
         "danh_hieu": "Danh hiệu", "xep_thu": "Xếp thứ", "dtb": "ĐTB", "ghi_chu": "Ghi chú", "khen_thuong": "Khen thưởng", "giao_vien_ky": "Giáo viên ký",
         "xep_loai": "Xếp loại", "ca_nam": "Cả năm", "hoc_ki_II": "Học kỳ II", "hoc_ki_I_hoc_luc_mon": "Học kỳ I", "scores": "Điểm", "scores_with_subject_rank": "Điểm",
         "date": "Ngày", "exam_date": "Ngày thi", "venue": "Địa điểm", "schedule": "Lịch", "subject": "Môn", "subjects": "Các môn", "problems": "Đề bài",
         "duration": "Thời gian", "tournament": "Giải", "round": "Ván", "white": "Trắng", "black": "Đen", "result": "Kết quả",
         "moves_as_written": "Nước đi (như ghi trong biên bản)", "moves_san": "Nước đi", "events": "Nội dung", "registration_deadline": "Hạn đăng ký",
         "signed": "Ký", "header": "Tiêu đề", "summons": "Giấy triệu tập", "when": "Thời gian", "legend": "Chú giải", "legend_as_written": "Chú giải",
         "levels": "Màn", "levels_drawn": "Màn", "cards": "Lá bài", "routes": "Tuyến", "civilizations": "Dân tộc", "civilizations_with_tier": "Dân tộc",
         "civs": "Dân tộc", "boards": "Bàn cờ", "terrain": "Địa hình", "piece_legend": "Quân cờ", "resource_values": "Tài nguyên", "unit_lines": "Dòng quân",
         "note_on_sheet": "Ghi trên giấy", "other_text": "Chữ khác", "list": "", "rows": "", "row": "", "title": "", "left_column": "", "right_column": "",
         "slip_1": "Phiếu 1", "slip_2": "Phiếu 2", "class": "Lớp", "school_year": "Năm học", "term": "Học kỳ", "student": "Học sinh", "level_count": "Số màn"}
EN = set("the a an of has is are eats runs away attacks defends sprays bullets throws shot invisible wrestles spikes armour armor poison potion bite numbing "
         "likely inferred scanned side struck underlined planned sic means page sheet probably maybe written crossed out blank two slips devours meat "
         "left right top bottom his her first last cut off unclear see also note copy same".split())
def gloss(m):
    words = re.findall(r"[A-Za-z]+", m.group(1).lower())
    return "" if words and sum(w in EN for w in words) >= max(1, len(words) // 3) else m.group(0)
def clean(t): return re.sub(r"\s*\(([^()]*)\)", gloss, t)
def lab(k): return LABEL.get(k, k.replace("_", " "))
def inline(x):
    if isinstance(x, dict):
        bits = []
        for k, y in x.items():
            if k in DROP or y in (None, "", [], {}): continue
            if isinstance(y, list) and all(not isinstance(z, (dict, list)) for z in y): bits.append(" → ".join(map(str, y)))
            elif isinstance(y, (dict, list)): bits.append((lab(k) + ": " if lab(k) else "") + inline(y))
            else: bits.append(str(y))
        return " · ".join(bits)
    if isinstance(x, list): return "; ".join(inline(z) for z in x)
    return str(x)
def fmt(v, ind=0):
    pad = "  " * ind
    if isinstance(v, (str, int, float)): return pad + str(v)
    if isinstance(v, list):
        return "\n".join(pad + "• " + inline(x) if not isinstance(x, list) else fmt(x, ind + 1) for x in v)
    if isinstance(v, dict):
        out = []
        for k, x in v.items():
            if k in DROP or x in (None, "", [], {}): continue
            if isinstance(x, (dict, list)):
                if lab(k): out.append(pad + lab(k) + ":")
                out.append(fmt(x, ind + 1 if lab(k) else ind))
            else: out.append(pad + (lab(k) + ": " if lab(k) else "") + str(x))
        return "\n".join(out)
    return pad + str(v)
def bus(r):
    out = [r["route"] + " · " + (r.get("terminals") or "")]
    if r.get("adjusted"): out[0] += "  [điều chỉnh: " + r["adjusted"] + "]"
    if r.get("outbound"): out.append("  đi: " + " → ".join(r["outbound"]))
    if r.get("return"): out.append("  về: " + " → ".join(r["return"]))
    meta = [x for x in (r.get("hours"), r.get("frequency"), r.get("fare")) if x]
    if meta: out.append("  " + " · ".join(meta))
    return "\n".join(out)
src = open(os.path.join(D, "build.py")).read()
for e in S + S2:
    mid = e.get("mediaId")
    if not mid or e.get("kind") in ("chess-game",): pass
    if not mid: continue
    yr = re.sub(r"\s*\(.*", "", str(e.get("year") or "")).replace(" and ", ", ").strip()
    if re.search(r"[A-Za-z]{3,}", yr) and not re.search(r"lớp|năm", yr): yr = re.sub(r"[^0-9–\-/, ]", "", yr).strip(" ,")
    head = (e.get("title") or e["file"]) + (f" ({yr})" if yr else "")
    body = fmt(e.get("content")) if e.get("kind") != "other" or e.get("content") else ""
    extra = []
    if e.get("teacher_remark"): extra.append("Lời phê: " + inline(e["teacher_remark"]))
    if e.get("grade"): extra.append("Điểm: " + inline(e["grade"]))
    if e.get("kind") == "chess-game": body = "Nước đi: " + e["content"].get("moves_san", "")
    if e["file"].startswith("Luu but"): body = ""                   # his farewell letter stays private
    captions[mid] = clean(head + ("\n" + body if body else "") + ("\n" + "\n".join(extra) if extra else "")).strip()[:6000]
for e in G:
    ids = [i for i in (e.get("mediaIds") or []) if i]
    if not ids: continue
    text = clean(e["game"] + "\n" + fmt(e.get("content")))
    captions.setdefault(ids[0], text[:12000])
    for i in ids[1:]: captions.setdefault(i, e["game"] + " (trang tiếp; bản chép ở trang đầu)")
by_page = collections.defaultdict(list)
for r in B["routes"]: by_page[r["page"]].append(r)
for page, rs in by_page.items():
    mid = find("Travel box", page)
    if mid: captions.setdefault(mid, "Sổ chép tuyến xe buýt Hà Nội\n" + "\n".join(bus(r) for r in rs))
VISIT = {"scan0126.jpg": ["1993", "1994"], "scan0127.jpg": ["1995", "1996", "1997"], "scan0128.jpg": ["1998", "1999"],
         "scan0129.jpg": ["2000", "2001"], "scan0130.jpg": ["2002", "2003", "2004"], "scan0131.jpg": ["2005"]}
vlines = [l for l in src[src.index('VISITIN="""') + 10:src.index('"""', src.index('VISITIN="""') + 10)].split("\n") if l]
for fn, years in VISIT.items():
    mid = find("Travel box", fn)
    if mid: captions.setdefault(mid, "Sổ \"Visit in\": " + " | ".join(l for l in vlines if l[:4] in years))
pick_tags = {}
for m in mems:
    if m["kind"] == "TRIP": continue
    for p in m.get("photos", []):
        captions.setdefault(p["id"], m["title"])
        names = set(sum(m.get("tags", {}).values(), []))
        pick_tags.setdefault(p["id"], set()).update(names)

# fresh captions from the hub, so nothing typed by hand is overwritten
current = {}
for cid in sorted(set(coll_of[i] for i in captions if i in coll_of)):
    for m in call("GET", f"/api/collections/{cid}/media"): current[m["id"]] = m.get("caption")
todo = {i: t for i, t in captions.items() if i in current and not (current[i] or "").strip()}

tags = {t["name"]: t["id"] for t in call("GET", "/api/tags")}
tag_batches = collections.defaultdict(list)
for mid, names in pick_tags.items():
    for n in names:
        tn = TAG_ALIAS.get(n)
        if tn and tn in tags: tag_batches[tags[tn]].append(mid)

print(f"memory: {len(chapters)} chapters, {len(episodes)} episodes, {len(facts)} facts → source '{SOURCE}' (replaces that source only)")
print(f"captions: {len(todo)} photos without a caption get one ({len(captions) - len(todo)} skipped: already captioned or outside the tree)")
print("tags:", {n: len(tag_batches[i]) for n, i in tags.items() if i in tag_batches})
print("episode links:", {k: sum(1 for e in episodes if e[k]) for k in ("mediaIds", "collectionIds", "tagIds", "personIds", "place")},
      "status:", dict(collections.Counter(e["status"] for e in episodes)))
if not APPLY:
    for e in [episodes[0]] + [x for x in episodes if x["kind"] == "TRIP"][:1]:
        print("  ·", json.dumps({k: v for k, v in e.items() if k != "mediaIds"}, ensure_ascii=False)[:500])
    for i, t in list(todo.items())[:5]: print("  ·", i[:8], t[:120].replace("\n", " / "))
    sys.exit(0)
# A re-run replaces everything this source wrote. Once memories are checked or fixed in the admin, that would undo
# the work — so stop when anything in the hub differs from what this script would write (--force to replace anyway).
if "--force" not in sys.argv:
    have = {e.get("externalKey"): e for e in call("GET", f"/api/persons/{SELF}/memory/episodes?source={SOURCE}")}
    changed = []
    for e in episodes:
        h = have.get(e["externalKey"])
        if h and any((h.get(k) or None) != (e.get(k) or None) for k in ("title", "summary", "status", "kind", "place")) \
               or h and [m["id"] for m in h.get("media") or []] != e["mediaIds"]:
            changed.append(e["externalKey"])
    gone = [k for k in have if k and k not in {e["externalKey"] for e in episodes}]
    hand_facts = [f["key"] for f in call("GET", f"/api/persons/{SELF}/memory/facts")
                  if f.get("source") == SOURCE and f.get("status") == "CONFIRMED" and f["key"] not in OWNER_SAID]
    mine = {(c["title"], c["summary"]) for c in chapters}
    hand_chapters = [c["title"] for c in call("GET", f"/api/persons/{SELF}/memory/chapters")
                     if c.get("source") == SOURCE and (c.get("status") == "CONFIRMED" or (c.get("title"), c.get("summary")) not in mine)]
    if changed or gone or hand_facts or hand_chapters:
        print("Stopped: these were changed in the hub since the last push —", changed + gone + hand_facts + hand_chapters)
        print("Bring the change into memories_src.py first, or run with --force to replace them.")
        sys.exit(1)
print(call("PUT", f"/api/persons/{SELF}/memory/sources/{SOURCE}", dict(chapters=chapters, episodes=episodes, facts=facts)))
n = 0
for i, t in todo.items():
    call("PATCH", f"/api/media-files/{i}", {"caption": t}); n += 1
print("captions written:", n)
for tid, ids in tag_batches.items():
    print(tid[:8], call("POST", "/api/media-files/batch/tags", {"ids": sorted(set(ids)), "tagId": tid}))
