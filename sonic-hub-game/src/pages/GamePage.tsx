/* One game's own page: its picture, what it is, where it sits on the shelf, and the way in. Every game has one, so a
   single game can be sent to someone by its address. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Game } from '../catalog';
import { groupLink, machineLink, seriesLink, tagLink, useData } from '../data';
import { PlayIcon } from '../icons';
import { rememberPlayed, useFavorites } from '../store';
import { groupOf, machineOf, subOf, tagName } from '../taxonomy';
import { Chamber, FavButton, Inputs, LineHead, Picture, Tank, Tile, calm, useSeen } from '../ui';

export function useTitle(title: string) {
  useEffect(() => { document.title = title ? `${title} · Sonic Hub Games` : 'Sonic Hub Games'; }, [title]);
}

export function Missing() {
  useTitle('Not found');
  return (
    <div className="notice">
      <p className="notice-title">Nothing at this address</p>
      <p>The game or shelf may have moved or been renamed.</p>
      <Link className="btn btn-play" to="/">See all games</Link>
    </div>
  );
}

/** the games nearest to one game: its series first, then its sub-group by year, then its group */
function near(game: Game, all: Game[]): Game[] {
  const same = all.filter(g => g !== game && g.group === game.group);
  const gap = (g: Game) => Math.abs((g.year ?? 0) - (game.year ?? 0));
  const series = game.series ? all.filter(g => g !== game && g.series === game.series) : [];
  const sub = same.filter(g => g.sub && g.sub === game.sub && !series.includes(g)).sort((a, b) => gap(a) - gap(b));
  const rest = same.filter(g => !series.includes(g) && !sub.includes(g));
  return [...series, ...sub, ...rest].slice(0, 8);
}

export default function GamePage() {
  const { key = '' } = useParams();
  const data = useData(), favorites = useFavorites();
  const game = data.byKey.get(key);
  const [play, setPlay] = useState(false);
  const [pipe, seen] = useSeen<HTMLDivElement>();
  const [morePipe, moreSeen] = useSeen<HTMLDivElement>();
  const more = useMemo(() => (game ? near(game, data.games) : []), [game, data]);
  const favs = useMemo(() => new Set(favorites), [favorites]);
  useTitle(game?.title ?? '');

  useEffect(() => {
    setPlay(false);
    if (!game || calm() || !game.shots.includes('play')) return;
    const t = setInterval(() => setPlay(p => !p), 4200);
    return () => clearInterval(t);
  }, [game]);

  if (!game) return <Missing />;
  const group = groupOf(game.group), sub = subOf(game.group, game.sub), machine = machineOf(game.machine);
  return (
    <div className={`gamepage liq-${group.liquid}`}>
      <div className={`line${seen ? ' open' : ''}`}>
        <LineHead pipe={pipe} title={group.name} to={groupLink(group.key)} action={sub ? <Link className="see-all" to={groupLink(group.key, sub.key)}>{sub.name}</Link> : undefined} />
      </div>
      <div className="wrap gp">
        <div className="stage">
          <div className="stage-frame">
            <div className="screen"><Picture game={game} play={play} sizes="(min-width: 960px) 640px, 92vw" eager /></div>
            <div className="stage-strip" aria-hidden="true"><i /><i /><i /><b /></div>
          </div>
        </div>
        <div className="pitch">
          <h1 className="pitch-title" lang={game.lang}>{game.title}</h1>
          <p className="pitch-kind">{game.kind}</p>
          {game.blurb && <p className="pitch-blurb">{game.blurb}</p>}
          <Inputs game={game} names />
          <div className="actions">
            {game.play
              ? <a className="btn btn-play" href={game.play} onClick={() => rememberPlayed(game.key)}><PlayIcon size={20} />Play</a>
              : <p className="no-play">{game.test ? 'A sample entry of the test shelf. There is no game behind it.' : 'On the shelf, not playable here yet.'}</p>}
            <FavButton game={game} on={favs.has(game.key)} label />
          </div>
          <dl className="gp-facts">
            <div><dt>Made for</dt><dd><Link to={machineLink(machine.key)}>{machine.name}</Link>{game.year ? `, ${game.year}` : ''}</dd></div>
            {game.maker && <div><dt>By</dt><dd>{game.maker}</dd></div>}
            {game.series && <div><dt>Series</dt><dd><Link to={seriesLink(game.series)}>{game.series}</Link></dd></div>}
            {game.alt.length > 0 && <div><dt>Also known as</dt><dd>{game.alt.join(', ')}</dd></div>}
            {game.tags.length > 0 && <div><dt>Tags</dt><dd>{game.tags.map((t, i) => <span key={t}>{i > 0 && ', '}<Link to={tagLink(t)}>{tagName(t)}</Link></span>)}</dd></div>}
          </dl>
        </div>
      </div>
      {more.length > 0 && (
        <section className={`line gp-more${moreSeen ? ' open' : ''}`} aria-labelledby="h-more">
          <LineHead pipe={morePipe} id="h-more" title="More like this" action={<Link className="see-all" to={groupLink(group.key, sub?.key)}>See all</Link>} />
          {more.length <= 3
            ? <div className="wrap grid">{more.map(g => <Chamber key={g.key} game={g} fav={favs.has(g.key)} />)}<Tank count={more.length} /></div>
            : <div className="wrap row">{more.map(g => <Tile key={g.key} game={g} fav={favs.has(g.key)} />)}</div>}
        </section>
      )}
    </div>
  );
}
