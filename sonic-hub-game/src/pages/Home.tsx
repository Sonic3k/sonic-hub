/* The front of the shelf. Whatever the size of the catalogue, this screen shows a little of everything and a way
   into the rest: one game on the big screen, the visitor's own games, the owner's highlights, and one row per group.
   A group with only a few games gives each of them room; a full group shows a row and the door to all of it. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { gamePage, type Game } from '../catalog';
import { groupLink, machineLink, useData } from '../data';
import { AnotherIcon, PlayIcon } from '../icons';
import { Skyline, Stars } from '../scene';
import { rememberPlayed, useFavorites, useRecent } from '../store';
import { groupOf, type Group } from '../taxonomy';
import { Chamber, Inputs, LineHead, Picture, Tank, Tile, calm, useSeen } from '../ui';
import { useTitle } from './GamePage';

/** how many games a group may have and still be shown as chambers on this screen */
const FEW = 5;
/** below this many games the catalogue is small enough to be seen whole: no highlights row, no random row */
const SMALL_SHELF = 30;

/** The game on the big screen: the one last opened from this browser, or else a pick that changes with every visit. */
function Featured() {
  const data = useData(), recent = useRecent();
  const pool = useMemo(() => {
    const pictured = data.games.filter(g => g.shots.includes('title'));
    const from = pictured.length ? pictured : data.games.slice(0, 24);
    return [...from.filter(g => g.highlight), ...from.filter(g => !g.highlight)];
  }, [data]);
  const [pick, setPick] = useState(() => {
    const last = recent.map(k => data.byKey.get(k)).find(g => g && pool.includes(g));
    if (last) return { game: last, last: true };
    const marked = pool.filter(g => g.highlight), from = marked.length ? marked : pool;
    return { game: from[Math.floor(Math.random() * from.length)], last: false };
  });
  const [play, setPlay] = useState(false);
  const { game } = pick, group = groupOf(game.group);

  // the big screen alternates between the title and a moment of play, like a cabinet left running
  useEffect(() => {
    setPlay(false);
    if (calm() || !game.shots.includes('play')) return;
    const t = setInterval(() => setPlay(p => !p), 4200);
    return () => clearInterval(t);
  }, [game]);

  const another = () => setPick({ game: pool[(pool.indexOf(game) + 1) % pool.length], last: false });

  return (
    <section className={`hero liq-${group.liquid}`} aria-label="Featured game">
      <Stars />
      <Skyline />
      <div className="wrap hero-in">
        <div className="stage" key={game.key}>
          <div className="stage-frame">
            <div className="screen"><Picture game={game} play={play} sizes="(min-width: 960px) 640px, 92vw" eager /></div>
            <div className="stage-strip" aria-hidden="true"><i /><i /><i /><b /></div>
          </div>
          <div className="stage-plinth" aria-hidden="true" />
        </div>
        <div className="pitch" key={`p-${game.key}`} aria-live="polite">
          <p className="plate">{pick.last ? 'Last played' : 'Featured'}<Link to={groupLink(group.key)}>{group.name}</Link></p>
          <h2 className="pitch-title" lang={game.lang}><Link to={gamePage(game)}>{game.title}</Link></h2>
          <p className="pitch-kind">{game.kind}</p>
          {game.blurb && <p className="pitch-blurb">{game.blurb}</p>}
          <Inputs game={game} names />
          <div className="actions">
            {game.play
              ? <a className="btn btn-play" href={game.play} onClick={() => rememberPlayed(game.key)}><PlayIcon size={20} />Play</a>
              : <Link className="btn btn-play" to={gamePage(game)}>See the game</Link>}
            {pool.length > 1 && <button type="button" className="btn btn-steel" onClick={another}><AnotherIcon />Show another</button>}
          </div>
        </div>
      </div>
    </section>
  );
}

function SeeAll({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link className="see-all" to={to}>{children}</Link>;
}

/** the visitor's own shelf: favorites given room, then what they opened lately */
function YourGames({ favs }: { favs: Set<string> }) {
  const data = useData(), favKeys = useFavorites(), recent = useRecent();
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const favorites = favKeys.map(k => data.byKey.get(k)).filter((g): g is Game => !!g);
  const shown = favorites.slice(0, 3);
  // the game opened last is already on the big screen when it has a picture: the row starts after it
  const onScreen = data.byKey.get(recent[0] ?? '')?.shots.includes('title') ? recent[0] : null;
  const lately = recent.filter(k => k !== onScreen).map(k => data.byKey.get(k)).filter((g): g is Game => !!g && !shown.includes(g)).slice(0, 8);
  if (!favorites.length && !lately.length) return null;
  return (
    <section className={`line liq-ice${seen ? ' open' : ''}`} aria-labelledby="h-yours">
      <LineHead pipe={pipe} id="h-yours" title="Your games" to="/favorites" action={favorites.length > 3 ? <SeeAll to="/favorites">All favorites</SeeAll> : undefined} />
      {shown.length > 0 && <div className="wrap grid strip">{shown.map(g => <Chamber key={g.key} game={g} fav />)}<Tank count={shown.length} /></div>}
      {lately.length > 0 && (
        <>
          <h3 className="wrap row-label">Recently played</h3>
          <div className="wrap row">{lately.map(g => <Tile key={g.key} game={g} fav={favs.has(g.key)} mixed />)}</div>
        </>
      )}
      {!favorites.length && <p className="wrap row-hint">Star a game and it stays here, large, for next time.</p>}
    </section>
  );
}

/** the owner's picks, three at a time, a different three each day so every highlight gets its turn up front */
function Highlights({ favs }: { favs: Set<string> }) {
  const data = useData();
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const all = useMemo(() => data.games.filter(g => g.highlight), [data]);
  if (!all.length) return null;
  const day = Math.floor(Date.now() / 86400000), start = (day * 3) % all.length;
  const shown = [0, 1, 2].filter(i => i < all.length).map(i => all[(start + i) % all.length]);
  return (
    <section className={`line liq-gold${seen ? ' open' : ''}`} aria-labelledby="h-highlights">
      <LineHead pipe={pipe} id="h-highlights" title="Highlights" to="/highlights" action={all.length > 3 ? <SeeAll to="/highlights">See all</SeeAll> : undefined} />
      <div className="wrap grid strip">{shown.map(g => <Chamber key={g.key} game={g} fav={favs.has(g.key)} />)}<Tank count={shown.length} /></div>
    </section>
  );
}

function GroupLine({ group, games, favs }: { group: Group; games: Game[]; favs: Set<string> }) {
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const to = groupLink(group.key), few = games.length <= FEW;
  return (
    <section className={`line liq-${group.liquid}${seen ? ' open' : ''}`} id={group.key} aria-labelledby={`h-${group.key}`}>
      <LineHead pipe={pipe} id={`h-${group.key}`} title={group.name} to={to} action={few ? undefined : <SeeAll to={to}>See all<span className="sr-only"> in {group.name}</span></SeeAll>} />
      {few ? (
        <div className="wrap grid">
          {games.map(g => <Chamber key={g.key} game={g} fav={favs.has(g.key)} wide={games.length === 1} />)}
          <Tank count={games.length === 1 ? 2 : games.length} />
        </div>
      ) : (
        <div className="wrap row">{games.slice(0, 8).map(g => <Tile key={g.key} game={g} fav={favs.has(g.key)} />)}</div>
      )}
    </section>
  );
}

/** a handful drawn from anywhere on the shelf, so games that sit deep get seen too */
function RandomPicks({ favs }: { favs: Set<string> }) {
  const data = useData();
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const [turn, setTurn] = useState(0);
  const picks = useMemo(() => {
    const out = new Set<Game>();
    while (out.size < Math.min(8, data.games.length)) out.add(data.games[Math.floor(Math.random() * data.games.length)]);
    return [...out];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, turn]);
  return (
    <section className={`line liq-mint${seen ? ' open' : ''}`} aria-labelledby="h-random">
      <LineHead pipe={pipe} id="h-random" title="Random picks" action={<button type="button" className="see-all" onClick={() => setTurn(t => t + 1)}><AnotherIcon size={18} />Shuffle</button>} />
      <div className="wrap row">{picks.map(g => <Tile key={g.key} game={g} fav={favs.has(g.key)} mixed />)}</div>
    </section>
  );
}

function Machines() {
  const data = useData();
  const [pipe, seen] = useSeen<HTMLDivElement>();
  return (
    <section className={`line liq-ice${seen ? ' open' : ''}`} aria-labelledby="h-machines">
      <LineHead pipe={pipe} id="h-machines" title="By machine" />
      <ul className="wrap shelf-plates">{data.machines.map(m => <li key={m.key}><Link className="shelf-plate" to={machineLink(m.key)}>{m.name}</Link></li>)}</ul>
    </section>
  );
}

export default function Home() {
  const data = useData(), favKeys = useFavorites();
  const favs = useMemo(() => new Set(favKeys), [favKeys]);
  const large = data.games.length >= SMALL_SHELF;
  useTitle('');
  return (
    <>
      <h1 className="sr-only">Sonic Hub Games</h1>
      <Featured />
      <div className="lines">
        <YourGames favs={favs} />
        {large && <Highlights favs={favs} />}
        {data.groups.map(({ group, games }) => <GroupLine key={group.key} group={group} games={games} favs={favs} />)}
        {large && <RandomPicks favs={favs} />}
        {data.machines.length > 1 && <Machines />}
      </div>
    </>
  );
}
