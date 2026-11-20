/* The front of the shelf. Whatever the size of the catalogue, this screen shows a little of everything and a way
   into the rest: one game on the big screen, the visitor's own games, and one line per kind of game.
   Every line is laid out alike: the two games that stand up front (its highlights, else its newest), given room, and
   the tank its pipe drains into. A kind with two games and a kind with two thousand differ only in the door to the
   rest ("See all"), so the screen keeps its shape as the shelf fills. */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { gamePage, type Game } from '../catalog';
import { FRONT, groupLink, machineLink, useData } from '../data';
import { AnotherIcon, PlayIcon } from '../icons';
import { Skyline, Stars } from '../scene';
import { useFavorites, useRecent } from '../store';
import { groupOf, type Group } from '../taxonomy';
import { Front, Inputs, LineHead, Picture, PlayLink, Tile, calm, useSeen } from '../ui';
import { useTitle } from './GamePage';

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
              ? <PlayLink game={game} className="btn btn-play"><PlayIcon size={20} />Play</PlayLink>
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

/** the visitor's own shelf: the favorites starred last, given room, then what they opened lately */
function YourGames({ favs }: { favs: Set<string> }) {
  const data = useData(), favKeys = useFavorites(), recent = useRecent();
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const favorites = favKeys.map(k => data.byKey.get(k)).filter((g): g is Game => !!g);
  const shown = favorites.slice(0, FRONT);
  // the game opened last is already on the big screen when it has a picture: the row starts after it
  const onScreen = data.byKey.get(recent[0] ?? '')?.shots.includes('title') ? recent[0] : null;
  const lately = recent.filter(k => k !== onScreen).map(k => data.byKey.get(k)).filter((g): g is Game => !!g && !shown.includes(g)).slice(0, 8);
  if (!favorites.length && !lately.length) return null;
  return (
    <section className={`line liq-ice${seen ? ' open' : ''}`} aria-labelledby="h-yours">
      <LineHead pipe={pipe} id="h-yours" title="Your games" to="/favorites" action={favorites.length > shown.length ? <SeeAll to="/favorites">All favorites</SeeAll> : undefined} />
      <Front games={shown} favs={favs} />
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

/** One kind of game. `games` come as they stand on the shelf (highlights first, then the newest), so the first of
 *  them are the ones up front. */
function GroupLine({ group, games, favs }: { group: Group; games: Game[]; favs: Set<string> }) {
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const to = groupLink(group.key), front = games.slice(0, FRONT);
  return (
    <section className={`line liq-${group.liquid}${seen ? ' open' : ''}`} id={group.key} aria-labelledby={`h-${group.key}`}>
      <LineHead pipe={pipe} id={`h-${group.key}`} title={group.name} to={to}
        action={games.length > front.length ? <SeeAll to={to}>See all<span className="sr-only"> in {group.name}</span></SeeAll> : undefined} />
      <Front games={front} favs={favs} />
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
  useTitle('');
  return (
    <>
      <h1 className="sr-only">Sonic Hub Games</h1>
      <Featured />
      <div className="lines">
        <YourGames favs={favs} />
        {data.groups.map(({ group, games }) => <GroupLine key={group.key} group={group} games={games} favs={favs} />)}
        {data.machines.length > 1 && <Machines />}
      </div>
    </>
  );
}
