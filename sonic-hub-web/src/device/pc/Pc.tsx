/* The computer of a moment: /pc?at=2011-08-22T20:35 (Vietnam wall-clock; none = now), or /pc?scene=<memory id> to go
   back to a memory with its windows open. It boots as the machine he had then (his photo of it, the system starting),
   runs what started with it, keeps T in its clock (a click there is the time machine; another machine's time
   reboots into that machine), and when shut down goes back to the portal on that day. */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { desk, type DeskItem, type Machine, type MomentData, type Scene } from '../api';
import { useUrlParams } from '../url';
import { MomentContext, atString, portalAt, utc, vn } from '../moment';
import { IconContext, useSkin } from '../skin';
import { usePreloadPc } from '../preload';
import { Wallpaper } from '../wallpapers';
import { viewDay } from '../apps/Viewers';
import { Desk, browserGlyph, skinOf, type DeskCtx } from './desk';
import { WmProvider, useWm } from './wm';
import { APPS, sceneSpecs, specOf } from './registry';
import { Window } from './Window';
import { Taskbar } from './Taskbar';
import { StartMenu } from './StartMenu';
import { TimeMachine } from './TimeMachine';
import { DesktopIcons } from './Icons';
import { Boot, type Phase } from './Boot';
import { Gadgets, Notices } from './Extras';
import { IDLE_MS, Screensaver, saverKind } from './Screensaver';

const TASKBAR: Record<string, number> = { w98: 28, xp: 30, vista: 30, w7: 40, w81: 40, w10: 40, w11: 48 };
/** systems whose shutdown had a sound of its own */
const SHUTDOWN_SOUND = new Set(['w98', 'xp', 'vista', 'w7']);
const FALLBACK: Record<string, string> = { w98: 'win98-teal', xp: 'xp-hills', vista: 'vista-aurora', w7: 'win7-glow', w81: 'win81-teal', w10: 'win10-light', w11: 'win11-bloom' };

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

/** The screen of the machine: its resolution (1080p laptops ran at 150%), enlarged to fill the page like the monitor
 *  did. A page smaller than that screen, or a phone, gets a screen of its own size instead, so nothing is too small to read. */
function screenOf(m: Machine | null | undefined, vp: { w: number; h: number }) {
  const dw = m?.device.screenWidth ?? 1280, dh = m?.device.screenHeight ?? 800;
  const dpi = dw >= 1900 ? 1.5 : 1;
  const W = Math.round(dw / dpi), H = Math.round(dh / dpi);
  const s = Math.min(vp.w / W, vp.h / H);
  if (vp.w < 720 || s < 1) return { W: vp.w, H: vp.h, s: 1, small: vp.w < 720 };
  return { W, H, s: Math.min(s, 2), small: false };
}

export default function Pc() {
  const [sp, setSp] = useUrlParams();
  const sceneId = sp.get('scene');
  const last = useRef<string>(atString(new Date()));
  const sceneQ = useQuery({ queryKey: ['scene', sceneId], queryFn: () => desk.scene(sceneId!), enabled: !!sceneId, staleTime: Infinity, retry: 0 });
  const sceneAt = sceneQ.data ? atString(utc(sceneQ.data.at)!) : null;
  const at = sceneId ? (sceneAt ?? (sceneQ.isError ? last.current : null)) : sp.get('at') ?? last.current;
  if (at) last.current = at;
  const q = useQuery({ queryKey: ['desk-at', at], queryFn: () => desk.at(at!), enabled: !!at, placeholderData: keepPreviousData, staleTime: 5 * 60_000 });
  const vp = useViewport();
  const data = q.data;
  const machine = data?.computer ?? null;
  const T = useMemo(() => (data ? utc(data.at)! : null), [data]);
  const moment = useMemo(() => ({ at: T ? atString(T) : undefined, T: T ?? new Date(), latest: null }), [T]);
  const go = useCallback((p: Record<string, string>) => setSp(p), [setSp]);
  const scr = screenOf(machine, vp);
  const skin = skinOf(machine?.system?.os);

  if (!data || !machine || !T) {
    return (
      <div className="dv-stage">
        {q.isError && <div className="dv-fail"><p>Không bật được máy lúc này.</p><a href="/">Về Sonic Hub</a></div>}
      </div>
    );
  }
  return (
    <MomentContext.Provider value={moment}>
      <WmProvider apps={APPS} area={{ w: scr.W, h: scr.H - TASKBAR[skin] }} scale={scr.s}
        dockInset={!scr.small && machine.items.some(i => i.place === 'GADGET') ? (skin === 'vista' ? 150 : 156) : 0}>
        <Desktop data={data} machine={machine} T={T} at={moment.at!} fresh={!q.isPlaceholderData} scene={sceneId ? sceneQ.data ?? null : null}
          go={go} scr={scr} skin={skin} />
      </WmProvider>
    </MomentContext.Provider>
  );
}

function Desktop({ data, machine, T, at, fresh, scene, go, scr, skin }: {
  data: MomentData; machine: Machine; T: Date; at: string; fresh: boolean; scene: Scene | null;
  go: (p: Record<string, string>) => void; scr: { W: number; H: number; s: number; small: boolean }; skin: string;
}) {
  const wm = useWm();
  const { open, closeAll, close } = wm;
  const os = machine.system?.os ?? 'WINXP';
  const ver = machine.apps;
  const bootKey = `${machine.device.key}/${os}`;
  const [phase, setPhase] = useState<Phase>('card');
  const [changed, setChanged] = useState<'first' | 'machine' | 'os'>('first');
  const [startOpen, setStartOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const booted = useRef<string | null>(null), started = useRef<string | null>(null), shown = useRef<string | null>(null);
  const [sceneAsk, setSceneAsk] = useState(0);
  const [saver, setSaver] = useState(false);
  const messengerApp = machine.items.some(i => i.app === 'messenger');
  const look = useSkin(skin);
  const { sound } = look;
  const year = vn(T).y;
  const iconCtx = useMemo(() => ({ skin, year, ver }), [skin, year, ver]);
  // its files fetched while it shows itself and starts, so the desktop opens whole
  usePreloadPc(machine, skin, year);

  // another machine, or another system on it: reboot into it
  useEffect(() => {
    if (!fresh || booted.current === bootKey) return;
    const prev = booted.current;
    booted.current = bootKey;
    closeAll();
    setStartOpen(false);
    setTimeOpen(false);
    const kind = !prev ? 'first' : prev.split('/')[0] !== machine.device.key ? 'machine' : 'os';
    setChanged(kind);
    setPhase(kind === 'os' ? 'boot' : 'card');
  }, [fresh, bootKey, machine.device.key, closeAll]);

  const next = useCallback(() => setPhase(p => p === 'card' ? 'boot' : p === 'boot' ? (skin === 'w98' ? 'on' : 'login') : p === 'login' ? 'on' : p), [skin]);
  const off = useCallback(() => window.location.assign(portalAt(T)), [T]);
  useEffect(() => {
    if (phase === 'on') return;
    const id = window.setTimeout(phase === 'down' ? off : next,
      phase === 'card' ? 2600 : phase === 'boot' ? 2600 : phase === 'login' ? 1700 : SHUTDOWN_SOUND.has(skin) ? 3000 : 1600);
    return () => window.clearTimeout(id);
  }, [phase, next, off, skin]);

  // the sounds of the system starting (at its welcome screen from 7 on, with the desktop before) and going down
  const lastPhase = useRef<Phase>(phase);
  useEffect(() => {
    const was = lastPhase.current;
    lastPhase.current = phase;
    if (was === phase) return;
    if (phase === 'login' && (skin === 'w7' || skin === 'w11')) sound('startup');
    else if (phase === 'on' && (skin === 'w98' || skin === 'xp' || skin === 'vista')) sound('startup');
    else if (phase === 'down' && SHUTDOWN_SOUND.has(skin)) sound('shutdown');
  }, [phase, skin, sound]);

  const openItem = useCallback((it: Pick<DeskItem, 'app' | 'target' | 'label' | 'glyph'>) => {
    const spec = specOf(it, os, ver);
    if (spec === 'time') { setStartOpen(false); setTimeOpen(true); return; }
    if (spec.app === 'viewer' && spec.arg?.set === 'day') viewDay(data.day.photos);
    open(spec);
  }, [os, ver, data.day.photos, open]);

  const openChat = useCallback((platform: string, archiveId: string, name?: string | null, seq?: number | null) => {
    if (platform === 'YAHOO') open({ app: 'im', arg: { archiveId, name: name ?? '', seq: seq ?? null } });
    else if (platform === 'FACEBOOK') open(messengerApp ? { app: 'messenger', arg: { thread: archiveId } }
      : { app: 'browser', arg: { url: `facebook.com/messages/${archiveId}` }, glyph: browserGlyph(ver.browser) });
    else open({ app: 'messages', arg: { platform, archiveId, seq: seq ?? null }, title: platform === 'ZALO' ? 'Zalo' : 'Messages', glyph: platform === 'ZALO' ? 'chat-blue' : 'sms' });
  }, [open, messengerApp, ver.browser]);

  // what started with the machine
  useEffect(() => {
    if (phase !== 'on' || started.current === bootKey) return;
    started.current = bootKey;
    machine.items.filter(i => i.place === 'STARTUP').forEach(openItem);
  }, [phase, bootKey, machine.items, openItem]);

  // a memory asked for: once its moment is up, its windows open (over what was open, the buddy list kept)
  useEffect(() => {
    if (!scene || phase !== 'on' || !fresh) return;
    const mark = `${scene.episode}:${sceneAsk}`;
    if (shown.current === mark || Math.abs(utc(scene.at)!.getTime() - T.getTime()) > 90_000) return;
    shown.current = mark;
    wm.wins.filter(w => w.app !== 'yahoo').forEach(w => close(w.id));
    const yahoo = wm.wins.find(w => w.app === 'yahoo' && !w.min);
    for (const spec of sceneSpecs(scene, { messengerApp, os, ver })) {
      // the memory's note sits at the right, beside the buddy list when it is up
      if (spec.app === 'sticky') open({ ...spec, dock: undefined, x: Math.max(8, (yahoo && !scr.small ? yahoo.x : wm.area.w - 6) - 310), y: 12 });
      else open(spec);
    }
  }, [scene, phase, fresh, T, sceneAsk, wm.wins, wm.area.w, close, open, messengerApp, os, ver, scr.small]);

  const toScene = useCallback((id: string) => { setStartOpen(false); setTimeOpen(false); setSceneAsk(n => n + 1); go({ scene: id }); }, [go]);
  const setAt = useCallback((next: string) => go({ at: next }), [go]);
  const shutdown = useCallback(() => { setStartOpen(false); setTimeOpen(false); setPhase('down'); }, []);
  const openTime = useCallback(() => { setStartOpen(false); setTimeOpen(true); }, []);

  // left alone for a while, the machine goes to its screensaver (not on a phone-sized page, where reading is all there is)
  useEffect(() => {
    if (phase !== 'on' || scr.small) { setSaver(false); return; }
    let id = window.setTimeout(() => setSaver(true), IDLE_MS);
    const poke = () => { window.clearTimeout(id); id = window.setTimeout(() => setSaver(true), IDLE_MS); };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    evs.forEach(e => window.addEventListener(e, poke, { capture: true, passive: true }));
    return () => { window.clearTimeout(id); evs.forEach(e => window.removeEventListener(e, poke, { capture: true })); };
  }, [phase, scr.small]);
  const wake = useCallback(() => setSaver(false), []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setStartOpen(false); setTimeOpen(false); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const ctx = useMemo<DeskCtx>(() => ({ T, at, data, machine, os, ver, setAt, openItem, scene: toScene, openChat, openTime, shutdown }),
    [T, at, data, machine, os, ver, setAt, openItem, toScene, openChat, openTime, shutdown]);
  const icons = useMemo(() => machine.items.filter(i => i.place === 'DESKTOP').sort((a, b) => a.sort - b.sort), [machine.items]);
  const gadgets = machine.items.filter(i => i.place === 'GADGET');
  const sidebar = skin === 'vista' && gadgets.length > 0;
  const tb = TASKBAR[skin];
  const style = { ...look.style, width: scr.W, height: scr.H, transform: scr.s !== 1 ? `scale(${scr.s})` : undefined, '--tb': `${tb}px`,
    '--accent': machine.system?.accent ?? '#0078d7' } as CSSProperties;

  return (
    <Desk.Provider value={ctx}>
     <IconContext.Provider value={iconCtx}>
      <div className="dv-stage">
        <div className={`dv dv-${skin} ${scr.small ? 'small' : ''} ${look.real ? 'real' : ''} ${phase !== 'on' ? 'busy' : ''}`} style={style}
          onClick={() => { setStartOpen(false); setTimeOpen(false); }}>
          <Wallpaper wp={machine.wallpaper} fallback={FALLBACK[skin]} />
          <div className="dv-desk" style={sidebar ? { right: 150 } : undefined}>
            <DesktopIcons items={icons} skin={skin} height={scr.H - tb} onOpen={openItem} />
          </div>
          {gadgets.length > 0 && <Gadgets items={gadgets} sidebar={sidebar} />}
          <div className="dv-wins">{wm.wins.map(w => APPS[w.app] && <Window key={w.id} win={w} def={APPS[w.app]} small={scr.small} />)}</div>
          <Notices ready={phase === 'on'} messengerApp={messengerApp} skip={scene?.episode} />
          {startOpen && <StartMenu onClose={() => setStartOpen(false)} />}
          {timeOpen && <TimeMachine onClose={() => setTimeOpen(false)} />}
          <Taskbar startOpen={startOpen} timeOpen={timeOpen} onStart={() => { setTimeOpen(false); setStartOpen(o => !o); }}
            onClock={() => { setStartOpen(false); setTimeOpen(o => !o); }} />
          <Boot phase={phase} machine={machine} skin={skin} T={T} changed={changed} onNext={phase === 'down' ? off : next} />
          {saver && phase === 'on' && <Screensaver kind={saverKind(skin, machine)} machine={machine} skin={skin} T={T} onWake={wake} />}
        </div>
      </div>
     </IconContext.Provider>
    </Desk.Provider>
  );
}
