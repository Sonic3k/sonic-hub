# Builds the league workbook in the shape of the sample (keep-it-down-league.xlsx): Standings, Head to head, Games.
#   python3 -I tools/build_xlsx.py out/results.jsonl out/standings.json out/commander-chess-league.xlsx
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

results_path, standings_path, out_path = sys.argv[1:4]
games = [json.loads(l) for l in open(results_path, encoding='utf-8') if l.strip()]
table = json.load(open(standings_path, encoding='utf-8'))
order = table['order']                                   # players, best first, with their fitted ratings
rank = {p['key']: i for i, p in enumerate(order)}
n_players, n_games = len(order), len(games)
ROUNDS, MS, MAX_TURNS = 3, 1000, 600

ARIAL = dict(name='Arial', size=10)
HEAD_FONT = Font(bold=True, color='FFFFFFFF', **ARIAL)
HEAD_FILL = PatternFill('solid', fgColor='0022364A')
HEAD_ALIGN = Alignment(horizontal='center', vertical='center', wrap_text=True)
PLAIN, BOLD, BLUE, NOTE = Font(**ARIAL), Font(bold=True, **ARIAL), Font(color='000000FF', **ARIAL), Font(italic=True, color='00555555', **ARIAL)
CENTER, LEFT = Alignment(horizontal='center'), Alignment(horizontal='left')

def header(ws, row, titles, height):
    for c, t in enumerate(titles, 1):
        cell = ws.cell(row=row, column=c, value=t)
        cell.font, cell.fill, cell.alignment = HEAD_FONT, HEAD_FILL, HEAD_ALIGN
    ws.row_dimensions[row].height = height

# ── the games, in the order of the sheet: by round, then by pair (best-placed player first), the better-placed as Red first
def game_key(g):
    a, b = sorted((rank[g['red']], rank[g['blue']]))
    return (g['round'], a, b, 0 if rank[g['red']] == a else 1)
games.sort(key=game_key)

WHY = {'commander': 'Commander taken', 'sea': 'last ship lost', 'air': 'last plane lost', 'land': 'last of infantry, tanks and artillery lost',
       'alone': 'Commander left alone', 'mate': 'no legal move, Commander attacked', 'stuck': 'no legal move'}
CAUSE = {'quiet': 'points after 100 quiet turns', 'repeat': 'points after a third repetition', 'turns': 'points at the %d-turn limit' % MAX_TURNS}
FAULT = {'illegal': 'forfeit: illegal move', 'time': 'forfeit: out of time', 'threw': 'forfeit: the bot threw an error', 'answer': 'forfeit: no move returned', 'empty': 'forfeit: no move returned',
         'extra': 'forfeit: moves after its turn was over', 'unfinished': 'forfeit: turn left open', 'load': 'forfeit: the file did not load'}
def ended_by(g):
    if g['why'] == 'points': return '%s (%d–%d)' % (CAUSE.get(g.get('cause'), 'points'), g['pts'][0], g['pts'][1])
    if g['why'] == 'fault': return FAULT.get(g['fault']['kind'], 'forfeit')
    return WHY.get(g['why'], g['why'])

wb = Workbook()

# ── Games
gs = wb.active; gs.title = 'Games'
header(gs, 1, ['#', 'Round', 'Red (moves first)', 'Blue', 'Result', 'Winner', 'Ended by', 'Turns played', 'Red: ms a turn', 'Red: slowest turn (ms)', 'Blue: ms a turn', 'Blue: slowest turn (ms)', 'Lost by forfeit'], 42)
for i, g in enumerate(games, 2):
    result = 'Draw' if g['winner'] < 0 else ('Blue wins' if g['winner'] else 'Red wins')
    forfeit = (g['blue'] if g['fault']['side'] else g['red']) if g.get('fault') else None
    row = [i - 1, g['round'], g['red'], g['blue'], result, '=IF(E%d="Draw","Draw",IF(E%d="Red wins",C%d,D%d))' % (i, i, i, i), ended_by(g), g['turns'], g['ms'][0], g['max'][0], g['ms'][1], g['max'][1], forfeit]
    for c, v in enumerate(row, 1):
        gs.cell(row=i, column=c, value=v).font = PLAIN
last = n_games + 1
for col, w in zip('ABCDEFGHIJKLM', [6, 7, 22, 22, 12, 22, 40, 9, 10, 12, 10, 12, 18]): gs.column_dimensions[col].width = w
gs.freeze_panes = 'A2'; gs.auto_filter.ref = 'A1:M%d' % last
RED, BLUE_COL, RES = "Games!$C$2:$C$%d" % last, "Games!$D$2:$D$%d" % last, "Games!$E$2:$E$%d" % last

# ── Standings
st = wb.create_sheet('Standings', 0)
st['A1'] = 'Commander Chess: the league'; st['A1'].font = Font(name='Arial', size=14, bold=True)
st['A2'] = ('%d games: %d players, %d rounds, every pair twice a round (once with each colour), %d ms a turn. Win 3 points, draw 1, loss 0.' % (n_games, n_players, ROUNDS, MS)); st['A2'].font = PLAIN
header(st, 4, ['#', 'Player', 'AI', 'Written by', 'Level', 'Played', 'Won', 'Drawn', 'Lost', 'Points', 'As Red: won', 'As Red: drawn', 'As Red: lost', 'As Blue: won', 'As Blue: drawn', 'As Blue: lost', 'Rating'], 32)
for i, p in enumerate(order):
    r = 5 + i
    cnt = lambda rng, res: '=COUNTIFS(%s,$B%d,%s,"%s")' % (rng, r, RES, res)
    row = [i + 1, p['key'], p['ai'], p['by'], p['level'], '=G%d+H%d+I%d' % (r, r, r), '=K%d+N%d' % (r, r), '=L%d+O%d' % (r, r), '=M%d+P%d' % (r, r), '=3*G%d+H%d' % (r, r),
           cnt(RED, 'Red wins'), cnt(RED, 'Draw'), cnt(RED, 'Blue wins'), cnt(BLUE_COL, 'Blue wins'), cnt(BLUE_COL, 'Draw'), cnt(BLUE_COL, 'Red wins'), p['rating']]
    for c, v in enumerate(row, 1):
        cell = st.cell(row=r, column=c, value=v)
        cell.font = BOLD if c == 10 else BLUE if c == 17 else PLAIN
        cell.alignment = LEFT if 2 <= c <= 5 else CENTER
pm = sorted(p['pm'] for p in order if p.get('pm'))
notes = json.load(open(sys.argv[4], encoding='utf-8')) if len(sys.argv) > 4 else []
mid = pm[len(pm) // 2]
pinned = table.get('pinned', [])
loose = [p for p in order if p.get('pm') and p['pm'] > 2 * mid]
names = [k.split(':')[1] for k in pinned]
lines = ['Ratings (blue) are fitted to all the games outside this sheet (tools/standings.js): 400 points apart means ten wins to one. Everything else on this sheet is counted from the Games sheet.',
         ('The scale is set so that the game\'s own opponents who took points here (house: %s) average what their ratings in the campaign average, %d. Most ratings are good to about ±%d.'
          % (', '.join(names[:-1]) + ' and ' + names[-1] if len(names) > 1 else ''.join(names), round(sum(table['campaign'][k] for k in pinned) / max(1, len(pinned))), round(mid, -1)))]
if loose:
    lines.append('Loose: ' + ' and '.join('%s (±%d: %d won, %d lost)' % (p['key'], round(p['pm'], -1), p['w'], p['l']) for p in loose) + '. With a record that one-sided, a rating says little more than "far above" or "far below".')
lines += ['The table is in the order of points as the league ended. Red moves first.'] + notes
for k, text in enumerate(lines):
    c = st.cell(row=5 + n_players + 1 + k, column=1, value=text); c.font = NOTE
for col, w in zip('ABCDEFGHIJKLMNOPQ', [4, 22, 21, 26, 18, 8, 7, 7, 7, 8, 9, 9, 9, 9, 9, 9, 8]): st.column_dimensions[col].width = w
st.freeze_panes = 'C5'

# ── Head to head
hh = wb.create_sheet('Head to head', 1)
hh['A1'] = 'Each row against each column: won – drawn – lost, over their %d games' % (2 * ROUNDS); hh['A1'].font = Font(name='Arial', size=12, bold=True)
header(hh, 3, ['Player'] + [p['key'] for p in order], 44)
for i, p in enumerate(order):
    r = 4 + i
    hh.cell(row=r, column=1, value=p['key']).font = BOLD
    for j in range(n_players):
        col = get_column_letter(2 + j)
        if i == j: v = '—'
        else:
            me, you = '$A%d' % r, '%s$3' % col
            both = lambda mine, yours, res: 'COUNTIFS(%s,%s,%s,%s,%s,"%s")' % (mine, me, yours, you, RES, res)
            v = ('=(%s+%s)&"–"&(%s+%s)&"–"&(%s+%s)' % (both(RED, BLUE_COL, 'Red wins'), both(BLUE_COL, RED, 'Blue wins'), both(RED, BLUE_COL, 'Draw'), both(BLUE_COL, RED, 'Draw'), both(RED, BLUE_COL, 'Blue wins'), both(BLUE_COL, RED, 'Red wins')))
        c = hh.cell(row=r, column=2 + j, value=v); c.font, c.alignment = PLAIN, CENTER
hh.column_dimensions['A'].width = 22
for j in range(n_players): hh.column_dimensions[get_column_letter(2 + j)].width = 13
hh.freeze_panes = 'B4'

wb.save(out_path)
print('wrote', out_path, ':', n_games, 'games,', n_players, 'players')
