/* The Yahoo Messenger of his machines: the buddy list as it stood at T (who was online is who wrote around then),
   and a conversation window per buddy that reads the saved chats up to T. Purple like the real one, drawn here. */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { desk, type Buddy } from '../api';
import { useMoment, utc, vnDate } from '../moment';
import { cdn } from '../fb/api';
import { Glyph } from '../glyphs';
import { useWm } from '../pc/wm';
import { useDesk } from '../pc/desk';
import { Chat } from './Chat';

/** 2009 on, his Messenger was in Vietnamese (screenshots of 3/2009 and 8/2013). */
const vi = (ver?: string) => ver === 'YM9' || ver === 'YM11';

export function YahooList() {
  const { at } = useMoment();
  const { ver, data } = useDesk();
  const v = ver.yahoo;
  const { open } = useWm();
  const q = useQuery({ queryKey: ['buddies', 'YAHOO', at], queryFn: () => desk.buddies('YAHOO', at!) });
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const me = q.data?.me;
  const chat = (b: Buddy) => b.archiveId && open({ app: 'im', arg: { archiveId: b.archiveId, name: b.name }, title: `${b.name} - ${vi(v) ? 'Tin nhắn nhanh' : 'Instant Message'}` });
  return (
    <div className={`dv-ym dv-ym-${(v ?? 'YM10').toLowerCase()}`}>
      <div className="dv-ym-menu">{(vi(v) ? ['Messenger', 'Danh bạ', 'Thao tác', 'Trợ giúp'] : ['Messenger', 'Contacts', 'Actions', 'Help']).map(m => <span key={m}>{m}</span>)}</div>
      <div className="dv-ym-me">
        <div className="dv-ym-pic">{me?.avatarUrl ? <img src={cdn(me.avatarUrl, 160)} alt="" /> : <Glyph name="im-smile" size={40} />}</div>
        <div className="dv-ym-who">
          <b>{me?.name ?? 'Sonic3k'}</b>
          <span className="dv-ym-status">{q.data?.status ?? (vi(v) ? 'Bạn đang nghĩ gì?' : "What's on your mind?")}</span>
        </div>
      </div>
      <div className="dv-ym-tabs"><span className="on">{vi(v) ? 'Danh bạ' : 'Contacts'}</span>{v !== 'YM8' && <span>Y! Updates</span>}</div>
      <div className="dv-ym-search"><input placeholder={vi(v) ? 'đánh vào vài thông tin…' : 'type some contact information…'} readOnly /></div>
      <div className="dv-ym-list">
        {q.isLoading && <div className="dv-ym-note">…</div>}
        {q.data && !q.data.groups.length && <div className="dv-ym-note">{vi(v) ? 'Chưa có ai trong danh bạ.' : 'No contacts yet.'}</div>}
        {q.data?.groups.map(g => {
          const total = g.buddies.length;
          return (
            <div key={g.name} className="dv-ym-group">
              <button type="button" className="dv-ym-gh" onClick={() => setShut(s => ({ ...s, [g.name]: !s[g.name] }))}>
                <i className={shut[g.name] ? 'shut' : ''} />{g.name} ({g.online}/{total})
              </button>
              {!shut[g.name] && g.buddies.map(b => (
                <button type="button" key={b.archiveId ?? b.name} className={`dv-ym-b ${b.online ? 'on' : ''}`} onDoubleClick={() => chat(b)}
                  onClick={e => { if ((e.nativeEvent as PointerEvent).pointerType === 'touch') chat(b); }}
                  title={b.lastAt ? `${vi(v) ? 'Lần cuối' : 'Last'}: ${vnDate(utc(b.lastAt))}` : undefined}>
                  <span className={`dv-ym-dot ${b.online ? 'on' : ''}`} />
                  <span className="dv-ym-bname">{b.name}</span>
                  {b.status && <span className="dv-ym-bstatus"> - {b.status}</span>}
                  {b.ref.avatarUrl && <img src={cdn(b.ref.avatarUrl, 160)} alt="" />}
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <div className="dv-ym-foot">{data.day.toasts.length ? `${data.day.toasts.length} ${vi(v) ? 'tin nhắn mới' : 'new messages'}` : vi(v) ? 'Tiện ích' : 'Plug-ins'}</div>
    </div>
  );
}

export function YahooIm({ archiveId, name, seq }: { archiveId: string; name: string; seq?: number | null }) {
  const { ver, T } = useDesk();
  const v = ver.yahoo;
  const tools = vi(v) ? ['Gọi', 'Phòng nền', 'Hoạt động', 'Hình ảnh'] : ['Call', 'Webcam', 'Games', 'Send File', 'Photos'];
  return (
    <div className={`dv-im dv-ym-${(v ?? 'YM10').toLowerCase()}`}>
      <div className="dv-ym-menu">{(vi(v) ? ['Hội thoại', 'Sửa', 'Hiển thị', 'Thao tác', 'Trợ giúp'] : ['Conversation', 'Edit', 'View', 'Actions', 'Help']).map(m => <span key={m}>{m}</span>)}</div>
      <div className="dv-im-tools">{tools.map(t => <span key={t}><i />{t}</span>)}</div>
      <div className="dv-im-to"><span className="dv-ym-dot on" /> {name}</div>
      <div className="dv-im-body"><Chat archiveId={archiveId} variant="yahoo" focusSeq={seq} /></div>
      <div className="dv-im-input"><div className="dv-im-emo">🙂 ✎ T</div><textarea readOnly aria-label="" /><button type="button" disabled>{vi(v) ? 'Gửi' : 'Send'}</button></div>
      <div className="dv-im-status">{vi(v) ? 'Tin nhắn sau cùng nhận ngày' : 'Last message received on'} {vnDate(T)}</div>
    </div>
  );
}
