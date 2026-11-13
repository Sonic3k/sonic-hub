/* What is playing in Music: one song and the line of songs it came with. Kept outside the pages, so the bar under them
   (drawn by the frame while in Music) and any page's play buttons share it, and a song goes on while he moves from a
   list to another page of Music. Leaving Music stops it. */
import { useSyncExternalStore } from 'react';
import type { Track } from '../api/music';

/** where the songs come from: shown in the bar, and a way back to it */
export interface PlayedFrom { title: string; to: string }
interface State { now: Track | null; queue: Track[]; from?: PlayedFrom }

const IDLE: State = { now: null, queue: [] };
let state: State = IDLE;
/** the one audio element (the bar's): kept here so a tap can start it before anything else happens */
let el: HTMLAudioElement | null = null;
const subs = new Set<() => void>();
const set = (s: State) => { state = s; subs.forEach(f => f()); };
const at = () => state.queue.findIndex(t => t.key === state.now?.key);
const off = () => { el?.pause(); if (state.now) set(IDLE); };

export const player = {
  attach(a: HTMLAudioElement | null) { el = a; },
  /** First thing in a tap that will start music only after something is fetched: a phone lets a page start sound
   *  only from inside the tap itself, so the element is started here, still empty, and plays once it has a song. */
  unlock() { if (el && !state.now) void el.play().catch(() => {}); },
  /** play a song; the songs after it in its line follow */
  play(track: Track, queue: Track[] = [track], from?: PlayedFrom) { set({ now: track, queue, from }); },
  /** the same button starts a song and stops it */
  toggle(track: Track, queue: Track[] = [track], from?: PlayedFrom) { if (state.now?.key === track.key) off(); else set({ now: track, queue, from }); },
  next() { const i = at(); if (i >= 0 && state.queue[i + 1]) set({ ...state, now: state.queue[i + 1] }); else off(); },
  stop: off,
  hasNext: () => { const i = at(); return i >= 0 && i < state.queue.length - 1; },
};
export const usePlayer = () => useSyncExternalStore(cb => { subs.add(cb); return () => { subs.delete(cb); }; }, () => state);

/** a line of songs in a new order each time (the way a folder of a period was listened to) */
export function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
