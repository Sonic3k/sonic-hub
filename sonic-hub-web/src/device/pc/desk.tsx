/* What every part of the computer shares: T, the machine of T, and the few actions that change them. */
import { createContext, useContext, useEffect, useState } from 'react';
import type { DeskDevice, DeskItem, Machine, MomentData, Os } from '../api';
import { isComputer } from '../api';
import { utc } from '../moment';

export interface DeskCtx {
  T: Date; at: string; data: MomentData; machine: Machine; os: Os; ver: Record<string, string>;
  /** move T (Vietnam wall-clock "2011-08-22T20:35"), on the computer named if he had it then; a different machine
   *  means a reboot */
  setAt: (at: string, device?: string) => void;
  /** what a desktop icon, a Start entry or a bookmark opens */
  openItem: (item: Pick<DeskItem, 'app' | 'target' | 'label' | 'glyph'>) => void;
  /** go back to a memory: its moment, its windows */
  scene: (episodeId: string) => void;
  /** a conversation in the app it lived in then (Yahoo, Messenger, the browser, SMS, Zalo) */
  openChat: (platform: string, archiveId: string, name?: string | null, seq?: number | null) => void;
  /** the clock's time machine */
  openTime: () => void;
  shutdown: () => void;
}
export const Desk = createContext<DeskCtx | null>(null);
export const useDesk = () => useContext(Desk)!;

/** The look a system belongs to, as the stylesheet names it. */
export const skinOf = (os: Os | undefined | null): string => {
  switch (os) {
    case 'WIN98': return 'w98';
    case 'WINXP': return 'xp';
    case 'VISTA': return 'vista';
    case 'WIN7': return 'w7';
    case 'WIN81': return 'w81';
    case 'WIN10': return 'w10';
    case 'WIN11': return 'w11';
    default: return 'xp';
  }
};

/** The computers he had at T, in the order he got them — there were years with two (his own and the family's). */
export const computersAt = (all: DeskDevice[], T: Date): DeskDevice[] => {
  const t = T.getTime();
  return all.filter(m => isComputer(m) && (utc(m.from)?.getTime() ?? -Infinity) <= t && (utc(m.to)?.getTime() ?? Infinity) > t);
};

/** From Windows 7 the taskbar is tall enough for the date under the time; before, only the time. */
export const showsDate = (os: Os) => os === 'WIN7' || os === 'WIN81' || os === 'WIN10' || os === 'WIN11';

/* The clock runs on from T while the machine is on (only the clock: everything else stays read at T). One start for
   all the clocks, so they agree. */
let base = { T: 0, at: 0 };
export function useTick(T: Date, every = 1000): Date {
  if (base.T !== T.getTime()) base = { T: T.getTime(), at: Date.now() };
  const [, force] = useState(0);
  useEffect(() => { const id = window.setInterval(() => force(x => x + 1), every); return () => window.clearInterval(id); }, [every]);
  return new Date(base.T + (Date.now() - base.at));
}

/* names of the programs as each machine had them */
export const browserName = (v?: string) =>
  v === 'FIREFOX' ? 'Mozilla Firefox' : v === 'CHROME' ? 'Google Chrome' : v === 'EDGE' ? 'Microsoft Edge' : 'Microsoft Internet Explorer';
export const browserGlyph = (v?: string) =>
  v === 'FIREFOX' ? 'globe-orange' : v === 'CHROME' ? 'globe-multi' : v === 'EDGE' ? 'globe-teal' : 'globe-blue';
export const viewerName = (os?: Os) =>
  os === 'WIN98' ? 'Imaging' : os === 'WINXP' ? 'Windows Picture and Fax Viewer' : os === 'VISTA' ? 'Windows Photo Gallery' : os === 'WIN7' ? 'Windows Photo Viewer' : 'Photos';
export const osName = (os?: Os | null) =>
  ({ WIN98: 'Windows 98', WINXP: 'Windows XP', VISTA: 'Windows Vista', WIN7: 'Windows 7', WIN81: 'Windows 8.1', WIN10: 'Windows 10', WIN11: 'Windows 11' } as Record<string, string>)[os ?? ''] ?? '';
