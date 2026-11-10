/* A conversation window of his Messenger: 8 as on 4/8/2007 and 9 as on 21/3/2009 (their toolbars cut from those
   screenshots), 10 and 11 from the Purple skin of his 11.5 — the buttons up top, the buddy's line, the chat with both
   display pictures beside it, the input with its toolbar, and when the last message came. A conference (several
   buddies at once) lists who was in it where the buddy's picture would be. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { desk } from '../../api';
import { cdn, social, type Member } from '../../fb/api';
import { clockText, trayDate, useMoment, utc, vn } from '../../moment';
import { useDesk } from '../../pc/desk';
import { useWinTitle } from '../../pc/Window';
import { Chat } from '../Chat';
import { ymText, ymVer, type YmVer } from './strings';
import { bgUrl, Sp, stateBg, useYm } from './ui';

/** The buddy of a conversation as the list has them at T (picture, status, ID); by their own key when no conversation
 *  with them was kept. */
function useBuddy(archiveId: string, key?: string) {
  const { at } = useMoment();
  const q = useQuery({ queryKey: ['buddies', 'YAHOO', at], queryFn: () => desk.buddies('YAHOO', at!) });
  const b = q.data?.groups.flatMap(g => g.buddies).find(x => (archiveId ? x.archiveId === archiveId : (x.ref.key ?? x.name) === key));
  return { b, me: q.data?.me };
}

/** Who else was in a conference as the archive has them at T; null for a talk with one buddy. */
function useConference(archiveId: string): Member[] | null {
  const { at } = useMoment();
  const q = useQuery({ queryKey: ['ym-thread', archiveId, at], queryFn: () => social.thread(archiveId, at!), enabled: !!archiveId });
  return q.data?.group ? q.data.members.filter(m => !m.me) : null;
}

/** The people of a conference, in the place of the buddy's display picture. */
function People({ people }: { people: Member[] }) {
  const { a } = useYm();
  return (
    <div className="ym-conf">
      {people.map(m => (
        <div key={m.ref.id ?? m.sender} className="ym-conf-p" title={m.ref.handle ?? m.sender}>
          <img src={m.ref.avatarUrl ? cdn(m.ref.avatarUrl, 32) : a('skin/images/DefaultFriendIcon.png')} alt="" />
          <span>{m.ref.name || m.sender}</span>
        </div>
      ))}
    </div>
  );
}

/** When the last line of the conversation before T came (the same pages the chat reads). */
function useLastAt(archiveId: string) {
  const { at } = useMoment();
  const q = useInfiniteQuery({
    queryKey: ['chat', archiveId, at],
    queryFn: ({ pageParam }) => desk.messages(archiveId, at!, pageParam ?? null, 60),
    initialPageParam: null as number | null,
    getNextPageParam: p => (p.hasMore ? p.oldestSeq : undefined),
    enabled: !!archiveId,
  });
  const items = q.data?.pages[0]?.items ?? [];
  const last = [...items].reverse().find(m => !m.fromMe) ?? items[items.length - 1];
  return utc(last?.at);
}

/** archiveId: the conversation kept; none (and buddy, the key of who it is with) for a buddy nothing was kept with. */
export function YahooIm({ archiveId, buddy, name: asked, seq }: { archiveId: string; buddy?: string; name: string; seq?: number | null }) {
  const { ver } = useDesk();
  const v = ymVer(ver.yahoo);
  const { b, me } = useBuddy(archiveId, buddy);
  const people = useConference(archiveId);
  const name = people ? people.map(m => m.ref.name || m.sender).join(', ') : asked;
  const handle = b?.ref.handle;
  const who = handle && handle !== name ? `${name} (${handle})` : name;
  const title = people ? `${ymText(v).conference}${name ? ` - ${name}` : ''}` : v === 'YM8' ? `${who} - Instant Message` : who;
  useWinTitle(title);
  const p = { archiveId, name, seq, people, avatar: b?.ref.avatarUrl, meAvatar: me?.avatarUrl, meName: me?.name };
  if (v === 'YM8') return <Im8 {...p} status={b?.status} />;
  if (v === 'YM9') return <Im9 {...p} online={!!b?.online} />;
  return <Im11 {...p} v={v} status={b?.status} online={!!b?.online} />;
}

interface P {
  archiveId: string; name: string; seq?: number | null; people: Member[] | null; avatar?: string | null; status?: string | null;
  meAvatar?: string | null; meName?: string | null;
}

function Im11({ v, archiveId, name, seq, people, avatar, status, online, meAvatar, meName }: P & { v: YmVer; online: boolean }) {
  const { a } = useYm();
  const t = ymText(v);
  const last = useLastAt(archiveId);
  const pic = (u: string | null | undefined, w: number) => (u ? cdn(u, w) : a('skin/images/DefaultFriendIcon.png'));
  return (
    <div className="ym ym-im ym-im11">
      <div className="ym-menubar" style={stateBg(a('skin/theme/mainmenubarbg_aero.png'), 2, 0)}>{t.imMenu.map(m => <span key={m}>{m}</span>)}</div>
      <div className="ym-im-tb">
        <span className="ym-im-btn"><Sp src={a('skin/images/video.png')} w={24} h={31} /><small>{t.video}</small></span>
        <span className="ym-im-btn"><Sp src={a('skin/images/voice.png')} w={21} h={32} /><small>{t.call} ▾</small></span>
        <span className="ym-fill" />
        <span className="ym-im-btn"><Sp src={a('skin/IMWindow/PhotoShare.png')} w={32} h={28} /><small>{t.photos}</small></span>
        <span className="ym-im-btn"><Sp src={a('skin/IMWindow/Activities.png')} w={33} h={31} /><small>{t.activities}</small></span>
        <span className="ym-im-btn"><Sp src={a('skin/IMWindow/IMTheme.png')} w={43} h={30} /><small>{t.imv}</small></span>
      </div>
      <div className="ym-im-friend">
        <Sp src={a(online ? 'skin/images/online.png' : 'skin/images/offline.png')} w={10} h={10} />
        <b>{name}</b>{status && <span>&nbsp;-&nbsp;{status}</span>}
      </div>
      <div className="ym-im-main">
        <div className="ym-im-hist"><Chat archiveId={archiveId} variant="yahoo" focusSeq={seq} meName={meName ?? undefined} /></div>
        <div className="ym-im-side" style={bgUrl(a('skin/IMWindow/im_side_bg.png'))}>
          {people ? <People people={people} /> : <img className="ym-im-dp" src={pic(avatar, 192)} alt="" />}
          {!people && <span className="ym-fill" />}
          <img className="ym-im-mydp" src={pic(meAvatar, 96)} alt="" />
        </div>
      </div>
      <div className="ym-im-inbar">
        <Sp src={a('skin/IMWindow/im_tb_emoticon.png')} w={25} h={18} />
        <Sp src={a('skin/IMWindow/im_tb_audibles.png')} w={20} h={18} />
        <Sp src={a('skin/IMWindow/im_tb_format.png')} w={13} h={18} />
        <Sp src={a('skin/IMWindow/im_tb_buzz.png')} w={18} h={18} />
        <Sp src={a('skin/images/SendFile.png')} w={17} h={18} />
        <Sp src={a('skin/IMWindow/im_tb_screen_capture.png')} w={20} h={18} />
        <span className="ym-fill" />
        <Sp src={a('skin/IMWindow/im_tb_disp_img_toggle.png')} w={29} h={22} />
      </div>
      <div className="ym-im-input"><textarea readOnly aria-label="" /></div>
      <div className="ym-im-status">{last ? t.last(trayDate(last), clockText(last)) : ''}</div>
    </div>
  );
}

function Im8({ archiveId, name, seq, people, avatar, status, meAvatar, meName }: P) {
  const { a } = useYm();
  const t = ymText('YM8');
  const last = useLastAt(archiveId);
  const pic = (u: string | null | undefined) => (u ? cdn(u, 192) : a('skin/images/DefaultFriendIcon.png'));
  return (
    <div className="ym ym-im ym-im8">
      <div className="ym8-menu">{t.imMenu.map(m => <span key={m}>{m}</span>)}<span className="ym-fill" />{a('ym8/im-search.png') && <img src={a('ym8/im-search.png')} alt="" />}</div>
      <div className="ym8-im-tb">{a('ym8/im-toolbar.png') && <img src={a('ym8/im-toolbar.png')} alt="" />}</div>
      <div className="ym8-im-friend">
        {!people && <img className="ym8-im-fpic" src={pic(avatar)} alt="" />}
        <b>{name}</b>{status && <> - <u>{status}</u></>}
        <span className="ym-fill" />
        {a('ym8/im-friendbar-icons.png') && <img src={a('ym8/im-friendbar-icons.png')} alt="" />}
      </div>
      <div className="ym8-im-main">
        <div className="ym-im-hist"><Chat archiveId={archiveId} variant="yahoo" focusSeq={seq} meName={meName ?? undefined} /></div>
        <div className="ym8-im-side">
          {people ? <People people={people} /> : <div className="ym8-im-dp"><img src={pic(avatar)} alt="" /></div>}
          {!people && <span className="ym-fill" />}
          <div className="ym8-im-dp"><img src={pic(meAvatar)} alt="" /></div>
        </div>
      </div>
      <div className="ym8-im-emo">{a('ym8/im-emobar.png') && <img src={a('ym8/im-emobar.png')} alt="" />}</div>
      <div className="ym8-im-in"><textarea readOnly aria-label="" /><button type="button" disabled>{t.send}</button></div>
      <div className="ym8-im-status">{last ? t.last(trayDate(last), clockText(last)) : ''}</div>
    </div>
  );
}

/** Messenger 9 on Vista wrote the day first (21/3/2009). */
const dmy = (d: Date) => { const v = vn(d); return `${v.d}/${v.mo + 1}/${v.y}`; };

function Im9({ archiveId, name, seq, people, avatar, online, meAvatar, meName }: P & { online: boolean }) {
  const { a } = useYm();
  const t = ymText('YM9');
  const last = useLastAt(archiveId);
  const pic = (u: string | null | undefined) => (u ? cdn(u, 192) : a('skin/images/DefaultFriendIcon.png'));
  return (
    <div className="ym ym-im ym-im9">
      <div className="ym9-im-menu">{t.imMenu.map(m => <span key={m}>{m}</span>)}</div>
      <div className="ym9-im-tb">{a('ym9/im-toolbar.png') && <img src={a('ym9/im-toolbar.png')} alt="" />}</div>
      <div className="ym9-im-friend"><Sp src={a(online ? 'skin/images/online.png' : 'skin/images/offline.png')} w={10} h={10} /><span>{name}</span></div>
      <div className="ym9-im-body">
        <div className="ym-im-hist"><Chat archiveId={archiveId} variant="yahoo" focusSeq={seq} meName={meName ?? undefined} grouped /></div>
        <div className="ym9-im-emo">
          {a('ym9/im-emobar.png') && <img src={a('ym9/im-emobar.png')} alt="" />}<span className="ym-fill" />
          {a('ym9/im-emobar-r.png') && <img src={a('ym9/im-emobar-r.png')} alt="" />}
        </div>
        <div className="ym9-im-in"><textarea readOnly aria-label="" /><button type="button" disabled>{t.send}</button></div>
        <div className="ym9-im-side">
          {people ? <People people={people} /> : <><img src={pic(avatar)} alt="" /><span className="ym-fill" /></>}<img src={pic(meAvatar)} alt="" />
        </div>
      </div>
      <div className="ym9-im-status">{last ? t.last(dmy(last), clockText(last)) : ''}</div>
    </div>
  );
}
