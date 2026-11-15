# Rebuild ../../public/games/penned-in.html from shell.html + src/*.js.
#   Rules and AI checks: node test.js      The levels against each other: node sim.js 15 11 100
# The rules and the AI (00-core.js, 10-ai.js) go into their own <script id="engine">: the page also starts that text as a worker.
import glob, os
ROOT = os.path.dirname(os.path.abspath(__file__))
ENGINE = ('00-core.js', '10-ai.js')
read = lambda f: open(f, encoding='utf-8').read()
files = sorted(glob.glob(os.path.join(ROOT, 'src', '*.js')))
engine = '\n'.join(read(f) for f in files if os.path.basename(f) in ENGINE)
page = '\n'.join(read(f) for f in files if os.path.basename(f) not in ENGINE)
out = read(os.path.join(ROOT, 'shell.html')).replace('/*__ENGINE__*/', engine).replace('/*__JS__*/', page)
dst = os.path.normpath(os.path.join(ROOT, '..', '..', 'public', 'games', 'penned-in.html'))
open(dst, 'w', encoding='utf-8').write(out)
print('built', dst, len(out.encode('utf-8')) // 1024, 'KB')
