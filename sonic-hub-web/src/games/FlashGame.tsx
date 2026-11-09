/* A Flash game (.swf) in Ruffle, the same player as the Flash cards; the movie comes from the API (the private bucket). */
import { useEffect, useRef, useState } from 'react';
import { loadRuffle } from '../components/FlashCard';

type RufflePlayerEl = HTMLElement & { ruffle(): { load(o: Record<string, unknown>): Promise<void> } };

export default function FlashGame({ url, width, height }: { url: string; width: number; height: number }) {
  const box = useRef<HTMLDivElement>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    let player: RufflePlayerEl | null = null, gone = false;
    loadRuffle().then(() => {
      const api = (window.RufflePlayer as { newest?: () => { createPlayer(): RufflePlayerEl } } | undefined)?.newest?.();
      if (gone || !box.current || !api) return;
      player = api.createPlayer();
      box.current.appendChild(player);
      return player.ruffle().load({ url, allowScriptAccess: false });
    }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; player?.remove(); };
  }, [url]);
  return <div className="gr-flash" ref={box} style={{ aspectRatio: `${width} / ${height}` }}>{failed && <p className="gr-err">Không mở được game này.</p>}</div>;
}
