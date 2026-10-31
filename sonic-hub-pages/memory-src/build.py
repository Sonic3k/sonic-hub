import json, sys, os
D=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,D)
import importlib, memories_src; importlib.reload(memories_src)
from memories_src import CHAPTERS, M, THREADS, THREAD_OF, FACTS
t=json.load(open(os.path.join(D,"transcripts/media-tree-1990-2007.json")))
# index: album name -> list of (node, parent name)
albums={}
def walk(n, parent):
    albums.setdefault(n['name'],[]).append((n,parent))
    for c in n['children']: walk(c, n['name'])
walk(t, None)
missing=[]
def res(ref):
    album, fn = ref[0], ref[1]; parent = ref[2] if len(ref)>2 else None
    cands=[n for n,p in albums.get(album,[]) if parent is None or p==parent]
    for n in cands:
        for m in n['mediaItems']:
            if m['fileName']==fn: return dict(id=m['id'], url=m['cdnUrl'], w=m['width'], h=m['height'], album=n['id'], caption=m.get('caption'))
    missing.append(ref); return None
out_ch=[]
for c in CHAPTERS:
    c=dict(c); c['cover']=res(c['cover']); out_ch.append(c)
out_m=[]
for m in M:
    m=dict(m); m['photos']=[p for p in (res(r) for r in m['photos']) if p]
    m.setdefault('status','DRAFT'); m.setdefault('source','photo-review')
    if 'place' in m and m['place']:
        a,b,c_=m['place']; m['place']=dict(name=a,lat=b,lng=c_)
    m['links']=[dict(label=a,url=b,kind=c_) for a,b,c_ in m.get('links',[])]
    m['threads']=[THREAD_OF[x] for x in m.get('tags',{}).get('THEME',[]) if x in THREAD_OF]
    out_m.append(m)
trips=json.load(open(os.path.join(D,"trips.json")))
ch_of=lambda y: next((c['key'] for c in CHAPTERS if c['start']<=y<=c['end']), None)
for tr in trips:
    y=(tr.get('date') or '')[:4]
    out_m.append(dict(key="trip-"+tr['key'], kind="TRIP", chapter=ch_of(y) if y and y<="2008" else None, title=tr['title'],
        date=tr.get('date'), end=tr.get('end'), precision=tr.get('precision'), summary=tr.get('note'),
        photos=([dict(id=tr['coverId'], url=tr['coverUrl'])] if tr.get('coverId') else []) + [p for p in tr.get('sample',[]) if p['id']!=tr.get('coverId')][:5],
        stops=tr['stops'], who=tr.get('who'), album=tr.get('album'), mediaCount=tr.get('mediaCount'),
        status=tr.get('status','CONFIRMED') if tr.get('source')=='notebook' else tr.get('status','DRAFT'),
        source=tr.get('source'), tags=dict(ACTIVITY=["Du lịch"], PLACE=sorted({s['name'].split(',')[0] for s in tr['stops']})),
        threads=["ngua-da-hue"] if tr['key'] in ("1994-hue-da-nang","2000-hue-da-nang") else [], skip_map=tr.get('skip_map',False)))
# ── documents: transcriptions from the two reading passes ──
G=json.load(open(os.path.join(D,"transcripts/docs_games.json")))
try: S=json.load(open(os.path.join(D,"transcripts/docs_school.json")))
except Exception: S=[]
try: S2=json.load(open(os.path.join(D,"transcripts/docs_school2.json")))
except Exception: S2=[]
BUS=json.load(open(os.path.join(D,"transcripts/docs_bus.json")))
def _bus(r):
    out=[r['route']+' · '+(r.get('terminals') or '')]
    if r.get('adjusted'): out[0]+='  [điều chỉnh: '+r['adjusted']+']'
    if r.get('outbound'): out.append('  đi: '+' → '.join(r['outbound']))
    if r.get('return'): out.append('  về: '+' → '.join(r['return']))
    meta=[x for x in (r.get('hours'), r.get('frequency'), r.get('fare')) if x]
    if meta: out.append('  '+' · '.join(meta))
    return '\n'.join(out)
BUS_TEXT='Sổ chép tuyến xe buýt Hà Nội\n\n'+'\n'.join(_bus(r) for r in BUS['routes'])
SKIP={'sheet','file','mediaId','mediaIds','files'}
def inline(x):
    if isinstance(x,dict):
        bits=[]
        for k,y in x.items():
            if k in SKIP or y in (None,'',[],{}): continue
            if isinstance(y,list) and all(not isinstance(z,(dict,list)) for z in y): bits.append(' → '.join(map(str,y)))
            elif isinstance(y,(dict,list)): bits.append(k.replace('_',' ')+': '+inline(y))
            else: bits.append(str(y))
        return ' · '.join(bits)
    if isinstance(x,list): return '; '.join(inline(z) for z in x)
    return str(x)
def fmt(v, ind=0):
    pad='  '*ind
    if isinstance(v,str): return pad+v
    if isinstance(v,(int,float)): return pad+str(v)
    if isinstance(v,list):
        out=[]
        for x in v:
            if isinstance(x,dict): out.append(pad+'• '+inline(x))
            elif isinstance(x,list): out.append(fmt(x,ind+1))
            else: out.append(pad+'• '+str(x))
        return '\n'.join(out)
    if isinstance(v,dict):
        out=[]
        for k,x in v.items():
            if k in SKIP or x in (None,'',[],{}): continue
            lab=k.replace('_',' ')
            if isinstance(x,(dict,list)): out.append(pad+lab+':'); out.append(fmt(x,ind+1))
            else: out.append(pad+lab+': '+str(x))
        return '\n'.join(out)
    return pad+str(v)
VISITIN="""1993 · Sầm Sơn – Thanh Hoá
1994 · Đà Nẵng (by train), Huế (by ôtô), Đà Nẵng…
1995 · Sài Gòn (by train), Đà Lạt (by ôtô), Sài Gòn
1996 · No…
1997 · Sầm Sơn – Thanh Hoá (by ôtô)
1998 · Kim Bôi – Hoà Bình (by ôtô), with *
1999 · Cửa Lò – Nghệ An (by train)
2000 · Đà Nẵng (by train), Huế (ôtô) · Hotels: Biệt thự, Kỳ Lân · Impression: Mỹ Sơn
2001 · Hạ Long (by ôtô), Cát Bà (by boat), Trà Cổ (by ôtô), Quảng Đông (Trung Quốc) · Hotels: … (101), Bình Minh · Impression: Mũi Ngọc
2002 · Sài Gòn (by train), Đà Lạt (by ôtô), Sài Gòn (by train) · Hotels: Tao Đàn
2003 · Sầm Sơn (by ôtô), with *
2004 · Quảng Bình (by ôtô), Cửa Lò – Nghệ An (by ôtô) · Hotels: Lâm Đào (201), Việt Anh (404), Biển Nhớ, Công Đoàn (214) · Impression: Việt Anh
2005 · Cửa Lò – Nghệ An (with *) · Hotels: Vinamotor (523)
2005 · Lào Cai (by train) 15-7, Lô Tây – TQ (by ôtô) 16-7, Kunming city 17-7, Stone Forest 19-7, Lào Cai 20-7 · Hotels: … Lô Tây, Baiyun – Kunming (1516), … Thạch Lâm (213)"""
def doc_text(ref):
    if not ref: return None
    if ref=="visitin": return "Trang bìa: Impression in year Summers\n"+VISITIN
    if ';' in ref: return '\n\n'.join(filter(None, (doc_text(r) for r in ref.split(';'))))[:12000]
    kind, ids = ref.split(':',1)
    parts=[]
    if kind=='school2':
        for f in [x.strip() for x in ids.split(',')]:
            for e in S2:
                if e.get('file')==f:
                    head='▸ '+(e.get('title') or f)+(' ('+str(e['year'])+')' if e.get('year') else '')
                    body=[fmt(e.get('content'))]
                    if e.get('teacher_remark'): body.append('Lời phê: '+inline(e['teacher_remark']))
                    if e.get('grade'): body.append('Điểm: '+inline(e['grade']))
                    parts.append(head+'\n'+'\n'.join(x for x in body if x))
    elif kind=='bus':
        parts.append(BUS_TEXT)
    if kind=='games':
        for i in ids.split(','):
            e=G[int(i)]; parts.append('▸ '+e.get('game','')+('\n'+fmt(e.get('content')) if e.get('content') else ''))
    elif kind=='school':
        want=[x.strip() for x in ids.split(',')]
        for e in S:
            if (ids=='chess' and e.get('kind','').startswith('chess')) or e.get('file') in want:
                parts.append('▸ '+(e.get('title') or e.get('file'))+(' ('+str(e['year'])+')' if e.get('year') else '')+'\n'+fmt(e.get('content')))
    t='\n\n'.join(parts).strip()
    return t if kind=='bus' else (t[:9000] if t else None)
for m in out_m:
    m['doc_text']=doc_text(m.get('doc'))
CHESS=[]
for e in S:
    if e.get('kind')=='chess-game':
        c=e['content']; san=c.get('moves_san','')
        if c.get('round')==1: san=san.split(' 16. Qxe4')[0]+' 16. Qxe4'
        CHESS.append(dict(title='Ván '+str(c.get('round'))+' · '+str(c.get('date')), white=c.get('white'), black=c.get('black'), result=(c.get('result') or '').split(' ')[0], san=san,
            note=('Biên bản chỉ đọc được hợp lệ tới nước 16; phần sau ghi lệch nửa nước.' if c.get('round')==1 else None)))
CHESS.sort(key=lambda g:g['title'])
for m in out_m:
    if m['key']=='doi-tuyen-co-2004': m['games']=CHESS
data=dict(schemaVersion=1, generated="2026-11-01", owner="self", chapters=out_ch, memories=out_m, threads=THREADS,
          facts=[dict(category=a,key=b,value=c,status="DRAFT") for a,b,c in FACTS])
json.dump(data, open(os.path.join(D,"../assets/memory-1990-2008.json"),"w"), ensure_ascii=False, indent=1)
print("memories", len(out_m), "missing", missing)
