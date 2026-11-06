/* The iPhones (2015 on): the lock screen with T and what had just come in, the home screen of his apps and the dock,
   each app under a navigation bar. Drawn here; no system art. */
import { useEffect, useState, type ReactNode } from 'react';
import type { DeskItem } from '../api';
import { clockText, utc, vn } from '../moment';
import { Glyph } from '../glyphs';
import { Wallpaper } from '../wallpapers';
import { emoticons } from '../apps/Chat';
import { FacebookSite } from '../fb/Site';
import { chatScreen, usePhone } from './ctx';
import { appOf } from './Nokia';
import { CalendarView, ClockView, Contacts, Empty, Gallery, MemoryView, NoteReader, NotesList, PhoneBrowser, PhotoView, SettingsView, ThreadView, Threads } from './apps';

const VI_WD = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const pad = (n: number) => String(n).padStart(2, '0');
const APP_NAME: Record<string, string> = { SMS: 'Messages', ZALO: 'Zalo', FACEBOOK: 'Messenger', YAHOO: 'Yahoo! Messenger', SKYPE: 'Skype' };
const APP_GLYPH: Record<string, string> = { SMS: 'sms', ZALO: 'chat-blue', FACEBOOK: 'chat-blue', YAHOO: 'im-smile', SKYPE: 'phone-bubble' };

function useClock(T: Date) {
  const [tick, setTick] = useState(() => Date.now());
  const [base] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setTick(Date.now()), 10_000); return () => window.clearInterval(id); }, []);
  return new Date(T.getTime() + (tick - base));
}

function StatusBar({ light, notch }: { light: boolean; notch: boolean }) {
  const { T } = usePhone();
  const now = useClock(T);
  return (
    <div className={`ph-status ${light ? 'light' : ''} ${notch ? 'notch' : ''}`}>
      {notch ? <b className="ph-status-time">{clockText(now, true)}</b> : <span className="ph-status-sig"><i /><i /><i /><i /><i /></span>}
      {!notch && <b className="ph-status-time mid">{clockText(now, true)}</b>}
      <span className="ph-status-right">
        {notch && <span className="ph-status-bars"><i /><i /><i /><i /></span>}
        <svg viewBox="0 0 16 12" className="ph-status-wifi" aria-hidden="true"><path d="M1 4.2q7-5.6 14 0M3.4 6.9q4.6-3.6 9.2 0M5.8 9.4q2.2-1.6 4.4 0" /><circle cx="8" cy="11" r="1" /></svg>
        <span className="ph-status-batt"><i /></span>
      </span>
    </div>
  );
}

interface Notice { key: string; app: string; glyph: string; title: string; text: string; time: string; go: () => void }

function Lock({ onOpen, notch }: { onOpen: () => void; notch: boolean }) {
  const { machine, data, T, open } = usePhone();
  const now = useClock(T);
  const v = vn(now);
  const MONTH = (m: number) => `${m + 1}`;
  const notices: Notice[] = [
    ...data.day.memories.slice(0, 2).map(m => ({ key: `m${m.id}`, app: 'Ký ức', glyph: 'notes', title: m.title || (m.summary ?? '').slice(0, 50),
      text: m.title ? (m.summary ?? '') : '', time: 'Hôm nay', go: () => open('memory', { id: m.id }) })),
    ...data.day.toasts.slice(-3).reverse().map(t => {
      const s = chatScreen(t.platform, t.archiveId, t.sender, t.seq);
      return { key: `t${t.archiveId}${t.seq}`, app: APP_NAME[t.platform] ?? t.platform, glyph: APP_GLYPH[t.platform] ?? 'sms', title: t.sender,
        text: t.text ? emoticons(t.text) : 'Tệp đính kèm', time: t.at ? clockText(utc(t.at)!, true) : '', go: () => open(s.app, s.arg) };
    }),
  ];
  return (
    <div className="ph-lock" onClick={onOpen}>
      <Wallpaper wp={machine.lock ?? machine.wallpaper} fallback="ios-dusk" />
      <div className="ph-lock-time"><b>{pad(v.h)}:{pad(v.mi)}</b><span>{VI_WD[v.wd]}, {v.d} tháng {MONTH(v.mo)}</span></div>
      <div className="ph-lock-list">
        {notices.map(n => (
          <button type="button" key={n.key} className="ph-notice" onClick={e => { e.stopPropagation(); onOpen(); n.go(); }}>
            <span className="ph-notice-head"><Glyph name={n.glyph} size={18} /><span>{n.app}</span><time>{n.time}</time></span>
            <b>{n.title}</b>{n.text && <span className="ph-notice-text">{n.text}</span>}
          </button>
        ))}
      </div>
      <div className="ph-lock-hint">{notch ? 'Chạm để mở' : 'Nhấn để mở'}</div>
    </div>
  );
}

function Springboard() {
  const { machine, open } = usePhone();
  const home = machine.items.filter(i => i.place === 'HOME').sort((a, b) => a.sort - b.sort);
  const dock = machine.items.filter(i => i.place === 'DOCK').sort((a, b) => a.sort - b.sort);
  const icon = (it: DeskItem) => (
    <button type="button" key={it.key} className="ph-app" onClick={() => open(appOf(it), {})}>
      <span className="ph-app-icon"><Glyph name={it.glyph} size={46} /></span><span className="ph-app-label">{it.label}</span>
    </button>
  );
  return (
    <div className="ph-board">
      <Wallpaper wp={machine.wallpaper} fallback="ios-dusk" />
      <div className="ph-board-grid">{home.map(icon)}</div>
      <div className="ph-board-dots"><i className="on" /><i /></div>
      <div className="ph-dock">{dock.map(it => (
        <button type="button" key={it.key} className="ph-app" onClick={() => open(appOf(it), {})} title={it.label}>
          <span className="ph-app-icon"><Glyph name={it.glyph} size={46} /></span>
        </button>
      ))}</div>
    </div>
  );
}

function AppView() {
  const { stack, back, machine } = usePhone();
  const cur = stack[stack.length - 1];
  const prev = stack[stack.length - 2];
  const str = (k: string) => (typeof cur.arg[k] === 'string' ? (cur.arg[k] as string) : undefined);
  const num = (k: string) => (typeof cur.arg[k] === 'number' ? (cur.arg[k] as number) : null);
  const label = (app: string) => machine.items.find(i => (i.place === 'HOME' || i.place === 'DOCK') && appOf(i) === app)?.label;
  const names: Record<string, string> = { messages: 'Messages', zalo: 'Zalo', messenger: 'Messenger', facebook: 'Facebook', photos: 'Photos', photo: '',
    memories: 'Notes', memory: '', note: '', calendar: 'Calendar', clock: 'Clock', contacts: 'Contacts', settings: 'Settings', browser: 'Safari', music: 'Music' };
  const titleOf = (app: string, arg?: Record<string, unknown>) => (app === 'thread' ? String(arg?.title ?? '') : label(app) ?? names[app] ?? '');
  let body: ReactNode;
  let dark = false;
  switch (cur.app) {
    case 'messages': body = <Threads platform="SMS" />; break;
    case 'zalo': body = <Threads platform="ZALO" />; break;
    case 'thread': body = <ThreadView archiveId={str('archiveId') ?? ''} seq={num('seq')} />; break;
    case 'messenger': body = <FacebookSite path={str('thread') ? `/messenger/${str('thread')}` : '/messenger'} />; break;
    case 'facebook': body = <FacebookSite path="/facebook" />; break;
    case 'photos': body = <Gallery />; break;
    case 'photo': body = <PhotoView set={str('set') ?? 'roll'} index={num('index') ?? 0} />; dark = true; break;
    case 'memories': body = <NotesList />; break;
    case 'memory': body = <div className="ph-scroll"><MemoryView id={str('id') ?? ''} /></div>; break;
    case 'note': body = <div className="ph-scroll"><NoteReader noteId={str('noteId') ?? ''} /></div>; break;
    case 'calendar': body = <CalendarView />; break;
    case 'clock': body = <div className="ph-scroll"><ClockView /></div>; break;
    case 'contacts': body = <Contacts />; break;
    case 'settings': body = <SettingsView />; break;
    case 'browser': body = <PhoneBrowser url={str('url')} />; break;
    case 'music': body = <Empty text="Chưa có bài hát nào." />; break;
    default: body = <Empty text="Ứng dụng này không còn trên máy." />;
  }
  return (
    <div className={`ph-appview ph-app-${cur.app} ${dark ? 'dark' : ''}`}>
      <div className="ph-nav">
        {prev ? <button type="button" onClick={back}>‹ {titleOf(prev.app, prev.arg) || 'Back'}</button> : <span />}
        <b>{titleOf(cur.app, cur.arg)}</b>
      </div>
      <div className="ph-appbody">{body}</div>
    </div>
  );
}

export function IosScreen({ notch, homeBar }: { notch: boolean; homeBar: boolean }) {
  const { stack, home, T } = usePhone();
  const [locked, setLocked] = useState(true);
  useEffect(() => setLocked(true), [T]);
  const cur = stack[stack.length - 1];
  const light = locked || !cur || cur.app === 'photo';
  return (
    <div className={`ph-ios ${notch ? 'notch' : ''}`}>
      <StatusBar light={light} notch={notch} />
      {locked ? <Lock notch={notch} onOpen={() => setLocked(false)} /> : !cur ? <Springboard /> : <AppView />}
      {homeBar && !locked && <button type="button" className={`ph-homebar ${light ? 'light' : ''}`} onClick={home} aria-label="Màn hình chính" />}
    </div>
  );
}
