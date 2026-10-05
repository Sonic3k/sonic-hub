# Builds both front ends from the same game core.
#   src/core     rules, content, AI (pure, no DOM) — also used by sim.js / tune.js / probe.js / refine.js
#   src/shared   symbol art, crests, sound
#   src/classic  the first UI   -> ../../game-civ-clash.html      (shell: classic-shell.html)
#   src/ui       the new UI     -> ../../game-civ-clash-v2.html   (shell: ui-shell.html + ui.css)
import glob, os
ROOT = os.path.dirname(os.path.abspath(__file__))
def js(*dirs):
    return '\n'.join(open(f, encoding='utf-8').read() for d in dirs for f in sorted(glob.glob(os.path.join(ROOT, 'src', d, '*.js'))))
def build(shell, out, dirs, css=None):
    page = open(os.path.join(ROOT, shell), encoding='utf-8').read().replace('/*__JS__*/', js(*dirs))
    if css: page = page.replace('/*__CSS__*/', open(os.path.join(ROOT, css), encoding='utf-8').read())
    dst = os.path.normpath(os.path.join(ROOT, '..', '..', out))
    open(dst, 'w', encoding='utf-8').write(page)
    print('built', out, len(page.encode('utf-8')) // 1024, 'KB')
build('classic-shell.html', 'game-civ-clash.html', ['core', 'shared', 'classic'])
if os.path.exists(os.path.join(ROOT, 'ui-shell.html')):
    build('ui-shell.html', 'game-civ-clash-v2.html', ['core', 'shared', 'ui'], 'ui.css')
