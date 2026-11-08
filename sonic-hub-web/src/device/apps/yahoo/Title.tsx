/* Messenger 9 to 11 on glass wrote its own name in the title bar ("YAHOO! MESSENGER", then "Y! MESSENGER" from 10),
   dimmed when the window wasn't the active one; on XP (8) the title was the system's. */
import type { ReactNode } from 'react';
import type { Win } from '../../pc/wm';
import { useDesk } from '../../pc/desk';
import { ymVer } from './strings';
import { useYm } from './ui';

const GLASS = new Set(['VISTA', 'WIN7', 'WIN81', 'WIN10', 'WIN11']);

export function YahooTitle({ on, fallback }: { win: Win; on: boolean; fallback: ReactNode }) {
  const { os, ver } = useDesk();
  const { a } = useYm();
  const v = ymVer(ver.yahoo);
  const [src, w, h] = v === 'YM9' ? [a('skin/theme/Yahoo!_Messenger.png'), 170, 17] : [a('skin/theme/Yahoo!_Messenger_aero.png'), 115, 19];
  if (v === 'YM8' || !GLASS.has(os) || !src) return <>{fallback}</>;
  return <span className="ym-logo" role="img" aria-label="Yahoo! Messenger"
    style={{ width: w, height: h, backgroundImage: `url("${src}")`, backgroundPosition: `0 ${on ? 0 : -h}px` }} />;
}
