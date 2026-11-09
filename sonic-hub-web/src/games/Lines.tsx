/* Lines 98: the 9×9 board of Color Lines. Pick a ball, pick an empty square it can reach, and it rolls there; five or
   more of one colour in a row, a column or a diagonal clear away and score, otherwise three new balls come (the small
   ones show where). The board full ends the game. The best score stays in this browser. */
import { useEffect, useRef, useState } from 'react';
import './lines.css';

const N = 9, COLORS = ['#e8352f', '#2f6fe0', '#2bb24a', '#f2c42d', '#9c3fd6', '#26c4d8', '#7a4a22'];
type Board = (number | null)[];
const rnd = (n: number) => Math.floor(Math.random() * n);
const empties = (b: Board) => b.flatMap((v, i) => (v === null ? [i] : []));

/** where three next balls will land, and their colours */
function nextOf(b: Board, avoid: number[] = []): { at: number; c: number }[] {
  const free = empties(b).filter(i => !avoid.includes(i)), out: { at: number; c: number }[] = [];
  for (let k = 0; k < 3 && free.length; k++) out.push({ at: free.splice(rnd(free.length), 1)[0], c: rnd(COLORS.length) });
  return out;
}
/** the squares on a straight line of 5+ through i */
function linesAt(b: Board, i: number): number[] {
  const c = b[i];
  if (c === null) return [];
  const r0 = Math.floor(i / N), c0 = i % N, out = new Set<number>();
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const run = [i];
    for (const s of [1, -1]) {
      let r = r0 + dr * s, cc = c0 + dc * s;
      while (r >= 0 && r < N && cc >= 0 && cc < N && b[r * N + cc] === c) { run.push(r * N + cc); r += dr * s; cc += dc * s; }
    }
    if (run.length >= 5) run.forEach(k => out.add(k));
  }
  return [...out];
}
/** the way from a to b through empty squares (up, down, left, right), or null */
function path(b: Board, a: number, z: number): number[] | null {
  const prev = new Map<number, number>([[a, -1]]), q = [a];
  while (q.length) {
    const i = q.shift()!;
    if (i === z) { const p = [z]; let k = z; while (prev.get(k)! !== -1) { k = prev.get(k)!; p.unshift(k); } return p; }
    const r = Math.floor(i / N), c = i % N;
    for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      const j = nr * N + nc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N || prev.has(j) || b[j] !== null) continue;
      prev.set(j, i); q.push(j);
    }
  }
  return null;
}
const points = (n: number) => n * 2 + (n - 5) * (n - 5) * 2;
const BEST = 'sonic-hub.lines98.best';
const readBest = () => { try { return Number(localStorage.getItem(BEST) ?? 0) || 0; } catch { return 0; } };

function start(): { board: Board; next: { at: number; c: number }[] } {
  const board: Board = Array(N * N).fill(null);
  nextOf(board).forEach(x => { board[x.at] = x.c; });
  nextOf(board).forEach(x => { board[x.at] = x.c; });
  return { board, next: nextOf(board) };
}

export default function Lines() {
  const [g, setG] = useState(start), [sel, setSel] = useState<number | null>(null), [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest), [moving, setMoving] = useState(false), [flash, setFlash] = useState<number[]>([]), [secs, setSecs] = useState(0);
  const over = !empties(g.board).length;
  const started = useRef(false);

  useEffect(() => {
    if (over || !started.current) return;
    const t = setInterval(() => setSecs(v => v + 1), 1000);
    return () => clearInterval(t);
  }, [over, g]);
  useEffect(() => {
    if (score > best) { setBest(score); try { localStorage.setItem(BEST, String(score)); } catch { /* a private window keeps nothing */ } }
  }, [score, best]);

  const clear = (b: Board, at: number[]) => {
    const gone = new Set(at.flatMap(i => linesAt(b, i)));
    if (!gone.size) return 0;
    setFlash([...gone]);
    setTimeout(() => setFlash([]), 260);
    gone.forEach(i => { b[i] = null; });
    return points(gone.size);
  };
  const click = (i: number) => {
    if (moving || over) return;
    const v = g.board[i];
    if (v !== null) { setSel(sel === i ? null : i); return; }
    if (sel === null) return;
    const p = path(g.board, sel, i);
    if (!p) return;
    started.current = true;
    setMoving(true);
    const color = g.board[sel]!;
    let step = 0;
    const tick = () => {
      step++;
      setG(cur => { const b = [...cur.board]; b[p[step - 1]] = null; b[p[step]] = color; return { ...cur, board: b }; });
      if (step < p.length - 1) { setTimeout(tick, 34); return; }
      setTimeout(() => {
        setG(cur => {
          const b = [...cur.board];
          let won = clear(b, [i]);
          let next = cur.next;
          if (!won) {
            const placed: number[] = [];
            next.forEach(x => {
              const at = b[x.at] === null ? x.at : empties(b)[0];
              if (at !== undefined) { b[at] = x.c; placed.push(at); }
            });
            won = clear(b, placed);
            next = nextOf(b);
          }
          if (won) setScore(s => s + won);
          return { board: b, next };
        });
        setSel(null); setMoving(false);
      }, 40);
    };
    setTimeout(tick, 34);
  };
  const reset = () => { setG(start()); setSel(null); setScore(0); setSecs(0); started.current = false; };
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div className="ln">
      <div className="ln-top">
        <div className="ln-num" title="High score">{String(best).padStart(5, '0')}</div>
        <div className="ln-next">{g.next.map((x, k) => <span key={k} className="ln-ball" style={{ ['--c' as string]: COLORS[x.c] }} />)}</div>
        <div className="ln-clock">{clock}</div>
        <div className="ln-num">{String(score).padStart(5, '0')}</div>
      </div>
      <div className="ln-board">
        {g.board.map((v, i) => {
          const pre = v === null ? g.next.find(x => x.at === i) : undefined;
          return <button key={i} type="button" className={`ln-cell ${flash.includes(i) ? 'flash' : ''}`} onClick={() => click(i)}>
            {v !== null && <span className={`ln-ball ${sel === i ? 'jump' : ''}`} style={{ ['--c' as string]: COLORS[v] }} />}
            {pre && <span className="ln-ball small" style={{ ['--c' as string]: COLORS[pre.c] }} />}
          </button>;
        })}
        {over && <div className="ln-over"><b>Game over</b><span>{score} points</span><button type="button" onClick={reset}>New Game</button></div>}
      </div>
      <div className="ln-bar"><button type="button" onClick={reset}>New Game</button></div>
    </div>
  );
}
