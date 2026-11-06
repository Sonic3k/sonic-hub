/* The Nokia (Series 40) of 2006–2015: the standby screen with its clock, the menu of nine, lists moved through with
   the keys, the soft keys under the screen. Drawn here; the keypad works by touch and by the keyboard's arrows,
   Enter and Esc. */
import { useEffect, useState, type ReactNode } from 'react';
import type { DeskItem } from '../api';
import { vn } from '../moment';
import { Glyph } from '../glyphs';
import { Wallpaper } from '../wallpapers';
import { usePhone } from './ctx';
import { CalendarView, ClockView, Contacts, Empty, Gallery, MemoryView, NoteReader, NotesList, PhoneBrowser, PhotoView, SettingsView, ThreadView, Threads, useKeys } from './apps';

const pad = (n: number) => String(n).padStart(2, '0');
const VI_WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
type Soft = [string, () => void] | null;

/** What a menu entry opens (entries without a program open by what they are). */
export const appOf = (it: Pick<DeskItem, 'app' | 'glyph'>) =>
  it.app && it.app !== 'none' ? it.app : it.glyph === 'contacts' || it.glyph === 'phone' ? 'contacts' : it.glyph === 'settings' ? 'settings' : it.glyph === 'camera' ? 'photos' : 'none';

const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key }));

export function NokiaScreen() {
  const ph = usePhone();
  const { stack, open, back, home, data, machine } = ph;
  const cur = stack[stack.length - 1];
  const [ask, setAsk] = useState(false);
  const sms = data.day.toasts.filter(t => t.platform === 'SMS');
  const menu = machine.items.filter(i => i.place === 'HOME').sort((a, b) => a.sort - b.sort);
  const str = (k: string) => (typeof cur?.arg[k] === 'string' ? (cur.arg[k] as string) : undefined);
  const num = (k: string) => (typeof cur?.arg[k] === 'number' ? (cur.arg[k] as number) : null);

  const choose: Soft = ['Chọn', () => press('Enter')];
  const backKey: Soft = ['Quay lại', back];
  let title = '', body: ReactNode = null, left: Soft = null, mid: Soft = choose, right: Soft = backKey;
  if (!cur) {
    body = <Standby sms={sms.length} memories={data.day.memories.length} />;
    left = sms.length ? ['Xem', () => open('thread', { platform: 'SMS', archiveId: sms[sms.length - 1].archiveId, title: sms[sms.length - 1].sender })] : ['Đi tới', () => open('clock')];
    mid = ['Menu', () => open('menu')];
    right = ['Tên', () => open('contacts')];
  } else {
    switch (cur.app) {
      case 'menu': body = <Menu items={menu} />; right = ['Thoát', back]; break;
      case 'messages': title = 'Tin nhắn'; body = <Threads platform="SMS" />; break;
      case 'zalo': title = 'Zalo'; body = <Threads platform="ZALO" />; break;
      case 'thread': title = str('title') ?? 'Tin nhắn'; body = <ThreadView archiveId={str('archiveId') ?? ''} seq={num('seq')} />; mid = null; break;
      case 'messenger': title = 'Tin nhắn'; body = <ThreadView archiveId={str('thread') ?? ''} />; mid = null; break;
      case 'photos': title = 'Thư viện'; body = <Gallery />; mid = ['Mở', () => press('Enter')]; break;
      case 'photo': title = 'Ảnh'; body = <PhotoView set={str('set') ?? 'roll'} index={num('index') ?? 0} />; mid = null; break;
      case 'memories': title = 'Ghi chú'; body = <NotesList />; mid = ['Mở', () => press('Enter')]; break;
      case 'memory': title = 'Ký ức'; body = <div className="ph-scroll"><MemoryView id={str('id') ?? ''} /></div>; mid = null; break;
      case 'note': title = 'Bài viết'; body = <div className="ph-scroll"><NoteReader noteId={str('noteId') ?? ''} /></div>; mid = null; break;
      case 'calendar': title = 'Lịch'; body = <CalendarView />; mid = ['Đi tới', () => press('Enter')]; break;
      case 'clock': title = 'Đồng hồ'; body = <div className="ph-scroll"><ClockView /></div>; mid = null; break;
      case 'contacts': title = 'Danh bạ'; body = <Contacts />; break;
      case 'settings': title = 'Cài đặt'; body = <SettingsView />; break;
      case 'browser': title = 'Web'; body = <PhoneBrowser url={str('url')} />; mid = null; break;
      case 'music': title = 'Âm nhạc'; body = <Empty text="Chưa có bài hát nào." />; mid = null; break;
      case 'games': title = 'Trò chơi'; body = <Empty text="Chưa có trò chơi nào." />; mid = null; break;
      default: title = 'Ứng dụng'; body = <Empty text="Ứng dụng này không còn trên máy." />; mid = null;
    }
  }
  const end = () => { if (stack.length) home(); else setAsk(a => !a); };
  useKeys(k => {
    if (k === 'Escape' || k === 'Backspace') { if (ask) setAsk(false); else if (stack.length) back(); }
    else if (k === 'F1') left?.[1]();
    else if (k === 'F2') right?.[1]();
    else if (k === 'End') end();
    else if (k === 'Call') open('messages');
    else if (!cur && k === 'Enter') open('menu');
    else if (cur && (k === 'ArrowDown' || k === 'ArrowUp')) {
      const el = document.querySelector('.ph-s40-body .dv-chat, .ph-s40-body .ph-scroll');
      el?.scrollBy({ top: k === 'ArrowDown' ? 60 : -60 });
    }
  }, [cur, stack.length, left, right, ask]);

  return (
    <div className="ph-s40">
      {cur && cur.app !== 'menu' && <div className="ph-s40-title"><Bars /><span>{title}</span><Batt /></div>}
      <div className={`ph-s40-body ${cur ? '' : 'standby'}`}>{body}</div>
      {ask && (
        <div className="ph-s40-ask"><p>Tắt máy?</p>
          <div><button type="button" onClick={ph.powerOff}>Có</button><button type="button" onClick={() => setAsk(false)}>Không</button></div>
        </div>
      )}
      <div className="ph-s40-soft">
        <button type="button" onClick={() => left?.[1]()}>{left?.[0] ?? ''}</button>
        <button type="button" className="mid" onClick={() => mid?.[1]()}>{mid?.[0] ?? ''}</button>
        <button type="button" onClick={() => right?.[1]()}>{right?.[0] ?? ''}</button>
      </div>
    </div>
  );
}

const Bars = () => <span className="ph-s40-bars" aria-hidden="true">{[3, 5, 7, 9, 11].map(h => <i key={h} style={{ height: h }} />)}</span>;
const Batt = () => <span className="ph-s40-batt" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} />)}</span>;

function Standby({ sms, memories }: { sms: number; memories: number }) {
  const { machine, T } = usePhone();
  const [tick, setTick] = useState(() => Date.now());
  const [base] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setTick(Date.now()), 10_000); return () => window.clearInterval(id); }, []);
  const t = vn(new Date(T.getTime() + (tick - base)));
  return (
    <div className="ph-s40-standby">
      <Wallpaper wp={machine.wallpaper} fallback="s40-blue" />
      <div className="ph-s40-sb-top"><Bars /><Batt /></div>
      <div className="ph-s40-clock"><b>{pad(t.h)}:{pad(t.mi)}</b><span>{VI_WD[t.wd]}, {pad(t.d)}/{pad(t.mo + 1)}/{t.y}</span></div>
      {(sms > 0 || memories > 0) && (
        <div className="ph-s40-notes">
          {sms > 0 && <span><Glyph name="sms" size={16} />{sms} tin nhắn mới</span>}
          {memories > 0 && <span><Glyph name="sticky" size={16} />Ký ức hôm nay</span>}
        </div>
      )}
    </div>
  );
}

function Menu({ items }: { items: DeskItem[] }) {
  const { open } = usePhone();
  const [sel, setSel] = useState(0);
  const pick = (i: number) => { const it = items[i]; if (it) open(appOf(it)); };
  useKeys(k => {
    const n = items.length;
    if (!n) return;
    if (k === 'ArrowRight') setSel(s => (s + 1) % n);
    else if (k === 'ArrowLeft') setSel(s => (s - 1 + n) % n);
    else if (k === 'ArrowDown') setSel(s => Math.min(n - 1, s + 3));
    else if (k === 'ArrowUp') setSel(s => Math.max(0, s - 3));
    else if (k === 'Enter') pick(sel);
  }, [items, sel]);
  return (
    <div className="ph-s40-menu">
      <div className="ph-s40-title"><Bars /><span>{items[sel]?.label ?? 'Menu'}</span><Batt /></div>
      <div className="ph-s40-grid">
        {items.map((it, i) => (
          <button type="button" key={it.key} className={i === sel ? 'on' : ''} onClick={() => { setSel(i); pick(i); }} title={it.label}>
            <Glyph name={it.glyph} size={44} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** The keypad under the screen: soft keys, the navigation ring, call and end, the numbers. */
export function Keypad({ compact }: { compact?: boolean }) {
  const k = (key: string) => () => press(key);
  return (
    <div className={`ph-keys ${compact ? 'compact' : ''}`}>
      <div className="ph-keys-top">
        <button type="button" className="ph-key-soft" onClick={k('F1')} aria-label="Phím trái" />
        <div className="ph-key-nav">
          <button type="button" className="up" onClick={k('ArrowUp')} aria-label="Lên" />
          <button type="button" className="left" onClick={k('ArrowLeft')} aria-label="Trái" />
          <button type="button" className="ok" onClick={k('Enter')} aria-label="Chọn" />
          <button type="button" className="right" onClick={k('ArrowRight')} aria-label="Phải" />
          <button type="button" className="down" onClick={k('ArrowDown')} aria-label="Xuống" />
        </div>
        <button type="button" className="ph-key-soft" onClick={k('F2')} aria-label="Phím phải" />
        <button type="button" className="ph-key-call" onClick={k('Call')} aria-label="Tin nhắn" />
        <button type="button" className="ph-key-end" onClick={k('End')} aria-label="Kết thúc / tắt máy" />
      </div>
      {!compact && (
        <div className="ph-keys-num">
          {[['1', '.,?'], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', '+'], ['0', '␣'], ['#', '⇧']].map(([n, l]) => (
            <span key={n}><b>{n}</b><small>{l}</small></span>
          ))}
        </div>
      )}
    </div>
  );
}
