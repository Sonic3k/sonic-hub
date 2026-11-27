# -*- coding: utf-8 -*-
"""Cover pictures for the portal, taken from the games themselves.

For every game: its title screen and one screen of play, each saved at two widths under public/covers/
(<key>-title-640.webp, <key>-title-1280.webp, <key>-play-640.webp, <key>-play-1280.webp).

    pip install playwright pillow && playwright install chromium
    python3 scripts/capture_covers.py            # every game
    python3 scripts/capture_covers.py muop tim-4 # only these

Run it again after a game's look changes. The steps below walk each game from its title to a screen worth showing.
A game that lives on a site of its own (`site`) is pictured there.
With no Chromium of Playwright's own at hand, point CHROME at a browser: CHROME=/usr/bin/google-chrome python3 scripts/capture_covers.py
(and where that browser needs switches to start at all, as in a container, give them in CHROME_ARGS: CHROME_ARGS=--no-sandbox).

Not taken here: Saltline (someone else's file, a 3D shooter). A browser without a graphics card draws it too slowly
to picture, so its covers were made by hand: the title screen at 1280x800, and a still of play (16:9) set between
black bands the way the game's own title screen is.
"""
import functools, http.server, io, json, os, re, sys, threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PUBLIC, OUT = os.path.join(ROOT, 'public'), os.path.join(ROOT, 'public', 'covers')
W, H = 1280, 800

# Steps: key:<Key> | hold:<Key>:<ms> | click:<css> | text:<visible text> | wait:<ms> | waitsel:<css> | js:<script the
# page runs>.  ls = what the
# browser already holds for the game when the screen of play is taken (a save that opens later levels), so that picture
# is not always level 1; the title screen is taken in a browser that has never seen the game. title = steps before the
# title screen is taken, for a game whose title screen moves (Penned In and Keep It Down play themselves there: wait
# for a few moves).
# A game that keeps its players with the saves service (sonic-save.js) opens on the list of them, and what a browser holds
# for it is one of those players: title_ls is that for the title picture, so it shows what a player sees on coming in;
# shut is the addresses (regular expressions) left unanswered while that game's pictures are taken, so the made-up
# player is never written to the service, and is not dropped on the service's list not having him; and a picture
# taken with nothing held neither waits on the service nor has anyone who really plays there in it.
def kept_player(game, name, data):
    pid = 'c0ffee00-0000-4000-8000-000000000001'
    return {'sonic-save.' + game: {'v': 1, 'current': pid, 'max': 3, 'epoch': None, 'gone': [], 'players': [
        {'id': pid, 'name': name, 'data': data, 'version': 1, 'dirty': False, 'playedAt': '2026-11-19T08:00:00.000Z', 'full': False}]}}


def lines_kept(at, game=None):
    """What a browser holds for Line 98: Bảy Sắc part of the way along its road: where the traveller stands, each
    place's best score, and (game) the game left unfinished at the place he stands on. The page is told to speak
    Vietnamese, as its name does, whatever the browser speaks."""
    best = {'home': 268, 'lantern': 312, 'market': 140, 'school': 104, 'pond': 520, 'sea': 85}
    places = {k: {'best': v, 'games': 4, 'game': game if game and k == at else None} for k, v in best.items()}
    return {'line-98-bay-sac.v1': {'v': 1, 'lang': 'vi', 'sound': True, 'show': 'both', 'marks': False, 'at': at, 'places': places}}

MAT_THAT_READY = "js:new Promise(done => { const t = setInterval(() => { if (window.__ready) { clearInterval(t); done(); } }, 100); })"

GAMES = {
    'muop': dict(
        ls={'muop-12-den.v1': {'v': 1, 'unlocked': 12, 'abilities': {'wall': True, 'dash': True}, 'levels': {}, 'sfx': False, 'music': False}},
        play=['key:Enter', 'wait:1400', 'key:ArrowLeft', 'wait:900', 'key:ArrowLeft', 'wait:900', 'key:ArrowLeft', 'wait:900',
              'key:Enter', 'wait:3200', 'hold:ArrowRight:1600', 'wait:150']),
    'tim-4': dict(play=['key:Enter', 'wait:1500', 'key:Enter', 'wait:3000', 'hold:ArrowRight:1300', 'wait:150']),
    'medieval-mayhem-2': dict(play=['click:[data-act=quick]', 'wait:3000', 'click:#sheet button >> nth=0', 'wait:6500']),
    'mayhem-classic': dict(play=['click:[data-act=quick]', 'waitsel:#stage-card .card', 'wait:350']),
    'masks-and-mortar': dict(play=['click:[data-act=quick]', 'waitsel:#sheet:not(.hidden) button.pick', 'wait:500',
                                   'click:#sheet button.pick >> nth=1', 'wait:300', 'click:[data-act=form-ok]', 'wait:2500']),
    'len-doi': dict(play=['text:Xuất quân', 'wait:2500']),
    'forum-tycoon': dict(play=['text:Mở 4rum', 'wait:2500']),
    'penned-in': dict(
        title=['wait:12000'],
        ls={'penned-in.v1': {'cfg': {'level': 'hard', 'size': 11, 'side': 0}, 'sound': True, 'game': {'n': 11, 'cells': [12, 108, 24, 96, 36, 84, 48, 73, 60, 61, 70, 49, 81, 37, 93, 27, 105, 39, 106, 51, 94, 63, 104, 62, 92, 72, 80, 71, 69, 59, 58, 47, 57, 46, 67, 34, 68, 23, 79, 13, 91, 1, 101, 2, 111, 14]}}},
        play=['wait:700']),
    'keep-it-down': dict(
        title=['wait:9000'],
        ls={'keep-it-down.v1': {'cfg': {'level': 'hard', 'side': 0}, 'sound': True, 'game': {'moves': [1682,2413,1747,2283,1812,2926,2007,2153,1951,2218,1877,2469,6558,5794,5787,2209,6298,6574,6818,6054,7338,11514,6045,2527,2462,2023,1942,1503,5713,2991,7078,7085,2543,5729,1886,1763,2471,5915,7078,7094,2397,983,2738,911,2794,11955,1234,5209,6955,846,8965,4689,1,6957,2731,649,3242,4234]}}},
        play=['wait:900']),
    # on its own site, with its players at the saves service, like Caro. The first picture is the one a shelf shows
    # small, so it is a game at the board: one board and one face, in a game for points in the Reading Room against
    # the one who runs its coffee corner, the move the player's. The game is taken up where she has a Ram to take.
    # She does not play the same move every time: when she takes it she says so, and when she plays something quiet
    # instead she is given one of her own lines about how the game stands, so that the picture never has her silent.
    # (The town with a house's people on its wall is many small things, which a small picture cannot carry: that is
    # the second picture.)
    'keep-it-down-extended': dict(
        site='https://keepitdown-game-production.up.railway.app/',
        shut=[r'/games/[^/]+/players'],
        title_ls=kept_player('keep-it-down-extended', 'Sonic', {'points': 836, 'peak': 848,
            'vs': {'mina': {'w': 5, 'l': 0, 'd': 0}, 'odette': {'w': 2, 'l': 1, 'd': 0}, 'nell': {'w': 3, 'l': 0, 'd': 0}, 'quinn': {'w': 1, 'l': 0, 'd': 0}},
            'match': {'opp': 'odette', 'rated': True, 'side': 0, 'moves': [1942,2153,1682,2413,1552,2218,6298,6305,1624,2543,1812,6379,1689,5859,5850,1698,2267,2478,2007,6054,6623,2991,1617,5722,2072,6184,5720,1178,1747,658,8898,5534,2137,5462,6177,853,1422,4429,12612,2794,6883,1893,2332,6899,2211,6444,2592]}}),
        title=["js:new Promise(done => { const t = setInterval(() => { if (G.screen === 'play' && G.S && !G.busy && G.S.turn === G.side) { clearInterval(t); done(); } }, 60); })",
               "js:G.said || speak(herLead() >= 0 ? 'ahead' : 'behind', true)",
               'waitsel:#said:not(:empty)', 'waitsel:#rival img[src]', 'wait:2600'],
        # the second picture is the town as a player finds it part of the way up the hill: five places with a light
        # on and the Citadel still dark, and under it the Reading Room with its people on the wall
        ls=kept_player('keep-it-down-extended', 'Sonic', {'points': 1216, 'peak': 1228, 'match': None,
            'vs': {'mina': {'w': 5, 'l': 0, 'd': 0}, 'odette': {'w': 5, 'l': 1, 'd': 0}, 'claire': {'w': 4, 'l': 2, 'd': 0}, 'vera': {'w': 2, 'l': 2, 'd': 0}, 'isolde': {'w': 0, 'l': 1, 'd': 0},
                   'nell': {'w': 5, 'l': 0, 'd': 0}, 'britt': {'w': 3, 'l': 1, 'd': 0}, 'quinn': {'w': 2, 'l': 0, 'd': 0}, 'lan': {'w': 1, 'l': 1, 'd': 0}}}),
        play=['waitsel:#rooms .seat .shot img[src]', 'wait:4600']),
    # in the portal now, its players at the saves service. The first picture goes back to a game for points against
    # Commander Nadia Rahimi, both sides down to one ship and one plane: she makes her move, has something to say, and
    # it is the player's turn. The second is the chart of the Lumen coast as a player finds it part of the way along:
    # the stations that have opened with their officers' faces, and the last one still closed.
    'commander-chess': dict(
        shut=[r'/games/[^/]+/players'],
        title_ls=kept_player('commander-chess', 'Sonic', {'rating': 1312, 'peak': 1330, 'side': 0, 'all': False, 'rules': 3,
            'record': {'pia': {'w': 5, 'l': 0, 'd': 0}, 'sol': {'w': 4, 'l': 0, 'd': 0}, 'yuna': {'w': 3, 'l': 1, 'd': 0}, 'maeve': {'w': 3, 'l': 1, 'd': 0},
                       'ligaya': {'w': 3, 'l': 0, 'd': 0}, 'thandiwe': {'w': 3, 'l': 1, 'd': 0}, 'efua': {'w': 3, 'l': 0, 'd': 0}, 'hana': {'w': 3, 'l': 2, 'd': 0},
                       'leilani': {'w': 2, 'l': 2, 'd': 0}, 'dandara': {'w': 2, 'l': 1, 'd': 0}, 'adjoa': {'w': 1, 'l': 2, 'd': 0}, 'greta': {'w': 1, 'l': 1, 'd': 0},
                       'nadia': {'w': 1, 'l': 2, 'd': 0}},
            'met': {k: True for k in ('pia', 'sol', 'yuna', 'maeve', 'ligaya', 'thandiwe', 'efua', 'hana', 'leilani', 'dandara', 'adjoa', 'greta', 'arevik', 'nadia')},
            'match': {'w': 'nadia', 'side': 0, 'rated': True, 'seed': 1, 'moves': [36192019,44583538,33555718,44057455,34084620,44057923,41433647,44057157,33886213,44117570,67441168,393216,44057134,38287139,44058178,38288183,44181574,38427707,44057670,36709145,44060228,34093079,44181070,34164280,48320090,36260415,46221942,38428475]}}),
        title=['click:[data-act=resume]',
               "js:new Promise(done => { const t = setInterval(() => { if (G.screen === 'match' && !G.busy && !G.S.over && G.S.turn === G.side && G.moves.length > 28) { clearInterval(t); done(); } }, 60); })",
               'waitsel:#bubble:not(:empty)', 'waitsel:#her img[data-bust]',
               "js:new Promise(done => { const t = setInterval(() => { if (!document.querySelector('.cutin')) { clearInterval(t); done(); } }, 80); })", 'wait:900'],
        ls=kept_player('commander-chess', 'Sonic', {'rating': 1312, 'peak': 1330, 'side': 0, 'all': False, 'rules': 3, 'match': None,
            'record': {'pia': {'w': 5, 'l': 0, 'd': 0}, 'sol': {'w': 4, 'l': 0, 'd': 0}, 'yuna': {'w': 3, 'l': 1, 'd': 0}, 'maeve': {'w': 3, 'l': 1, 'd': 0},
                       'ligaya': {'w': 3, 'l': 0, 'd': 0}, 'thandiwe': {'w': 3, 'l': 1, 'd': 0}, 'efua': {'w': 3, 'l': 0, 'd': 0}, 'hana': {'w': 3, 'l': 2, 'd': 0},
                       'leilani': {'w': 2, 'l': 2, 'd': 0}, 'dandara': {'w': 2, 'l': 1, 'd': 0}, 'adjoa': {'w': 1, 'l': 2, 'd': 0}, 'greta': {'w': 1, 'l': 1, 'd': 0},
                       'nadia': {'w': 2, 'l': 2, 'd': 0}},
            'met': {k: True for k in ('pia', 'sol', 'yuna', 'maeve', 'ligaya', 'thandiwe', 'efua', 'hana', 'leilani', 'dandara', 'adjoa', 'greta', 'arevik', 'nadia')}}),
        play=['click:[data-act=chart]', 'waitsel:.chart .pin-faces img[data-bust]',
              "js:Promise.all([...document.querySelectorAll('.chart img')].map(i => i.complete ? 0 : new Promise(done => { i.onload = i.onerror = done; })))", 'wait:900']),
    # on its own site as well, with its players at the saves service. The title picture is the place a player comes
    # in to, part of the way up it. The picture of play goes back to a game for points against the owner at the moment
    # the player is one mark from five in a line: she closes it and says so
    'caro': dict(
        site='https://sonic-gomoku-production.up.railway.app/',
        shut=[r'/games/[^/]+/players'],
        # The first picture is the one a shelf shows small, so it is a game at the board: one board and one face, the
        # player's move, in a game for points under the open sky. (The film with a place's people on it is many small
        # things, which a small picture cannot carry: that is the second picture.)
        title_ls=kept_player('sonic-gomoku', 'Sonic', {'points': 1432, 'peak': 1448, 'at': 'citadel', 'streak': 2, 'fresh': [],
            'vs': {'hanh': {'w': 5, 'l': 0, 'd': 0}, 'thu': {'w': 5, 'l': 1, 'd': 0}, 'diep': {'w': 5, 'l': 2, 'd': 0}, 'oanh': {'w': 3, 'l': 2, 'd': 0}, 'uyen': {'w': 2, 'l': 2, 'd': 0}, 'bich': {'w': 1, 'l': 2, 'd': 0}},
            'match': {'opp': 'oanh', 'rated': True, 'side': 1, 'seed': 20261119, 'moves': [112,96,82,84,114,97,95,98,100,111,128,142,81,139,125,109,94,140,141,107,108,123,91,136,137,169,80,154,184,171,187,79,65]}}),
        title=['waitsel:#said:not(:empty)', 'waitsel:#rival img[src]', 'wait:3500'],
        # the second picture is the film with In Bloom picked on it: its people as prints, the later frames still out of focus
        ls=kept_player('sonic-gomoku', 'Sonic', {'points': 1164, 'peak': 1190, 'match': None, 'at': 'market', 'streak': 3, 'fresh': ['giang'],
            'vs': {'suong': {'w': 5, 'l': 0, 'd': 0}, 'hanh': {'w': 5, 'l': 0, 'd': 0}, 'nhi': {'w': 5, 'l': 1, 'd': 0}, 'yen': {'w': 4, 'l': 1, 'd': 0}, 'tram': {'w': 2, 'l': 2, 'd': 1},
                   'thom': {'w': 5, 'l': 0, 'd': 0}, 'cuc': {'w': 5, 'l': 0, 'd': 0}, 'man': {'w': 3, 'l': 1, 'd': 0}, 'dao': {'w': 2, 'l': 1, 'd': 0},
                   'thu': {'w': 4, 'l': 1, 'd': 0}, 'vy': {'w': 3, 'l': 1, 'd': 0}, 'hien': {'w': 1, 'l': 1, 'd': 1}, 'quyen': {'w': 2, 'l': 0, 'd': 0}, 'ly': {'w': 1, 'l': 1, 'd': 0}}}),
        play=['waitsel:.prints img[src]', 'wait:5000']),
    # on its own site as well, with its players at the saves service. The first picture is the one a shelf shows small,
    # so it is a game at the board: a game for points part of the way through, the player to move with a piece in hand,
    # and who sits across. The second is the road the campaign is walked on: the middle of the hanging scroll, the
    # player on it, the lanterns of whoever will play lit and the seals already won in red.
    'xiangqi': dict(
        site='https://sonic-xiangqi-production.up.railway.app/',
        shut=[r'/games/[^/]+/players'],
        title_ls=kept_player('xiangqi', 'Vân', {'points': 1318, 'peak': 1340, 'at': 'willow-pavilion',
            'vs': {'mei': {'w': 5, 'l': 0, 'd': 0}, 'lan': {'w': 5, 'l': 1, 'd': 0}, 'lian': {'w': 3, 'l': 2, 'd': 0}},
            'match': {'opp': 'yue', 'rated': True, 'side': 0, 'moves': [2585,8384,2305,8146,7059,8646,3079,8920,2836,9537,8247,8394,8640,8659,5409,6588,6570,6595,128,6072,8193,8641,8384,11353,6081,9139,4635,2136,4754,1936,5272,1423]}}),
        title=['waitsel:#said:not(:empty)', 'wait:1500', 'js:press(sqOf("f5"))', 'wait:500'],
        ls=kept_player('xiangqi', 'Vân', {'points': 1318, 'peak': 1340, 'match': None, 'at': 'goldwall',
            'vs': {'lu': {'w': 3, 'l': 0, 'd': 0}, 'tang': {'w': 5, 'l': 0, 'd': 0}, 'mei': {'w': 5, 'l': 0, 'd': 0}, 'lan': {'w': 5, 'l': 1, 'd': 0}, 'lian': {'w': 3, 'l': 2, 'd': 0},
                   'shui': {'w': 5, 'l': 0, 'd': 0}, 'wan': {'w': 4, 'l': 1, 'd': 0}, 'lang': {'w': 2, 'l': 1, 'd': 0}, 'qiao': {'w': 1, 'l': 2, 'd': 0}, 'guo': {'w': 1, 'l': 3, 'd': 0},
                   'cao': {'w': 5, 'l': 0, 'd': 0}, 'feng': {'w': 3, 'l': 1, 'd': 0}, 'ding': {'w': 2, 'l': 2, 'd': 0}, 'zhu': {'w': 5, 'l': 0, 'd': 0}, 'wei': {'w': 4, 'l': 0, 'd': 0},
                   'miao': {'w': 5, 'l': 0, 'd': 0}, 'kuang': {'w': 3, 'l': 1, 'd': 0}, 'xiao': {'w': 1, 'l': 1, 'd': 0}, 'tao': {'w': 4, 'l': 0, 'd': 0}, 'si': {'w': 2, 'l': 1, 'd': 0},
                   'gu': {'w': 5, 'l': 2, 'd': 0}, 'gong': {'w': 2, 'l': 2, 'd': 0}, 'suo': {'w': 1, 'l': 2, 'd': 0}, 'quan': {'w': 5, 'l': 0, 'd': 0}, 'mi': {'w': 3, 'l': 0, 'd': 0}, 'chen': {'w': 4, 'l': 1, 'd': 0}}}),
        play=['waitsel:.stop .slip', 'wait:3200']),
    # on the portal, with its players at the saves service, like Caro. It opens by asking who is playing; its title
    # picture is the table behind that, where a game with no points is set up, the name of the game stands beside the
    # board and the board plays by itself: one thing to look at, which is what a small picture on a shelf can carry
    # (the map of the Moon with a sea's people beside it could not). The moves the board plays there are drawn by
    # lot, so for the picture the lot is fixed once the table is up, and the picture is taken with the board at
    # rest: the same moons every time, both faces among them. The picture of play goes back to a game for points in
    # the Sea of Cold, the player to move, once she has said her word
    'wax-and-wane': dict(
        shut=[r'/games/[^/]+/players'],
        title=['waitsel:#who [data-act=free]', 'click:#who [data-act=free]',
               'js:(() => { let s = 4; Math.random = () => (s = s * 16807 % 2147483647) / 2147483647; })()',
               'js:new Promise(done => { const t = setInterval(() => { if (View.disc.filter(Boolean).length >= 16 && !View.acts.length) { clearInterval(t); done(); } }, 40); })',
               'wait:400'],
        ls=kept_player('wax-and-wane', 'Sonic', {'points': 948, 'peak': 960, 'at': 'cold', 'streak': 3, 'fresh': [],
            'vs': {'posy': {'w': 5, 'l': 0, 'd': 0}, 'dot': {'w': 5, 'l': 0, 'd': 0}, 'greta': {'w': 4, 'l': 1, 'd': 0}, 'wren': {'w': 3, 'l': 1, 'd': 0}, 'sabine': {'w': 1, 'l': 2, 'd': 0},
                   'pippa': {'w': 4, 'l': 0, 'd': 0}, 'tilde': {'w': 3, 'l': 1, 'd': 0}, 'noor': {'w': 2, 'l': 1, 'd': 0}, 'coral': {'w': 2, 'l': 2, 'd': 0}, 'luz': {'w': 1, 'l': 1, 'd': 0}, 'fern': {'w': 1, 'l': 0, 'd': 0}},
            'match': {'opp': 'tove', 'rated': True, 'side': 0, 'moves': [44,29,20,43,30,22,38,31,42,51,21,37,45,34,39,47,23,15,19,26,25,46,58,12,11,53]}}),
        play=['waitsel:#said:not(:empty)', 'waitsel:.cell.can', 'wait:1200']),
    # its first picture is a game at the board: the quick board against the computer at Shifen, both colours of lantern
    # lit, the player to move. The second goes back to the long board at Pingxi with the score level and one chain
    # left: the player takes it, wins, and the station's stamp comes down
    'lantern-line': dict(
        title_ls={'lantern-line.v1': {'cfg': {'size': 5, 'vs': 'bot', 'level': 'steady', 'side': 0}, 'sound': True,
            'stamps': {'easy:5': True, 'casual:5': True}, 'wins': {'easy:5': 3, 'casual:5': 1},
            'game': {'size': 5, 'moves': [57,11,36,37,12,28,26,20,21,0,3,49,18,14,32,30,43,9,33,17,46,1,22,59,24,53,35,25,42,39,27,56,54,55,13,45,44,16,51,50,4,34,8,41,40],
                     'seat': [{'kind': 'human'}, {'kind': 'bot', 'bot': 'house', 'level': 'steady', 'name': 'The computer', 'label': 'Computer'}]}}},
        title=['wait:1500'],
        ls={'lantern-line.v1': {'cfg': {'size': 7, 'vs': 'bot', 'level': 'sharp', 'side': 0}, 'sound': True,
            'stamps': {'easy:5': True, 'casual:5': True, 'steady:5': True, 'easy:7': True, 'casual:7': True, 'steady:7': True}, 'wins': {'easy:5': 3, 'casual:5': 2, 'steady:5': 1, 'easy:7': 1, 'casual:7': 1, 'steady:7': 2},
            'game': {'size': 7, 'moves': [64,96,82,32,51,56,68,81,14,94,100,88,45,92,34,70,59,84,97,105,21,20,49,23,11,43,91,63,8,0,107,77,74,89,27,111,40,26,4,103,36,98,15,67,24,44,106,50,109,101,48,78,19,79,6,13,62,71,2,3,1,76,54,86,87,5,53,22,73,72,90,29,28,80,35,104,42,30,83,31,99,37,38,10,60,61,12,17,69,18,75,16,25,85,33,93,39,46,52,108,7,57,58,66,9,65,41],
                     'seat': [{'kind': 'human'}, {'kind': 'bot', 'bot': 'house', 'level': 'sharp', 'name': 'The computer', 'label': 'Computer'}]}}},
        play=['wait:600', 'js:(async () => { for (const m of [95, 102, 47, 110, 55]) { while (!View.input) await sleep(40); View.input(m); await sleep(120); } })()', 'wait:1700']),
    # its title picture is the map, as a player finds it part of the way along the road: stars won at the first places,
    # the rainbow half lit. The picture of play goes back to a game at the lantern street with a row of stars one short,
    # picks the lantern that would fill it and points at the gap, so the way it would take is showing
    'line-98-bay-sac': dict(
        title_ls=lines_kept('pond'),
        title=['wait:1500'],
        ls=lines_kept('lantern', {'score': 187, 'moves': 64, 'back': None, 'time': 412, 'was': 312, 'shown': True,
            'next': [{'c': 0, 'at': 34}, {'c': 3, 'at': 75}, {'c': 5, 'at': 6}],
            'board': [0, -1, -1, 6, -1, -1, -1, -1, -1,
                 -1, 0, -1, -1, 1, -1, 4, -1, -1,
                 -1, -1, 3, -1, 0, -1, -1, 1, -1,
                 3, -1, -1, -1, -1, 5, -1, -1, -1,
                 -1, 2, 2, 2, -1, 2, -1, -1, -1,
                 4, -1, -1, 6, -1, -1, -1, 6, -1,
                 -1, 1, -1, -1, 2, -1, 3, -1, -1,
                 -1, -1, -1, 5, -1, -1, 2, -1, 0,
                 -1, 6, -1, -1, -1, 4, -1, -1, -1]}),
        play=['click:#tk-go', 'wait:1700', 'js:L98.press(58)', 'wait:150', 'js:L98.table.point(40)', 'wait:520']),
    # on its own site; what a browser holds for it is its own (no players at the saves service). It is drawn in 3D, and
    # a browser without a graphics card takes its time over that, so each picture waits for the game to say it is ready
    # (window.__ready) rather than for a number of seconds. The first picture is its title over the hall of doorways.
    # The second is a room part of the way through, taken up from what the browser holds: the study that is a model of
    # itself, seen from beside its table, with the armchair already pushed aside, the safe open and the fire lit at
    # every size. The page is told to speak Vietnamese, as its name does, whatever the browser speaks.
    'mat-that': dict(
        site='https://sonic-escape-room-production.up.railway.app/',
        title_ls={'mat-that.v1': {'v': 1, 'lang': 'vi', 'rooms': {}}},
        title=[MAT_THAT_READY, 'wait:2500'],
        ls={'mat-that.v1': {'v': 1, 'lang': 'vi', 'seenIntro': True, 'rooms': {'scale': {'notes': ['scale.note.law', 'scale.note.digits'], 'hints': {}, 'time': 240,
            'state': {'v': 1, 'chair': 1, 'found': True, 'safe': True, 'matches': 'used', 'fire': True, 'drawer': False, 'key': 'none', 'weight': True, 'door': False}}}}},
        play=[MAT_THAT_READY, "js:window.__mt.toRoom('scale')", "js:window.__mt.nav.goto('table', { instant: true })", 'wait:3000']),
}


class Handler(http.server.SimpleHTTPRequestHandler):
    """public/ as the production server shows it: /games/<key> answers with <key>.html."""
    def translate_path(self, path):
        p = super().translate_path(path)
        return p + '.html' if not os.path.exists(p) and os.path.exists(p + '.html') else p

    def log_message(self, *a):
        pass


def run(pg, steps):
    for s in steps:
        k, _, v = s.partition(':')
        if k == 'key': pg.keyboard.press(v)
        elif k == 'wait': pg.wait_for_timeout(int(v))
        elif k == 'click': pg.click(v, timeout=5000)
        elif k == 'waitsel': pg.wait_for_selector(v, timeout=20000)
        elif k == 'js': pg.evaluate(v)
        elif k == 'text': pg.get_by_text(v, exact=False).first.click(timeout=5000)
        elif k == 'hold':
            key, ms = v.split(':'); pg.keyboard.down(key); pg.wait_for_timeout(int(ms)); pg.keyboard.up(key)
        else: raise ValueError(s)


def save(png, name):
    im = Image.open(io.BytesIO(png)).convert('RGB')
    for w in (1280, 640):
        out = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        out.save(os.path.join(OUT, f'{name}-{w}.webp'), 'WEBP', quality=82, method=6)


def main(keys):
    os.makedirs(OUT, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=PUBLIC))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{srv.server_address[1]}'
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None, args=os.environ.get('CHROME_ARGS', '').split())
        for key in keys:
            g = GAMES[key]
            for shot, ls, steps in (('title', g.get('title_ls'), g.get('title', [])), ('play', g.get('ls'), g['play'])):
                ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
                if ls:
                    ctx.add_init_script('(() => { const o = %s; for (const k in o) localStorage.setItem(k, JSON.stringify(o[k])); })()' % json.dumps(ls))
                for pattern in g.get('shut', []): ctx.route(re.compile(pattern), lambda route: route.abort())
                pg = ctx.new_page()
                pg.goto(g.get('site') or f'{base}/games/{key}', wait_until='load')
                pg.wait_for_timeout(1800)
                # the picture is of the game alone: the link back to the portal is not part of it
                pg.add_style_tag(content='#home, a.home, a.menu-home { visibility: hidden !important }')
                run(pg, steps)
                save(pg.screenshot(), f'{key}-{shot}')
                ctx.close()
            print('captured', key)
        b.close()
    srv.shutdown()


if __name__ == '__main__':
    main(sys.argv[1:] or list(GAMES))
