/* The contact card of Messenger 10 and 11: the mouse resting on a buddy shows it beside the list — the picture, the
   ways to reach them, and how you appear to them (his screenshots of 22/8/2011 and 1/8/2013). */
import { createPortal } from 'react-dom';
import type { Buddy } from '../../api';
import { cdn } from '../../fb/api';
import { ymText, type YmVer } from './strings';
import { Sp, useYm } from './ui';

/** where the buddy's row is, in the pixels of the machine's screen (host), or of the page when there is no screen */
export interface CardAt { b: Buddy; top: number; left: number; host: HTMLElement | null }

/** The row under the mouse, measured on the screen it is drawn on: that screen may be shown larger or smaller than
 *  its pixels, and the card is drawn on it too, so it follows the list at any size. */
export function cardAt(b: Buddy, row: HTMLElement): CardAt {
  const r = row.getBoundingClientRect(), host = row.closest<HTMLElement>('.dv');
  if (!host) return { b, top: r.top, left: r.left, host: null };
  const o = host.getBoundingClientRect(), k = o.width / host.offsetWidth || 1;
  return { b, top: (r.top - o.top) / k, left: (r.left - o.left) / k, host };
}

export function Card({ at, v, onEnter, onLeave, onChat }: { at: CardAt; v: YmVer; onEnter: () => void; onLeave: () => void; onChat: (b: Buddy) => void }) {
  const { a } = useYm();
  const t = ymText(v);
  const { b, host } = at;
  const W = 252;
  // beside the list, its top a little above the row (his screenshots); kept on the screen, above the taskbar
  const room = host ? host.offsetHeight - 46 : window.innerHeight;
  const left = Math.max(4, at.left - W - 1), top = Math.max(4, Math.min(at.top - 18, room - 196));
  return createPortal(
    <div className={`ym ym-card ${host ? 'in' : ''}`} style={{ left, top, width: W, borderImageSource: a('skin/ContactCard/background.png') ? `url("${a('skin/ContactCard/background.png')}")` : undefined }} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      <div className="ym-card-h"><b>{b.name}</b>{b.ref.handle && b.ref.handle !== b.name && <span> ({b.ref.handle})</span>}<i>✕</i></div>
      <div className="ym-card-m">
        <button type="button" className="ym-card-pic" onClick={() => onChat(b)}>
          <img src={b.ref.avatarUrl ? cdn(b.ref.avatarUrl, 192) : a('skin/images/DefaultFriendIcon.png')} alt="" />
        </button>
        <div className="ym-card-r">
          <div className="ym-card-icons">
            <Sp src={a('skin/ContactCard/card-VideoButton.png')} w={16} h={16} />
            <Sp src={a('skin/ContactCard/card-CallButton.png')} w={11} h={16} />
            <Sp src={a('skin/ContactCard/card-SmsButton.png')} w={26} h={16} />
          </div>
          {t.card.map(l => <span key={l} className="ym-card-a">{l}</span>)}
          <span className="ym-card-gap" />
          <span className="ym-card-a">{t.cardDetails}</span>
          <span className="ym-card-a">{t.cardProfile}</span>
        </div>
      </div>
      <div className="ym-card-f">{t.cardOnline} <img src={a('skin/images/single_arrow_down.png')} alt="" /></div>
    </div>,
    host ?? document.body,
  );
}
