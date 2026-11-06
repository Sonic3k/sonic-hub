/* Turning the machine on and off: the machine itself (his photo of it), the system starting as it did then, the
   welcome or lock screen, and at the end the screen of shutting down. A click moves on. */
import { cdn } from '../../api/client';
import type { Machine } from '../api';
import { clockText, longDate, usedText, vnDate } from '../moment';
import { Glyph, Mark } from '../glyphs';
import { Wallpaper } from '../wallpapers';
import { osName } from './desk';

export type Phase = 'card' | 'boot' | 'login' | 'on' | 'down';

const Dots = () => <div className="dv-dots">{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * 0.14}s` }} />)}</div>;
const Spin = () => <div className="dv-spin" />;

export function Boot({ phase, machine, skin, T, changed, onNext }: {
  phase: Phase; machine: Machine; skin: string; T: Date; changed: 'first' | 'machine' | 'os'; onNext: () => void;
}) {
  if (phase === 'on') return null;
  const os = machine.system?.os;
  return (
    <div className={`dv-boot dv-boot-${phase} dv-boot-${skin}`} onClick={onNext} role="presentation">
      {phase === 'card' && <Card machine={machine} T={T} changed={changed} />}
      {phase === 'boot' && <Starting skin={skin} os={osName(os)} />}
      {phase === 'login' && <Login skin={skin} machine={machine} T={T} />}
      {phase === 'down' && <Down skin={skin} />}
    </div>
  );
}

function Card({ machine, T, changed }: { machine: Machine; T: Date; changed: string }) {
  const d = machine.device;
  return (
    <div className="dv-card">
      <div className="dv-card-at">{vnDate(T)} · {clockText(T, true)}</div>
      <div className="dv-card-ph">{d.photoUrl ? <img src={cdn(d.photoUrl, 960)} alt={d.name} /> : <Glyph name="computer" size={150} />}</div>
      {changed === 'machine' && <div className="dv-card-new">Đổi máy</div>}
      <h1>{d.name}</h1>
      <p>{[osName(machine.system?.os), `dùng ${usedText(d.from, d.to)}`].filter(Boolean).join(' · ')}</p>
      <span className="dv-card-led" />
    </div>
  );
}

function Starting({ skin, os }: { skin: string; os: string }) {
  switch (skin) {
    case 'w98':
      return (
        <div className="dv-b98">
          <div className="dv-b98-logo"><Mark size={70} /><b>Sonic3k</b><i>98</i></div>
          <div className="dv-b98-bar" />
        </div>
      );
    case 'xp':
      return (
        <div className="dv-bxp">
          <div className="dv-bxp-logo"><Mark size={58} /><b>Sonic3k</b><sup>xp</sup></div>
          <div className="dv-bxp-bar"><i /><i /><i /></div>
        </div>
      );
    case 'vista': case 'w7':
      return (
        <div className="dv-b7">
          <div className="dv-b7-orb"><Mark size={64} /></div>
          <p>Starting {os}</p>
        </div>
      );
    default:
      return (
        <div className="dv-b10">
          <Mark size={86} color="var(--accent)" />
          <Dots />
        </div>
      );
  }
}

function Login({ skin, machine, T }: { skin: string; machine: Machine; T: Date }) {
  switch (skin) {
    case 'xp':
      return (
        <div className="dv-lxp">
          <div className="dv-lxp-top" />
          <div className="dv-lxp-mid">
            <div className="dv-lxp-left"><Mark size={64} /><p>To begin, click your user name</p></div>
            <div className="dv-lxp-sep" />
            <div className="dv-lxp-user"><span className="dv-lxp-pic"><Glyph name="chess" size={44} /></span><b>Sonic3k</b></div>
          </div>
          <div className="dv-lxp-bot"><span><i />Turn off computer</span></div>
        </div>
      );
    case 'vista': case 'w7':
      return <div className="dv-l7"><Spin /><p>Welcome</p></div>;
    case 'w81': case 'w10': case 'w11':
      return (
        <div className="dv-lock">
          <Wallpaper wp={machine.lock ?? machine.wallpaper} fallback={skin === 'w11' ? 'win11-bloom' : 'win10-lake'} />
          <div className={`dv-lock-time ${skin === 'w11' ? 'mid' : ''}`}>
            <b>{clockText(T, true)}</b>
            <span>{longDate(T).replace(/, \d{4}$/, '')}</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}

function Down({ skin }: { skin: string }) {
  switch (skin) {
    case 'w98': return <div className="dv-d98"><p>It's now safe to turn off<br />your computer.</p></div>;
    case 'xp': return <div className="dv-dxp"><div className="dv-lxp-top" /><p>Windows is shutting down…</p><div className="dv-lxp-bot" /></div>;
    case 'vista': case 'w7': return <div className="dv-l7"><Spin /><p>Shutting down…</p></div>;
    default: return <div className="dv-d10"><Dots /><p>Shutting down</p></div>;
  }
}
