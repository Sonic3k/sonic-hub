/* Dòng thời gian: his life era by era, each on its own paper — the big year at the left with the stretches of life
   it holds, and to the right what the hub keeps from then: photos of his memories laid out like prints on a table,
   the moments that mattered most, the machines to turn on, what he played and listened to. Everything is read from
   the hub (giai đoạn, ký ức, máy, game, list nhạc, diễn đàn, nhật ký); the layout of each era is fixed here. */
import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { hub, dayOf, randomDay } from '../api/hub';
import { cdn, pic } from '../api/client';
import type { Chapter, DeskDevice, Episode, Forum, GameCard, Note } from '../types';
import type { Playlist } from '../api/music';
import { noteDate, noteHref, plain, useNotes, useTimeline } from '../lib/queries';
import { dayMonthYear } from '../lib/date';
import { atOf, isoOf, momentQuery, useMoment, type Moment } from '../lib/moment';
import { ERAS, eraOf, eraRange, type Era } from '../lib/era';
import { chapterYear, deviceMoment, deviceRange, deviceYear, eventsOnDay, forumYears, forumsIn, gamesIn, listsIn, periodSpan } from '../lib/life';
import { memoryHref, memoryWhen, useLifeChapters, useMemories } from './Memories';
import { useEvents } from './Events';
import { useGames } from './Games';
import { useLists } from './Spotify';
import { HandNote, MachineTile, ModeSwitch, Print, Rows, SameDay, Tile, type DayCard } from '../components/Paper';

const T = 10 * 60_000;
const FINE = new Set(['DAY', 'HOUR', 'MINUTE', 'SECOND']);
const IMAGE = /\.(jpe?g|png|webp|gif|bmp)$/i;
const LIST_2004 = '/memories/82fa0730-5766-4112-837a-99ccaa86e340';
const yearOf = (e: Episode) => (e.occurredAt ? +e.occurredAt.slice(0, 4) : NaN);
const photoOf = (e: Episode) => e.media?.find(x => x.url && IMAGE.test(x.fileName));
/** words someone really said or wrote, quoted in a memory's title: at least two of them */
const quoted = (s?: string | null) => { const q = /(?:^|[\s(:])[“"']([^”"']{6,48})[”"'](?=$|[\s).,;!?])/.exec(s ?? '')?.[1]; return q && q.trim().includes(' ') ? q.trim() : null; };
/** a print's caption: what it is, and the year unless the title already says it */
const captionOf = (e: Episode) => { const y = yearOf(e); return e.title && y && !e.title.includes(String(y)) ? `${e.title}, ${y}` : e.title ?? ''; };
/** the opening sentence of something he wrote, as a line on a page */
function firstLine(n: Note): string {
  const t = plain(n.content), cut = /^.{24,110}?[.!?…](?=\s|$)/.exec(t)?.[0] ?? t.slice(0, 96);
  return cut.length < t.length && !/[.!?…]$/.test(cut) ? `${cut}…` : cut;
}

/** when a memory was, short enough for a row: no hour, a stretch inside one month as "20 – 27/11/2007", a longer one by its first day */
function rowWhen(e: Episode): string {
  const w = memoryWhen(e).replace(/^(~?)\d{1,2}h /, '$1').replace(/^(~?\d{2}\/\d{2}\/\d{4}) \d{2}:\d{2}(:\d{2})?/, '$1');
  const m = /^(~?)(\d{2})\/(\d{2})\/(\d{4}) – (\d{2})\/(\d{2})\/(\d{4})$/.exec(w);
  if (!m) return w;
  return m[3] === m[6] && m[4] === m[7] ? `${m[1]}${+m[2]} – ${+m[5]}/${m[6]}/${m[7]}` : `${m[1]}${m[2]}/${m[3]}/${m[4]}`;
}

interface EraData {
  era: Era; chapters: Chapter[]; rows: Episode[]; prints: Episode[]; object?: Episode; note?: string | null;
  machines: DeskDevice[]; games: GameCard[]; lists: Playlist[]; forums: Forum[]; hand: GameCard[]; journal: Note[];
}

export default function Timeline() {
  const { moment, picked, pick } = useMoment();
  const tl = useTimeline(), chapters = useLifeChapters(), memories = useMemories(), games = useGames(), lists = useLists(), notes = useNotes(), events = useEvents();
  const forums = useQuery({ queryKey: ['forums'], queryFn: hub.forums, staleTime: T });
  const at = moment ? atOf(moment) : '';
  const desk = useQuery({ queryKey: ['desk-at', at], queryFn: () => hub.deskAt(at), enabled: !!moment, staleTime: T });
  const dayQ = useQuery({ queryKey: ['day', moment?.y, moment?.m, moment?.d], queryFn: () => dayOf(moment!.y, moment!.m, moment!.d), enabled: !!moment, staleTime: T });

  const data = useMemo<EraData[]>(() => ERAS.map(era => {
    const inside = (y: number) => !!y && eraOf(y).key === era.key;
    const mem = (memories.data ?? []).filter(e => inside(yearOf(e)) && e.status !== 'DRAFT');
    const byWeight = [...mem].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));
    const withPhoto = byWeight.filter(e => e.title && photoOf(e));
    const object = withPhoto.find(e => e.kind === 'KEEPSAKE' || e.kind === 'DOCUMENT');
    const chs = (chapters.data ?? []).filter(c => inside(chapterYear(c)));
    // a machine belongs to the era it came in; one that came in an era's last months belongs to the next
    const eraOfDevice = (d: DeskDevice) => { const t = new Date(new Date(`${d.from}Z`).getTime() + 7 * 3600_000 + 183 * 86400_000); return eraOf(t.getUTCFullYear()).key; };
    return {
      era,
      chapters: [...chs.filter(c => chapterYear(c) >= era.from), ...chs.filter(c => chapterYear(c) < era.from)],
      rows: byWeight.filter(e => e.title).slice(0, 5).sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? '')),
      prints: withPhoto.filter(e => e !== object).slice(0, 4),
      object,
      note: byWeight.map(e => quoted(e.title)).find(Boolean),
      machines: (desk.data?.machines ?? []).filter(d => d.kind !== 'PLAYER' && d.from && !Number.isNaN(deviceYear(d)) && eraOfDevice(d) === era.key),
      games: gamesIn(games.data ?? [], era.from, era.to).slice(0, 3),
      // the lists of his own folders where the era has them, else his biggest Spotify playlists (as they are now)
      lists: (() => { const l = listsIn(lists.data ?? [], era.from, era.to), w = l.filter(p => p.kind === 'WINDOW'); return (w.length ? w : l.filter(p => p.spotifyId).sort((a, b) => b.tracks - a.tracks)).slice(0, 3); })(),
      forums: forumsIn(forums.data ?? [], era.from, era.to),
      hand: era.key === '2001' ? (games.data ?? []).filter(g => g.handOrder && g.handName).sort((a, b) => (a.handOrder ?? 0) - (b.handOrder ?? 0)) : [],
      journal: era.key === '2013' ? (notes.data ?? []).filter(n => n.kind === 'JOURNAL' && !n.authorPersonId && !n.authorName && inside(+noteDate(n).slice(0, 4))).reverse().filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 5)) === 0).slice(0, 5) : [],
    };
  }), [memories.data, chapters.data, desk.data, games.data, lists.data, forums.data, notes.data]);

  // the same day in other years (as on Hôm nay)
  const cards = useMemo<DayCard[]>(() => {
    if (!moment) return [];
    const md = isoOf(moment).slice(5), out: DayCard[] = [];
    (memories.data ?? []).filter(e => e.occurredAt && e.title && e.occurredAt.slice(5, 10) === md && yearOf(e) !== moment.y && (!e.precision || FINE.has(e.precision)))
      .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)).forEach(e => out.push({ year: yearOf(e), title: e.title! }));
    eventsOnDay(events.data ?? [], moment.m, moment.d, moment.y).forEach(e => out.push({ year: +e.startAt.slice(0, 4), title: e.title }));
    const seen = new Set<number>();
    return out.filter(c => (seen.has(c.year) ? false : (seen.add(c.year), true))).slice(0, 3).sort((a, b) => a.year - b.year);
  }, [memories.data, events.data, moment]);
  const years = useMemo(() => (moment ? [...new Set((tl.data ?? []).filter(b => b.month === moment.m && b.count > 0 && b.year !== moment.y && b.year > 1900).map(b => b.year))]
    .filter(yr => !cards.some(c => c.year === yr)).sort((a, b) => a - b) : []), [tl.data, moment, cards]);

  // a day was picked: the page opens at its era — again once the memories are in (they change the heights above it),
  // unless he has started moving through the page himself
  const here = moment ? eraOf(moment.y).key : '', filled = !memories.isLoading, moved = useRef(false);
  useEffect(() => {
    const on = () => { moved.current = true; };
    window.addEventListener('wheel', on, { passive: true }); window.addEventListener('touchmove', on, { passive: true }); window.addEventListener('keydown', on);
    return () => { window.removeEventListener('wheel', on); window.removeEventListener('touchmove', on); window.removeEventListener('keydown', on); };
  }, []);
  useEffect(() => { moved.current = false; }, [moment?.y, moment?.m, moment?.d]);
  useEffect(() => {
    if (!picked || !here || moved.current) return;
    const el = document.getElementById(`e${here}`);
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }, [picked, here, filled, moment?.y, moment?.m, moment?.d]);

  if (!moment) return <div className="hm"><p className="hm-wait">Đang tìm lại ngày ấy…</p></div>;
  const now = new Date(), isToday = moment.m === now.getMonth() + 1 && moment.d === now.getDate();
  const dayLead = dayQ.data?.scope === 'day' ? dayQ.data.items.find(x => pic(x)) : undefined;
  const computerNow = desk.data?.computer?.device.key;
  const random = async () => {
    const ys = [...new Set((tl.data ?? []).filter(b => b.count > 0 && b.year > 1900).map(b => b.year))]; if (!ys.length) return;
    const y = ys[Math.floor(Math.random() * ys.length)], r = await randomDay(y, tl.data ?? []).catch(() => null);
    if (r) pick({ y, m: r.month, d: r.day });
  };

  return (
    <div className="hm page">
      <section className="hm-open">
        <div className="hm-when">
          <p>{isToday ? 'Hôm nay' : `Đang xem năm ${moment.y}`}</p>
          <h1>{moment.d} tháng {moment.m}</h1>
          <ModeSwitch />
        </div>
        <SameDay moment={moment} cards={cards} years={years} onPick={pick} />
      </section>

      <nav className="eras" aria-label="Các giai đoạn">
        {data.map(({ era, chapters: chs }) => (
          <a key={era.key} href={`#e${era.key}`} className={`era-${era.key} ${era.key === here ? 'here' : ''}`}>
            <b>{era.from}</b><span>{chs[0]?.title ?? (era.to ? eraRange(era) : 'đến nay')}</span>
          </a>))}
      </nav>

      {data.map((d, i) => <EraSection key={d.era.key} d={d} loading={memories.isLoading} moment={moment}
        dayLead={d.era.key === here && dayLead ? cdn(pic(dayLead, true), 960) : undefined} computerNow={computerNow} last={i === data.length - 1} onRandom={random} />)}
    </div>
  );
}

function EraSection({ d, loading, moment, dayLead, computerNow, last, onRandom }: { d: EraData; loading: boolean; moment: Moment; dayLead?: string; computerNow?: string; last: boolean; onRandom: () => void }) {
  const { era } = d, lead = d.chapters[0], span = periodSpan(lead?.period);
  const long = !!span && (+span[1].slice(0, 4) - +span[0].slice(0, 4)) >= 3;
  const empty = !d.prints.length && !d.hand.length && !d.journal.length && !dayLead;
  return (
    <section id={`e${era.key}`} className={`era era-${era.key}`}>
      <div className="era-in">
        <div className="era-left">
          <div className="era-year"><b>{era.from}</b><span>{eraRange(era)}</span></div>
          {d.chapters.map((c, k) => (
            <Link key={c.id} className={`ch ${k === 0 && long ? 'wide' : ''}`} to={`/memories?chapter=${c.id}`}>
              <b>{c.title || c.period}</b><span>{k === 0 && long && c.summary ? c.summary : c.period}</span>
            </Link>))}
          {d.note && <HandNote tilt={-2.5}>{d.note}</HandNote>}
          {d.object && photoOf(d.object) && <Print small className="obj" src={cdn(photoOf(d.object)!.url!, 320)} alt="" caption={captionOf(d.object)} tilt={3} to={memoryHref(d.object)} />}
        </div>

        <div className="era-right">
          {loading && <p className="hm-wait">Đang lục lại ký ức…</p>}
          {!empty && <Table d={d} dayLead={dayLead} moment={moment} />}
          <Rows rows={d.rows.map(e => ({ key: e.id, when: rowWhen(e), title: e.title!, to: memoryHref(e) }))} />
          <div className="tiles">
            {d.machines.map(m => <MachineTile key={m.key} name={m.name} range={deviceRange(m)} phone={m.kind === 'PHONE'}
              href={`/${m.kind === 'PHONE' ? 'phone' : 'pc'}?at=${encodeURIComponent(deviceMoment(m) ?? '')}${m.kind === 'PHONE' ? '' : `&device=${m.key}`}`}
              photo={m.key === computerNow && m.photoUrl ? cdn(m.photoUrl, 640) : null} />)}
            {d.games.length > 0 && <Tile label="Game" to="/games">{d.games.map(g => g.title).join(', ')}</Tile>}
            {d.lists.length > 0 && <Tile label="Music" to={d.lists.length === 1 ? `/music/lists/${d.lists[0].key}` : '/music'}>{d.lists.map(p => p.title).join(', ')}</Tile>}
            {d.forums.map(f => <Tile key={f.key} label="Diễn đàn" to={`/forum/${f.key}`}>{f.name.replace(/\s*\(.*\)$/, '')}, {forumYears(f)}</Tile>)}
          </div>
          {last && <div className="era-end">
            <a href={`#e${ERAS[0].key}`}>Về năm {ERAS[0].from}</a>
            <button type="button" onClick={onRandom}>Một ngày bất kỳ</button>
          </div>}
        </div>
      </div>
    </section>
  );
}

/* The prints of an era on the table. Each era has its own arrangement (the grid is twelve columns; d1…d6 drop a
   print lower so they overlap), filled with the photos of its weightiest memories; two eras also carry a page:
   his handwritten list of games (2004), and lines from his notes (2015 – 2016). */
const SLOTS: Record<string, { col: string; ratio: string; tilt: number; drop?: string; z?: number; tape?: number }[]> = {
  '1990': [{ col: '1 / 9', ratio: '3 / 2', tilt: -1 }, { col: '7 / 13', ratio: '4 / 3', tilt: 2.5, drop: 'd3', z: 2, tape: -4 }],
  '1996': [{ col: '1 / 4', ratio: '1 / 1', tilt: -3 }, { col: '4 / 7', ratio: '1 / 1', tilt: 2, drop: 'd2', z: 2 }, { col: '7 / 10', ratio: '1 / 1', tilt: -1.5, drop: 'd1', z: 1 }, { col: '10 / 13', ratio: '1 / 1', tilt: 3.5, drop: 'd3', z: 3 }],
  '2001': [{ col: '9 / 13', ratio: '4 / 5', tilt: 3, drop: 'd1', z: 2, tape: 5 }],
  '2005': [{ col: '4 / 13', ratio: '6 / 5', tilt: 0.6 }, { col: '1 / 5', ratio: '4 / 5', tilt: -4, drop: 'd3', z: 2, tape: -5 }],
  '2008': [{ col: '1 / 5', ratio: '4 / 3', tilt: -2.5 }, { col: '5 / 9', ratio: '4 / 3', tilt: 1.8, drop: 'd2', z: 2 }, { col: '9 / 13', ratio: '4 / 3', tilt: -1.2, drop: 'd1', z: 1 }],
  '2013': [{ col: '8 / 13', ratio: '4 / 3', tilt: 3, drop: 'd1', z: 2 }, { col: '9 / 13', ratio: '1 / 1', tilt: -3.5, drop: 'd6', z: 3 }],
  '2018': [{ col: '1 / 10', ratio: '3 / 2', tilt: -1.5 }, { col: '9 / 13', ratio: '4 / 3', tilt: 3, drop: 'd1', z: 2 }, { col: '9 / 13', ratio: '4 / 3', tilt: -2.5, drop: 'd55', z: 3 }],
  '2023': [{ col: '1 / 5', ratio: '4 / 3', tilt: -2 }, { col: '5 / 9', ratio: '4 / 3', tilt: 1.5, drop: 'd2', z: 2 }, { col: '9 / 13', ratio: '4 / 3', tilt: -1, drop: 'd1', z: 1 }],
};
const THREE = SLOTS['2008'];

function Table({ d, dayLead, moment }: { d: EraData; dayLead?: string; moment: Moment }) {
  const key = d.era.key, page = key === '2001' ? d.hand.length > 0 : key === '2013' ? d.journal.length > 2 : false;
  const slots = (key === '2001' || key === '2013') && !page ? THREE : SLOTS[key] ?? THREE;
  // the day being looked at lies in this era: its photo takes the first place, tagged
  const items: { src: string; caption?: string; to: string; tag?: string }[] = [
    ...(dayLead ? [{ src: dayLead, to: `/${momentQuery(moment)}`, tag: `Ngày này năm ${moment.y}`, caption: dayMonthYear(isoOf(moment)) }] : []),
    ...d.prints.map(e => ({ src: cdn(photoOf(e)!.url!, 640), caption: captionOf(e), to: memoryHref(e) })),
  ].slice(0, slots.length);
  return (
    <div className="ov">
      {page && key === '2001' && <Link className="sheet-oly" to={LIST_2004} style={{ gridColumn: '1 / 10', gridRow: 1, transform: 'rotate(-0.8deg)' }}>
        <b>Danh sách các trò chơi</b>
        <div>{d.hand.map(g => <span key={g.key}>{g.handName}</span>)}</div>
      </Link>}
      {page && key === '2013' && <div className="sheet-notes" style={{ gridColumn: '1 / 9', gridRow: 1, transform: 'rotate(-0.6deg)' }}>
        {d.journal.map(n => <Link key={n.id} to={noteHref(n)}><span>{dayMonthYear(noteDate(n))}</span><b>{firstLine(n)}</b></Link>)}
      </div>}
      {items.map((it, i) => { const s = slots[i]; return (
        <Print key={i} className={`${s.drop ?? ''} ${it.tag ? 'tagged' : ''}`} src={it.src} caption={it.caption} ratio={s.ratio} tilt={s.tilt} tape={s.tape} tag={it.tag} to={it.to}
          style={{ gridColumn: s.col, gridRow: 1, zIndex: s.z }} />); })}
    </div>
  );
}
