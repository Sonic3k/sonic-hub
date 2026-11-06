/* A timeline as it stood at the moment: a person's, a group's or a page's — or the locked page of someone the portal
   keeps only a name for, or the blank page of an account that did not exist (yet, or any more). */
import { useContext, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, cdn, social, type Detail, type Media, type Profile as P, type Ref } from '../api';
import { dateText, monthYear, useMoment } from '../time';
import { Avatar, Empty, L, Loading, Name, Tile, Viewer, profilePath, type Shown } from '../ui/bits';
import { ICake, IClock, IGlobe, IHeart, IHouse, ILink, ILock, IPin, IQuote, ISchool, IWork, IPeople, INote } from '../ui/icons';
import PostList from './PostList';
import { MeContext } from './PostCard';

/* ── Intro lines ────────────────────────────────────────────────────────── */

function period(d: Detail) {
  if (!d.start && !d.end) return null;
  const a = dateText(d.start, d.precision), b = d.end ? dateText(d.end, d.precision) : d.current ? 'present' : '';
  return a && b ? `${a} – ${b}` : a || b;
}

const ICON: Record<string, ReactNode> = {
  WORK: <IWork size={18} />, EDUCATION: <ISchool size={18} />, CURRENT_CITY: <IHouse size={18} />, HOMETOWN: <IPin size={18} />,
  RELATIONSHIP: <IHeart size={18} />, FAMILY: <IPeople size={18} />, BIRTHDAY: <ICake size={18} />, WEBSITE: <ILink size={18} />,
  QUOTES: <IQuote size={18} />, LANGUAGES: <IGlobe size={18} />, NICKNAME: <IPeople size={18} />, INTERESTED_IN: <IHeart size={18} />,
  CONTACT: <ILink size={18} />,
};

function Thing({ d }: { d: Detail }) {
  if (d.related?.id) return <Name r={{ ...d.related, name: d.title || d.related.name }} />;
  return <b>{d.title}</b>;
}

/** A school one "goes to" rather than "studies at": a high school by its usual names. */
const HIGH_SCHOOL = /\b(THPT|PTTH|THCS|Trung học|High School|Secondary)\b/i;

/** One line in the network's words, the tense following whether it still held at the moment. */
function line(d: Detail): ReactNode {
  switch (d.kind) {
    case 'WORK': return <>{d.current ? 'Works' : 'Worked'} at <Thing d={d} />{d.subtitle && <span className="sub"> · {d.subtitle}</span>}</>;
    case 'EDUCATION': return HIGH_SCHOOL.test(d.title ?? '')
      ? <>{d.current ? 'Goes to' : 'Went to'} <Thing d={d} />{d.subtitle && <span className="sub"> · {d.subtitle}</span>}</>
      : <>{d.current ? 'Studies' : 'Studied'} {d.subtitle ? <>{d.subtitle} </> : ''}at <Thing d={d} /></>;
    case 'CURRENT_CITY': return <>Lives in <Thing d={d} /></>;
    case 'HOMETOWN': return <>From <Thing d={d} /></>;
    case 'RELATIONSHIP': return <>{d.title}{d.related && <> with <Name r={d.related} /></>}{d.start && <span className="sub"> since {dateText(d.start, d.precision)}</span>}</>;
    case 'FAMILY': return <>{d.related ? <Name r={d.related} /> : <b>{d.title}</b>}{d.subtitle && <span className="sub"> · {d.subtitle}</span>}</>;
    case 'BIRTHDAY': return d.start ? <>Born on {dateText(d.start, d.precision)}</> : <>{d.title}</>;
    case 'WEBSITE': return <a href={d.title?.startsWith('http') ? d.title : `http://${d.title}`} target="_blank" rel="noopener noreferrer">{d.title}</a>;
    case 'LANGUAGES': return <>Speaks <b>{d.title}</b></>;
    case 'NICKNAME': return <>Also known as <b>{d.title}</b></>;
    case 'INTERESTED_IN': return <>Interested in <b>{d.title}</b></>;
    case 'QUOTES': return <i>“{d.title}”</i>;
    default: return <>{d.title}{d.subtitle && <span className="sub"> · {d.subtitle}</span>}</>;
  }
}

function Intro({ p }: { p: P }) {
  const bio = p.intro.find(d => d.kind === 'BIO' || (p.ref.kind !== 'USER' && d.kind === 'ABOUT'));
  const lines = p.intro.filter(d => !['BIO', 'ABOUT', 'QUOTES', 'CONTACT'].includes(d.kind));
  if (!bio && !lines.length && !p.joinedAt) return null;
  return (
    <div className="card side-card intro">
      <div className="side-title">{p.ref.kind === 'USER' ? 'Intro' : 'About'}</div>
      {bio && <p className="intro-bio">{bio.title}{bio.body && <><br />{bio.body}</>}</p>}
      {lines.map(d => <div key={d.id} className="intro-line"><span className="ico">{ICON[d.kind] ?? <IGlobe size={18} />}</span><span>{line(d)}</span></div>)}
      {p.ref.kind === 'GROUP' && p.privacy && <div className="intro-line"><span className="ico"><ILock size={18} /></span><span>{privacyText(p.privacy)}</span></div>}
      {p.ref.kind === 'PAGE' && p.category && <div className="intro-line"><span className="ico"><IGlobe size={18} /></span><span>{p.category}</span></div>}
      {p.joinedAt && <div className="intro-line"><span className="ico"><IClock size={18} /></span><span>{p.ref.kind === 'GROUP' ? 'Created' : 'Joined'} {monthYear(p.joinedAt)}</span></div>}
    </div>
  );
}

const privacyText = (p: string) => (p === 'SECRET' ? 'Secret Group' : p === 'CLOSED' ? 'Closed Group' : 'Public Group');

/* ── Header ─────────────────────────────────────────────────────────────── */

function Header({ p, tab }: { p: P; tab: string }) {
  const me = useContext(MeContext);
  const r = p.ref, base = profilePath(r);
  const pos = `${(p.coverFocusX ?? 0.5) * 100}% ${(p.coverFocusY ?? 0.5) * 100}%`;
  const tabs: [string, string, number?][] = r.kind === 'GROUP'
    ? [['', 'Discussion'], ['members', 'Members', p.counts.members], ['about', 'About'], ['photos', 'Photos']]
    : r.kind === 'PAGE'
      ? [['', 'Home'], ['about', 'About'], ['photos', 'Photos']]
      : [['', 'Timeline'], ['about', 'About'], ['friends', 'Friends', p.counts.friends], ['photos', 'Photos'], ...(p.counts.notes ? [['notes', 'Notes'] as [string, string]] : [])];
  return (
    <div className={`card prof-head kind-${r.kind.toLowerCase()}`}>
      <div className="prof-cover">
        {p.coverUrl ? <img src={cdn(p.coverUrl, 1280)} alt="" style={{ objectPosition: pos }} /> : <span className="prof-cover-blank" />}
      </div>
      <div className="prof-id">
        {r.kind !== 'GROUP' && <div className="prof-pic"><Avatar r={r} size={168} link={false} /></div>}
        <h1 className="prof-name">{r.name}</h1>
        <div className="prof-buttons">
          {r.kind === 'USER' && (p.withMe.self
            ? <><span className="btn">Update Info</span><span className="btn">Activity Log</span></>
            : <><span className="btn">{p.withMe.friends ? '✓ Friends' : 'Add Friend'}</span>
                {p.withMe.friends && me?.id && <L className="btn" to={`/facebook/friendship/${encodeURIComponent(me.handle || me.id)}/${encodeURIComponent(r.handle || r.id || '')}`}>See Friendship</L>}
                <L className="btn" to="/messenger">Message</L></>)}
          {r.kind === 'PAGE' && <span className="btn">Like</span>}
        </div>
      </div>
      {r.kind === 'GROUP' && <div className="prof-sub"><ILock size={13} /> {privacyText(p.privacy ?? 'PUBLIC')} · {p.counts.members.toLocaleString('en-US')} members</div>}
      {r.kind === 'PAGE' && <div className="prof-sub">{p.category}{p.counts.likes > 0 && <> · {p.counts.likes.toLocaleString('en-US')} people like this</>}</div>}
      <nav className="prof-tabs">
        {tabs.map(([k, label, n]) => (
          <L key={k} to={k ? `${base}/${k}` : base} className={tab === k ? 'on' : ''}>{label}{n ? <small>{n.toLocaleString('en-US')}</small> : null}</L>
        ))}
      </nav>
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

function TimelineTab({ p, refKey }: { p: P; refKey: string }) {
  const { at } = useMoment();
  const [shown, setShown] = useState<Shown | null>(null);
  const base = profilePath(p.ref);
  return (
    <div className="prof-cols">
      <aside className="prof-side">
        <Intro p={p} />
        {p.photos.length > 0 && (
          <div className="card side-card">
            <div className="side-title"><L to={`${base}/photos`}>Photos</L></div>
            <div className="mini-grid">{p.photos.map((m, i) => <Tile key={`${m.id}-${i}`} m={m} w={160} onOpen={() => setShown({ items: p.photos, index: i })} />)}</div>
          </div>
        )}
        {p.friends.length > 0 && (
          <div className="card side-card">
            <div className="side-title"><L to={`${base}/friends`}>Friends</L> <small>{p.counts.friends.toLocaleString('en-US')}{p.counts.mutual > 0 && ` (${p.counts.mutual} mutual)`}</small></div>
            <div className="mini-grid people">
              {p.friends.map(f => <L key={f.id} to={profilePath(f)} className="mini-person"><Avatar r={f} size={96} link={false} /><span>{f.name}</span></L>)}
            </div>
          </div>
        )}
      </aside>
      <section className="prof-posts">
        <PostList qkey={['timeline', refKey, at]} load={before => social.timeline(refKey, at, before)}
          empty={p.ref.kind === 'USER' ? `${p.ref.name} had not posted anything yet at this moment.` : 'No posts yet at this moment.'} />
      </section>
      <Viewer shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}

const ABOUT_SECTIONS: [string, string[]][] = [
  ['Work and Education', ['WORK', 'EDUCATION']],
  ['Places Lived', ['CURRENT_CITY', 'HOMETOWN']],
  ['Contact and Basic Info', ['CONTACT', 'WEBSITE', 'BIRTHDAY', 'LANGUAGES', 'INTERESTED_IN']],
  ['Family and Relationships', ['RELATIONSHIP', 'FAMILY']],
  ['Details', ['BIO', 'ABOUT', 'NICKNAME', 'QUOTES']],
];

function AboutTab({ p }: { p: P }) {
  const sections = ABOUT_SECTIONS.map(([title, kinds]) => [title, p.intro.filter(d => kinds.includes(d.kind))] as const).filter(([, ds]) => ds.length);
  return (
    <div className="card about">
      <div className="about-title"><IPeople size={18} /> About</div>
      {!sections.length && <p className="muted pad">No details to show at this moment.</p>}
      {sections.map(([title, ds]) => (
        <section key={title}>
          <h3>{title}</h3>
          {ds.map(d => (
            <div key={d.id} className="about-row">
              <span className="ico">{ICON[d.kind] ?? <IGlobe size={18} />}</span>
              <div>
                <div>{d.kind === 'BIO' || d.kind === 'ABOUT' ? d.title : line(d)}</div>
                {(d.kind === 'WORK' || d.kind === 'EDUCATION') && period(d) && <div className="muted">{period(d)}</div>}
                {d.body && d.kind !== 'BIO' && <div className="muted pre">{d.body}</div>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function FriendsTab({ p, refKey }: { p: P; refKey: string }) {
  const { at } = useMoment();
  const [q, setQ] = useState('');
  const rows = useQuery({ queryKey: ['friends', refKey, at], queryFn: () => social.friends(refKey, at) });
  const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const list = (rows.data ?? []).filter(r => !q || fold(r.ref.name).includes(fold(q)));
  const label = p.ref.kind === 'GROUP' ? 'Members' : p.ref.kind === 'PAGE' ? 'People who like this' : 'Friends';
  return (
    <div className="card friends">
      <div className="friends-head"><span className="about-title"><IPeople size={18} /> {label}</span>
        <input placeholder={`Search ${label.toLowerCase()}`} value={q} onChange={e => setQ(e.target.value)} /></div>
      {rows.isLoading && <Loading />}
      {rows.isSuccess && !list.length && <p className="muted pad">No one to show.</p>}
      <div className="friend-grid">
        {list.map(r => (
          <div key={r.ref.id ?? r.ref.name} className="friend-cell">
            <Avatar r={r.ref} size={80} />
            <div><Name r={r.ref} />
              <small>{r.mutual ? 'Mutual friend' : r.ref.state === 'locked' ? '' : ''}{r.since ? `${r.mutual ? ' · ' : ''}${p.ref.kind === 'USER' ? 'Friends' : 'Joined'} since ${monthYear(r.since)}` : ''}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotosTab({ p, refKey }: { p: P; refKey: string }) {
  const { at } = useMoment();
  const photos = useQuery({ queryKey: ['photos', refKey, at], queryFn: () => social.photos(refKey, at) });
  const [sub, setSub] = useState<'tagged' | 'uploads' | 'albums'>('albums');
  const [shown, setShown] = useState<Shown | null>(null);
  const d = photos.data, name = p.ref.name;
  const list: Media[] = sub === 'tagged' ? d?.tagged ?? [] : d?.uploads ?? [];
  return (
    <div className="card photos">
      <div className="photos-head">
        <span className="about-title">Photos</span>
        <div className="seg">
          {p.ref.kind === 'USER' && <button type="button" className={sub === 'tagged' ? 'on' : ''} onClick={() => setSub('tagged')}>Photos of {name}</button>}
          <button type="button" className={sub === 'uploads' ? 'on' : ''} onClick={() => setSub('uploads')}>{p.ref.kind === 'USER' ? `${name}’s Photos` : 'Photos'}</button>
          <button type="button" className={sub === 'albums' ? 'on' : ''} onClick={() => setSub('albums')}>Albums</button>
        </div>
      </div>
      {photos.isLoading && <Loading />}
      {sub === 'albums' ? (
        <div className="album-grid">
          {(d?.albums ?? []).map(a => (
            <L key={a.id} to={`${profilePath(p.ref)}/photos/${encodeURIComponent(a.id)}`} className="album-cell">
              <span className="album-cover">{a.coverUrl ? <img src={cdn(a.coverUrl, 320)} alt="" loading="lazy" /> : null}</span>
              <b>{a.title}</b><small>{a.count} Item{a.count === 1 ? '' : 's'}</small>
            </L>
          ))}
          {photos.isSuccess && !d?.albums.length && <p className="muted pad">No albums at this moment.</p>}
        </div>
      ) : (
        <div className="photo-grid">
          {list.map((m, i) => <Tile key={`${m.id}-${i}`} m={m} w={320} onOpen={() => setShown({ items: list, index: i })} />)}
          {photos.isSuccess && !list.length && <p className="muted pad">No photos at this moment.</p>}
        </div>
      )}
      <Viewer shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function AlbumTab({ p, refKey, albumId }: { p: P; refKey: string; albumId: string }) {
  const { at } = useMoment();
  const album = useQuery({ queryKey: ['album', refKey, albumId, at], queryFn: () => social.album(refKey, albumId, at), retry: false });
  const [shown, setShown] = useState<Shown | null>(null);
  if (album.isLoading) return <Loading />;
  if (album.isError) return <Empty>This album isn’t available at this moment.</Empty>;
  const a = album.data!;
  return (
    <div className="card photos">
      <div className="album-head">
        <L to={`${profilePath(p.ref)}/photos`} className="muted">← Photos</L>
        <h2>{a.album.title}</h2>
        {a.album.description && <p>{a.album.description}</p>}
        <small className="muted">{a.media.length} item{a.media.length === 1 ? '' : 's'}</small>
      </div>
      <div className="photo-grid">
        {a.media.map((m, i) => <Tile key={`${m.id}-${i}`} m={m} w={320} onOpen={() => setShown({ items: a.media, index: i, title: a.album.title })} />)}
      </div>
      <Viewer shown={shown} onClose={() => setShown(null)} />
    </div>
  );
}

function NotesTab({ refKey }: { refKey: string }) {
  const { at, T } = useMoment();
  const notes = useQuery({ queryKey: ['notes', refKey, at], queryFn: () => social.notes(refKey, at) });
  return (
    <div className="card notes">
      <div className="about-title"><INote size={18} /> Notes</div>
      {notes.isLoading && <Loading />}
      {notes.data?.items.map(n => (
        <L key={n.id} to={`/facebook/post/${n.id}`} className="note-row">
          {n.coverUrl && <img src={cdn(n.coverUrl, 320)} alt="" loading="lazy" />}
          <div><b>{n.title}</b><small className="muted">{dateText(n.postedAt.slice(0, 10), 'DAY')}{T && ''}</small>{n.excerpt && <p>{n.excerpt}</p>}</div>
        </L>
      ))}
      {notes.isSuccess && !notes.data.items.length && <p className="muted pad">No notes at this moment.</p>}
    </div>
  );
}

/* ── States without a timeline ──────────────────────────────────────────── */

function Locked({ r }: { r: Ref }) {
  return (
    <div className="prof">
      <div className="card prof-head kind-user">
        <div className="prof-cover"><span className="prof-cover-blank" /></div>
        <div className="prof-id">
          <div className="prof-pic"><Avatar r={r} size={168} link={false} /></div>
          <h1 className="prof-name">{r.name}</h1>
          <div className="prof-buttons"><span className="btn">Add Friend</span><L className="btn" to="/messenger">Message</L></div>
        </div>
        <nav className="prof-tabs"><span className="on">Timeline</span><span>About</span><span>Friends</span><span>Photos</span></nav>
      </div>
      <div className="card locked">
        <span className="locked-ico"><ILock size={30} /></span>
        <h2>{r.name} locked {r.gender === 'MALE' ? 'his' : r.gender === 'FEMALE' ? 'her' : 'their'} profile</h2>
        <p>Only {r.gender === 'MALE' ? 'his' : r.gender === 'FEMALE' ? 'her' : 'their'} friends can see what {r.gender === 'MALE' ? 'he shares' : r.gender === 'FEMALE' ? 'she shares' : 'they share'} on {r.gender === 'MALE' ? 'his' : r.gender === 'FEMALE' ? 'her' : 'their'} profile.</p>
      </div>
    </div>
  );
}

export function Unavailable() {
  return (
    <div className="card unavailable">
      <h2>This content isn't available right now</h2>
      <p>When this happens, it's usually because the owner only shared it with a small group of people, changed who can see it or it's been deleted.</p>
      <L to="/facebook" className="btn primary">Go to News Feed</L>
    </div>
  );
}

/* ── The page ───────────────────────────────────────────────────────────── */

export default function Profile() {
  const { ref = '', tab = '', albumId } = useParams();
  const { at } = useMoment();
  const prof = useQuery({ queryKey: ['profile', ref, at], queryFn: () => social.profile(ref, at), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1 });
  if (prof.isLoading) return <Loading />;
  if (prof.isError) return <Unavailable />;
  const p = prof.data!;
  if (p.ref.state === 'locked') return <Locked r={p.ref} />;
  if (p.ref.state !== 'active') return <Unavailable />;
  const key = p.ref.id ?? ref;
  const current = albumId ? 'photos' : tab;
  return (
    <div className="prof">
      <Header p={p} tab={current} />
      {albumId ? <AlbumTab p={p} refKey={key} albumId={albumId} />
        : tab === 'about' ? <AboutTab p={p} />
        : tab === 'friends' || tab === 'members' ? <FriendsTab p={p} refKey={key} />
        : tab === 'photos' ? <PhotosTab p={p} refKey={key} />
        : tab === 'notes' ? <NotesTab refKey={key} />
        : <TimelineTab p={p} refKey={key} />}
    </div>
  );
}
