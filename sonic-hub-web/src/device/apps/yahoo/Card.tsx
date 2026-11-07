/* The contact card of Messenger 10 and 11: the mouse resting on a buddy shows it beside the list — the picture, the
   ways to reach them, and how you appear to them (his screenshots of 22/8/2011 and 1/8/2013). */
import { createPortal } from 'react-dom';
import type { Buddy } from '../../api';
import { cdn } from '../../fb/api';
import { ymText, type YmVer } from './strings';
import { bgUrl, Sp, useYm } from './ui';

export interface CardAt { b: Buddy; top: number; left: number }

export function Card({ at, v, onEnter, onLeave, onChat }: { at: CardAt; v: YmVer; onEnter: () => void; onLeave: () => void; onChat: (b: Buddy) => void }) {
  const { a } = useYm();
  const t = ymText(v);
  const { b } = at;
  const W = 252;
  const left = Math.max(4, at.left - W + 2), top = Math.max(4, Math.min(at.top - 18, window.innerHeight - 190));
  return createPortal(
    <div className="ym ym-card" style={{ left, top, width: W, ...bgUrl(a('skin/ContactCard/background.png')) }} onPointerEnter={onEnter} onPointerLeave={onLeave}>
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
    document.body,
  );
}
