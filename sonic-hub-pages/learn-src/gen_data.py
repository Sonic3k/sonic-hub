# Builds common/data.js from the real learn content (../../sonic-hub-learn/content),
# so the demos show exactly what the portal will serve. Run by build.py.
import base64, glob, json, os, re
import markdown
import yaml

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.normpath(os.path.join(ROOT, '..', '..', 'sonic-hub-learn', 'content'))


def md(text, inline=False):
    """Markdown → HTML. Inline strings drop the wrapping <p>."""
    if text is None:
        return None
    html = markdown.markdown(str(text).strip(), extensions=['tables'])
    if inline and html.startswith('<p>') and html.endswith('</p>') and html.count('<p>') == 1:
        html = html[3:-4]
    return html


def data_uri(path):
    raw = open(path, 'rb').read()
    return 'data:image/svg+xml;base64,' + base64.b64encode(raw).decode()


def media(text, base):
    """Point relative media at inline data URIs."""
    if not text:
        return text
    def swap(m):
        p = os.path.normpath(os.path.join(base, m.group(2)))
        return m.group(1) + (data_uri(p) if p.endswith('.svg') and os.path.exists(p) else m.group(2)) + m.group(3)
    text = re.sub(r'(!\[[^\]]*\]\()([^)\s]+)(\))', swap, text)
    text = re.sub(r'(src=")([^"]+)(")', swap, text)
    return text


def natural(s):
    return [int(t) if t.isdigit() else t for t in re.split(r'(\d+)', s)]


subjects, courses, items, questions, lessons, themes = [], {}, {}, {}, {}, {}
course_items = {}

for sdir in sorted(d for d in glob.glob(os.path.join(CONTENT, '*')) if os.path.isdir(d) and not os.path.basename(d).startswith('_')):
    s = yaml.safe_load(open(os.path.join(sdir, 'subject.yaml')))
    theme = os.path.join(sdir, 'theme.css')
    themes[s['id']] = open(theme).read() if os.path.exists(theme) else ''
    subj = {'key': s['id'], 'title': s['title'], 'lang': s.get('lang', 'en-US'), 'prefix': s['prefix'], 'sort': s.get('sort', 0), 'courses': []}
    for cdir in sorted(glob.glob(os.path.join(sdir, 'courses', '*')), key=natural):
        c = yaml.safe_load(open(os.path.join(cdir, 'course.yaml')))
        key = c['id']
        subj['courses'].append(key)
        course = {
            'key': key, 'title': c['title'], 'sort': c.get('sort', 0), 'description': c.get('description'), 'subject': s['id'],
            'source': c['source'], 'tags': c.get('tags', []), 'policy': c.get('policy', {}),
            'exam': c.get('exam'), 'include': c.get('include'), 'chapters': [],
        }
        order = []
        for chdir in sorted((d for d in glob.glob(os.path.join(cdir, '*')) if os.path.exists(os.path.join(d, 'chapter.yaml'))), key=natural):
            ch = yaml.safe_load(open(os.path.join(chdir, 'chapter.yaml')))
            chapter = {'key': os.path.basename(chdir), 'title': ch['title'], 'description': ch.get('description'), 'lessons': []}
            stems = sorted({re.sub(r'\.(md|items\.yaml|slides\.html)$', '', os.path.basename(f))
                            for f in glob.glob(os.path.join(chdir, '*')) if re.search(r'\.(md|items\.yaml|slides\.html)$', f)}, key=natural)
            for stem in stems:
                lid = f"{key}/{chapter['key']}/{stem}"
                lesson = {'id': lid, 'course': key, 'chapter': chapter['title'], 'title': None, 'summary': None, 'body': None, 'slides': None, 'items': []}
                mdp = os.path.join(chdir, stem + '.md')
                if os.path.exists(mdp):
                    raw = open(mdp).read()
                    fm, body = re.match(r'^---\n(.*?)\n---\n(.*)$', raw, re.S).groups()
                    front = yaml.safe_load(fm)
                    lesson['title'] = front['title']
                    lesson['summary'] = front.get('summary')
                    lesson['body'] = md(media(body, chdir))
                sp = os.path.join(chdir, stem + '.slides.html')
                if os.path.exists(sp):
                    lesson['slides'] = media(re.sub(r'<!--.*?-->', '', open(sp).read(), flags=re.S).strip(), chdir)
                ip = os.path.join(chdir, stem + '.items.yaml')
                if os.path.exists(ip):
                    doc = yaml.safe_load(open(ip)) or {}
                    lesson['title'] = lesson['title'] or doc.get('title')
                    for e in doc.get('items', []):
                        ikey = e.get('id') or e.get('ref')
                        lesson['items'].append(ikey)
                        order.append(ikey)
                        if 'id' in e:
                            it = {k: v for k, v in e.items() if k not in ('questions', 'examples', 'related', 'note')}
                            for f in ('front', 'back'):
                                if f in it:
                                    it[f] = md(media(it[f], chdir), inline=(f == 'front'))
                            if it.get('image'):
                                it['image'] = data_uri(os.path.join(chdir, it['image']))
                            it['examples'] = []
                            it['related'] = [r if isinstance(r, str) else r['id'] for r in e.get('related', [])]
                            items.setdefault(ikey, {}).update(it)
                        target = items.setdefault(ikey, {})
                        target.setdefault('examples', [])
                        for ex in e.get('examples', []) or []:
                            ex = ex if isinstance(ex, dict) else {'text': ex}
                            target['examples'].append({'course': key, 'text': ex['text'], 'tr': ex.get('translation')})
                        if e.get('note'):
                            target.setdefault('notes', {})[key] = md(e['note'], inline=True)
                        for q in e.get('questions', []) or []:
                            qk = f"{ikey}#{q['id']}"
                            questions[qk] = {
                                'key': qk, 'item': ikey, 'type': q['type'], 'facet': q.get('facet'),
                                'prompt': q['prompt'] if q['type'] == 'cloze' else md(q['prompt'], inline=True),
                                'options': [{'text': md(o['text'], inline=True), 'correct': bool(o.get('correct')),
                                             'why': md(o.get('why'), inline=True), 'match': o.get('match')} for o in q.get('options', [])],
                                'answer': q.get('answer'), 'answers': q.get('answers'), 'back': md(q.get('back')),
                                'explanation': md(q.get('explanation'), inline=True),
                                'tags': q.get('tags', []), 'courseOnly': key if q.get('course_only') else None,
                            }
                lesson['title'] = lesson['title'] or stem
                chapter['lessons'].append(lid)
                lessons[lid] = lesson
            course['chapters'].append(chapter)
        course_items[key] = order
        courses[key] = course
    subj['courses'].sort(key=lambda k: courses[k]['sort'])
    subjects.append(subj)
subjects.sort(key=lambda s: s['sort'])

# Collection courses list the items of the courses they include.
for key, c in courses.items():
    if c.get('include'):
        seen, out = set(), []
        for rule in c['include']:
            for src in rule['courses']:
                for i in course_items.get(src, []):
                    kind = items.get(i, {}).get('kind')
                    if rule.get('kinds') and kind not in rule['kinds']:
                        continue
                    if i not in seen:
                        seen.add(i)
                        out.append(i)
        course_items[key] = out
for key, c in courses.items():
    seen, out = set(), []
    for i in course_items[key]:
        if i not in seen:
            seen.add(i)
            out.append(i)
    c['items'] = out

data = {
    'subjects': subjects, 'courses': courses, 'items': items, 'questions': questions,
    'lessons': lessons, 'themes': themes,
}
out = os.path.join(ROOT, 'common', 'data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Generated by gen_data.py from sonic-hub-learn/content — do not edit. */\n')
    f.write('const CONTENT = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
print('wrote', out, os.path.getsize(out) // 1024, 'KB', len(items), 'items', len(questions), 'questions', len(lessons), 'lessons')
