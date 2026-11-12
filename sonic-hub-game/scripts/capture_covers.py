# -*- coding: utf-8 -*-
"""Cover pictures for the portal, taken from the games themselves.

For every game: its title screen and one screen of play, each saved at two widths under public/covers/
(<key>-title-640.webp, <key>-title-1280.webp, <key>-play-640.webp, <key>-play-1280.webp).

    pip install playwright pillow && playwright install chromium
    python3 scripts/capture_covers.py            # every game
    python3 scripts/capture_covers.py muop tim-4 # only these

Run it again after a game's look changes. The steps below walk each game from its title to a screen worth showing.

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

# Steps: key:<Key> | hold:<Key>:<ms> | click:<css> | text:<visible text> | wait:<ms> | waitsel:<css>.  ls = what the
# browser already holds for the game when the screen of play is taken (a save that opens later levels), so that picture
# is not always level 1; the title screen is taken in a browser that has never seen the game.
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
        b = p.chromium.launch()
        for key in keys:
            g = GAMES[key]
            for shot, ls, steps in (('title', None, []), ('play', g.get('ls'), g['play'])):
                ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
                if ls:
                    ctx.add_init_script('(() => { const o = %s; for (const k in o) localStorage.setItem(k, JSON.stringify(o[k])); })()' % json.dumps(ls))
                pg = ctx.new_page()
                pg.goto(f'{base}/games/{key}', wait_until='load')
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
