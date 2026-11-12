/* The player for a game that is someone else's file (catalogue entries with `frame`): a game found on the web and
   kept to look at. The file is read as text and shown in a frame that has none of this site's origin: it cannot
   reach this page, what the portal keeps in the browser (favorites, other games' saves) or lead the tab away, and
   it loads only from the hosts its entry lists (its fonts). What it keeps for itself (its settings) lasts until the
   frame closes. The bar above it is the way back to the shelf and lets the game fill the screen. */
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { gamePage } from '../catalog';
import { useData } from '../data';
import { rememberPlayed } from '../store';
import { Missing, useTitle } from './GamePage';

/** the hosts as "https://name" words only, whatever the catalogue holds */
const hostList = (hosts?: string) => (hosts ?? '').split(/\s+/).filter(h => /^https:\/\/[a-z0-9.-]+$/i.test(h)).join(' ');

/** The page with its policy ahead of everything in the file, so nothing of its own loads or runs before the policy
 *  holds (a page that opens with a doctype keeps one in front). */
export function confined(html: string, hosts?: string): string {
  const policy = `default-src 'unsafe-inline' data: blob: ${hostList(hosts)}; form-action 'none'; base-uri 'none'`;
  return (/^\s*<!doctype/i.test(html) ? '<!doctype html>' : '') + `<meta http-equiv="Content-Security-Policy" content="${policy}">` + html;
}

export default function Player() {
  const { key = '' } = useParams(), data = useData();
  const game = data.byKey.get(key), frame = game?.frame ?? null;
  const [doc, setDoc] = useState<string | null>(null), [failed, setFailed] = useState(false), [full, setFull] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const canFill = typeof document !== 'undefined' && document.fullscreenEnabled;
  useTitle(game && frame ? game.title : 'Not found');

  // an address opened directly (a link someone sent) counts as played too
  useEffect(() => { if (game && frame) rememberPlayed(game.key); }, [game, frame]);

  useEffect(() => {
    if (!frame) return;
    let gone = false;
    setDoc(null); setFailed(false);
    fetch(frame.file).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(t => { if (!gone) setDoc(confined(t, frame.hosts)); }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, [frame]);

  // leaving the browser's own full screen (Esc) brings the bar's button back in step
  useEffect(() => {
    const left = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', left);
    return () => document.removeEventListener('fullscreenchange', left);
  }, []);

  if (!game || !frame) return <div className="player-none"><Missing /></div>;

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => { /* already out */ });
    else void box.current?.requestFullscreen?.().catch(() => { /* refused: the page already fills the window */ });
  };

  return (
    <div className="player" ref={box}>
      <div className="player-bar">
        <Link className="player-home" to="/"><span aria-hidden="true">‹</span> Sonic Hub Games</Link>
        <Link className="player-title" to={gamePage(game)} lang={game.lang}>{game.title}</Link>
        {canFill && <button type="button" className="player-fill" onClick={toggle}>{full ? 'Exit full screen' : 'Full screen'}</button>}
      </div>
      {failed
        ? <div className="player-msg"><p className="notice-title">This game could not be opened</p><p>Its file did not arrive. Try again in a moment.</p><Link className="btn btn-steel" to={gamePage(game)}>Back to its page</Link></div>
        : doc === null
          ? <div className="player-msg" role="status"><p>Opening {game.title}…</p></div>
          : <iframe title={game.title} srcDoc={doc} sandbox="allow-scripts allow-pointer-lock" allow="fullscreen *; autoplay *; gamepad *"
              referrerPolicy="no-referrer" onLoad={e => e.currentTarget.focus()} />}
    </div>
  );
}
