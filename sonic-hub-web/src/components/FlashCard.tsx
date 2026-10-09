/* A Flash card (.swf), played by Ruffle — a Flash Player emulator in WebAssembly, served from /ruffle/ with the
   site (copied from npm at build time) and loaded only the first time a card is opened. The .swf comes through the
   API, which sends CORS headers the CDN does not; a card whose own player used to play the music has it beside. */
import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../api/client';
import type { MediaFile } from '../types';

type RufflePlayerEl = HTMLElement & { ruffle(): { load(o: Record<string, unknown>): Promise<void> } };
/* before ruffle.js loads this holds only our config; the script then puts its API (newest()) in its place */
type RuffleApi = { config?: Record<string, unknown>; newest?: () => { createPlayer(): RufflePlayerEl } };
declare global {
  interface Window { RufflePlayer?: RuffleApi }
}

let loading: Promise<void> | null = null;
function loadRuffle(): Promise<void> {
  if (window.RufflePlayer?.newest) return Promise.resolve();
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      window.RufflePlayer = { ...window.RufflePlayer, config: { publicPath: '/ruffle/', polyfills: false, autoplay: 'on',
        unmuteOverlay: 'visible', splashScreen: false, letterbox: 'on', contextMenu: 'off', showSwfDownload: false,
        warnOnUnsupportedContent: false, allowNetworking: 'internal' } };
      const s = document.createElement('script');
      s.src = '/ruffle/ruffle.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error('Ruffle')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export default function FlashCard({ m }: { m: MediaFile }) {
  const box = useRef<HTMLDivElement>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    let player: RufflePlayerEl | null = null, gone = false;
    setFailed(false);
    loadRuffle().then(() => {
      const api = window.RufflePlayer?.newest?.();
      if (gone || !box.current) return;
      if (!api) throw new Error('Ruffle');
      player = api.createPlayer();
      box.current.appendChild(player);
      return player.ruffle().load({ url: apiUrl(`/media-files/${m.id}/flash`) });
    }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; player?.remove(); };
  }, [m.id]);
  const ar = m.width && m.height ? m.width / m.height : 4 / 3;
  return (
    <div className="v-flash" style={{ ['--ar' as string]: String(ar) }}>
      <div className="v-flash-box" ref={box}>{failed && <p className="v-flash-err">Không mở được thiệp này.</p>}</div>
      {m.soundtrackUrl && <audio className="v-flash-audio" src={m.soundtrackUrl} autoPlay loop controls />}
    </div>
  );
}
