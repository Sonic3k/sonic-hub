# Rebuild ../../game-forum-tycoon.html from src/*.js + shell.html.  Balance: node sim.js 100   One run: node trace.js fan student 1001
import glob, os
ROOT = os.path.dirname(os.path.abspath(__file__))
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))))
out = open(os.path.join(ROOT, 'shell.html'), encoding='utf-8').read().replace('/*__JS__*/', js)
dst = os.path.normpath(os.path.join(ROOT, '..', '..', 'game-forum-tycoon.html'))
open(dst, 'w', encoding='utf-8').write(out)
print('built', dst, len(out.encode('utf-8')) // 1024, 'KB')
