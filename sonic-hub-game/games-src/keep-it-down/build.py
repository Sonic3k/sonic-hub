#!/usr/bin/env python3
"""Puts Keep It Down together as one self-contained page: shell.html + src/*.js -> ../../public/games/keep-it-down.html

The rules and the computer player (00-core.js, 10-ai.js) go into their own <script id="engine">, so the page can start
the same text again as a worker and let the computer think without holding up the drawing.
"""
import glob, os

ROOT = os.path.dirname(os.path.abspath(__file__))
ENGINE = ('00-core.js', '10-ai.js')
read = lambda f: open(f, encoding='utf-8').read()
files = sorted(glob.glob(os.path.join(ROOT, 'src', '*.js')))
engine = '\n'.join(read(f) for f in files if os.path.basename(f) in ENGINE)
page = '\n'.join(read(f) for f in files if os.path.basename(f) not in ENGINE)
out = read(os.path.join(ROOT, 'shell.html')).replace('/*__ENGINE__*/', engine).replace('/*__JS__*/', page)
dst = os.path.normpath(os.path.join(ROOT, '..', '..', 'public', 'games', 'keep-it-down.html'))
open(dst, 'w', encoding='utf-8').write(out)
print('built', dst, len(out.encode('utf-8')) // 1024, 'KB')
