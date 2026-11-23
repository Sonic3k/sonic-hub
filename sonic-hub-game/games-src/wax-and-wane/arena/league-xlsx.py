#!/usr/bin/env python3
"""The league as a workbook, laid out as the one made for keepitdown-game's league.

    node arena/league.js --table --ratings      first: arena/ratings.json has to be this league's
    python3 arena/league-xlsx.py out.xlsx       needs openpyxl

Three sheets. Games: every game in arena/league.json, a row each. Standings: the table, in the order of
arena/ratings.json; every count on it is a formula over the Games sheet, and only the ratings are written in.
Head to head: each row against each column, counted from the Games sheet too. openpyxl writes formulas without their
values: open the file in Excel, or recalculate it with LibreOffice, before reading the numbers with a program."""
import json, math, os, sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

HERE = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
league = json.load(open(os.path.join(HERE, 'league.json'), encoding='utf-8'))
ratings = json.load(open(os.path.join(HERE, 'ratings.json'), encoding='utf-8'))
games, ms, rounds = league['games'], league['ms'], ratings['rounds']
if ratings['games'] != len(games):
    sys.exit("arena/ratings.json is not this league's: node arena/league.js --table --ratings")
who = {p['id']: p for p in league['players']}
order = [p['id'] for p in ratings['players']]            # the table's order: points, as the league ended
rating = {p['id']: p['rating'] for p in ratings['players']}
# the sheets count with COUNTIFS, which takes no notice of capitals and reads * ? ~ as wildcards
assert len({i.lower() for i in order}) == len(order), 'two players whose names differ only in capitals'
assert not any(ch in i for i in order for ch in '*?~'), 'a player with * ? or ~ in its name'
last = len(games) + 1                                     # the last row of the Games sheet

ARIAL = 'Arial'
plain, bold = Font(name=ARIAL, size=10), Font(name=ARIAL, size=10, bold=True)
blue, note = Font(name=ARIAL, size=10, color='0000FF'), Font(name=ARIAL, size=10, italic=True, color='555555')
head_font, head_fill = Font(name=ARIAL, size=10, bold=True, color='FFFFFF'), PatternFill('solid', fgColor='22364A')
head_align, centre, left = Alignment(horizontal='center', vertical='center', wrap_text=True), Alignment(horizontal='center'), Alignment(horizontal='left')


def header(ws, row, names, height):
    for c, name in enumerate(names, 1):
        cell = ws.cell(row, c, name)
        cell.font, cell.fill, cell.alignment = head_font, head_fill, head_align
    ws.row_dimensions[row].height = height


def widths(ws, values):
    for letter, w in values.items():
        ws.column_dimensions[letter].width = w


def col(n):
    s = ''
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def good_to():
    """How far each rating can be trusted, from the number and closeness of its games: twice its standard error."""
    weight = {i: 0.0 for i in order}
    for g in games:
        p = 1 / (1 + 10 ** ((rating[g['light']] - rating[g['dark']]) / 400))
        weight[g['dark']] += p * (1 - p)
        weight[g['light']] += p * (1 - p)
    each = [2 * (400 / math.log(10)) / math.sqrt(w) for w in weight.values() if w > 0]
    return (int(round(min(each) / 5) * 5), int(round(max(each) / 5) * 5)) if each else (0, 0)


wb = Workbook()

# ── Standings ──
ws = wb.active
ws.title = 'Standings'
ws['A1'], ws['A1'].font = 'Wax & Wane: the league', Font(name=ARIAL, size=14, bold=True)
ws['A2'] = (f'{len(games)} games: {len(order)} players, {rounds} rounds, every pair twice a round (once with each colour), '
            f'{ms} ms a move. Win 3 points, draw 1, loss 0.')
ws['A2'].font = plain
header(ws, 4, ['#', 'Player', 'AI', 'Written by', 'Level', 'Played', 'Won', 'Drawn', 'Lost', 'Points', 'As Light: won', 'As Light: drawn',
               'As Light: lost', 'As Dark: won', 'As Dark: drawn', 'As Dark: lost', 'Rating'], 32)
LIGHT, DARK, RESULT = f'Games!$C$2:$C${last}', f'Games!$D$2:$D${last}', f'Games!$E$2:$E${last}'
for n, pid in enumerate(order):
    r, p = 5 + n, who[pid]
    count = lambda side, result: f'=COUNTIFS({side},$B{r},{RESULT},"{result}")'
    row = [n + 1, pid, p['name'], p.get('model') or p['author'], p['level'],
           f'=G{r}+H{r}+I{r}', f'=K{r}+N{r}', f'=L{r}+O{r}', f'=M{r}+P{r}', f'=3*G{r}+H{r}',
           count(LIGHT, 'Light wins'), count(LIGHT, 'Draw'), count(LIGHT, 'Dark wins'),
           count(DARK, 'Dark wins'), count(DARK, 'Draw'), count(DARK, 'Light wins'), rating[pid]]
    for c, v in enumerate(row, 1):
        cell = ws.cell(r, c, v)
        cell.font = bold if c == 10 else blue if c == 17 else plain
        cell.alignment = left if 2 <= c <= 5 else centre
end = 5 + len(order)
low, high = good_to()
ws.cell(end + 1, 1, f'Ratings (blue) are fitted to all the games outside this sheet (arena/league.js): 400 points apart means ten wins to one, and the scale '
                    f'hangs from {ratings["anchor"]["id"]} at {ratings["anchor"]["rating"]}. Each is good to about ±{low} to ±{high}. '
                    f'Everything else on this sheet is counted from the Games sheet.').font = note
ws.cell(end + 2, 1, 'The table is in the order of points as the league ended. Dark moves first.').font = note
widths(ws, {'A': 4, 'B': 25, 'C': 22, 'D': 21, 'E': 12, 'F': 8, 'G': 7, 'H': 7, 'I': 7, 'J': 8, 'K': 9, 'L': 9, 'M': 9, 'N': 9, 'O': 9, 'P': 9, 'Q': 8})
ws.freeze_panes = 'C5'

# ── Head to head ──
hh = wb.create_sheet('Head to head')
hh['A1'], hh['A1'].font = f'Each row against each column: won – drawn – lost, over their {2 * rounds} games', Font(name=ARIAL, size=12, bold=True)
header(hh, 3, ['Player'] + order, 44)
for i, pid in enumerate(order):
    r = 4 + i
    hh.cell(r, 1, pid).font = bold
    for j in range(len(order)):
        c = col(2 + j)
        both = lambda mine, theirs, result: f'COUNTIFS({mine},$A{r},{theirs},{c}$3,{RESULT},"{result}")'
        cell = hh.cell(r, 2 + j, '—' if i == j else
                       f'=({both(LIGHT, DARK, "Light wins")}+{both(DARK, LIGHT, "Dark wins")})&"–"&({both(LIGHT, DARK, "Draw")}+{both(DARK, LIGHT, "Draw")})'
                       f'&"–"&({both(LIGHT, DARK, "Dark wins")}+{both(DARK, LIGHT, "Light wins")})')
        cell.font, cell.alignment = plain, centre
widths(hh, {'A': 25, **{col(2 + j): 13 for j in range(len(order))}})
hh.freeze_panes = 'B4'

# ── Games ──
gs = wb.create_sheet('Games')
header(gs, 1, ['#', 'Round', 'Light', 'Dark (moves first)', 'Result', 'Winner', 'Ended by', 'Moves played', 'Light: ms a move', 'Light: slowest move (ms)',
               'Dark: ms a move', 'Dark: slowest move (ms)', 'Lost by forfeit', 'Light: discs', 'Dark: discs'], 42)
ENDED = {'full': 'the board is full', 'swept': 'one side has no disc left', 'blocked': 'neither side can move', 'forfeit': 'forfeit'}
RESULTS = {'light': 'Light wins', 'dark': 'Dark wins', 'draw': 'Draw'}
for n, g in enumerate(games):
    r, (dark, light) = 2 + n, g['time']
    row = [n + 1, g['round'], g['light'], g['dark'], RESULTS[g['result']], f'=IF(E{r}="Draw","Draw",IF(E{r}="Light wins",C{r},D{r}))', ENDED[g['why']],
           len(g['moves']) // 2, light['mean'], light['max'], dark['mean'], dark['max'],
           f"{g['forfeit']['by']}: {g['forfeit']['why']}" if g['forfeit'] else None, g['discs'][1], g['discs'][0]]
    for c, v in enumerate(row, 1):
        gs.cell(r, c, v).font = plain
widths(gs, {'A': 6, 'B': 7, 'C': 25, 'D': 25, 'E': 12, 'F': 25, 'G': 28, 'H': 9, 'I': 10, 'J': 12, 'K': 10, 'L': 12, 'M': 14, 'N': 9, 'O': 9})
gs.freeze_panes = 'A2'
gs.auto_filter.ref = f'A1:O{last}'

wb.save(out)
print(f'{out}: {len(order)} players, {len(games)} games, ratings good to about ±{low} to ±{high}')
