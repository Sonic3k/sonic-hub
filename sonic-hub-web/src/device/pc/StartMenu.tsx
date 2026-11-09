/* Start, as each system had it: the grey menu with its banner (98), the two columns under his picture (XP), the glass
   menu with search (Vista, 7), the screen of tiles (8.1), the list and live tiles (10), the centred pinned grid (11).
   Every entry opens what the desktop icon would; Shut down goes back to the portal on T's day. */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { cdn } from '../../api/client';
import { desk, type DeskItem } from '../api';
import { DAYS, utc, vn, vnDate } from '../moment';
import { useAssets } from '../assets';
import { Glyph, Mark } from '../glyphs';
import { Wallpaper } from '../wallpapers';
import { browserGlyph, browserName, skinOf, useDesk } from './desk';

type It = Pick<DeskItem, 'key' | 'label' | 'glyph' | 'app' | 'target'>;
const SYSTEM = new Set(['computer', 'recycle', 'documents', 'user-folder', 'network', 'control', 'heart-folder', 'sticky']);
const FILE = /\.(docx?|txt|jpe?g|png|pptx?|rar|zip|pdf|xlsx?)$/i;
const PINNED_APPS = ['browser', 'yahoo', 'word', 'messages', 'zalo', 'messenger', 'skype', 'notepad', 'memories'];
/** the folders of Programs his games sit in, by the part of their key after "start/" (<device>/start/<folder>/<name>) */
const FOLDER_NAMES: Record<string, string> = { games: 'Games', 'win-games': 'Win Games' };
const folderOf = (key: string) => key.split('/start/')[1]?.split('/')[0] ?? 'games';
const folderName = (f: string) => FOLDER_NAMES[f] ?? f.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function useLists() {
  const { machine, os, ver } = useDesk();
  const skin = skinOf(os);
  return useMemo(() => {
    const items = machine.items;
    const byApp = new Map<string, It>();
    const place = (p: string) => (p === 'START' ? 0 : p === 'TASKBAR' ? 1 : p === 'DESKTOP' ? 2 : 9);
    const ranked = items.filter(i => place(i.place) < 9).sort((a, b) => place(a.place) - place(b.place));
    for (const app of PINNED_APPS) {
      const it = ranked.find(i => i.app === app);
      if (!it) continue;
      byApp.set(app, app === 'browser' ? { ...it, label: skin === 'xp' ? 'Internet' : browserName(ver.browser), glyph: browserGlyph(ver.browser) }
        : app === 'notepad' ? { ...it, label: 'Notepad', glyph: 'notepad' } : app === 'yahoo' ? { ...it, label: 'Yahoo! Messenger' } : it);
    }
    const pinned = [...byApp.values()];
    const seen = new Set<string>();
    const programs = items.filter(i => (i.place === 'DESKTOP' || i.place === 'TASKBAR') && !SYSTEM.has(i.glyph ?? '')
      && !FILE.test(i.label) && !(i.glyph ?? '').startsWith('folder'))
      .filter(i => { const k = i.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }));
    // his games on this machine (Start entries that open a game): folders in Programs (Games, Win Games…)
    const games = items.filter(i => i.place === 'START' && (i.app === 'game' || i.app === 'gamecard' || i.app === 'emulator'))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }));
    const folders: [string, It[]][] = [];
    for (const it of games) {
      const name = folderName(folderOf(it.key));
      const f = folders.find(x => x[0] === name);
      if (f) f[1].push(it); else folders.push([name, [it]]);
    }
    folders.sort((a, b) => a[0].localeCompare(b[0]));
    const my = skin === 'w98' || skin === 'xp';
    const places: It[] = [
      { key: 'p-docs', label: my ? 'My Documents' : 'Documents', glyph: 'documents', app: 'documents' },
      { key: 'p-pics', label: my ? 'My Pictures' : 'Pictures', glyph: 'folder-pictures', app: 'pictures' },
      { key: 'p-angels', label: 'Angels', glyph: 'heart-folder', app: 'angels' },
      { key: 'p-pc', label: my ? 'My Computer' : skin === 'vista' || skin === 'w7' ? 'Computer' : 'This PC', glyph: 'computer', app: 'computer' },
      { key: 'p-ctl', label: skin === 'w10' || skin === 'w11' ? 'Settings' : 'Control Panel', glyph: skin === 'w10' || skin === 'w11' ? 'settings' : 'control', app: 'control' },
    ];
    return { pinned, programs: skin === 'w98' || skin === 'xp' ? programs : [...programs, ...games], places, folders };
  }, [machine.items, skin, ver.browser]);
}

/** the folders of Programs with his games, each opening in place under its name */
function Folders({ folders, pick, size = 16 }: { folders: [string, It[]][]; pick: (it: It) => void; size?: number }) {
  const [open, setOpen] = useState<string | null>(null);
  return <>{folders.map(([name, its]) => <div key={name}>
    <button type="button" className={`dv-sm-row arrow ${open === name ? 'open' : ''}`} onClick={() => setOpen(o => (o === name ? null : name))}>
      <Glyph name="folder" size={size} /><span><b>{name}</b></span></button>
    {open === name && <div className="dv-sm98-in">{its.map(it => <Row key={it.key} it={it} onPick={pick} />)}</div>}
  </div>)}</>;
}

function Row({ it, size = 16, sub, onPick }: { it: It; size?: number; sub?: string; onPick: (it: It) => void }) {
  return (
    <button type="button" className="dv-sm-row" onClick={() => onPick(it)}>
      <Glyph name={it.glyph} label={it.label} size={size} /><span><b>{it.label}</b>{sub && <small>{sub}</small>}</span>
    </button>
  );
}

export function StartMenu({ onClose }: { onClose: () => void }) {
  const { os, openItem } = useDesk();
  const skin = skinOf(os);
  const pick = (it: It) => { onClose(); openItem(it); };
  const props = { pick, onClose };
  return (
    <div className={`dv-sm-wrap dv-sm-${skin}`} onClick={e => e.stopPropagation()}>
      {skin === 'w98' ? <Start98 {...props} /> : skin === 'xp' ? <StartXp {...props} /> : skin === 'vista' || skin === 'w7' ? <Start7 {...props} />
        : skin === 'w81' ? <Start81 {...props} /> : skin === 'w10' ? <Start10 {...props} /> : <Start11 {...props} />}
    </div>
  );
}

interface P { pick: (it: It) => void; onClose: () => void }

function Start98({ pick }: P) {
  const { shutdown } = useDesk();
  const { pinned, programs, folders } = useLists();
  const [sub, setSub] = useState(false);
  return (
    <div className="dv-sm dv-sm98">
      <div className="dv-sm98-band"><b>Windows</b><i>98</i></div>
      <div className="dv-sm98-list">
        {pinned.slice(0, 4).map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)}
        <hr />
        <div className="dv-sm98-sub">
          <button type="button" className="dv-sm-row arrow" onClick={() => setSub(s => !s)}><Glyph name="folder" size={24} /><span><b>Programs</b></span></button>
          {sub && <div className="dv-sm98-fly">
            <Folders folders={folders} pick={pick} />
            {programs.map(it => <Row key={it.key} it={it} onPick={pick} />)}</div>}
        </div>
        <Row it={{ key: 'd', label: 'Documents', glyph: 'documents', app: 'documents' }} size={24} onPick={pick} />
        <Row it={{ key: 'p', label: 'Pictures', glyph: 'folder-pictures', app: 'pictures' }} size={24} onPick={pick} />
        <Row it={{ key: 's', label: 'Settings', glyph: 'control', app: 'control' }} size={24} onPick={pick} />
        <hr />
        <button type="button" className="dv-sm-row" onClick={shutdown}><Glyph name="computer" size={24} /><span><b>Shut Down…</b></span></button>
      </div>
    </div>
  );
}

function StartXp({ pick }: P) {
  const { shutdown, ver } = useDesk();
  const { pinned, programs, places, folders } = useLists();
  const [all, setAll] = useState(false);
  const pic = useAssets('xp').a('user/chess.png');
  return (
    <div className="dv-sm dv-smxp">
      <header><span className="dv-sm-pic">{pic ? <img src={pic} alt="" /> : <Glyph name="chess" size={40} />}</span><b>Sonic3k</b></header>
      <div className="dv-smxp-cols">
        <div className="dv-smxp-left">
          {pinned.map(it => <Row key={it.key} it={it} size={32} sub={it.app === 'browser' ? browserName(ver.browser).replace(/^Microsoft /, '') : undefined} onPick={pick} />)}
          <div className="dv-smxp-sp" />
          <div className="dv-smxp-allwrap">
            <button type="button" className={`dv-smxp-all ${all ? 'on' : ''}`} onClick={() => setAll(a => !a)}><b>All Programs</b><i /></button>
            {all && <div className="dv-smxp-fly"><Folders folders={folders} pick={pick} />{programs.map(it => <Row key={it.key} it={it} onPick={pick} />)}</div>}
          </div>
        </div>
        <div className="dv-smxp-right">
          {places.slice(0, 3).map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)}
          <hr />
          {places.slice(3).map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)}
        </div>
      </div>
      <footer>
        <button type="button" onClick={shutdown}><span className="dv-smxp-key k1" />Log Off</button>
        <button type="button" onClick={shutdown}><span className="dv-smxp-key k2"><Mark size={12} /></span>Turn Off Computer</button>
      </footer>
    </div>
  );
}

function Start7({ pick }: P) {
  const { shutdown, os } = useDesk();
  const { pinned, programs, places } = useLists();
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  const found = q ? [...pinned, ...programs, ...places].filter((it, i, a) => it.label.toLowerCase().includes(q.toLowerCase()) && a.findIndex(x => x.label === it.label) === i) : null;
  return (
    <div className="dv-sm dv-sm7">
      <div className="dv-sm7-left">
        <div className="dv-sm7-list">
          {found ? found.map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)
            : all ? programs.map(it => <Row key={it.key} it={it} onPick={pick} />)
            : pinned.map(it => <Row key={it.key} it={it} size={32} onPick={pick} />)}
        </div>
        {!found && <button type="button" className="dv-sm7-all" onClick={() => setAll(a => !a)}>{all ? '◂  Back' : 'All Programs  ▸'}</button>}
        <div className="dv-sm7-search"><input value={q} onChange={e => setQ(e.target.value)} placeholder={os === 'VISTA' ? 'Start Search' : 'Search programs and files'} /></div>
      </div>
      <div className="dv-sm7-right">
        <div className="dv-sm7-pic"><Glyph name="chess" size={44} /></div>
        <Row it={{ key: 'u', label: 'Sonic3k', glyph: 'user-folder', app: 'documents' }} onPick={pick} />
        {places.map(it => <Row key={it.key} it={it} onPick={pick} />)}
        <div className="dv-sm7-power"><button type="button" onClick={shutdown}>Shut down</button><button type="button" className="dv-sm7-arrow" onClick={shutdown} aria-label="Shut down">▸</button></div>
      </div>
    </div>
  );
}

/* ── tiles (8.1, 10) ────────────────────────────────────────────────────── */

const TILE_COLORS = ['#2d89ef', '#00a300', '#da532c', '#603cba', '#b91d47', '#00aba9', '#e3a21a', '#1e7145', '#2b5797', '#9f00a7'];

function useLive() {
  const { at } = useDesk();
  const mem = useQuery({ queryKey: ['desk-memories', at, '', 0, 4], queryFn: () => desk.memories(at, undefined, 0, 4) });
  return mem.data?.items ?? [];
}

function Tile({ it, wide, color, children, onPick }: { it: It; wide?: boolean; color: string; children?: ReactNode; onPick: (it: It) => void }) {
  return (
    <button type="button" className={`dv-tile ${wide ? 'wide' : ''}`} style={{ background: color }} onClick={() => onPick(it)} title={it.label}>
      {children ?? <Glyph name={it.glyph} label={it.label} size={wide ? 44 : 40} />}
      <span className="dv-tile-label">{it.label}</span>
    </button>
  );
}

function LiveTiles({ pick, accent, lead }: { pick: (it: It) => void; accent: string; lead?: ReactNode }) {
  const { T, data } = useDesk();
  const { pinned, places } = useLists();
  const memories = useLive();
  const v = vn(T);
  const photo = data.day.photos[0];
  const tiles: ReactNode[] = [
    lead,
    <Tile key="cal" it={{ key: 'cal', label: 'Calendar', glyph: 'calendar', app: 'control' }} color={accent} onPick={pick}>
      <div className="dv-tile-cal"><b>{v.d}</b><span>{DAYS[v.wd]}</span></div>
    </Tile>,
    <Tile key="photos" wide it={{ key: 'photos', label: 'Photos', glyph: 'photos', app: 'pictures' }} color="#0063b1" onPick={pick}>
      {photo ? <img className="dv-tile-img" src={cdn(photo.url, 320)} alt="" /> : undefined}
    </Tile>,
    <Tile key="mem" wide it={{ key: 'mem', label: 'Ký ức', glyph: 'sticky', app: 'memories' }} color="#b8860b" onPick={pick}>
      {memories[0] ? <div className="dv-tile-text"><b>{memories[0].title || (memories[0].summary ?? '').slice(0, 50)}</b><small>{vnDate(utc(memories[0].at))}</small></div> : undefined}
    </Tile>,
    ...[...pinned.filter(p => p.app !== 'memories'), ...places.filter(p => p.app === 'angels' || p.app === 'computer' || p.app === 'documents')]
      .map((it, i) => <Tile key={it.key} it={it} color={TILE_COLORS[i % TILE_COLORS.length]} onPick={pick} />),
  ];
  return <div className="dv-tiles">{tiles}</div>;
}

function Start81({ pick, onClose }: P) {
  const { shutdown, machine } = useDesk();
  return (
    <div className="dv-sm81">
      <header>
        <h1>Start</h1>
        <div className="dv-sm81-user"><span>Sonic3k</span><span className="dv-sm-pic"><Glyph name="chess" size={30} /></span>
          <button type="button" className="dv-sm81-power" onClick={shutdown} aria-label="Shut down"><Power /></button></div>
      </header>
      <div className="dv-sm81-body">
        <LiveTiles pick={pick} accent="#008a8a" lead={
          <button type="button" key="desk" className="dv-tile wide dv-tile-desk" onClick={onClose}>
            <Wallpaper wp={machine.wallpaper} fallback="win81-teal" /><span className="dv-tile-label">Desktop</span>
          </button>} />
      </div>
    </div>
  );
}

function Start10({ pick }: P) {
  const { shutdown } = useDesk();
  const { pinned, programs, places } = useLists();
  const list = useMemo(() => {
    const all = [...programs, ...pinned].filter((it, i, a) => a.findIndex(x => x.label === it.label) === i)
      .sort((a, b) => a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }));
    const groups: [string, It[]][] = [];
    for (const it of all) {
      const ch = it.label[0].toUpperCase();
      const k = /[A-Z]/.test(ch) ? ch : /[À-ỹ]/i.test(ch) ? ch.normalize('NFD')[0].toUpperCase() : '#';
      const g = groups.find(x => x[0] === k);
      if (g) g[1].push(it); else groups.push([k, [it]]);
    }
    return groups;
  }, [programs, pinned]);
  return (
    <div className="dv-sm dv-sm10">
      <nav className="dv-sm10-rail">
        <span className="dv-sm10-burger">≡</span>
        <div className="dv-sm10-railbot">
          <button type="button" title="Sonic3k" onClick={() => pick({ key: 'u', label: 'Sonic3k', glyph: 'user-folder', app: 'documents' })}><Glyph name="chess" size={20} /></button>
          {places.filter(p => p.app === 'documents' || p.app === 'pictures' || p.app === 'control').map(p =>
            <button type="button" key={p.key} title={p.label} onClick={() => pick(p)}><Glyph name={p.glyph} label={p.label} size={20} /></button>)}
          <button type="button" title="Power" onClick={shutdown}><Power /></button>
        </div>
      </nav>
      <div className="dv-sm10-list">
        {list.map(([k, its]) => <div key={k}><h6>{k}</h6>{its.map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)}</div>)}
      </div>
      <div className="dv-sm10-tiles"><h5>Life at a glance</h5><LiveTiles pick={pick} accent="#0078d7" /></div>
    </div>
  );
}

function Start11({ pick }: P) {
  const { shutdown } = useDesk();
  const { pinned, programs, places } = useLists();
  const memories = useLive();
  const { scene } = useDesk();
  const [all, setAll] = useState(false);
  const grid = [...pinned, ...places.filter(p => p.app !== 'control'), places.find(p => p.app === 'control')!].slice(0, 18);
  return (
    <div className="dv-sm dv-sm11">
      <div className="dv-sm11-search"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.6" /><path d="M10 10l4.5 4.5" /></svg><span>Search for apps, settings, and documents</span></div>
      <div className="dv-sm11-head"><b>{all ? 'All apps' : 'Pinned'}</b><button type="button" onClick={() => setAll(a => !a)}>{all ? '‹  Back' : 'All apps  ›'}</button></div>
      {all ? (
        <div className="dv-sm11-all">{programs.map(it => <Row key={it.key} it={it} size={24} onPick={pick} />)}</div>
      ) : <>
        <div className="dv-sm11-grid">{grid.map(it => (
          <button type="button" key={it.key} onClick={() => pick(it)} title={it.label}><Glyph name={it.glyph} label={it.label} size={32} /><span>{it.label}</span></button>
        ))}</div>
        <div className="dv-sm11-head"><b>Recommended</b></div>
        <div className="dv-sm11-rec">{memories.map(m => (
          <button type="button" key={m.id} onClick={() => scene(m.id)}><Glyph name="sticky" size={28} />
            <span><b>{m.title || (m.summary ?? '').slice(0, 50)}</b><small>{vnDate(utc(m.at))}</small></span></button>
        ))}</div>
      </>}
      <footer><span className="dv-sm11-user"><span className="dv-sm-pic"><Glyph name="chess" size={22} /></span>Sonic3k</span>
        <button type="button" onClick={shutdown} aria-label="Power"><Power /></button></footer>
    </div>
  );
}

const Power = () => <svg className="dv-power" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8v6M4.6 4.2a5 5 0 1 0 6.8 0" /></svg>;

