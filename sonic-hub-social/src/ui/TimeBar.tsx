/* The strip above every app: the moment the portal is looking from, and ways to move it. */
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { social } from '../api';
import { atString, barText, useMoment, utc, vn } from '../time';
import { IDice, ILatest, INext, IPrev } from './icons';
import { L } from './bits';

const HUB = (import.meta.env.VITE_HUB_URL as string | undefined) ?? '';

export default function TimeBar() {
  const { T, at, latest } = useMoment();
  const [sp] = useSearchParams();
  const loc = useLocation(), nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const go = (next: string | null) => {
    const q = new URLSearchParams(sp);
    if (next) q.set('at', next); else q.delete('at');
    const s = q.toString();
    nav(`${loc.pathname}${s ? `?${s}` : ''}`);
  };
  const shift = (days: number, months = 0) => {
    const d = new Date(T.getTime());
    if (months) {
      const v = vn(d);
      const target = new Date(Date.UTC(v.y, v.mo + months, Math.min(v.d, 28), v.h, v.mi) - 7 * 3600_000);
      go(atString(target));
    } else go(atString(new Date(d.getTime() + days * 86400_000)));
  };
  const random = async () => {
    setBusy(true);
    try {
      const m = await social.randomMoment();
      const d = utc(m.at);
      if (d) go(atString(d).slice(0, 10));   // a whole day: everything of it shows
    } finally { setBusy(false); }
  };

  return (
    <div className="timebar">
      <div className="timebar-in">
        <L to="/" className="tb-home"><img src="/mark.svg" alt="" width="18" height="18" /><span>Social Media</span></L>
        <div className="tb-moment">
          <button type="button" className="tb-btn wide" onClick={() => shift(0, -1)} aria-label="Lùi một tháng" title="Lùi một tháng"><IPrev size={14} /><IPrev size={14} /></button>
          <button type="button" className="tb-btn" onClick={() => shift(-1)} aria-label="Lùi một ngày" title="Lùi một ngày"><IPrev size={15} /></button>
          <label className="tb-when" title="Thời điểm đang xem">
            <span>{barText(T)}</span>
            <input type="datetime-local" value={atString(T)} onChange={e => e.target.value && go(e.target.value)} />
          </label>
          <button type="button" className="tb-btn" onClick={() => shift(1)} aria-label="Tới một ngày" title="Tới một ngày"><INext size={15} /></button>
          <button type="button" className="tb-btn wide" onClick={() => shift(0, 1)} aria-label="Tới một tháng" title="Tới một tháng"><INext size={14} /><INext size={14} /></button>
        </div>
        <div className="tb-actions">
          <button type="button" className="tb-act" onClick={random} disabled={busy}><IDice size={15} /><span>Một ngày bất kỳ</span></button>
          <button type="button" className={`tb-act ${!at ? 'on' : ''}`} onClick={() => go(null)} disabled={!at}
            title={latest ? `Mới nhất: ${barText(latest)}` : undefined}><ILatest size={15} /><span>Mới nhất</span></button>
          {HUB && <a className="tb-hub" href={HUB}>Sonic Hub</a>}
        </div>
      </div>
    </div>
  );
}
