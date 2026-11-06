/* What every screen of the phone shares: T, the phone of T, and moving between its screens. */
import { createContext, useContext } from 'react';
import type { Machine, MomentData } from '../api';

export interface Screen { app: string; arg: Record<string, unknown> }

export interface PhoneCtx {
  T: Date; at: string; data: MomentData; machine: Machine; nokia: boolean;
  stack: Screen[];
  open: (app: string, arg?: Record<string, unknown>) => void;
  back: () => void;
  home: () => void;
  /** move T (Vietnam wall-clock); another phone's time turns that phone on */
  setAt: (at: string) => void;
  powerOff: () => void;
}
export const Phone = createContext<PhoneCtx | null>(null);
export const usePhone = () => useContext(Phone)!;

/** A conversation in the app it lived in on the phone: SMS, Zalo, Messenger; anything else read as it was. */
export function chatScreen(platform: string, archiveId: string, title?: string | null, seq?: number | null): Screen {
  if (platform === 'FACEBOOK') return { app: 'messenger', arg: { thread: archiveId } };
  return { app: 'thread', arg: { platform, archiveId, title: title ?? '', seq: seq ?? null } };
}
