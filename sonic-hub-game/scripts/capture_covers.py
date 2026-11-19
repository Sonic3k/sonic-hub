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

Not taken here: Saltline (someone else's file, a 3D shooter). A browser without a graphics card draws it too slowly
to picture, so its covers were made by hand: the title screen at 1280x800, and a still of play (16:9) set between
black bands the way the game's own title screen is.
"""
import functools, http.server, io, json, os, sys, threading
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
# for a few moves). register = the address of the service a game keeps its players with: while its pictures are
# taken the list of players there reads as empty and nothing is written to it (see keep_out), so no real player's
# name gets into a picture and none is added.
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
    # on its own site. The title picture is its first screen, the rooms. The picture of play opens a game for points
    # against the owner at the moment she has a Ram to take: she takes it and says so
    'keep-it-down-extended': dict(
        site='https://keepitdown-game-production.up.railway.app/',
        ls={'keepitdown.campaign.v1': {'points': 1104, 'peak': 1128, 'sound': True,
            'vs': {'mina': {'w': 5, 'l': 0, 'd': 0}, 'odette': {'w': 5, 'l': 1, 'd': 0}, 'claire': {'w': 4, 'l': 2, 'd': 0}, 'vera': {'w': 3, 'l': 3, 'd': 0}, 'isolde': {'w': 1, 'l': 2, 'd': 0}},
            'match': {'opp': 'isolde', 'rated': True, 'side': 0, 'moves': [1942,2153,1682,2413,1552,2218,6298,6305,1624,2543,1812,6379,1689,5859,5850,1698,2267,2478,2007,6054,6623,2991,1617,5722,2072,6184,5720,1178,1747,658,8898,5534,2137,5462,6177,853,1422,4429,12612,2794,6883,1893,2332,6899,2211,6444,2592]}}},
        play=['waitsel:#said:not(:empty)', 'wait:1600']),
    # on its own site as well. The title picture is its first screen. The picture of play goes back to a game for points
    # against the Hard opponent, both sides down to one ship and one plane, and waits for her to move
    'commander-chess': dict(
        site='https://sonic-commander-chess-production.up.railway.app/',
        ls={'commander-chess.v1': {'rating': 912, 'peak': 930, 'sound': True, 'side': 0, 'all': False, 'rules': 2, 'seen': {},
            'record': {'pia': {'w': 5, 'l': 0, 'd': 0}, 'sol': {'w': 4, 'l': 1, 'd': 0}, 'hana': {'w': 3, 'l': 2, 'd': 0}, 'nadia': {'w': 1, 'l': 2, 'd': 0}},
            'met': {'pia': True, 'sol': True, 'hana': True, 'nadia': True},
            'match': {'w': 'nadia', 'side': 0, 'rated': True, 'moves': [36192019,44583538,33555718,44057455,34084620,44057923,41433647,44057157,33886213,44117570,67441168,393216,44057134,38287139,44058178,38288183,44181574,38427707,44057670,36709145,44060228,34093079,44181070,34164280,48320090,36260415,46221942,38428475]}}},
        play=['click:[data-act=resume]', 'wait:5200']),
    # on its own site, and its players are kept by the hub's game service (register). The title picture is the game
    # as a newcomer finds it; the picture of play is a game for points against the fan painter, taken up from what
    # the browser is given to hold, with a Horse in hand
    'xiangqi': dict(
        site='https://sonic-xiangqi-production.up.railway.app/',
        register='**/sonic-hub-game-api-production.up.railway.app/**',
        ls={'sonic-save.xiangqi': {'v': 1, 'current': 'cover', 'max': 3, 'epoch': None, 'gone': [], 'players': [{
            'id': 'cover', 'name': 'Guest', 'version': 0, 'dirty': True, 'playedAt': '2026-11-19T12:00:00.000Z', 'data': {
                'points': 1236, 'peak': 1300, 'vs': {'mei': {'w': 5, 'l': 0, 'd': 0}, 'lan': {'w': 5, 'l': 1, 'd': 0}, 'lian': {'w': 3, 'l': 2, 'd': 0}},
                'match': {'opp': 'yue', 'rated': True, 'side': 0, 'moves': [2585,8384,2305,8146,7059,8646,3079,8920,2836,9537,8247,8394,8640,8659,5409,6588,6570,6595,128,6072,8193,8641,8384,11353,6081,9139,4635,2136,4754,1936,5272,1423]}}}]}},
        play=['waitsel:#board .l-pieces > *', 'wait:1500', 'js:press(sqOf("f5"))', 'wait:500']),
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


def keep_out(route):
    """The service a game keeps its players with, while the game is pictured: the list of players reads as empty and
    nothing is written. What the game only reads there (the cast and their pictures) comes through as it is."""
    r = route.request
    if r.method != 'GET': route.abort()
    elif r.url.split('?')[0].endswith('/players'):
        route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'},
                      body=json.dumps({'players': [], 'max': 3, 'epoch': 'cover'}))
    else: route.continue_()


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
        b = p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
        for key in keys:
            g = GAMES[key]
            for shot, ls, steps in (('title', None, g.get('title', [])), ('play', g.get('ls'), g['play'])):
                ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
                if ls:
                    ctx.add_init_script('(() => { const o = %s; for (const k in o) localStorage.setItem(k, JSON.stringify(o[k])); })()' % json.dumps(ls))
                if g.get('register'): ctx.route(g['register'], keep_out)
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
