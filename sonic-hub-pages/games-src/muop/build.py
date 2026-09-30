# Rebuild ../../game-muop.html from src/*.js + shell.html.  Levels: edit design/w*.py, run design/gen.py, then node check.js
import glob, os
ROOT = os.path.dirname(os.path.abspath(__file__))
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(ROOT, 'src', '*.js'))))
out = open(os.path.join(ROOT, 'shell.html')).read().replace('/*__JS__*/', js)
dst = os.path.normpath(os.path.join(ROOT, '..', '..', 'game-muop.html'))
open(dst, 'w').write(out)
print('built', dst, len(out) // 1024, 'KB')
