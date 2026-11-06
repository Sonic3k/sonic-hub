/* The phone of a moment: /phone?at=2012-07-16T21:30 (Vietnam wall-clock; none = now). The Nokia until mid-2015, then
   the iPhones — each turned on with its own look, holding what was on it at T. On a wide screen it stands as a
   phone; on a phone it fills the screen. Turned off, it goes back to the portal on that day. */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cdn } from '../../api/client';
import { desk, type Machine, type MomentData } from '../api';
import { MomentContext, atString, clockText, portalAt, usedText, utc, vnDate } from '../moment';
import { Glyph, Mark } from '../glyphs';
import { useUrlParams } from '../url';
import { Phone as PhoneCtxProvider, type PhoneCtx, type Screen } from './ctx';
import { Keypad, NokiaScreen } from './Nokia';
import { IosScreen } from './Ios';

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

export default function Phone() {
  const [sp, setSp] = useUrlParams();
  const [nowAt] = useState(() => atString(new Date()));
  const at = sp.get('at') ?? nowAt;
  const q = useQuery({ queryKey: ['desk-at', at], queryFn: () => desk.at(at), placeholderData: keepPreviousData, staleTime: 5 * 60_000 });
  const data = q.data;
  const T = useMemo(() => (data ? utc(data.at)! : null), [data]);
  const moment = useMemo(() => ({ at: T ? atString(T) : undefined, T: T ?? new Date(), latest: null }), [T]);
  const setAt = useCallback((next: string) => setSp({ at: next }), [setSp]);
  if (!data || !T) {
    return <div className="dv-stage">{q.isError && <div className="dv-fail"><p>Không bật được điện thoại lúc này.</p><a href="/">Về Sonic Hub</a></div>}</div>;
  }
  if (!data.phone) return <NoPhone T={T} />;
  return (
    <MomentContext.Provider value={moment}>
      <Handset data={data} machine={data.phone} T={T} at={moment.at!} fresh={!q.isPlaceholderData} setAt={setAt} />
    </MomentContext.Provider>
  );
}

function NoPhone({ T }: { T: Date }) {
  return (
    <div className="dv-stage">
      <div className="ph-none">
        <Glyph name="phone" size={64} />
        <p>Ngày {vnDate(T)} chưa có điện thoại.</p>
        <div><a href={`/pc?at=${encodeURIComponent(atString(T))}`}>Bật máy tính</a><a href={portalAt(T)}>Về Sonic Hub</a></div>
      </div>
    </div>
  );
}

type Phase = 'card' | 'boot' | 'on' | 'down';

function Handset({ data, machine, T, at, fresh, setAt }: { data: MomentData; machine: Machine; T: Date; at: string; fresh: boolean; setAt: (at: string) => void }) {
  const vp = useViewport();
  const os = machine.system?.os ?? 'IOS7';
  const nokia = os.startsWith('NOKIA');
  const notch = !nokia && (machine.device.screenHeight ?? 0) >= 800;
  const [phase, setPhase] = useState<Phase>('card');
  const [changed, setChanged] = useState(false);
  const [stack, setStack] = useState<Screen[]>([]);
  const [ask, setAsk] = useState(false);
  const booted = useRef<string | null>(null);

  useEffect(() => {
    if (!fresh || booted.current === machine.device.key) return;
    setChanged(booted.current !== null);
    booted.current = machine.device.key;
    setStack([]);
    setPhase('card');
  }, [fresh, machine.device.key]);
  const off = useCallback(() => window.location.assign(portalAt(T)), [T]);
  useEffect(() => {
    if (phase === 'on') return;
    const id = window.setTimeout(phase === 'down' ? off : () => setPhase(p => (p === 'card' ? 'boot' : 'on')), phase === 'card' ? 2400 : phase === 'boot' ? 1700 : 1500);
    return () => window.clearTimeout(id);
  }, [phase, off]);

  const open = useCallback((app: string, arg: Record<string, unknown> = {}) => setStack(s => [...s, { app, arg }]), []);
  const back = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const home = useCallback(() => setStack([]), []);
  const powerOff = useCallback(() => { setAsk(false); setPhase('down'); }, []);
  const ctx = useMemo<PhoneCtx>(() => ({ T, at, data, machine, nokia, stack, open, back, home, setAt, powerOff }),
    [T, at, data, machine, nokia, stack, open, back, home, setAt, powerOff]);

  const frame = vp.w >= 720 && vp.h >= 560;
  const W = nokia ? 240 : frame ? machine.device.screenWidth ?? 390 : vp.w;
  const H = nokia ? 320 : frame ? machine.device.screenHeight ?? 844 : vp.h;
  const screen = (
    <div className={`ph-screen ${nokia ? 'nokia' : 'ios'}`} style={{ width: W, height: H }}>
      {phase === 'on' || phase === 'card' ? (nokia ? <NokiaScreen /> : <IosScreen notch={notch} homeBar={notch || !frame} />) : null}
      {phase === 'boot' && <div className={`ph-boot ${nokia ? 'nokia' : ''}`}><Mark size={nokia ? 54 : 64} color={nokia ? '#1b3f8f' : '#fff'} />{nokia && <b>Sonic3k</b>}</div>}
      {phase === 'down' && <div className={`ph-boot ${nokia ? 'nokia' : ''}`}>{nokia ? <b>Tạm biệt!</b> : <div className="dv-spin" />}</div>}
      {ask && (
        <div className="ph-ask" onClick={() => setAsk(false)}>
          <button type="button" className="ph-ask-off" onClick={e => { e.stopPropagation(); powerOff(); }}><span>⏻</span>Tắt máy</button>
          <button type="button" className="ph-ask-cancel" onClick={() => setAsk(false)}>Hủy</button>
        </div>
      )}
    </div>
  );

  let device: ReactNode;
  if (frame) {
    const bodyW = nokia ? 290 : W + (notch ? 28 : 40), bodyH = nokia ? 660 : H + (notch ? 28 : 196);
    const s = Math.min((vp.h - 36) / bodyH, (vp.w - 36) / bodyW, nokia ? 1.9 : 1.15);
    device = (
      <div className={`ph-body ${nokia ? 'nokia' : notch ? 'iphone-x' : 'iphone'}`} style={{ width: bodyW, height: bodyH, transform: `scale(${s})` } as CSSProperties}>
        {nokia ? <>
          <div className="ph-body-ear" />
          <div className="ph-body-screen">{screen}</div>
          <Keypad />
        </> : <>
          {!notch && <div className="ph-body-top"><i className="cam" /><i className="speaker" /></div>}
          <div className="ph-body-screen">{screen}{notch && <div className="ph-notch" />}</div>
          {!notch && <button type="button" className="ph-body-home" onClick={home} aria-label="Màn hình chính" />}
          <button type="button" className="ph-body-side" onClick={() => setAsk(a => !a)} aria-label="Nút nguồn" />
        </>}
      </div>
    );
  } else if (nokia) {
    const s = vp.w / 240;
    device = (
      <div className="ph-bare nokia">
        <div style={{ width: vp.w, height: 320 * s, overflow: 'hidden' }}><div style={{ transform: `scale(${s})`, transformOrigin: '0 0' }}>{screen}</div></div>
        <Keypad compact />
      </div>
    );
  } else device = <div className="ph-bare">{screen}</div>;

  return (
    <PhoneCtxProvider.Provider value={ctx}>
      <div className={`dv-stage ph-stage ${frame ? 'framed' : 'bare'}`}>
        {device}
        {phase === 'card' && <Card machine={machine} T={T} changed={changed} onNext={() => setPhase('boot')} />}
      </div>
    </PhoneCtxProvider.Provider>
  );
}

function Card({ machine, T, changed, onNext }: { machine: Machine; T: Date; changed: boolean; onNext: () => void }) {
  const d = machine.device;
  return (
    <div className="ph-card" onClick={onNext} role="presentation">
      <div className="dv-card">
        <div className="dv-card-at">{vnDate(T)} · {clockText(T, true)}</div>
        <div className="dv-card-ph">{d.photoUrl ? <img src={cdn(d.photoUrl, 960)} alt={d.name} /> : <Glyph name="phone" size={130} />}</div>
        {changed && <div className="dv-card-new">Đổi máy</div>}
        <h1>{d.name}</h1>
        <p>{[d.model, `dùng ${usedText(d.from, d.to)}`].filter(Boolean).join(' · ')}</p>
        <span className="dv-card-led" />
      </div>
    </div>
  );
}
