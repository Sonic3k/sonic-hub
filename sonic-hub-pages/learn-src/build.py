# Rebuild ../learn-desk.html, ../learn-rhythm.html and ../learn-aero.html:
# content (gen_data.py → common/data.js) + common/engine.js + <vibe>/ui.js, inlined into <vibe>/shell.html.
import os, subprocess, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(ROOT, 'gen_data.py')], check=True)
common = ''.join(open(os.path.join(ROOT, 'common', f), encoding='utf-8').read() + '\n' for f in ('data.js', 'engine.js'))
for vibe in ('desk', 'rhythm', 'aero'):
    shell = os.path.join(ROOT, vibe, 'shell.html')
    if not os.path.exists(shell):
        continue
    ui = open(os.path.join(ROOT, vibe, 'ui.js'), encoding='utf-8').read()
    out = open(shell, encoding='utf-8').read().replace('/*__JS__*/', common + ui)
    dst = os.path.normpath(os.path.join(ROOT, '..', f'learn-{vibe}.html'))
    open(dst, 'w', encoding='utf-8').write(out)
    print('built', dst, len(out) // 1024, 'KB')
