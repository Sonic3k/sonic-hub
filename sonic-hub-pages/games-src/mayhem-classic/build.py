# Builds ../../game-mayhem-classic.html (Mayhem Classic) from the game core and its UI.
#   src/core    rules, symbols, heroes, engine, AI (pure, no DOM) — also used by sim.js / test.js
#   src/shared  symbol art, card pictures, hero colours, sound
#   src/ui      the table UI (shell: ui-shell.html + ui.css)
import glob, os
ROOT = os.path.dirname(os.path.abspath(__file__))
js = '\n'.join(open(f, encoding='utf-8').read() for d in ['core', 'shared', 'ui'] for f in sorted(glob.glob(os.path.join(ROOT, 'src', d, '*.js'))))
page = open(os.path.join(ROOT, 'ui-shell.html'), encoding='utf-8').read().replace('/*__CSS__*/', open(os.path.join(ROOT, 'ui.css'), encoding='utf-8').read()).replace('/*__JS__*/', js)
dst = os.path.normpath(os.path.join(ROOT, '..', '..', 'game-mayhem-classic.html'))
open(dst, 'w', encoding='utf-8').write(page)
print('built game-mayhem-classic.html', len(page.encode('utf-8')) // 1024, 'KB')
