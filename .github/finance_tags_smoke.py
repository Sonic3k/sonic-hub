"""Facets and tags of /api/finance against a fresh database (temporary, removed before merge)."""
import datetime
import json
import os
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("API", "http://localhost:8080")
KEY = os.environ.get("SEPAY_KEY", "testkey")
VN = datetime.timezone(datetime.timedelta(hours=7))
NOW = datetime.datetime.now(VN)
MONTH = NOW.strftime("%Y-%m")


def call(method, path, body=None, expect=200, headers=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            code, raw = r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read().decode()
    if expect is not None and code != expect:
        raise AssertionError(f"{method} {path} -> {code} {raw[:500]}")
    return json.loads(raw) if raw else None


def check(cond, msg):
    if not cond:
        raise AssertionError(msg)
    print("ok -", msg)


def hook(pid, typ, amount, content, minutes_ago=0, days_ago=0):
    when = (NOW - datetime.timedelta(days=days_ago, minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")
    body = {"id": pid, "gateway": "TPBank", "transactionDate": when, "accountNumber": "00001234567", "subAccount": "",
            "code": None, "content": content, "transferType": typ, "description": "", "transferAmount": amount,
            "accumulated": 0, "referenceCode": f"FT{pid}"}
    return call("POST", "/api/finance/hooks/sepay", body, headers={"Authorization": f"Apikey {KEY}"})


def all_txns():
    return [t for t in call("GET", "/api/finance/transactions?size=200")["content"] if t["source"] != "SYSTEM"]


def find(desc):
    hits = [t for t in all_txns() if (t.get("description") or "") == desc]
    check(len(hits) == 1, f"exactly one '{desc}' (found {len(hits)})")
    return hits[0]


def names(t):
    return [x["name"] for x in t["tags"]]


def amt(x):
    return round(float(x))


# ── facets and their tags ──
facets = {f["code"]: f for f in call("GET", "/api/finance/facets")}
check(list(facets) == ["hang-muc", "voi-ai", "dang", "dip"], f"four facets in order ({list(facets)})")
check(facets["hang-muc"]["main"] and not facets["hang-muc"]["perTransaction"], "Hạng mục is the main facet")
check(facets["voi-ai"]["perTransaction"] and facets["dip"]["perTransaction"] and not facets["dang"]["perTransaction"], "Với ai and Dịp are per-transaction")
tags = {c["code"]: c for c in call("GET", "/api/finance/categories")}
main_id = facets["hang-muc"]["id"]
check(all(tags[c]["facetId"] == main_id for c in ("an-uong", "giai-tri", "tien-mat", "luong")), "the categories belong to Hạng mục")
check(tags["ban-be"]["facetId"] == facets["voi-ai"]["id"] and tags["ban-be"]["kind"] == "ANY", "Bạn bè is a Với ai tag, kind ANY")
check(tags["digital"]["facetId"] == facets["dang"]["id"] and tags["tet"]["facetId"] == facets["dip"]["id"], "Digital in Dạng, Tết in Dịp")
check(facets["voi-ai"]["tagCount"] == 7 and facets["dang"]["tagCount"] == 2, "tag counts per facet")
ID = {k: v["id"] for k, v in tags.items()}

# ── rules give several tags ──
hook(5001, "out", 450000, "STEAMGAMES 123456 PAYMENT", 30)
st = find("STEAMGAMES 123456 PAYMENT")
check(st["categoryName"] == "Giải trí" and names(st) == ["Giải trí", "Digital"] and st["status"] == "OK", f"Steam: Giải trí + Digital ({names(st)})")
hook(5002, "out", 260000, "NETFLIX.COM SUBSCRIPTION", 29)
nf = find("NETFLIX.COM SUBSCRIPTION")
check(names(nf) == ["Đăng ký dịch vụ", "Digital"], f"Netflix: subscription + Digital ({names(nf)})")
rules = call("GET", "/api/finance/rules")
gr = [r for r in rules if r["keywords"].startswith("steam|")]
check(len(gr) == 1 and [t["name"] for t in gr[0]["tags"]] == ["Giải trí", "Digital"] and gr[0]["categoryName"] == "Giải trí", "the games rule lists its tags")

# ── one line, more tags: other facets beside the category, and a second category ──
hook(5003, "out", 1200000, "LAU PHAN THANH TOAN", 28)
lp = find("LAU PHAN THANH TOAN")
check(lp["status"] == "REVIEW" and lp["tags"] == [], "an unknown restaurant waits, no tags")
u = call("PUT", f"/api/finance/transactions/{lp['id']}", {"tagIds": [ID["an-uong"], ID["ban-be"]]})
check(u["categoryName"] == "Ăn uống" and u["status"] == "OK" and u["categorizedBy"] == "USER", "category chosen in the sheet decides the line")
check(names(u) == ["Ăn uống", "Bạn bè"] and all(x["by"] == "USER" for x in u["tags"]), f"…and Bạn bè sits beside it ({names(u)})")
u = call("PUT", f"/api/finance/transactions/{lp['id']}", {"tagIds": [ID["an-uong"], ID["giai-tri"], ID["ban-be"], ID["vo"]]})
check(u["categoryName"] == "Ăn uống" and set(names(u)) == {"Ăn uống", "Giải trí", "Bạn bè", "Vợ"}, f"two categories and two people ({names(u)})")
rep = call("GET", f"/api/finance/report?month={MONTH}")
an = [l for l in rep["expenses"] if l["name"] == "Ăn uống"]
check(an and amt(an[0]["amount"]) == 1200000 and sum(amt(l["amount"]) for l in rep["expenses"]) == amt(rep["expense"]), "the report still counts it once")
# a sheet that leaves the category alone does not take it from the rule
u = call("PUT", f"/api/finance/transactions/{st['id']}", {"tagIds": [ID["giai-tri"], ID["digital"], ID["ban-than"]]})
check(u["categorizedBy"] == "RULE" and {x["name"]: x["by"] for x in u["tags"]} == {"Giải trí": "RULE", "Digital": "RULE", "Bản thân": "USER"},
      f"only the facet that changed became his ({[(x['name'], x['by']) for x in u['tags']]})")

# ── implied tags ──
game = call("POST", "/api/finance/categories", {"name": "Game", "icon": "🕹️", "facetId": facets["dang"]["id"], "impliesIds": [ID["giai-tri"], ID["digital"]]})
check(game["kind"] == "ANY" and set(game["impliesIds"]) == {ID["giai-tri"], ID["digital"]}, "a tag that brings two others along")
again = call("POST", "/api/finance/categories", {"name": "game", "facetId": facets["dang"]["id"]})
check(again["id"] == game["id"], "the same name in the same facet gives back the tag that exists")
hook(5004, "out", 99000, "CUA HANG XYZ", 27)
x = find("CUA HANG XYZ")
r = call("POST", "/api/finance/transactions/tags", {"ids": [x["id"]], "add": [game["id"]]})
x = find("CUA HANG XYZ")
check(r["updated"] == 1 and x["categoryName"] == "Giải trí" and x["status"] == "OK", f"Game alone decides the line through Giải trí ({names(x)})")
check({t["name"]: t["by"] for t in x["tags"]} == {"Giải trí": "IMPLIED", "Game": "USER", "Digital": "IMPLIED"}, "Giải trí and Digital came along")
call("POST", "/api/finance/transactions/tags", {"ids": [x["id"]], "remove": [game["id"]]})
x = find("CUA HANG XYZ")
check(x["tags"] == [] and x["status"] == "REVIEW", "taking Game off takes what it brought, the line waits again")
call("PUT", f"/api/finance/categories/{game['id']}", {"impliesIds": [ID["digital"]]})
call("POST", "/api/finance/transactions/tags", {"ids": [x["id"]], "add": [game["id"], ID["mua-sam"]]})
x = find("CUA HANG XYZ")
check(set(names(x)) == {"Mua sắm", "Game", "Digital"} and x["categoryName"] == "Mua sắm", f"implies changed: Game now brings only Digital ({names(x)})")

# ── many lines at once ──
hook(5005, "out", 300000, "BIA HOI 1", 26)
hook(5006, "out", 150000, "KARAOKE NIGHT", 25)
b1, b2 = find("BIA HOI 1"), find("KARAOKE NIGHT")
r = call("POST", "/api/finance/transactions/tags", {"ids": [b1["id"], b2["id"]], "add": [ID["ban-be"]]})
check(r["updated"] == 2, "two lines tagged in one go")
b1, b2 = find("BIA HOI 1"), find("KARAOKE NIGHT")
check("Bạn bè" in names(b1) and b1["status"] == "OK" and b1["categoryName"] == "Ăn uống", f"bia hơi: rule's category kept, Bạn bè added ({names(b1)})")
check(names(b2) == ["Giải trí", "Bạn bè"], f"karaoke: Giải trí + Bạn bè ({names(b2)})")
f = call("GET", f"/api/finance/transactions?size=50&categoryId={ID['ban-be']}")["content"]
check({t["description"] for t in f} == {"LAU PHAN THANH TOAN", "BIA HOI 1", "KARAOKE NIGHT"}, "filter by a tag finds every line carrying it")
atm = None
hook(5007, "out", 1000000, "RUT TIEN ATM 99", 24)
atm = find("RUT TIEN ATM 99")
r = call("POST", "/api/finance/transactions/tags", {"ids": [atm["id"]], "add": [ID["ban-be"]]})
check(r["updated"] == 0 and find("RUT TIEN ATM 99")["tags"] == [], "a move between own accounts carries no tags")

# ── counterparty rules with more tags; his own facets stay ──
cp = call("POST", "/api/finance/counterparties/assign", {"name": "LAU PHAN", "categoryId": ID["an-uong"], "tagIds": [ID["ban-be"]]})
rule = [r for r in call("GET", "/api/finance/rules") if r["counterpartyName"] == "LAU PHAN"][0]
check([t["name"] for t in rule["tags"]] == ["Ăn uống", "Bạn bè"], "a counterparty rule keeps its extra tags")
hook(5008, "out", 500000, "LAU PHAN 2", 23)
l2 = find("LAU PHAN 2")
call("PUT", f"/api/finance/transactions/{l2['id']}", {"tagIds": [ID["vo"]]})
l2 = find("LAU PHAN 2")
check(l2["status"] == "REVIEW" and names(l2) == ["Vợ"], "only Vợ chosen: the line still waits for a category")
kr = call("POST", "/api/finance/rules", {"keywords": "lau phan", "tagIds": [ID["an-uong"], ID["ban-be"]], "direction": "OUT"})
res = call("POST", f"/api/finance/rules/{kr['id']}/apply")
lp, l2 = find("LAU PHAN THANH TOAN"), find("LAU PHAN 2")
check(set(names(lp)) == {"Ăn uống", "Giải trí", "Bạn bè", "Vợ"} and lp["categorizedBy"] == "USER", "what he chose on a line stays when a rule is applied")
check(l2["categoryName"] == "Ăn uống" and l2["status"] == "OK" and names(l2) == ["Ăn uống", "Vợ"],
      f"the rule gave the category; his Vợ stayed and Bạn bè was not added ({names(l2)})")
check(res["updated"] == 1, f"only that one line changed ({res})")

# ── occasions: a span of days ──
trip = call("POST", "/api/finance/categories", {"name": "Đà Lạt", "icon": "🌲", "facetId": facets["dip"]["id"]})
d0 = (NOW - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
d1 = NOW.strftime("%Y-%m-%d")
occ = call("POST", "/api/finance/rules", {"fromDate": d0, "toDate": d1, "tagIds": [trip["id"]], "direction": "OUT", "label": ""})
check(occ["priority"] == 200 and occ["keywords"] == "" and occ["fromDate"] == d0 and occ["toDate"] == d1, "an occasion rule: days only, tried last")
res = call("POST", f"/api/finance/rules/{occ['id']}/apply")
lines = {t["description"]: t for t in all_txns()}
check("Đà Lạt" in names(lines["BIA HOI 1"]) and "Đà Lạt" in names(lines["LAU PHAN THANH TOAN"]), "lines of those days carry the trip")
check("Đà Lạt" not in names(lines["NETFLIX.COM SUBSCRIPTION"]), "a subscription (a fixed cost) is left out of the trip")
check(lines["RUT TIEN ATM 99"]["tags"] == [], "and so is a move")
check(res["updated"] >= 5, f"apply counted the lines it changed ({res})")
hook(5009, "out", 70000, "GRAB TRIP", 2)
g = find("GRAB TRIP")
check(g["categoryName"] == "Đi lại" and names(g) == ["Đi lại", "Đà Lạt"], f"a new line in the span gets the trip by itself ({names(g)})")
hook(5010, "out", 80000, "GRAB OLD", 0, 5)
check("Đà Lạt" not in names(find("GRAB OLD")), "a line before the span does not")
call("POST", "/api/finance/rules", {"tagIds": [trip["id"]]}, expect=400)

# ── learning from the sheet: per-transaction facets stay on the line ──
hook(5011, "out", 45000, "CHE BA THIN", 1)
cb = find("CHE BA THIN")
u = call("PUT", f"/api/finance/transactions/{cb['id']}", {"tagIds": [ID["an-uong"], ID["ban-be"]], "learnKeywords": "che ba thin"})
lr = [r for r in call("GET", "/api/finance/rules") if r["keywords"] == "che ba thin"][0]
check([t["name"] for t in lr["tags"]] == ["Ăn uống"], f"the learned rule leaves Bạn bè out ({[t['name'] for t in lr['tags']]})")
hook(5012, "out", 50000, "CHE BA THIN", 0)
nx = [t for t in all_txns() if t["description"] == "CHE BA THIN" and t["id"] != cb["id"]][0]
check(nx["categoryName"] == "Ăn uống" and "Bạn bè" not in names(nx), "next time: the category, not the company")

# ── taking every category off sends a line back to review ──
u = call("PUT", f"/api/finance/transactions/{b2['id']}", {"tagIds": [ID["ban-be"], trip["id"]]})
check(u["status"] == "REVIEW" and u["categoryId"] is None and names(u) == ["Bạn bè", "Đà Lạt"], f"no category: waits again ({names(u)})")
u = call("PUT", f"/api/finance/transactions/{b2['id']}", {"categoryId": ID["giai-tri"]})
check(u["status"] == "OK" and set(names(u)) == {"Giải trí", "Bạn bè", "Đà Lạt"}, "categoryId alone only sets the category")

# ── facets come and go; deleting a tag takes it off lines and rules ──
nf2 = call("POST", "/api/finance/facets", {"name": "Mức cần thiết", "icon": "⚖️"})
check(nf2["code"] == "muc-can-thiet" and nf2["sortOrder"] > facets["dip"]["sortOrder"] and not nf2["main"], "a new facet")
need = call("POST", "/api/finance/categories", {"name": "Thiết yếu", "facetId": nf2["id"]})
call("DELETE", f"/api/finance/facets/{nf2['id']}", expect=400)
call("DELETE", f"/api/finance/categories/{need['id']}", expect=204)
call("DELETE", f"/api/finance/facets/{nf2['id']}", expect=204)
call("DELETE", f"/api/finance/facets/{main_id}", expect=400)
call("DELETE", f"/api/finance/categories/{ID['ban-be']}", expect=204)
check(not any("Bạn bè" in names(t) for t in all_txns()), "deleting Bạn bè took it off every line")
rule = [r for r in call("GET", "/api/finance/rules") if r["counterpartyName"] == "LAU PHAN"][0]
check([t["name"] for t in rule["tags"]] == ["Ăn uống"], "…and off the rule")
call("DELETE", f"/api/finance/categories/{trip['id']}", expect=204)
check(not any(r["id"] == occ["id"] for r in call("GET", "/api/finance/rules")), "an occasion rule left with nothing to give went away")
call("DELETE", f"/api/finance/categories/{ID['giai-tri']}", expect=204)
st = find("STEAMGAMES 123456 PAYMENT")
check(st["status"] == "REVIEW" and st["categoryId"] is None and names(st) == ["Bản thân", "Digital"], f"its lines lost the category and wait ({names(st)})")
check(find("KARAOKE NIGHT")["status"] == "REVIEW", "karaoke waits too")
gr = [r for r in call("GET", "/api/finance/rules") if r["keywords"].startswith("steam|")]
check(len(gr) == 1 and [t["name"] for t in gr[0]["tags"]] == ["Digital"] and gr[0]["categoryId"] is None, "the games rule keeps Digital, no category")

rv = call("GET", "/api/finance/review")
check(any(t["description"] == "STEAMGAMES 123456 PAYMENT" and names(t) == ["Bản thân", "Digital"] for t in rv), "the review list shows tags too")
check(isinstance(call("GET", "/api/finance/counterparties"), list), "counterparties still answer")

print("\nALL TAG CHECKS PASSED")
