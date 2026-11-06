/* What sits on the desktop besides the icons: the gadgets of Vista and 7 (calendar, clock, a slide show of the day's
   photos), and the notices of T — messages that had just come in, and memories of that day. */
import { useEffect, useMemo, useState } from 'react';
import { cdn } from '../../api/client';
import type { DeskItem, Toast } from '../api';
import { clockText, DAYS, MONTHS, utc, vn } from '../moment';
import { Glyph } from '../glyphs';
import { emoticons } from '../apps/Chat';
import { viewDay } from '../apps/Viewers';
import { useWm } from './wm';
import { useDesk, useTick, viewerName } from './desk';

export function Gadgets({ items, sidebar }: { items: DeskItem[]; sidebar: boolean }) {
  return (
    <aside className={`dv-gadgets ${sidebar ? 'sidebar' : ''}`}>
      {items.map(it => it.app === 'calendar' ? <CalendarGadget key={it.key} /> : it.app === 'clock' ? <ClockGadget key={it.key} />
        : it.app === 'photos' ? <SlideGadget key={it.key} /> : null)}
    </aside>
  );
}

function CalendarGadget() {
  const { T, openTime } = useDesk();
  const v = vn(T);
  return (
    <button type="button" className="dv-g-cal" onClick={openTime} title="Cỗ máy thời gian">
      <span className="dv-g-cal-m">{MONTHS[v.mo]}</span>
      <b>{v.d}</b>
      <span className="dv-g-cal-w">{DAYS[v.wd]}</span>
    </button>
  );
}

function ClockGadget() {
  const { T } = useDesk();
  const t = useTick(T, 1000);
  const v = vn(t), s = Math.floor(t.getTime() / 1000) % 60;
  const hand = (deg: number, len: number, w: number, c: string) =>
    <line x1="50" y1="50" x2={50 + len * Math.sin(deg * Math.PI / 180)} y2={50 - len * Math.cos(deg * Math.PI / 180)} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  return (
    <div className="dv-g-clock">
      <svg viewBox="0 0 100 100" aria-label={clockText(t)}>
        <defs><radialGradient id="gclk" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#d9dde3" /></radialGradient></defs>
        <circle cx="50" cy="50" r="46" fill="url(#gclk)" stroke="#2a2f36" strokeWidth="4" />
        {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="9" x2="50" y2={i % 3 ? 13 : 16} stroke="#333" strokeWidth={i % 3 ? 1.4 : 2.6} transform={`rotate(${i * 30} 50 50)`} />)}
        {hand((v.h % 12) * 30 + v.mi / 2, 24, 4, '#222')}
        {hand(v.mi * 6 + s / 10, 34, 3, '#222')}
        {hand(s * 6, 37, 1.2, '#c0281b')}
        <circle cx="50" cy="50" r="2.6" fill="#222" />
      </svg>
    </div>
  );
}

function SlideGadget() {
  const { data, os } = useDesk();
  const { open } = useWm();
  const photos = data.day.photos;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (photos.length < 2) return;
    const id = window.setInterval(() => setI(x => (x + 1) % photos.length), 6000);
    return () => window.clearInterval(id);
  }, [photos.length]);
  useEffect(() => setI(0), [data.at]);
  const p = photos[i % Math.max(1, photos.length)];
  if (!p) return null;
  return (
    <button type="button" className="dv-g-slide" onClick={() => { viewDay(photos); open({ app: 'viewer', arg: { set: 'day', index: i }, title: viewerName(os) }); }}>
      <img key={p.id} src={cdn(p.url, 320)} alt="" />
    </button>
  );
}

/* ── notices ────────────────────────────────────────────────────────────── */

const APP_NAME: Record<string, string> = { YAHOO: 'Yahoo! Messenger', FACEBOOK: 'Facebook', SMS: 'Tin nhắn', ZALO: 'Zalo', SKYPE: 'Skype' };
const APP_GLYPH: Record<string, string> = { YAHOO: 'im-smile', FACEBOOK: 'fb', SMS: 'sms', ZALO: 'chat-blue', SKYPE: 'phone-bubble' };
const SENT: Record<string, string> = { PHOTO: 'đã gửi một ảnh', VIDEO: 'đã gửi một video', STICKER: 'đã gửi một sticker', AUDIO: 'đã gửi tin nhắn thoại', FILE: 'đã gửi một tệp', GIF: 'đã gửi một GIF' };

interface Notice { key: string; head: string; glyph: string; title: string; text: string; time?: string; open: () => void }

/** skip: the memory being shown (its own notice would only repeat it) */
export function Notices({ ready, messengerApp, skip }: { ready: boolean; messengerApp: boolean; skip?: string }) {
  const { data, scene, openChat } = useDesk();
  const [gone, setGone] = useState<Record<string, boolean>>({});
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!ready) return;
    const id = window.setTimeout(() => setShown(true), 1800);
    return () => window.clearTimeout(id);
  }, [ready, data.at]);
  const list = useMemo<Notice[]>(() => {
    const byChat = new Map<string, Toast[]>();
    for (const t of data.day.toasts) byChat.set(t.archiveId, [...(byChat.get(t.archiveId) ?? []), t]);
    const chats = [...byChat.values()].map(ts => {
      const last = ts[ts.length - 1];
      const head = last.platform === 'FACEBOOK' && messengerApp ? 'Messenger' : APP_NAME[last.platform] ?? last.platform;
      const text = last.text ? emoticons(last.text) : SENT[last.kind ?? ''] ?? '';
      return { key: `c:${last.archiveId}:${last.seq}`, head, glyph: APP_GLYPH[last.platform] ?? 'chat-blue', title: last.sender,
        text: ts.length > 1 ? `${text}  (+${ts.length - 1})` : text, time: last.at ? clockText(utc(last.at)!) : undefined,
        open: () => openChat(last.platform, last.archiveId, last.sender, last.seq) };
    }).slice(-3);
    const memories = data.day.memories.filter(m => m.id !== skip).slice(0, 2).map(m => ({ key: `m:${m.id}`, head: 'Ký ức', glyph: 'sticky',
      title: m.title || (m.summary ?? '').slice(0, 60), text: m.title ? (m.summary ?? '') : '', time: 'Hôm nay', open: () => scene(m.id) }));
    return [...memories, ...chats];
  }, [data, messengerApp, openChat, scene, skip]);
  const live = list.filter(n => !gone[n.key]);
  if (!shown || !live.length) return null;
  return (
    <div className="dv-notices">
      {live.map(n => (
        <div key={n.key} className="dv-notice" role="status">
          <div className="dv-notice-head"><Glyph name={n.glyph} size={16} /><span>{n.head}</span>{n.time && <time>{n.time}</time>}
            <button type="button" onClick={() => setGone(g => ({ ...g, [n.key]: true }))} aria-label="Đóng">×</button></div>
          <button type="button" className="dv-notice-body" onClick={() => { n.open(); setGone(g => ({ ...g, [n.key]: true })); }}>
            <b>{n.title}</b>{n.text && <span>{n.text}</span>}
          </button>
        </div>
      ))}
    </div>
  );
}
