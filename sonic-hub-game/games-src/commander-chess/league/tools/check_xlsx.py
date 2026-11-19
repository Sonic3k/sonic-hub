# Reads the computed values back out of the workbook and compares them with the results they were built from.
#   python3 -I tools/check_xlsx.py out/commander-chess-league.xlsx out/results.jsonl out/standings.json
import json, sys
from openpyxl import load_workbook
xlsx, results_path, standings_path = sys.argv[1:4]
games = [json.loads(l) for l in open(results_path, encoding='utf-8') if l.strip()]
order = json.load(open(standings_path, encoding='utf-8'))['order']
wb = load_workbook(xlsx, data_only=True)
st, hh, gs = wb['Standings'], wb['Head to head'], wb['Games']
bad = 0
def expect(what, got, want):
    global bad
    if got != want:
        bad += 1
        if bad <= 12: print('  DIFFERENT', what, 'sheet says', repr(got), 'results say', repr(want))
n = len(order)
for i, p in enumerate(order):
    r = 5 + i
    expect('rank row key', st.cell(row=r, column=2).value, p['key'])
    for col, f in [(6, 'played'), (7, 'w'), (8, 'd'), (9, 'l'), (10, 'pts'), (11, 'rw'), (12, 'rd'), (13, 'rl'), (14, 'bw'), (15, 'bd'), (16, 'bl'), (17, 'rating')]:
        expect(p['key'] + ' ' + f, st.cell(row=r, column=col).value, p[f])
# points must not rise going down the table
pts = [st.cell(row=5 + i, column=10).value for i in range(n)]
expect('table in order of points', pts, sorted(pts, reverse=True))
# head to head, from the raw games
h2h = {}
for g in games:
    a, b = g['red'], g['blue']
    wa, da, la = h2h.setdefault((a, b), [0, 0, 0]), None, None
    x, y = h2h.setdefault((a, b), [0, 0, 0]), h2h.setdefault((b, a), [0, 0, 0])
    if g['winner'] == 0: x[0] += 1; y[2] += 1
    elif g['winner'] == 1: x[2] += 1; y[0] += 1
    else: x[1] += 1; y[1] += 1
for i, p in enumerate(order):
    expect('h2h row name', hh.cell(row=4 + i, column=1).value, p['key'])
    for j, q in enumerate(order):
        want = '—' if i == j else '–'.join(str(v) for v in h2h.get((p['key'], q['key']), [0, 0, 0]))
        expect('h2h %s v %s' % (p['key'], q['key']), hh.cell(row=4 + i, column=2 + j).value, want)
# the games sheet: one row a game, winner as recorded
expect('number of game rows', gs.max_row - 1, len(games))
seen = {}
for r in range(2, gs.max_row + 1):
    red, blue, res, win = gs.cell(row=r, column=3).value, gs.cell(row=r, column=4).value, gs.cell(row=r, column=5).value, gs.cell(row=r, column=6).value
    expect('winner in row %d' % r, win, 'Draw' if res == 'Draw' else red if res == 'Red wins' else blue)
    seen[(gs.cell(row=r, column=2).value, red, blue)] = seen.get((gs.cell(row=r, column=2).value, red, blue), 0) + 1
expect('each pairing once a round and colour', max(seen.values()) if seen else 0, 1 if seen else 0)
total_w = sum(st.cell(row=5 + i, column=7).value for i in range(n)); total_l = sum(st.cell(row=5 + i, column=9).value for i in range(n)); total_d = sum(st.cell(row=5 + i, column=8).value for i in range(n))
expect('wins equal losses', total_w, total_l); expect('wins + draws/2 = games', total_w + total_d // 2, len(games))
print('workbook against results:', 'ALL THE SAME' if not bad else '%d DIFFERENCES' % bad, '| games', len(games), '| players', n, '| wins', total_w, 'draws', total_d // 2)
sys.exit(1 if bad else 0)
