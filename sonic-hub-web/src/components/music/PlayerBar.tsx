/* The bar a song plays in, under every page of Music: the song and where it came from, play / pause, how far along it
   is (drag to move), the next song, close. The frame draws it while he is in Music; leaving Music stops the song.
   The audio element is there the whole time (the bar only while a song is on), so a tap can start it at once. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../../api/client';
import { player, usePlayer } from '../../lib/player';

const clock = (s: number) => (isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

export default function PlayerBar() {
  const { now, from } = usePlayer();
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false), [t, setT] = useState(0), [d, setD] = useState(0);
  useEffect(() => { player.attach(audio.current); return () => { player.stop(); player.attach(null); }; }, []);
  // a new song starts by itself (this runs inside the tap that chose it, which is what a phone asks for)
  useEffect(() => { setT(0); setD(0); const a = audio.current; if (a && now?.audioUrl) void a.play().catch(() => {}); }, [now?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // the pages leave room for the bar while a song is on
  useEffect(() => { document.body.classList.toggle('has-player', !!now); return () => document.body.classList.remove('has-player'); }, [now]);
  const src = now?.audioUrl ? apiUrl(now.audioUrl.replace(/^\/api/, '')) : undefined;
  return (
    <>
      <audio ref={audio} src={src} autoPlay preload="auto"
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onTimeUpdate={e => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setD(e.currentTarget.duration)} onEnded={() => player.next()} onError={() => { if (now) player.next(); }} />
      {now && src && <div className="mu-player" role="region" aria-label="Đang phát">
        <button type="button" className="mu-pl-main" aria-label={on ? 'Tạm dừng' : 'Phát'} onClick={() => { const a = audio.current; if (a) { if (a.paused) void a.play().catch(() => {}); else a.pause(); } }}>
          {on ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>}
        </button>
        <span className="mu-pl-t"><b>{now.title}{now.version ? ` (${now.version})` : ''}</b>
          <small>{now.artist?.name}{from && <> · <Link to={from.to}>{from.title}</Link></>}</small></span>
        <span className="mu-pl-seek">
          <i>{clock(t)}</i>
          <input type="range" min={0} max={d || 1} step={1} value={Math.min(t, d || 1)} aria-label="Vị trí trong bài"
            style={{ ['--p' as string]: `${d ? (t / d) * 100 : 0}%` }} onChange={e => { const a = audio.current; if (a) { a.currentTime = +e.target.value; setT(+e.target.value); } }} />
          <i>{clock(d)}</i>
        </span>
        <button type="button" aria-label="Bài sau" disabled={!player.hasNext()} onClick={() => player.next()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7zM16 5h2.4v14H16z" /></svg></button>
        <button type="button" aria-label="Tắt nhạc" onClick={() => player.stop()}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="x"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
      </div>}
    </>
  );
}
