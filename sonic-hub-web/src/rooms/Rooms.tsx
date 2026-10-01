/* The rooms of the portal — markup mirrors the approved demo so its CSS applies as-is. */
import type { CSSProperties } from 'react';
import type { Collection, MediaFile, Note, Person } from '../types';
import { cdn } from '../api/client';
import { yearsOf } from '../api/hub';
import { shortDay, yearOf } from '../lib/date';
import { hashString } from '../lib/rng';
import Justified from '../components/Justified';
import WarpZone from '../components/WarpZone';

type V = CSSProperties & Record<string, string | number>;
const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fmt = (n: number) => n.toLocaleString('vi-VN');
const nameOf = (p: Person) => p.displayName || p.name;
export const REGION_PALETTES = [['#FFD9A6', '#E08A52', '#6B3218', 'rgba(255,170,100,.3)'], ['#B8F4EC', '#3BA3A6', '#123E48', 'rgba(120,230,220,.28)'], ['#FFD0E8', '#D9579B', '#5A1640', 'rgba(255,150,200,.3)'], ['#D2F5B8', '#4E9E4B', '#173B1C', 'rgba(160,240,140,.24)'], ['#E2D6FF', '#7155D9', '#22164F', 'rgba(190,170,255,.3)'], ['#FFF8E8', '#D9CFB8', '#6E6656', 'rgba(255,240,210,.25)']];
const regionStyle = (name: string): V => { const p = REGION_PALETTES[hashString(name) % REGION_PALETTES.length]; return { '--p1': p[0], '--p2': p[1], '--p3': p[2], '--atm': p[3] }; };

export interface Go { room: (id: string) => void; leave: (to: string, external?: boolean) => void; view: (items: MediaFile[], i: number) => void; read: (platform: string, who?: string) => void; year: (y: number) => void; region: (name: string) => void }

/* ── Hôm nay ─────────────────────────────────────────────────────────────── */
export function HomeRoom(p: { year: number; month: number; day: number; isRandom: boolean; scope?: 'day' | 'month' | 'year'; items: MediaFile[]; loading: boolean; people: Person[]; note?: Note; totals: { photos: number; notes: number; persons: number }; regions: { name: string; count: number }[]; go: Go }) {
  const { year, items, people, note, go } = p, ago = new Date().getFullYear() - year;
  const lede = p.loading ? 'Đang tìm lại ngày ấy…' : p.isRandom ? `Một ngày bất kỳ của năm ${year}${ago > 0 ? `, ${ago} năm trước` : ''}.`
    : p.scope === 'day' ? (ago > 0 ? `Trôi về đúng ngày này, ${ago} năm trước.` : 'Đêm nay.')
    : p.scope === 'month' ? `Đúng ngày ấy không có tấm nào — đây là tháng ${p.month} năm ${year}.`
    : p.scope === 'year' ? `Tháng ấy trống — vài khoảnh khắc của cả năm ${year}.` : 'Chưa kết nối được kho ký ức.';
  const today = new Date(), eyebrow = p.isRandom ? 'Một ngày bất kỳ' : new Date(today).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  const doors: [string, string, string, boolean?][] = [['photos', 'Ảnh', `${fmt(p.totals.photos)} tấm`], ['journal', 'Nhật ký', `${fmt(p.totals.notes)} trang`], ['angels', 'Angels', `${p.totals.persons} người`], ['fantasy', 'Bóng đá', 'Fantasy'], ['games', 'Game', 'kệ game']];
  return (
    <section className="home">
      <div className="hero" style={{ '--img': items[0] ? `url('${cdn(items[0].cdnUrl, 640)}')` : 'none' } as V}><div className="hero-in">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{p.isRandom ? <>{shortDay(p.month, p.day)} <span className="yr">{year}</span></> : <>Ngày này năm <span className="yr">{year}</span></>}</h1>
        <p className="lede">{lede}</p>
        <div className="actions"><button type="button" className="btn primary" onClick={() => go.room('photos')}>Xem ảnh năm {year}</button><button type="button" className="btn" onClick={() => go.room('angels')}>Đọc lại chuyện cũ</button></div>
      </div></div>
      <div className="moments">
        <article className="moment m-photos">
          <h3>{p.scope === 'day' ? 'Ảnh cùng ngày' : p.scope === 'month' ? 'Ảnh tháng ấy' : 'Ảnh năm ấy'}</h3>
          {items.length ? <div className="thumbs">{items.slice(0, 3).map((m, i) => <img key={m.id} src={cdn(m.thumbnailUrl ?? m.cdnUrl, 320)} alt={m.caption ?? ''} onClick={() => go.view(items, i)} />)}</div> : <p className="hush">Chưa có tấm nào.</p>}
          {items.length > 0 && <button type="button" className="more" onClick={() => go.view(items, 0)}>{items.length} ảnh</button>}
        </article>
        <article className="moment m-chat">
          <h3>Năm ấy có</h3>
          {people.length ? <><blockquote>{people.map(nameOf).join(', ')}</blockquote><cite>{people.map(x => x.period).filter(Boolean).join(' · ')}</cite></> : <blockquote>Một năm của riêng mình.</blockquote>}
          <button type="button" className="more" onClick={() => go.room('angels')}>Vào Angels</button>
        </article>
        <article className="moment m-note">
          <h3>{note ? (note.kind === 'ARTICLE' ? 'Bài viết năm ấy' : 'Nhật ký năm ấy') : 'Ghi chép'}</h3>
          {note ? <><p className="t">{note.title || shortDay(+(note.createdAt ?? '').slice(5, 7) || 1, +(note.createdAt ?? '').slice(8, 10) || 1)}</p><p className="d">{(note.excerpt || plain(note.content)).slice(0, 150)}</p></> : <p className="d">Năm {year} chưa có trang nào.</p>}
          <button type="button" className="more" onClick={() => go.room('journal')}>Đọc tiếp</button>
        </article>
      </div>
      <h2 className="sec">Các phòng</h2>
      <div className="doors">{doors.map(([id, name, sub]) => <button key={id} type="button" className={`door d-${id}`} onClick={() => go.room(id)}><span className="door-art" /><b>{name}</b><span>{sub}</span></button>)}</div>
      {p.regions.length > 0 && <>
        <h2 className="sec">Các vùng</h2>
        <div className="doors regions">{p.regions.map(r => <button key={r.name} type="button" className="door" style={regionStyle(r.name)} onClick={() => go.region(r.name)}><span className="door-art" /><b>{r.name}</b><span>{fmt(r.count)} khoảnh khắc</span></button>)}</div>
      </>}
    </section>
  );
}

/* ── Ảnh ─────────────────────────────────────────────────────────────────── */
export function PhotosRoom({ year, count, albums, items, go }: { year: number; count: number; albums: Collection[]; items: MediaFile[]; go: Go }) {
  return (
    <section className="photos">
      <header className="head"><p className="eyebrow">Ảnh</p><h1>Năm <span className="yr">{year}</span></h1><p className="lede">{count ? `${fmt(count)} tấm, xếp theo ngày chụp.` : 'Năm này chưa có tấm nào — chọn một năm khác.'}</p></header>
      {albums.length > 0 && <div className="folders">{albums.map(a => <button key={a.id} type="button" className="folder" onClick={() => go.leave(`/photos?album=${a.id}`)}><span className="folder-art">{a.thumbnailUrl ? <img src={cdn(a.thumbnailUrl, 400)} alt="" /> : null}</span><b>{a.name}</b><span>{fmt(a.mediaCount ?? 0)} ảnh</span></button>)}</div>}
      {items.length > 0 && <><h2 className="sec">Ảnh năm {year}</h2><Justified items={items} onOpen={(i) => go.view(items, i)} /></>}
      <WarpZone label="Vào kho ảnh" hint="toàn bộ album và ảnh, mọi năm" onWarp={() => go.leave('/photos')} />
    </section>
  );
}

/* ── Nhật ký ─────────────────────────────────────────────────────────────── */
function NoteCard({ n }: { n: Note }) {
  const y = yearOf(n.publishedAt ?? n.createdAt);
  return (
    <article className="note">
      <div className="note-meta"><span className="note-year">{Number.isNaN(y) ? '' : y}</span>{n.mood && <span className="note-mood">{n.mood}</span>}</div>
      <h3>{n.title || 'Không tiêu đề'}</h3>
      <p>{(n.excerpt || plain(n.content)).slice(0, 240)}</p>
      {(n.category || n.tags?.length) ? <div className="chips">{n.category && <span className="chip problem">{n.category}</span>}{n.tags?.map(t => <span key={t.id} className="chip">{t.name}</span>)}</div> : null}
    </article>
  );
}
export function JournalRoom({ year, notes, go }: { year: number; notes: Note[]; go: Go }) {
  const mine = notes.filter(n => yearOf(n.publishedAt ?? n.createdAt) === year), others = notes.filter(n => !mine.includes(n)).slice(0, 8);
  return (
    <section className="journal">
      <header className="head"><p className="eyebrow">Nhật ký</p><h1>{mine.length ? <>Viết năm <span className="yr">{year}</span></> : 'Nhật ký'}</h1><p className="lede">{mine.length ? 'Những trang đã viết trong năm này.' : `Năm ${year} chưa có trang nào.`}</p></header>
      {mine.length > 0 && <div className="notes">{mine.map(n => <NoteCard key={n.id} n={n} />)}</div>}
      {others.length > 0 && <><h2 className="sec">Từ các năm khác</h2><div className="notes others">{others.map(n => <NoteCard key={n.id} n={n} />)}</div></>}
      <WarpZone label="Vào không gian đọc" hint="đọc từng bài cho đúng nghĩa" onWarp={() => go.leave('/journal')} />
    </section>
  );
}

/* ── Angels ──────────────────────────────────────────────────────────────── */
export function AngelsRoom({ year, persons, go }: { year: number; persons: Person[]; go: Go }) {
  const list = persons.filter(x => !x.isSelf), now = list.filter(x => { const r = yearsOf(x); return r ? year >= r[0] && year <= r[1] : false; });
  return (
    <section className="angels">
      <header className="head"><p className="eyebrow">Angels</p><h1>{now.length ? <>Năm <span className="yr">{year}</span></> : 'Những người thương'}</h1><p className="lede">{now.length ? 'Người ở bên trong năm này được làm nổi.' : `Năm ${year} không có ai — đây là tất cả.`}</p></header>
      <div className="people">{list.map(x => { const on = now.includes(x), r = yearsOf(x); return (
        <button key={x.id} type="button" className={`person ${on ? 'on' : 'dim'}`} onClick={() => r && go.year(r[0])}>
          <span className="person-art">{x.avatarUrl ? <img src={cdn(x.avatarUrl, 320)} alt="" /> : <i>{nameOf(x).slice(0, 1)}</i>}</span>
          <b>{nameOf(x)}</b><span>{[x.period, x.relationshipType?.toLowerCase().replace('_', ' ')].filter(Boolean).join(' · ')}</span>
        </button>); })}</div>
      <h2 className="sec">Phòng đọc</h2>
      <div className="readers">{[['Yahoo', 'Yahoo! Messenger', '#7B1FA2'], ['Nokia', 'Tin nhắn Nokia', '#2E6FDB'], ['Facebook', 'Facebook', '#1877F2']].map(([k, label, tone]) => <button key={k} type="button" className="reader-btn" style={{ '--tone': tone } as V} onClick={() => go.read(label)}><i />{label}</button>)}</div>
      <WarpZone label="Vào Angels" hint="mỗi người một chương" onWarp={() => go.leave('/angels')} />
    </section>
  );
}

/* ── Bóng đá & Game ──────────────────────────────────────────────────────── */
const FOOTBALL = import.meta.env.VITE_FOOTBALL_URL, PAGES = (import.meta.env.VITE_PAGES_URL ?? '').replace(/\/$/, '');
export function FantasyRoom({ year, go }: { year: number; go: Go }) {
  return (
    <section className="fantasy">
      <header className="head"><p className="eyebrow">Bóng đá</p><h1>Mùa <span className="yr">{year}/{String(year + 1).slice(2)}</span></h1><p className="lede">Fantasy Football của tôi.</p></header>
      <div className="empty"><div className="empty-art" /><div className="empty-txt"><h3>Sân riêng</h3><p>Đội hình, điểm số và bảng xếp hạng sống ở trang Fantasy riêng — cổng warp bên dưới dẫn thẳng sang đó.</p></div></div>
      <WarpZone label="Sang Fantasy Football" onWarp={() => (FOOTBALL ? go.leave(FOOTBALL, true) : go.leave('/football'))} />
    </section>
  );
}
export function GamesRoom({ go }: { go: Go }) {
  const games = [{ name: 'Mướp và Mười Hai Ngọn Đèn', note: 'platformer tự làm', url: PAGES ? `${PAGES}/game-muop.html` : '' }, { name: 'Sắp có', note: 'chưa có' }];
  return (
    <section className="games">
      <header className="head"><p className="eyebrow">Game</p><h1>Kệ game</h1><p className="lede">Những trò đã chơi, đang chơi, và sẽ tự làm.</p></header>
      <div className="shelf">{games.map((g, i) => <button key={g.name} type="button" className="game" style={{ '--i': i } as V} onClick={() => g.url && go.leave(g.url, true)}><span className="game-art" /><b>{g.name}</b><span>{g.note}</span></button>)}</div>
      <WarpZone label="Vào kệ game" onWarp={() => go.leave('/games')} />
    </section>
  );
}

/* ── Vùng (tag) ──────────────────────────────────────────────────────────── */
export function RegionRoom({ name, total, items, notes, go }: { name: string; total: number; items: MediaFile[]; notes: Note[]; go: Go }) {
  return (
    <section className="photos region">
      <header className="head"><p className="eyebrow">Vùng</p><h1>{name}</h1><p className="lede">{total ? `${fmt(total)} khoảnh khắc sống ở đây.` : 'Đang hạ cánh…'}</p></header>
      {items.length > 0 && <Justified items={items} onOpen={(i) => go.view(items, i)} />}
      {notes.length > 0 && <><h2 className="sec">Những trang viết trong vùng này</h2><div className="notes">{notes.map(n => <NoteCard key={n.id} n={n} />)}</div></>}
      <WarpZone label={`Mở toàn bộ vùng ${name}`} onWarp={() => go.leave(`/photos?tag=${encodeURIComponent(name)}`)} />
    </section>
  );
}
