/* Minesweeper, from the reference zip he kept (sh1zuku's Windows XP Minesweeper in React): its pictures and its
   rules, written again here without styled-components. Left click opens, right click flags (then ?, then nothing),
   both buttons together (or a middle click, or a double click on a number) open around a number whose flags are all
   placed; the first click is never a mine; on a phone a long press flags. */
import { useEffect, useReducer, useRef, useState, type MouseEvent as RME, type TouchEvent as RTE } from 'react';
import './minesweeper.css';

const A = (f: string) => `/games/minesweeper/${f}.png`;
type Level = 'Beginner' | 'Intermediate' | 'Expert';
const LEVELS: Record<Level, { rows: number; cols: number; mines: number }> = {
  Beginner: { rows: 9, cols: 9, mines: 10 }, Intermediate: { rows: 16, cols: 16, mines: 40 }, Expert: { rows: 16, cols: 30, mines: 99 },
};
type CellState = 'cover' | 'flag' | 'unknown' | 'open' | 'die' | 'misflagged' | 'mine';
interface Cell { state: CellState; around: number /* < 0: a mine */; pressed: boolean }
interface S { level: Level; status: 'new' | 'started' | 'died' | 'won'; rows: number; cols: number; mines: number; cells: Cell[] }
type Act = { t: 'reset'; level?: Level } | { t: 'start'; at: number } | { t: 'open'; at: number } | { t: 'cycle'; at: number }
  | { t: 'die'; at: number } | { t: 'won' } | { t: 'press'; at: number[] };

const fresh = (level: Level): S => {
  const c = LEVELS[level];
  return { level, status: 'new', ...c, cells: Array.from({ length: c.rows * c.cols }, () => ({ state: 'cover' as CellState, around: 0, pressed: false })) };
};
function near(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols), c = i % cols, out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
  }
  return out;
}
/** the cells a click opens: the cell, and around it as far as the empty ones go */
function flood(s: S, i: number): number[] {
  const seen = new Set<number>(), out: number[] = [], stack = [i];
  while (stack.length) {
    const k = stack.pop()!;
    if (seen.has(k)) continue;
    seen.add(k);
    const cell = s.cells[k];
    if (cell.around < 0 || cell.state === 'flag') continue;
    out.push(k);
    if (cell.around === 0) near(k, s.rows, s.cols).forEach(n => stack.push(n));
  }
  return out;
}
function reduce(s: S, a: Act): S {
  switch (a.t) {
    case 'reset': return fresh(a.level ?? s.level);
    case 'start': {
      const cells = s.cells.map(c => ({ ...c })), free = cells.map((_, k) => k).filter(k => k !== a.at);
      for (let n = 0; n < s.mines; n++) {
        const j = n + Math.floor(Math.random() * (free.length - n));
        [free[n], free[j]] = [free[j], free[n]];
        cells[free[n]].around = -10;
        near(free[n], s.rows, s.cols).forEach(k => { cells[k].around += 1; });
      }
      return { ...s, cells, status: 'started' };
    }
    case 'open': {
      const cells = [...s.cells];
      flood(s, a.at).forEach(k => { cells[k] = { ...cells[k], state: 'open' }; });
      return { ...s, cells };
    }
    case 'cycle': {
      const c = s.cells[a.at], next: CellState = c.state === 'cover' ? 'flag' : c.state === 'flag' ? 'unknown' : 'cover';
      const cells = [...s.cells]; cells[a.at] = { ...c, state: next };
      return { ...s, cells };
    }
    case 'die': {
      const cells = s.cells.map(c => c.around < 0 && c.state !== 'flag' ? { ...c, state: 'mine' as CellState, pressed: false }
        : c.state === 'flag' && c.around >= 0 ? { ...c, state: 'misflagged' as CellState, pressed: false } : { ...c, pressed: false });
      cells[a.at] = { ...cells[a.at], state: 'die' };
      return { ...s, status: 'died', cells };
    }
    case 'won': return { ...s, status: 'won', cells: s.cells.map(c => ({ ...c, pressed: false, state: c.around >= 0 ? 'open' : 'flag' })) };
    case 'press': {
      const on = new Set(a.at);
      return { ...s, cells: s.cells.map((c, k) => (on.has(k) !== c.pressed ? { ...c, pressed: on.has(k) } : c)) };
    }
  }
}

function Digits({ n }: { n: number }) {
  const t = n < 0 ? `-${String(Math.min(99, -n)).padStart(2, '0')}` : String(Math.min(999, n)).padStart(3, '0');
  return <div className="ms-digits">{t.split('').map((d, k) => <img key={k} src={A(d === '-' ? 'digit-' : `digit${d}`)} alt={d} />)}</div>;
}

export default function Minesweeper({ onClose }: { onClose?: () => void }) {
  const [s, send] = useReducer(reduce, 'Beginner', fresh);
  const [secs, setSecs] = useState(0), [menu, setMenu] = useState<'' | 'Game' | 'Help'>(''), [about, setAbout] = useState(false);
  const buttons = useRef(0), down = useRef<number | null>(null), longPress = useRef<number | null>(null), [face, setFace] = useState(false);
  const over = s.status === 'died' || s.status === 'won';

  useEffect(() => {
    if (s.status === 'new') setSecs(0);
    if (s.status !== 'started') return;
    const t = setInterval(() => setSecs(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [s.status]);
  useEffect(() => {
    if (s.status === 'started' && !s.cells.some(c => c.around >= 0 && c.state !== 'open')) send({ t: 'won' });
  });
  useEffect(() => { const up = () => { buttons.current = 0; setFace(false); }; window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, []);

  const open = (i: number) => {
    if (s.status === 'new') { send({ t: 'start', at: i }); send({ t: 'open', at: i }); return; }
    if (s.status !== 'started') return;
    const c = s.cells[i];
    if (c.state === 'flag' || c.state === 'open') return;
    send(c.around < 0 ? { t: 'die', at: i } : { t: 'open', at: i });
  };
  /** both buttons on a number whose flags are all down: open the rest around it */
  const chord = (i: number) => {
    const c = s.cells[i];
    if (s.status !== 'started' || c.state !== 'open' || c.around <= 0) return;
    const ns = near(i, s.rows, s.cols);
    if (ns.filter(k => s.cells[k].state === 'flag').length !== c.around) return;
    const bad = ns.find(k => s.cells[k].around < 0 && s.cells[k].state !== 'flag');
    if (bad !== undefined) send({ t: 'die', at: bad });
    else ns.forEach(k => { if (s.cells[k].state === 'cover' || s.cells[k].state === 'unknown') send({ t: 'open', at: k }); });
  };
  const pressAt = (i: number, both: boolean) => send({ t: 'press', at: both ? [i, ...near(i, s.rows, s.cols)].filter(k => ['cover', 'unknown'].includes(s.cells[k].state)) : ['cover', 'unknown'].includes(s.cells[i].state) ? [i] : [] });

  const onDown = (e: RME, i: number) => {
    e.preventDefault();
    if (over) return;
    buttons.current = e.buttons;
    if (e.button === 2 && e.buttons !== 3) { if (s.cells[i].state !== 'open') send({ t: 'cycle', at: i }); return; }
    down.current = i; setFace(true);
    pressAt(i, e.buttons === 3 || e.button === 1);
  };
  const onEnter = (i: number) => { if (!buttons.current || over || buttons.current === 2) return; down.current = i; pressAt(i, buttons.current === 3 || buttons.current === 4); };
  const onUp = (e: RME, i: number) => {
    if (over) return;
    const both = buttons.current === 3 || e.button === 1 || buttons.current === 4;
    send({ t: 'press', at: [] }); setFace(false);
    if (down.current !== i) { buttons.current = 0; return; }
    if (both) chord(i); else if (e.button === 0) open(i);
    buttons.current = 0; down.current = null;
  };
  const touchStart = (i: number) => { longPress.current = window.setTimeout(() => { longPress.current = null; if (!over && s.cells[i].state !== 'open') send({ t: 'cycle', at: i }); }, 420); };
  const touchEnd = (e: RTE, i: number) => {
    e.preventDefault();
    if (longPress.current === null) return;
    clearTimeout(longPress.current); longPress.current = null;
    if (s.cells[i].state === 'open') chord(i); else open(i);
  };
  const flags = s.cells.filter(c => c.state === 'flag').length;
  const faceImg = s.status === 'died' ? 'dead' : s.status === 'won' ? 'win' : face ? 'ohh' : 'smile';
  const pick = (level?: Level) => { send({ t: 'reset', level }); setMenu(''); };

  return (
    <div className="ms" onContextMenu={e => e.preventDefault()} onMouseLeave={() => setMenu('')}>
      <div className="ms-menu">
        {(['Game', 'Help'] as const).map(m => <div key={m} className={`ms-mi ${menu === m ? 'on' : ''}`} onMouseDown={() => setMenu(menu === m ? '' : m)} onMouseEnter={() => menu && setMenu(m)}>{m}
          {menu === m && m === 'Game' && <div className="ms-drop" onMouseDown={e => e.stopPropagation()}>
            <div onMouseUp={() => pick()}>New<span>F2</span></div><hr />
            {(Object.keys(LEVELS) as Level[]).map(l => <div key={l} onMouseUp={() => pick(l)}>{s.level === l && <img src={A('checked')} alt="" />}{l}</div>)}
            {onClose && <><hr /><div onMouseUp={() => { setMenu(''); onClose(); }}>Exit</div></>}
          </div>}
          {menu === m && m === 'Help' && <div className="ms-drop" onMouseDown={e => e.stopPropagation()}><div onMouseUp={() => { setMenu(''); setAbout(true); }}>About Minesweeper…</div></div>}
        </div>)}
      </div>
      <div className="ms-body" onMouseDown={() => setMenu('')}>
        <div className="ms-score">
          <Digits n={s.mines - flags} />
          <button type="button" className="ms-face" onMouseUp={() => pick()}><img src={A(faceImg)} alt="" /></button>
          <Digits n={secs} />
        </div>
        <div className="ms-grid" style={{ gridTemplateColumns: `repeat(${s.cols}, 16px)` }} onMouseLeave={() => send({ t: 'press', at: [] })}>
          {s.cells.map((c, i) => {
            const openLook = c.state === 'open' || c.state === 'mine' || c.state === 'die' || c.state === 'misflagged' || c.pressed;
            const img = c.state === 'open' ? (c.around > 0 ? A(`open${c.around}`) : null) : c.state === 'flag' ? A('flag') : c.state === 'unknown' ? A('question')
              : c.state === 'mine' ? A('mine-ceil') : c.state === 'die' ? A('mine-death') : c.state === 'misflagged' ? A('misflagged') : null;
            return <div key={i} className={`ms-cell ${openLook ? 'open' : ''}`} onMouseDown={e => onDown(e, i)} onMouseUp={e => onUp(e, i)} onMouseEnter={() => onEnter(i)}
              onDoubleClick={() => chord(i)} onTouchStart={() => touchStart(i)} onTouchEnd={e => touchEnd(e, i)}>{img && <img src={img} alt="" draggable={false} />}</div>;
          })}
        </div>
      </div>
      {about && <div className="ms-about" onMouseDown={() => setAbout(false)}><div><b>Minesweeper</b><p>React version by sh1zuku.</p><button type="button">OK</button></div></div>}
    </div>
  );
}
