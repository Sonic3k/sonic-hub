"""The few Chinese characters the page shows, cut out of LXGW WenKai TC (a Kai, brush-written, typeface for traditional
Chinese, SIL Open Font License 1.1) into one small file a weight: kai-400.woff2 and kai-700.woff2 beside this script.
The page carries them, so it needs nothing beside it. game/build.test.js checks that every Chinese character in the
page's sources is in them.

    npm pack @fontsource/lxgw-wenkai-tc@5.3.1 && tar xzf fontsource-lxgw-wenkai-tc-5.3.1.tgz
    pip install fonttools brotli
    python3 make-kai.py <the folder the package was unpacked into, which holds 400.css> "<the characters>"
"""
import os, re, sys
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.merge import Merger

pkg, chars = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
for weight in (400, 700):
    css = open(os.path.join(pkg, f'{weight}.css')).read()
    parts = []
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        src, rng = re.search(r"url\(\./files/([^)]+\.woff2)\)", block), re.search(r"unicode-range:\s*([^;]+);", block)
        if not src or not rng: continue
        cps = set()
        for part in rng.group(1).split(','):
            part = part.strip().replace('U+', '')
            if '-' in part: a, z = part.split('-'); cps.update(range(int(a, 16), int(z, 16) + 1))
            else: cps.add(int(part, 16))
        mine = ''.join(c for c in chars if ord(c) in cps)
        if not mine: continue
        f = TTFont(os.path.join(pkg, 'files', src.group(1)))
        opts = subset.Options(); opts.layout_features = []; opts.name_IDs = ['*']; opts.notdef_outline = False; opts.hinting = False
        s = subset.Subsetter(opts); s.populate(text=mine); s.subset(f)
        f.flavor = None; path = f'/tmp/kai-part-{weight}-{len(parts)}.ttf'; f.save(path); parts.append(path)
    font = Merger().merge(parts)
    font.flavor = 'woff2'
    out = os.path.join(here, f'kai-{weight}.woff2'); font.save(out)
    have = TTFont(out).getBestCmap()
    lost = [c for c in chars if ord(c) not in have]
    if lost: sys.exit(f'not in the typeface: {"".join(lost)}')
    print(out, os.path.getsize(out), 'bytes')
