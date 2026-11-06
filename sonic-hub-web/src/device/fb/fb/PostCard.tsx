/* A post as it stood at the moment: who wrote it where, what it said and showed, and the likes and comments it had
   by then. */
import { createContext, Fragment, useContext, useState, type ReactNode } from 'react';
import { cdn, type Comment, type Post, type Reactions, type Ref } from '../api';
import { ago, full, useMoment, dateText } from '../time';
import { Avatar, L, MediaGrid, Name, Viewer, type Shown } from '../ui/bits';
import { IComment, IFlag, IGlobe, ILock, IPeople, IPin, IShare, IStar, IThumb, ReactionIcon } from '../ui/icons';

/** The owner, for the comment box under posts. */
export const MeContext = createContext<Ref | null>(null);

const REACTIONS_SINCE = Date.UTC(2016, 1, 24);   // before this, only "like" existed

const pronoun = (r: Ref) => (r.gender === 'MALE' ? 'his' : r.gender === 'FEMALE' ? 'her' : 'their');

function Audience({ a }: { a: string | null }) {
  if (a === 'PUBLIC') return <span className="aud" title="Public"><IGlobe size={11} /></span>;
  if (a === 'ONLY_ME') return <span className="aud" title="Only Me"><ILock size={11} /></span>;
  return <span className="aud" title={a === 'FRIENDS_OF_FRIENDS' ? 'Friends of Friends' : 'Friends'}><IPeople size={11} /></span>;
}

/** Text as written: line breaks kept, addresses as links, hashtags in the link colour; long text folds behind "See More". */
export function Rich({ text, fold = 420 }: { text: string; fold?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > fold + 80;
  const shown = long && !open ? text.slice(0, text.lastIndexOf(' ', fold) > fold / 2 ? text.lastIndexOf(' ', fold) : fold) : text;
  const parts = shown.split(/(https?:\/\/[^\s]+|#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((p, i) => i % 2 === 0 ? <Fragment key={i}>{p}</Fragment>
        : p.startsWith('#') ? <span key={i} className="hash">{p}</span>
        : <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.length > 60 ? `${p.slice(0, 57)}…` : p}</a>)}
      {long && !open && <>… <button type="button" className="see-more" onClick={() => setOpen(true)}>See More</button></>}
    </>
  );
}

function people(rs: Ref[], max = 2): ReactNode {
  const shown = rs.slice(0, max), rest = rs.length - shown.length;
  return shown.map((r, i) => (
    <Fragment key={r.id ?? i}>{i > 0 && (i === shown.length - 1 && !rest ? ' and ' : ', ')}<Name r={r} /></Fragment>
  )).concat(rest > 0 ? [<Fragment key="rest"> and {rest} other{rest > 1 ? 's' : ''}</Fragment>] : []);
}

/** What follows the author's name: "updated his profile picture", "added 6 new photos to the album …", "— with … at …". */
function Headline({ p }: { p: Post }) {
  const bits: ReactNode[] = [];
  const n = p.media.length;
  if (p.kind === 'AVATAR_CHANGE') bits.push(` updated ${pronoun(p.author)} profile picture`);
  else if (p.kind === 'COVER_CHANGE') bits.push(` updated ${pronoun(p.author)} cover photo`);
  else if (p.kind === 'NOTE') bits.push(' wrote a note');
  else if (p.kind === 'ARTICLE') bits.push(' published an article');
  else if (p.kind === 'SHARE' && p.shared) bits.push(<Fragment key="s"> shared <Name r={p.shared.author} />’s post</Fragment>);
  else if (p.kind === 'LINK' && !p.text) bits.push(' shared a link');
  else if (p.album && n) bits.push(<Fragment key="a"> added {n} new photo{n > 1 ? 's' : ''} to the album <L to={`/facebook/${encodeURIComponent(p.author.handle || p.author.id || '')}/photos/${p.album.id}`}>{p.album.title}</L></Fragment>);
  else if (n > 1 && !p.text) bits.push(` added ${n} new photos`);
  const extra: ReactNode[] = [];
  if (p.activity) extra.push(<Fragment key="act">{p.activityIcon ? `${p.activityIcon} ` : ''}{p.activity}</Fragment>);
  if (p.tagged.length) extra.push(<Fragment key="with">{extra.length ? ' ' : ''}with {people(p.tagged)}</Fragment>);
  if (p.place) extra.push(<Fragment key="at">{extra.length ? ' ' : ''}at {p.place.ref?.id ? <Name r={{ ...p.place.ref, name: p.place.name }} /> : <b>{p.place.name}</b>}</Fragment>);
  return (
    <>
      {bits}
      {extra.length > 0 && <span className="post-extra"> — {extra}</span>}
      {(bits.length > 0 || extra.length > 0) && '.'}
    </>
  );
}

/** "You, Hà Linh and 21 others" or "21"; the old "… like this." before reactions came. */
export function ReactionLine({ r, me, T }: { r: Reactions; me: Ref | null; T: Date }) {
  if (!r.total) return null;
  const names: ReactNode[] = [];
  if (r.mine) names.push('You');
  r.who.filter(w => w.id !== me?.id).forEach(w => names.push(<Name key={w.id ?? w.name} r={w} />));
  const shownNames = names.slice(0, 2), rest = r.total - shownNames.length;
  const old = T.getTime() < REACTIONS_SINCE;
  const text = shownNames.length
    ? <>{shownNames.map((x, i) => <Fragment key={i}>{i > 0 && (i === shownNames.length - 1 && rest <= 0 ? ' and ' : ', ')}{x}</Fragment>)}
        {rest > 0 && <> and {rest.toLocaleString('en-US')} other{rest > 1 ? 's' : ''}</>}</>
    : <>{r.total.toLocaleString('en-US')}{old ? ` ${r.total > 1 ? 'people like' : 'person likes'} this` : ''}</>;
  return (
    <span className="rx-line">
      <span className="rx-icons">{(old ? ['LIKE'] : r.types.length ? r.types : ['LIKE']).map(t => <ReactionIcon key={t} type={t} />)}</span>
      <span className="rx-names">{text}{old && shownNames.length ? <> like{names.length === 1 && !r.mine && rest <= 0 ? 's' : ''} this.</> : null}</span>
    </span>
  );
}

function CommentRow({ c, T, onOpen }: { c: Comment; T: Date; onOpen: (s: Shown) => void }) {
  const [openReplies, setOpenReplies] = useState(c.replies.length <= 2);
  return (
    <div className="cmt">
      <Avatar r={c.author} size={32} />
      <div className="cmt-main">
        <div className="cmt-bubble"><Name r={c.author} className="cmt-name" />{c.text && <span className="cmt-text"> <Rich text={c.text} fold={300} /></span>}</div>
        {c.media && (
          <button type="button" className="cmt-photo" onClick={() => onOpen({ items: [c.media!], index: 0 })}>
            <img src={cdn(c.media.url, 320)} alt="" loading="lazy" />
          </button>
        )}
        <div className="cmt-meta">
          <span className="fake-link">Like</span> · <span className="fake-link">Reply</span> · <span title={full(c.postedAt, c.precision)}>{ago(c.postedAt, T, c.precision)}</span>
          {c.editedAt && <> · <span className="muted">Edited</span></>}
          {c.reactions.total > 0 && <span className="cmt-likes"><ReactionIcon type={c.reactions.types[0] ?? 'LIKE'} size={14} />{c.reactions.total}</span>}
        </div>
        {c.replies.length > 0 && (openReplies
          ? <div className="cmt-replies">{c.replies.map(r => <CommentRow key={r.id} c={r} T={T} onOpen={onOpen} />)}</div>
          : <button type="button" className="cmt-more-replies" onClick={() => setOpenReplies(true)}>
              <Avatar r={c.replies[c.replies.length - 1].author} size={18} link={false} /> <b>{c.replies[c.replies.length - 1].author.name}</b> replied · {c.replies.length} Replies
            </button>)}
      </div>
    </div>
  );
}

function LifeEvent({ p }: { p: Post }) {
  return (
    <div className="life">
      <span className="life-ico">{/work|job|career/i.test(p.title ?? '') ? <IFlag size={26} /> : <IStar size={26} />}</span>
      <div className="life-title">{p.title}</div>
      {p.eventDate && <div className="life-date">{dateText(p.eventDate.slice(0, 10), p.eventPrecision)}</div>}
    </div>
  );
}

function NoteCard({ p }: { p: Post }) {
  return (
    <L to={`/facebook/post/${p.id}`} className="note-card">
      {p.coverUrl && <img src={cdn(p.coverUrl, 640)} alt="" loading="lazy" />}
      <div className="note-card-in">
        <div className="note-card-title">{p.title}</div>
        {p.excerpt && <p>{p.excerpt}</p>}
        <span className="note-card-more">Continue reading</span>
      </div>
    </L>
  );
}

function LinkCard({ l }: { l: NonNullable<Post['link']> }) {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(l.url)?.[1];
  const img = l.imageUrl ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null);
  return (
    <a className="link-card" href={l.url} target="_blank" rel="noopener noreferrer">
      {img && <span className="link-img"><img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" /></span>}
      <span className="link-in">
        <span className="link-title">{l.title ?? l.url}</span>
        {l.description && <span className="link-desc">{l.description}</span>}
        <span className="link-domain">{(l.domain ?? '').toUpperCase()}</span>
      </span>
    </a>
  );
}

/** The body of a post without its header and footer (also how a shared post sits inside the sharing one). */
function Body({ p, onOpen }: { p: Post; onOpen: (s: Shown) => void }) {
  return (
    <>
      {p.text && <div className={`post-text ${p.text.length < 90 && !p.media.length && !p.link && !p.shared ? 'big' : ''}`}><Rich text={p.text} /></div>}
      {p.kind === 'LIFE_EVENT' && <LifeEvent p={p} />}
      {(p.kind === 'NOTE' || p.kind === 'ARTICLE') && !p.body && <NoteCard p={p} />}
      {p.link && <LinkCard l={p.link} />}
      {p.media.length > 0 && <div className={`post-media ${p.kind === 'AVATAR_CHANGE' ? 'avatar-change' : ''}`}><MediaGrid media={p.media} onOpen={i => onOpen({ items: p.media, index: i })} /></div>}
    </>
  );
}

export default function PostCard({ p, full: whole = false }: { p: Post; full?: boolean }) {
  const { T } = useMoment();
  const me = useContext(MeContext);
  const [shown, setShown] = useState<Shown | null>(null);
  const comments = p.comments;
  return (
    <article className="card post">
      <header className="post-head">
        <Avatar r={p.author} size={40} />
        <div className="post-who">
          <div className="post-line">
            <Name r={p.author} className="post-author" />
            {p.wall && <> <span className="arrow">▸</span> <Name r={p.wall} className="post-author" /></>}
            <Headline p={p} />
          </div>
          <div className="post-meta">
            <L to={`/facebook/post/${p.id}`} title={full(p.postedAt, p.precision)}>{ago(p.postedAt, T, p.precision)}</L>
            {p.editedAt && <> · <span title={full(p.editedAt)}>Edited</span></>}
            {p.place && !p.tagged.length && !p.activity && <> · <IPin size={11} /></>}
            {' · '}<Audience a={p.audience ?? (p.author.kind === 'PAGE' ? 'PUBLIC' : 'FRIENDS')} />
          </div>
        </div>
        {p.pinned && <span className="pinned" title="Pinned post">Pinned</span>}
      </header>

      <Body p={p} onOpen={setShown} />
      {p.body && (
        <div className="note-full">
          {p.coverUrl && <img className="note-cover" src={cdn(p.coverUrl, 960)} alt="" />}
          {p.title && <h1>{p.title}</h1>}
          <div className="note-body" dangerouslySetInnerHTML={{ __html: p.body }} />
        </div>
      )}
      {p.shared && (
        <div className="shared">
          <div className="shared-head">
            <Avatar r={p.shared.author} size={32} />
            <div><Name r={p.shared.author} className="post-author" />{p.shared.wall && <> ▸ <Name r={p.shared.wall} /></>}
              <div className="post-meta"><L to={`/facebook/post/${p.shared.id}`}>{ago(p.shared.postedAt, T, p.shared.precision)}</L></div></div>
          </div>
          <Body p={p.shared} onOpen={setShown} />
        </div>
      )}

      {(p.reactions.total > 0 || p.commentCount > 0 || p.shareCount > 0) && (
        <div className="post-stats">
          <ReactionLine r={p.reactions} me={me} T={T} />
          <span className="post-counts">
            {p.commentCount > 0 && <L to={`/facebook/post/${p.id}`}>{p.commentCount.toLocaleString('en-US')} Comment{p.commentCount > 1 ? 's' : ''}</L>}
            {p.shareCount > 0 && <span>{p.shareCount.toLocaleString('en-US')} Share{p.shareCount > 1 ? 's' : ''}</span>}
          </span>
        </div>
      )}
      <div className="post-actions">
        <span className={p.reactions.mine ? 'on' : ''}><IThumb size={16} />Like</span>
        <span><IComment size={16} />Comment</span>
        <span><IShare size={16} />Share</span>
      </div>
      {(comments.length > 0 || p.hiddenComments > 0 || me) && (
        <div className="post-comments">
          {p.hiddenComments > 0 && (whole
            ? <div className="cmt-hidden">{p.hiddenComments} more comment{p.hiddenComments > 1 ? 's' : ''} {p.hiddenComments > 1 ? 'were' : 'was'} not kept</div>
            : <L className="cmt-view-more" to={`/facebook/post/${p.id}`}>View {comments.length ? 'previous comments' : `${p.hiddenComments} comment${p.hiddenComments > 1 ? 's' : ''}`}</L>)}
          {comments.map(c => <CommentRow key={c.id} c={c} T={T} onOpen={setShown} />)}
          {me && (
            <div className="cmt cmt-write">
              <Avatar r={me} size={32} />
              <div className="cmt-input">Write a comment…</div>
            </div>
          )}
        </div>
      )}
      <Viewer shown={shown} onClose={() => setShown(null)} />
    </article>
  );
}
