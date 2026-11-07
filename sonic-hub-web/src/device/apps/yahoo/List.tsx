/* The buddy list of his Messenger at T, drawn from his own copy of it (the Purple skin of 11.5, its language pack)
   and from his screenshots for what that copy didn't have: 8 as on 6/8/2007, 9 as on 2/9/2010, 10 as on 22/8/2011,
   11 as on 1/8/2013. Who was online is who wrote around then; everyone else shows offline. */
import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import { desk, type Buddy, type BuddyList } from '../../api';
import { cdn } from '../../fb/api';
import { useMoment, utc } from '../../moment';
import { useWm } from '../../pc/wm';
import { useDesk } from '../../pc/desk';
import { ymText, ymVer, type YmVer } from './strings';
import { bgUrl, Sp, stateBg, useYm } from './ui';
import { Card, type CardAt } from './Card';

const AD: Record<YmVer, string> = { YM8: 'ads/2007.png', YM9: 'ads/2010.png', YM10: 'ads/2011.png', YM11: 'ads/2013.png' };
/** the notice Messenger 11 showed from late 2012 (his screenshot of 1/8/2013) */
const NOTICE_FROM = Date.UTC(2012, 10, 15);

function useList() {
  const { at } = useMoment();
  const { ver } = useDesk();
  const v = ymVer(ver.yahoo);
  const q = useQuery({ queryKey: ['buddies', 'YAHOO', at], queryFn: () => desk.buddies('YAHOO', at!) });
  const { open } = useWm();
  const chat = (b: Buddy) => {
    if (!b.archiveId) return;
    const who = b.ref.handle && b.ref.handle !== b.name ? `${b.name} (${b.ref.handle})` : b.name;
    open({ app: 'im', arg: { archiveId: b.archiveId, name: b.name }, title: v === 'YM8' ? `${who} - Instant Message` : who });
  };
  return { v, q, chat, data: q.data };
}

/** Recently in touch (Messenger 11's own group): who wrote in the two days before T, newest first. */
function recentOf(data: BuddyList | undefined, T: Date) {
  if (!data) return [];
  const seen = new Map<string, Buddy>();
  for (const g of data.groups) for (const b of g.buddies) {
    const d = utc(b.lastAt);
    if (d && T.getTime() - d.getTime() < 2 * 86400_000 && d.getTime() <= T.getTime()) seen.set(b.ref.key ?? b.name, b);
  }
  return [...seen.values()].sort((x, y) => (utc(y.lastAt)!.getTime() - utc(x.lastAt)!.getTime())).slice(0, 8);
}

export function YahooList() {
  const { v } = useList();
  return v === 'YM8' ? <List8 /> : v === 'YM9' ? <List9 /> : <List11 v={v} />;
}

/* ── 10 and 11 ─────────────────────────────────────────────────────────── */

function List11({ v }: { v: YmVer }) {
  const { a } = useYm();
  const { T } = useDesk();
  const { q, chat, data } = useList();
  const t = ymText(v);
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [card, setCard] = useState<CardAt | null>(null);
  const hover = useRef<number | undefined>(undefined);
  const me = data?.me;
  const recent = useMemo(() => (v === 'YM11' ? recentOf(data, T) : []), [v, data, T]);
  const groups = useMemo(() => [...(recent.length ? [{ name: t.recent, online: recent.filter(b => b.online).length, buddies: recent, recent: true }] : []),
    ...(data?.groups ?? []).map(g => ({ ...g, recent: false }))], [data, recent, t.recent]);

  const enter = (b: Buddy, e: RPE<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    window.clearTimeout(hover.current);
    hover.current = window.setTimeout(() => setCard({ b, top: r.top, left: r.left }), 650);
  };
  const leave = () => { window.clearTimeout(hover.current); hover.current = window.setTimeout(() => setCard(null), 250); };

  return (
    <div className={`ym ym-11 ${v === 'YM10' ? 'ym-10' : ''}`}>
      <div className="ym-menubar" style={stateBg(a('skin/theme/mainmenubarbg_aero.png'), 2, 0)}>{t.menu.map(m => <span key={m}>{m}</span>)}</div>
      <div className="ym-me" style={bgUrl(a('skin/FriendList/me_bg.png'))}>
        <div className="ym-me-pic"><img src={me?.avatarUrl ? cdn(me.avatarUrl, 96) : a('skin/images/DefaultFriendIcon.png')} alt="" /></div>
        <div className="ym-me-r">
          <div className="ym-me-l1">
            <Sp src={a('skin/images/online.png')} w={10} h={10} />
            <b>{me?.name ?? 'Sonic3k'}</b>
            <img className="ym-arr" src={a('skin/images/single_arrow_down.png')} alt="" />
            <span className="ym-insider"><Sp src={a('skin/images/yinsider.png')} w={18} h={12} />{t.insider}</span>
          </div>
          <div className="ym-me-st">
            <span className={data?.status ? '' : 'none'}>{data?.status || t.share}</span>
            <i style={bgUrl(a('skin/images/single_arrow_down.png'))} />
          </div>
          <div className="ym-me-l3">
            {v === 'YM11' ? <span>{t.blog}</span> : null}
            <img src={a('skin/images/mobile_status.png')} alt="" />
            {v === 'YM10' && <span className="ym-voice">☏ {t.voice}</span>}
            <span className="ym-fill" />
            {v === 'YM11' && <span className="ym-game"><Sp src={a('skin/FriendList/gameButton.png')} w={17} h={16} />{t.game}</span>}
            <Sp src={a('skin/images/email.png')} w={18} h={12} />
          </div>
        </div>
      </div>
      {v === 'YM11' && t.notice && T.getTime() >= NOTICE_FROM && (
        <div className="ym-info" style={bgUrl(a('skin/FriendList/info_bg.png'))}>
          <img src={a('skin/FriendList/icon_info.png')} alt="" />
          <span>{t.notice} <u>{t.noticeMore}</u></span>
          <Sp src={a('skin/images/Clear.png')} w={13} h={13} className="ym-info-x" />
        </div>
      )}
      <div className="ym-tabs">
        <div className="ym-tab on" style={stateBg(a('skin/FriendList/TabLeft.png'), 8, 4)}>
          <span>{t.contacts}</span><i className="ym-tab-dd" style={stateBg(a('skin/FriendList/TabMenuLeft.png'), 4, 0)} />
        </div>
        <div className="ym-tab" style={stateBg(a('skin/FriendList/TabRight.png'), 8, 0)}>
          {v === 'YM10' && <img src={a('skin/FriendList/new_updates.png')} alt="" />}<span>{t.updates}</span>
        </div>
      </div>
      <div className="ym-search">
        <Sp src={a('skin/FriendList/AddBuddy.png')} w={17} h={17} />
        {v === 'YM11' && <img src={a('skin/images/rolodex.png')} alt="" />}
        <div className="ym-search-box"><Sp src={a('skin/FriendList/SearchOptions.png')} w={16} h={13} /><span>{t.search}</span></div>
      </div>
      <div className="ym-list" onScroll={() => setCard(null)}>
        {q.isLoading && <div className="ym-note">…</div>}
        {data && !data.groups.length && <div className="ym-note">{t.noContacts}</div>}
        {groups.map(g => (
          <div key={`${g.recent}:${g.name}`} className="ym-g">
            <button type="button" className="ym-gh" onClick={() => setShut(s => ({ ...s, [g.name]: !s[g.name] }))}>
              <i className={`ym-tri ${shut[g.name] ? 'shut' : ''}`} />
              {g.recent && <img src={a('skin/images/RecentContact_Icon.png')} alt="" />}
              <b>{g.name} ({g.recent ? g.buddies.length : `${g.online}/${g.buddies.length}`})</b>
            </button>
            {!shut[g.name] && g.buddies.map(b => {
              const id = `${g.recent}:${b.ref.key ?? b.name}`;
              return (
                <button type="button" key={id} className={`ym-b ${sel === id ? 'sel' : ''}`}
                  style={sel === id ? bgUrl(a('skin/images/bg_selected.png')) : undefined}
                  onClick={e => { setSel(id); if ((e.nativeEvent as PointerEvent).pointerType === 'touch') chat(b); }}
                  onDoubleClick={() => chat(b)} onPointerEnter={e => enter(b, e)} onPointerLeave={leave}>
                  <img className="ym-b-pic" src={b.ref.avatarUrl ? cdn(b.ref.avatarUrl, 32) : a('skin/images/DefaultFriendIcon.png')} alt="" />
                  <Sp src={a(b.online ? 'skin/images/online.png' : 'skin/images/offline.png')} w={10} h={10} />
                  <span className="ym-b-n">{b.name}</span>
                  {b.status && <span className="ym-b-s">&nbsp;- {b.status}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="ym-plug" style={bgUrl(a('skin/SlotManager/BottomPluginPanel.png'))}>
        <span><Sp src={a('skin/FriendList/Plugins-arrow.png')} w={9} h={11} at={0} />{t.plugins}</span><span>{t.addPlugins}</span>
      </div>
      <div className="ym-ad">{a(AD[v]) && <img src={a(AD[v])} alt="" />}</div>
      {v === 'YM11' && <div className="ym-ws"><img src={a('ym11/websearch-logo.png')} alt={t.webSearch} /><span className="ym-ws-box" /></div>}
      {card && <Card at={card} v={v} onEnter={() => window.clearTimeout(hover.current)} onLeave={leave} onChat={chat} />}
    </div>
  );
}

/* ── 9 ─────────────────────────────────────────────────────────────────── */

function List9() {
  const { a } = useYm();
  const { q, chat, data } = useList();
  const t = ymText('YM9');
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<string | null>(null);
  const me = data?.me;
  return (
    <div className="ym ym-9">
      <div className="ym-menubar" style={stateBg(a('skin/theme/mainmenubarbg_aero.png'), 2, 0)}>{t.menu.map(m => <span key={m}>{m}</span>)}</div>
      <div className="ym9-me">
        <div className="ym9-me-l">
          <div className="ym9-me-n"><Sp src={a('skin/images/online.png')} w={10} h={10} /><b>{me?.name ?? 'Ngoc Anh Vu'}</b></div>
          <div className="ym9-me-st">{data?.status || t.share} <img src={a('skin/images/single_arrow_down.png')} alt="" /></div>
          <div className="ym9-me-ph"><span>{t.phoneOut}</span><span>{t.forward}</span></div>
        </div>
        <div className="ym9-me-pic">
          <Sp src={a('skin/images/email.png')} w={18} h={12} className="ym9-mail" />
          <img src={me?.avatarUrl ? cdn(me.avatarUrl, 96) : a('skin/images/DefaultFriendIcon.png')} alt="" />
        </div>
      </div>
      <div className="ym9-search"><span>{t.search9}</span></div>
      <div className="ym-list">
        {q.isLoading && <div className="ym-note">…</div>}
        {data && !data.groups.length && <div className="ym-note">{t.noContacts}</div>}
        {data?.groups.map(g => (
          <div key={g.name} className="ym-g">
            <button type="button" className="ym9-gh" onClick={() => setShut(s => ({ ...s, [g.name]: !s[g.name] }))}>
              <i className={`ym-tri ${shut[g.name] ? 'shut' : ''}`} /><b>{g.name} ({g.online}/{g.buddies.length})</b>
            </button>
            {!shut[g.name] && g.buddies.map(b => {
              const id = b.ref.key ?? b.name;
              return (
                <button type="button" key={id} className={`ym9-b ${sel === id ? 'sel' : ''}`} style={sel === id ? bgUrl(a('skin/images/bg_selected.png')) : undefined}
                  onClick={e => { setSel(id); if ((e.nativeEvent as PointerEvent).pointerType === 'touch') chat(b); }} onDoubleClick={() => chat(b)}>
                  <Sp src={a(b.online ? 'skin/images/online.png' : 'skin/images/offline.png')} w={10} h={10} />
                  <span className="ym9-b-t"><span className="ym9-b-n">{b.name}</span>{b.status && <small>{b.status}</small>}</span>
                  <img className="ym9-b-pic" src={b.ref.avatarUrl ? cdn(b.ref.avatarUrl, 48) : a('skin/images/DefaultFriendIcon.png')} alt="" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="ym9-btns">
        <span><Sp src={a('skin/images/addbuddy.png')} w={13} h={13} />{t.addContact}</span>
        <span><Sp src={a('skin/FriendList/Plugins-arrow.png')} w={9} h={11} />{t.plugins}</span>
      </div>
      <div className="ym-ad">{a(AD.YM9) && <img src={a(AD.YM9)} alt="" />}</div>
      <div className="ym9-ws">{a('ym9/websearch.png') && <img src={a('ym9/websearch.png')} alt="" />}</div>
    </div>
  );
}

/* ── 8 ─────────────────────────────────────────────────────────────────── */

function List8() {
  const { a } = useYm();
  const { q, chat, data } = useList();
  const t = ymText('YM8');
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [invite, setInvite] = useState(true);
  const me = data?.me;
  return (
    <div className="ym ym-8">
      <div className="ym8-menu">{t.menu.map(m => <span key={m}>{m}</span>)}</div>
      {invite && <div className="ym8-invite"><span>More friends = more fun. Invite them</span><button type="button" onClick={() => setInvite(false)} aria-label="Close">✕</button></div>}
      <div className="ym8-me">
        <img src={a('ym8/busy.png')} alt="" className="ym8-me-st" />
        {me?.avatarUrl ? <img className="ym8-me-pic" src={cdn(me.avatarUrl, 48)} alt="" /> : <img className="ym8-me-pic" src={a('ym8/avatar-2007.png')} alt="" />}
        <b>{me?.name ?? 'Ngoc Anh Vu'}</b>{data?.status && <span>&nbsp;- {data.status}</span>} <i>▾</i>
      </div>
      <div className="ym8-tools">
        <Sp src={a('res/png-1225.png')} w={43} h={27} across />
        <span className="ym8-seg"><Sp src={a('res/png-1228.png')} w={34} h={27} at={2} across /><Sp src={a('res/png-1226.png')} w={32} h={27} across /></span>
        <span className="ym-fill" />
        <img src={a('ym8/mail.png')} alt="" /><img src={a('ym8/voicemail.png')} alt="" /><img src={a('ym8/avatars.png')} alt="" />
      </div>
      <div className="ym8-phone"><img src={a('ym8/phone.png')} alt="" /><span>Type a phone number</span><i>▾</i></div>
      <div className="ym-list ym8-list">
        {q.isLoading && <div className="ym-note">…</div>}
        {data && !data.groups.length && <div className="ym-note">{t.noContacts}</div>}
        {data?.groups.map(g => (
          <div key={g.name}>
            <button type="button" className="ym8-gh" onClick={() => setShut(s => ({ ...s, [g.name]: !s[g.name] }))}>
              <i className={shut[g.name] ? 'shut' : ''} />{g.name} ({g.online}/{g.buddies.length})
            </button>
            {!shut[g.name] && g.buddies.map(b => {
              const id = b.ref.key ?? b.name;
              return (
                <button type="button" key={id} className={`ym8-b ${b.online ? 'on' : ''}`}
                  onClick={e => { setSel(id); if ((e.nativeEvent as PointerEvent).pointerType === 'touch') chat(b); }} onDoubleClick={() => chat(b)}>
                  <img src={a(b.online ? 'ym8/online.png' : 'ym8/offline.png')} alt="" />
                  <span className={`ym8-b-n ${sel === id ? 'sel' : ''}`}>{b.name}</span>{b.status && <span className="ym8-b-s">&nbsp;- {b.status}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="ym8-phonebar"><span>0.00 - Phone Out</span><span>Phone In</span></div>
      <div className="ym8-img">{a('ym8/plugins.png') && <img src={a('ym8/plugins.png')} alt="" />}</div>
      <div className="ym-ad">{a(AD.YM8) && <img src={a(AD.YM8)} alt="" />}</div>
      <div className="ym8-img">{a('ym8/websearch.png') && <img src={a('ym8/websearch.png')} alt="" />}</div>
    </div>
  );
}
