"""End-to-end check of /api/finance against a fresh database (temporary, removed before merge)."""
import datetime
import json
import os
import urllib.error
import urllib.request

API = os.environ.get("API", "http://localhost:8080")
KEY = os.environ.get("SEPAY_KEY", "testkey")
VN = datetime.timezone(datetime.timedelta(hours=7))
NOW = datetime.datetime.now(VN)
MONTH = NOW.strftime("%Y-%m")


def call(method, path, body=None, headers=None, expect=200):
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


def ts(minutes_ago):
    return (NOW - datetime.timedelta(minutes=minutes_ago)).strftime("%Y-%m-%d %H:%M:%S")


def hook(pid, typ, amount, content, accumulated, minutes_ago, key=KEY, expect=200):
    body = {"id": pid, "gateway": "TPBank", "transactionDate": ts(minutes_ago), "accountNumber": "00001234567",
            "subAccount": "", "code": None, "content": content, "transferType": typ, "description": "",
            "transferAmount": amount, "accumulated": accumulated, "referenceCode": f"FT{pid}"}
    headers = {"Authorization": f"Apikey {key}"} if key else {}
    return call("POST", "/api/finance/hooks/sepay", body, headers, expect)


def txns():
    return call("GET", f"/api/finance/transactions?month={MONTH}&size=200")["content"]


def find(desc):
    hits = [t for t in txns() if (t.get("description") or "") == desc]
    check(len(hits) == 1, f"exactly one transaction '{desc}' (found {len(hits)})")
    return hits[0]


def amt(x):
    return round(float(x))


def line(report, name):
    for l in report["expenses"]:
        if l["name"] == name:
            return amt(l["amount"])
    return None


# ── seeded defaults ──
accounts = {a["name"]: a for a in call("GET", "/api/finance/accounts")}
check(set(accounts) >= {"TPBank", "Techcombank", "MoMo", "Bank of America", "Tiền mặt"}, "five accounts seeded")
check(accounts["Tiền mặt"]["mode"] == "POOL" and accounts["Bank of America"]["currency"] == "USD", "cash is a pool, BoA is USD")
cats = {c["code"]: c for c in call("GET", "/api/finance/categories")}
check({"ca-phe", "tien-mat", "chi-chua-ro", "thu-chua-ro", "gia-dinh", "khac"} <= set(cats), "categories seeded")
check(len(call("GET", "/api/finance/rules")) >= 15, "rules seeded")
check(call("GET", "/api/finance/hooks/sepay")["keyRequired"] is True, "hook ping says a key is required")

# ── SePay webhook ──
r = hook(1000, "out", 1, "x", 0, 40, key="wrong", expect=401)
check(r["success"] is False, "wrong Apikey refused")
check(hook(1001, "out", 35000, "HIGHLANDS COFFEE THANH TOAN QR", 1965000, 30) == {"success": True}, "SePay answer is {success:true}")
check(hook(1001, "out", 35000, "HIGHLANDS COFFEE THANH TOAN QR", 1965000, 30) == {"success": True}, "duplicate still answered success")
hook(1002, "in", 20000000, "CONG TY NCS TRA LUONG THANG 10", 21965000, 28)
hook(1003, "out", 2000000, "RUT TIEN ATM 123", 19965000, 26)
hook(1004, "out", 500000, "NAP TIEN VI MOMO 0912", 19465000, 24)
hook(1005, "out", 120000, "NGUYEN VAN A chuyen tien", 19345000, 22)
hook(1007, "out", 50000, "GRAB 123", 19200000, 20)

hl = find("HIGHLANDS COFFEE THANH TOAN QR")
check(hl["categoryName"] == "Cà phê" and hl["status"] == "OK" and hl["accountName"] == "TPBank", "coffee by rule, on TPBank")
check(amt(hl["amount"]) == -35000 and amt(hl["balanceAfter"]) == 1965000, "amount signed, bank balance kept")
check(find("CONG TY NCS TRA LUONG THANG 10")["categoryName"] == "Lương", "salary by rule")
atm = find("RUT TIEN ATM 123")
check(atm["kind"] == "TRANSFER" and atm["transferAccountName"] == "Tiền mặt", "ATM withdrawal moves money to cash")
momo_top = find("NAP TIEN VI MOMO 0912")
check(momo_top["kind"] == "TRANSFER" and momo_top["transferAccountName"] == "MoMo", "top-up moves money to MoMo")
nva = find("NGUYEN VAN A chuyen tien")
check(nva["status"] == "REVIEW" and nva["kind"] == "EXPENSE" and nva["categoryId"] is None, "unknown transfer waits for review")
check(nva["suggestedKeywords"] == "nguyen van a", f"keyword suggestion ({nva['suggestedKeywords']})")
check(find("GRAB 123")["categoryName"] == "Đi lại", "grab by rule")

accounts = {a["name"]: a for a in call("GET", "/api/finance/accounts")}
tp = accounts["TPBank"]
check(tp["accountNumber"] == "00001234567" and tp["mode"] == "FEED" and amt(tp["balance"]) == 19200000, "TPBank claimed the number, balance from the bank")
inbound = call("GET", "/api/finance/inbound?size=50")["content"]
check(any(i["status"] == "DUPLICATE" for i in inbound) and sum(i["status"] == "SAVED" for i in inbound) == 6, "webhook log: 6 saved, 1 duplicate")

# ── quick notes ──
cash_id, momo_id, tcb_id = accounts["Tiền mặt"]["id"], accounts["MoMo"]["id"], accounts["Techcombank"]["id"]
n1 = call("POST", "/api/finance/notes", {"text": "cafe", "amount": -35000})
check(n1["accountName"] == "Tiền mặt" and n1["categoryName"] == "Cà phê" and n1["status"] == "OK", "note defaults to cash, rule applies")
n2 = call("POST", "/api/finance/notes", {"text": "bún chả", "amount": -45000, "accountId": momo_id})
check(n2["categoryName"] == "Ăn uống" and n2["accountName"] == "MoMo", "accented note matched (bún chả → Ăn uống)")
n3 = call("POST", "/api/finance/notes", {"text": "linh tinh", "amount": -20000})
check(n3["status"] == "REVIEW", "unknown note waits for review")
n4 = call("POST", "/api/finance/notes", {"text": "cafe", "amount": -35000, "occurredAt": NOW.strftime("%Y-%m-%dT%H:%M:%S+07:00"), "categoryId": cats["ca-phe"]["id"]})
check(n4["categorizedBy"] == "USER" and n4["status"] == "OK", "note with a chosen category and an offset time")
call("DELETE", f"/api/finance/transactions/{n4['id']}", expect=204)
chips = call("GET", "/api/finance/notes/chips")
check(any(c["text"] == "cafe" for c in chips), "quick chips built from notes")

# ── balance check-ins (MoMo) ──
m = call("POST", f"/api/finance/accounts/{momo_id}/balance", {"balance": 300000})
check(amt(m["balance"]) == 300000, "first check-in sets the start")
m = call("POST", f"/api/finance/accounts/{momo_id}/balance", {"balance": 200000})
adj = find("Chênh lệch khi chốt số dư")
check(amt(adj["amount"]) == -100000 and adj["categoryName"] == "Chi chưa rõ", "second check-in: gap becomes 'Chi chưa rõ'")
call("POST", f"/api/finance/accounts/{cash_id}/balance", {"balance": 1}, expect=400)

# ── the month report ──
rep = call("GET", f"/api/finance/report?month={MONTH}")
check(amt(rep["expense"]) == 2350000, f"spending counts cash at withdrawal (got {rep['expense']})")
check(amt(rep["income"]) == 20000000, "income")
check(line(rep, "Cà phê") == 70000 and line(rep, "Ăn uống") == 45000 and line(rep, "Đi lại") == 50000, "category lines")
check(line(rep, "Chưa phân loại") == 140000 and line(rep, "Chi chưa rõ") == 100000, "uncategorized and unknown lines")
check(line(rep, "Tiền mặt lặt vặt") == 1945000, f"cash bucket = withdrawn - noted (got {line(rep, 'Tiền mặt lặt vặt')})")
check(sum(amt(l["amount"]) for l in rep["expenses"]) == amt(rep["expense"]), "lines add up to the total")
check(len(rep["gaps"]) == 1 and amt(rep["gaps"][0]["missing"]) == -95000, "balance gap found (-95k)")

call("PUT", "/api/finance/settings", {"flexibleBudget": 5000000})
rep = call("GET", f"/api/finance/report?month={MONTH}")
b = rep["budget"]
check(amt(b["limit"]) == 5000000 and amt(b["spent"]) == 2350000 and amt(b["remaining"]) == 2650000 and b["daysLeft"] >= 1, "budget")

# ── learning from a correction ──
u = call("PUT", f"/api/finance/transactions/{nva['id']}", {"categoryId": cats["gia-dinh"]["id"], "learnKeywords": "nguyen van a"})
check(u["categoryName"] == "Gia đình" and u["status"] == "OK" and u["categorizedBy"] == "USER", "corrected by hand")
check(any(r["keywords"] == "nguyen van a" and r["origin"] == "USER" for r in call("GET", "/api/finance/rules")), "rule learned")
hook(1008, "out", 100000, "NGUYEN VAN A chuyen tien lan 2", 19100000, 18)
check(find("NGUYEN VAN A chuyen tien lan 2")["categoryName"] == "Gia đình", "learned rule used next time")

# ── deleting a transfer takes its mirror with it ──
call("DELETE", f"/api/finance/transactions/{atm['id']}", expect=204)
check(not any((t.get("description") or "") == "RUT TIEN ATM 123" for t in txns()), "withdrawal and its cash side deleted")
rep = call("GET", f"/api/finance/report?month={MONTH}")
check(amt(rep["expense"]) == 450000, f"report after delete (got {rep['expense']})")
check(sum(amt(l["amount"]) for l in rep["expenses"]) == 450000, "lines still add up")

# ── manual transaction, transfer and back ──
t = call("POST", "/api/finance/transactions", {"accountId": tcb_id, "amount": -99000, "description": "netflix"})
check(t["categoryName"] == "Đăng ký dịch vụ", "manual entry goes through rules")
t = call("PUT", f"/api/finance/transactions/{t['id']}", {"kind": "TRANSFER", "transferAccountId": momo_id})
check(t["kind"] == "TRANSFER" and t["transferAccountName"] == "MoMo", "turned into a transfer")
check(amt({a["name"]: a for a in call("GET", "/api/finance/accounts")}["MoMo"]["balance"]) == 299000, "MoMo running balance moved with the mirror")
t = call("PUT", f"/api/finance/transactions/{t['id']}", {"categoryId": cats["dang-ky"]["id"]})
check(t["kind"] == "EXPENSE" and t["transferPeerId"] is None, "back to spending")
check(amt({a["name"]: a for a in call("GET", "/api/finance/accounts")}["MoMo"]["balance"]) == 200000, "mirror removed, balance restored")

# ── categories, rules, accounts ──
c = call("POST", "/api/finance/categories", {"name": "Thú cưng", "icon": "🐶"})
check(c["code"] == "thu-cung" and c["kind"] == "EXPENSE" and c["budgetGroup"] == "FLEXIBLE", "category created")
call("DELETE", f"/api/finance/categories/{c['id']}", expect=204)
call("DELETE", f"/api/finance/categories/{cats['tien-mat']['id']}", expect=400)
rule = call("POST", "/api/finance/rules", {"keywords": "linh tinh", "categoryId": cats["khac"]["id"]})
check(call("POST", "/api/finance/rules/apply")["updated"] == 1, "rules applied to the waiting note")
check(find("linh tinh")["categoryName"] == "Khác", "waiting note categorized")
call("DELETE", f"/api/finance/rules/{rule['id']}", expect=204)
a = call("POST", "/api/finance/accounts", {"name": "Ví phụ", "mode": "RECONCILE"})
call("DELETE", f"/api/finance/accounts/{a['id']}", expect=204)
call("DELETE", f"/api/finance/accounts/{tp['id']}", expect=400)
call("POST", "/api/finance/transactions/confirm-all")
check(len(call("GET", "/api/finance/review")) == 0, "review list empty after confirm-all")

# ── summary and trend ──
s = call("GET", "/api/finance/summary")
check(amt(s["netWorthVnd"]) == 19100000 + 200000, f"net worth = TPBank + MoMo (got {s['netWorthVnd']})")
tr = call("GET", "/api/finance/trend?months=6")
check(tr[-1]["month"] == MONTH and amt(tr[-1]["expense"]) == amt(call("GET", f"/api/finance/report?month={MONTH}")["expense"]), "trend ends with this month")
check(amt(tr[-1]["netWorth"]) == 19300000, "trend net worth now")
st = call("GET", "/api/finance/settings")
check(st["sepayKeySet"] is True and amt(st["flexibleBudget"]) == 5000000, "settings")
call("PUT", "/api/finance/settings", {"usdRate": 26000})
boa = {a["name"]: a for a in call("GET", "/api/finance/accounts")}["Bank of America"]["id"]
call("POST", f"/api/finance/accounts/{boa}/balance", {"balance": 100})
check(amt(call("GET", "/api/finance/summary")["netWorthVnd"]) == 19300000 + 2600000, "USD balance converted at the manual rate")
print("\nALL FINANCE CHECKS PASSED")
