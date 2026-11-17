/* The pieces every screen is built from: a game's picture, the two sizes a game is shown at (a chamber when it is
   given room, a tile on a full shelf, a row in a list), the pipe that heads a shelf, and the tank that fills a row. */
import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cover, coverSet, gamePage, seedOf, type Game } from './catalog';
import { InputIcon, PlayIcon, StarIcon } from './icons';
import { markTitle } from './search';
import { rememberPlayed, toggleFavorite } from './store';
import { INPUT_NAME, groupOf, langName, machineOf, subOf } from './taxonomy';

/** The way into a game. One that plays in the portal's own player (catalogue entries with `frame`) opens without
 *  leaving the page; the others are pages of their own. Either way the portal remembers it was opened. */
export function PlayLink({ game, className, label, children }: { game: Game; className: string; label?: string; children: ReactNode }) {
  if (!game.play) return null;
  const on = () => rememberPlayed(game.key);
  return game.frame
    ? <Link className={className} to={game.play} onClick={on} aria-label={label}>{children}</Link>
    : <a className={className} href={game.play} onClick={on} aria-label={label}>{children}</a>;
}

export const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const liq = (g: Game) => `liq-${groupOf(g.group).liquid}`;

const PLATE_COLOURS = ['cyan', 'magenta', 'lime', 'orange', 'violet', 'mint', 'coral'];
/** What stands in for a picture a game does not have: a plate stencilled with its name. Its pattern and colour come
 *  from the game's own key, so a game always wears the same plate and a shelf of plates is not one flat colour. */
export function PlateArt({ game, bare }: { game: Game; bare?: boolean }) {
  const seed = seedOf(game.key), len = game.title.length;
  return (
    <span className={`plate-art pa${seed % 6} liq-${PLATE_COLOURS[(seed >>> 4) % 7]} ${len > 26 ? 'long' : len > 13 ? 'mid' : 'short'}`} aria-hidden="true">
      {!bare && <span className="plate-name" lang={game.lang}>{game.title}</span>}
    </span>
  );
}

/** A game's picture: its title screen, a moment of play laid over it when `play` is set, or its plate when it has none. */
export function Picture({ game, play, sizes, eager, bare }: { game: Game; play?: boolean; sizes: string; eager?: boolean; bare?: boolean }) {
  if (!game.shots.includes('title')) return <PlateArt game={game} bare={bare} />;
  return (
    <>
      <img src={cover(game, 'title', 640)} srcSet={coverSet(game, 'title')} sizes={sizes} width={1280} height={800} alt="" decoding="async" loading={eager ? 'eager' : 'lazy'} />
      {game.shots.includes('play') && play !== undefined && (
        <img className={`shot-play${play ? ' on' : ''}`} src={cover(game, 'play', 640)} srcSet={coverSet(game, 'play')} sizes={sizes} width={1280} height={800} alt=""
          decoding="async" loading="lazy" />
      )}
    </>
  );
}

export function FavButton({ game, on, label }: { game: Game; on: boolean; label?: boolean }) {
  return (
    <button type="button" className={`fav${on ? ' on' : ''}${label ? ' fav-wide' : ''}`} aria-pressed={on} onClick={() => toggleFavorite(game.key)}
      aria-label={label ? undefined : on ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`} title={label ? undefined : on ? 'In your favorites' : 'Add to favorites'}>
      <StarIcon on={on} size={label ? 20 : 18} />{label && (on ? 'In your favorites' : 'Add to favorites')}
    </button>
  );
}

export function Inputs({ game, names }: { game: Game; names?: boolean }) {
  return (
    <ul className={names ? 'facts' : 'inputs'}>
      {game.inputs.map(i => <li key={i} title={names ? undefined : INPUT_NAME[i]}><InputIcon kind={i} />{names ? INPUT_NAME[i] : <span className="sr-only">{INPUT_NAME[i]}</span>}</li>)}
      <li title={names ? undefined : `In ${langName(game.lang)}`}><span className="lang" aria-hidden="true">{game.lang.toUpperCase()}</span>{names ? `In ${langName(game.lang)}` : <span className="sr-only">In {langName(game.lang)}</span>}</li>
    </ul>
  );
}

/** A game given room: for highlights, favorites and shelves with only a few games on them. `wide` lays it across two
 *  columns, for a game that has a row to itself. */
export const Chamber = memo(function Chamber({ game, fav, wide }: { game: Game; fav: boolean; wide?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <article className={`chamber ${liq(game)}${wide ? ' chamber-wide' : ''}`} onPointerEnter={e => e.pointerType === 'mouse' && setOver(true)} onPointerLeave={() => setOver(false)}
      onFocus={() => setOver(true)} onBlur={() => setOver(false)}>
      <div className="screen"><Picture game={game} play={over} sizes="(min-width: 1040px) 380px, (min-width: 680px) 46vw, 92vw" /></div>
      <div className="sight" aria-hidden="true" />
      <div className="info">
        <h3 className="g-title" lang={game.lang}><Link to={gamePage(game)}>{game.title}</Link></h3>
        <p className="g-kind">{game.kind}</p>
        {game.blurb && <p className="g-blurb">{game.blurb}</p>}
        <div className="g-foot">
          <Inputs game={game} />
          <PlayLink game={game} className="go" label={`Play ${game.title}`}><PlayIcon size={15} />Play</PlayLink>
        </div>
      </div>
      <FavButton game={game} on={fav} />
    </article>
  );
});

/** A game on a full shelf: picture, name, and just enough to tell it from its neighbours. */
export const Tile = memo(function Tile({ game, fav, mixed, query }: { game: Game; fav: boolean; mixed?: boolean; query?: string }) {
  const sub = subOf(game.group, game.sub);
  return (
    <article className={`tile ${liq(game)}`}>
      <div className="tile-pic"><Picture game={game} sizes="200px" />{game.highlight && <span className="tile-hl" title="Highlight"><span className="sr-only">Highlight</span></span>}</div>
      <h3 className="tile-name" lang={game.lang}><Link to={gamePage(game)}><Marked title={game.title} query={query} /></Link></h3>
      <p className="tile-meta"><span className="tag">{machineOf(game.machine).short}</span><span className="tile-where">{mixed ? groupOf(game.group).name : sub?.name ?? game.year ?? ''}</span></p>
      <FavButton game={game} on={fav} />
    </article>
  );
});

/** A game as one line of a list: the densest way to read a long shelf. */
export const Row = memo(function Row({ game, fav, mixed, query }: { game: Game; fav: boolean; mixed?: boolean; query?: string }) {
  const sub = subOf(game.group, game.sub);
  return (
    <article className={`rowline ${liq(game)}`}>
      <FavButton game={game} on={fav} />
      <h3 className="row-name" lang={game.lang}><Link to={gamePage(game)}><Marked title={game.title} query={query} /></Link></h3>
      <span className="row-where">{mixed ? groupOf(game.group).name : sub?.name ?? ''}</span>
      <span className="row-year">{game.year ?? ''}</span>
      <span className="tag">{machineOf(game.machine).short}</span>
    </article>
  );
});

/** a name with the typed words marked in it */
export function Marked({ title, query }: { title: string; query?: string }) {
  if (!query?.trim()) return <>{title}</>;
  return <>{markTitle(title, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}</>;
}

/** true once the element has scrolled into view: the liquid comes down a pipe the first time its shelf is seen */
export function useSeen<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || calm() || typeof IntersectionObserver !== 'function') { setSeen(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

/** The head of a shelf: a full-width glass pipe with the shelf's name on a plate, and room on the pipe for one action. */
export function LineHead({ title, to, id, level = 2, pipe, action }: { title: ReactNode; to?: string; id?: string; level?: 1 | 2; pipe: React.RefObject<HTMLDivElement>; action?: ReactNode }) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <div className="line-head">
      <div className="pipe" ref={pipe} aria-hidden="true"><div className="pipe-liq" /><div className="pipe-joints" /></div>
      <div className="wrap line-head-in">
        <H className="line-plate" id={id}>{to ? <Link to={to}>{title}</Link> : title}</H>
        {action}
      </div>
    </div>
  );
}

/** What stands in the empty places at the end of a row of chambers: the tank the shelf's pipe drains into. */
export function Tank({ count }: { count: number }) {
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

export const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties;
