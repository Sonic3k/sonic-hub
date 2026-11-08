/* Turning the machine on and off: the machine itself (his photo of it), its maker's mark, the system starting as it
   did then (its own boot screen), the welcome or lock screen, and at the end the screen of shutting down. A click
   moves on. The screens are the systems' own pictures once their files have come; until then they are drawn. When he
   had two computers at the time, the other one stands beside this one while it shows itself; a click on it starts it. */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cdn } from '../../api/client';
import type { DeskDevice, Machine } from '../api';
import { useAssets } from '../assets';
import { clockText, longDate, usedText, vnDate } from '../moment';
import { Glyph, Mark } from '../glyphs';
import { makerOf } from '../skin';
import { Wallpaper } from '../wallpapers';
import { osName } from './desk';

export type Phase = 'card' | 'boot' | 'login' | 'on' | 'down';

const Dots = () => <div className="dv-dots">{[0, 1, 2, 3, 4].map(i => <i key={i} style={{ animationDelay: `${i * 0.14}s` }} />)}</div>;
const Spin = () => <div className="dv-spin" />;
const bg = (u?: string): CSSProperties | undefined => (u ? { backgroundImage: `url("${u}")` } : undefined);

export function Boot({ phase, machine, skin, T, changed, others = [], onPick, onNext }: {
  phase: Phase; machine: Machine; skin: string; T: Date; changed: 'first' | 'machine' | 'os';
  others?: DeskDevice[]; onPick?: (key: string) => void; onNext: () => void;
}) {
  if (phase === 'on') return null;
  return (
    <div className={`dv-boot dv-boot-${phase} dv-boot-${skin}`} onClick={onNext} role="presentation">
      {phase === 'card' && <Card machine={machine} T={T} changed={changed} others={others} onPick={onPick} />}
      {phase === 'boot' && <Starting skin={skin} machine={machine} />}
      {phase === 'login' && <Login skin={skin} machine={machine} T={T} />}
      {phase === 'down' && <Down skin={skin} />}
    </div>
  );
}

function Card({ machine, T, changed, others, onPick }: {
  machine: Machine; T: Date; changed: string; others: DeskDevice[]; onPick?: (key: string) => void;
}) {
  const d = machine.device;
  const m = useAssets('machines');
  const stock = makerOf(d) === 'rog' ? m.a('rog/photo.jpg') : undefined;
  const two = others.length > 0 && !!onPick;
  return (
    <div className={`dv-card ${two ? 'dv-card-two' : ''}`}>
      <div className="dv-card-at">{vnDate(T)} · {clockText(T, true)}</div>
      <div className="dv-card-row">
        <div className="dv-card-main">
          <div className="dv-card-ph">{d.photoUrl ? <img src={cdn(d.photoUrl, 960)} alt={d.name} /> : stock ? <img src={stock} alt={d.name} /> : <Glyph name="computer" size={150} />}</div>
          {changed === 'machine' && <div className="dv-card-new">Đổi máy</div>}
          <h1>{d.name}</h1>
          <p>{[osName(machine.system?.os), `dùng ${usedText(d.from, d.to)}`].filter(Boolean).join(' · ')}</p>
          <span className="dv-card-led" />
        </div>
        {two && others.map(o => (
          <button type="button" key={o.key} className="dv-card-alt" onClick={e => { e.stopPropagation(); onPick!(o.key); }}>
            <span className="dv-card-ph">{o.photoUrl ? <img src={cdn(o.photoUrl, 480)} alt="" /> : <Glyph name="computer" size={84} />}</span>
            <b>{o.name}</b>
            <small>dùng {usedText(o.from, o.to)}</small>
            <em>Bật máy này</em>
          </button>
        ))}
      </div>
    </div>
  );
}

/** The maker's mark (on black, as the machine showed it switching on). */
function useMaker(machine: Machine) {
  const m = useAssets('machines');
  const maker = makerOf(machine.device);
  return maker ? m.a(`oem/${maker}.svg`) : undefined;
}

function Starting({ skin, machine }: { skin: string; machine: Machine }) {
  const own = useAssets(skin);
  const w7 = useAssets('w7'), w81 = useAssets('w81'), w10 = useAssets('w10'), w11 = useAssets('w11');
  const maker = useMaker(machine);
  // the older machines showed their maker's mark first, then the system started
  const [post, setPost] = useState(!!maker && (skin === 'w98' || skin === 'xp' || skin === 'vista' || skin === 'w7'));
  useEffect(() => { if (!post) return; const id = window.setTimeout(() => setPost(false), 950); return () => window.clearTimeout(id); }, [post]);
  if (post && maker) return <div className="dv-post"><img src={maker} alt="" /></div>;
  switch (skin) {
    case 'w98': {
      const img = own.a('boot/boot.png');
      return img ? <div className="dv-b98 real" style={bg(img)}><div className="dv-b98-bar" /></div> : (
        <div className="dv-b98">
          <div className="dv-b98-logo"><Mark size={70} /><b>Sonic3k</b><i>98</i></div>
          <div className="dv-b98-bar" />
        </div>
      );
    }
    case 'xp': {
      const img = own.a('boot/professional.png');
      return img ? <div className="dv-bxp real"><div className="dv-b43" style={bg(img)}><div className="dv-bxp-run"><i /><i /><i /></div></div></div> : (
        <div className="dv-bxp">
          <div className="dv-bxp-logo"><Mark size={58} /><b>Sonic3k</b><sup>xp</sup></div>
          <div className="dv-bxp-bar"><i /><i /><i /></div>
        </div>
      );
    }
    case 'vista': {
      const img = own.a('boot/boot.png');
      if (img) return <div className="dv-bxp real"><div className="dv-b43" style={bg(img)}><div className="dv-bvista-run"><i /></div></div></div>;
      break;
    }
    case 'w7': {
      const orb = w7.a('start/orb-144.png');
      if (orb) return <div className="dv-b7 real"><div className="dv-b7-orb" style={bg(orb)} /><p>Starting Windows</p></div>;
      break;
    }
    case 'w81': case 'w10': case 'w11': {
      // a laptop of 8 on showed its maker's mark where the system's logo was, above the turning dots
      const logo = maker ?? (skin === 'w81' ? w81.a('logo/logo.svg') : skin === 'w10' ? w10.a('logo/wordmark.svg') : w11.a('logo/logo.svg'));
      if (logo) return (
        <div className="dv-b10 real">
          {maker ? <img className="dv-b10-maker" src={maker} alt="" />
            : skin === 'w10' ? <i className="dv-b10-logo w10" style={bg(logo)} />
            : <i className={`dv-b10-logo ${skin}`} style={{ WebkitMaskImage: `url("${logo}")`, maskImage: `url("${logo}")` } as CSSProperties} />}
          <Dots />
        </div>
      );
      break;
    }
  }
  switch (skin) {
    case 'vista': case 'w7':
      return (
        <div className="dv-b7">
          <div className="dv-b7-orb"><Mark size={64} /></div>
          <p>Starting Windows</p>
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

/** XP's welcome screen: its logo, "To begin, click your user name", his picture (the chess one), Turn off computer. */
function XpWelcome({ children, user }: { children?: ReactNode; user?: boolean }) {
  const xp = useAssets('xp');
  const flag = xp.a('icon/windows-logo-48.png'), word = xp.a('logo/wordmark-white.svg'), pic = xp.a('user/chess.png'), off = xp.a('icon/turn-off-computer-32.png');
  const logo = flag && word ? <span className="dv-lxp-logo"><img src={flag} alt="" /><img src={word} alt="" /></span> : <Mark size={64} />;
  return (
    <div className="dv-lxp">
      <div className="dv-lxp-top" />
      {user ? (
        <div className="dv-lxp-mid">
          <div className="dv-lxp-left">{logo}<p>To begin, click your user name</p></div>
          <div className="dv-lxp-sep" />
          <div className="dv-lxp-user"><span className="dv-lxp-pic">{pic ? <img src={pic} alt="" /> : <Glyph name="chess" size={44} />}</span><b>Sonic3k</b></div>
        </div>
      ) : <div className="dv-lxp-mid center">{logo}{children}</div>}
      <div className="dv-lxp-bot">{user && <span>{off ? <img src={off} alt="" /> : <i />}Turn off computer</span>}</div>
    </div>
  );
}

function Login({ skin, machine, T }: { skin: string; machine: Machine; T: Date }) {
  const w7 = useAssets('w7');
  switch (skin) {
    case 'xp':
      return <XpWelcome user />;
    case 'vista': case 'w7': {
      const back = skin === 'w7' ? w7.a('login/background.jpg') : undefined;
      return <div className={`dv-l7 ${back ? 'real' : ''}`} style={bg(back)}><Spin /><p>Welcome</p></div>;
    }
    case 'w81': case 'w10': case 'w11':
      return (
        <div className="dv-lock">
          {/* his own lock picture when he had one; otherwise the system's (not the desktop's) */}
          <Wallpaper wp={machine.lock?.url ? machine.lock : null} fallback={skin === 'w11' ? 'win11-lock' : skin === 'w81' ? 'win81-lock' : 'win10-lake'} />
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
    case 'xp': return <div className="dv-dxp"><XpWelcome><p className="dv-dxp-text">Windows is shutting down…</p></XpWelcome></div>;
    case 'vista': case 'w7': return <div className="dv-l7"><Spin /><p>Shutting down…</p></div>;
    default: return <div className="dv-d10"><Dots /><p>Shutting down</p></div>;
  }
}
