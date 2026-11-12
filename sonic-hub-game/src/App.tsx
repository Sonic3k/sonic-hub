import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GAMES, GROUPS, INPUT_NAME, LANG_NAME, cover, gameUrl, groupOf, lastPlayed, rememberPlayed, type Game, type Group } from './games';
import { AnotherIcon, InputIcon, Mark, PlayIcon } from './icons';
import { Skyline, Stars } from './scene';

const liquid = (g: Group) => `liq-${g.liquid}`;
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function Header() {
  return (
    <header className="top">
      <div className="wrap top-in">
        <h1 className="brand">
          <a href="/" aria-label="Sonic Hub Games"><Mark /><span className="brand-a">Sonic Hub</span><span className="brand-b">Games</span></a>
        </h1>
        <nav className="top-nav" aria-label="Game groups">
          {GROUPS.map(g => <a key={g.key} href={`#${g.key}`} className={liquid(g)}><i className="drop" aria-hidden="true" />{g.name}</a>)}
        </nav>
      </div>
    </header>
  );
}

/** The two pictures of a game on a screen: its title, and a moment of play laid over it when `play` is set. */
function Shots({ game, play, sizes, eager }: { game: Game; play: boolean; sizes: string; eager?: boolean }) {
  const set = (shot: 'title' | 'play') => `${cover(game, shot, 640)} 640w, ${cover(game, shot, 1280)} 1280w`;
  return (
    <>
      <img src={cover(game, 'title', 640)} srcSet={set('title')} sizes={sizes} width={1280} height={800} alt="" decoding="async"
        loading={eager ? 'eager' : 'lazy'} />
      <img className={`shot-play${play ? ' on' : ''}`} src={cover(game, 'play', 640)} srcSet={set('play')} sizes={sizes} width={1280} height={800} alt=""
        decoding="async" loading="lazy" />
    </>
  );
}

function Facts({ game }: { game: Game }) {
  return (
    <ul className="facts">
      {game.inputs.map(i => <li key={i}><InputIcon kind={i} />{INPUT_NAME[i]}</li>)}
      <li><span className="lang" aria-hidden="true">{game.lang.toUpperCase()}</span>In {LANG_NAME[game.lang]}</li>
    </ul>
  );
}

/** The game on the big screen: the one last opened from this browser, or else a pick that changes with every visit. */
function Featured() {
  const [pick, setPick] = useState(() => {
    const last = lastPlayed();
    return last ? { game: last, last: true } : { game: GAMES[Math.floor(Math.random() * GAMES.length)], last: false };
  });
  const [play, setPlay] = useState(false);
  const { game } = pick, group = groupOf(game);

  // the big screen alternates between the title and a moment of play, like a cabinet left running
  useEffect(() => {
    setPlay(false);
    if (calm()) return;
    const t = setInterval(() => setPlay(p => !p), 4200);
    return () => clearInterval(t);
  }, [game.key]);

  const another = () => setPick({ game: GAMES[(GAMES.indexOf(game) + 1) % GAMES.length], last: false });

  return (
    <section className={`hero ${liquid(group)}`} aria-label="Featured game">
      <Stars />
      <Skyline />
      <div className="wrap hero-in">
        <div className="stage" key={game.key}>
          <div className="stage-frame">
            <div className="screen"><Shots game={game} play={play} sizes="(min-width: 960px) 640px, 92vw" eager /></div>
            <div className="stage-strip" aria-hidden="true"><i /><i /><i /><b /></div>
          </div>
          <div className="stage-plinth" aria-hidden="true" />
        </div>
        <div className="pitch" key={`p-${game.key}`} aria-live="polite">
          <p className="plate">{pick.last ? 'Last played' : 'Featured'}<span>{group.name}</span></p>
          <h2 className="pitch-title" lang={game.lang}>{game.title}</h2>
          <p className="pitch-kind">{game.kind}</p>
          <p className="pitch-blurb">{game.blurb}</p>
          <Facts game={game} />
          <div className="actions">
            <a className="btn btn-play" href={gameUrl(game)} onClick={() => rememberPlayed(game)}><PlayIcon size={20} />Play</a>
            <button type="button" className="btn btn-steel" onClick={another}><AnotherIcon />Show another</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Chamber({ game }: { game: Game }) {
  const [over, setOver] = useState(false);
  return (
    <article className="chamber" onPointerEnter={e => e.pointerType === 'mouse' && setOver(true)} onPointerLeave={() => setOver(false)}
      onFocus={() => setOver(true)} onBlur={() => setOver(false)}>
      <div className="screen"><Shots game={game} play={over} sizes="(min-width: 1040px) 380px, (min-width: 680px) 46vw, 92vw" /></div>
      <div className="sight" aria-hidden="true" />
      <div className="info">
        <h3 className="g-title" lang={game.lang}><a href={gameUrl(game)} onClick={() => rememberPlayed(game)}>{game.title}</a></h3>
        <p className="g-kind">{game.kind}</p>
        <p className="g-blurb">{game.blurb}</p>
        <div className="g-foot">
          <ul className="inputs">
            {game.inputs.map(i => <li key={i} title={INPUT_NAME[i]}><InputIcon kind={i} /><span className="sr-only">{INPUT_NAME[i]}</span></li>)}
            <li title={`In ${LANG_NAME[game.lang]}`}><span className="lang" aria-hidden="true">{game.lang.toUpperCase()}</span><span className="sr-only">In {LANG_NAME[game.lang]}</span></li>
          </ul>
          <span className="go" aria-hidden="true"><PlayIcon size={15} />Play</span>
        </div>
      </div>
    </article>
  );
}

/** What stands in the empty places at the end of a group's row: the tank its pipe drains into. */
function Tank({ count }: { count: number }) {
  const r3 = count % 3, r2 = count % 2;
  const cls = `${r3 ? ` t3-${3 - r3}` : ''}${r2 ? ' t2-1' : ''}`;
  if (!cls) return null;
  // the pipe above reaches down to it only when it stands in the first row, right under that pipe
  const fed = `${count < 3 ? ' f3' : ''}${count < 2 ? ' f2' : ''}`;
  return (
    <div className={`tank${cls}${fed}`} aria-hidden="true">
      <div className="tank-feed" />
      <div className="tank-cap" />
      <div className="tank-glass">
        <div className="tank-liq"><div className="tank-wave" /></div>
        {[0, 1, 2, 3, 4, 5, 6].map(i => <i key={i} className={`bub b${i}`} />)}
      </div>
      <div className="tank-base" />
    </div>
  );
}

function Line({ group }: { group: Group }) {
  const games = GAMES.filter(g => g.group === group.key);
  const pipe = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // the liquid comes down the pipe, and on into the tank, the first time the group scrolls into view
  useEffect(() => {
    const el = pipe.current;
    if (!el || calm() || typeof IntersectionObserver !== 'function') { setOpen(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setOpen(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!games.length) return null;
  return (
    <section className={`line ${liquid(group)}${open ? ' open' : ''}`} id={group.key} aria-labelledby={`h-${group.key}`}>
      <div className="line-head">
        <div className="pipe" ref={pipe} aria-hidden="true"><div className="pipe-liq" /><div className="pipe-joints" /></div>
        <div className="wrap"><h2 className="line-plate" id={`h-${group.key}`}>{group.name}</h2></div>
      </div>
      <div className="wrap grid">
        {games.map(g => <Chamber key={g.key} game={g} />)}
        <Tank count={games.length} />
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Featured />
        <div className="lines">
          {GROUPS.map(g => <Line key={g.key} group={g} />)}
        </div>
      </main>
      <footer className="pool" aria-hidden="true">
        <div className="pool-glint" />
        {[0, 1, 2, 3, 4].map(i => <i key={i} className={`bub b${i}`} style={{ '--at': `${12 + i * 19}%` } as CSSProperties} />)}
      </footer>
    </>
  );
}
