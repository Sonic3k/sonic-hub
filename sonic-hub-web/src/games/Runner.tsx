/* What plays a game package, wherever it is shown (the portal page, a window of the old machines): the game remade for
   the web, a DOS game in js-dos, a Windows game in Boxedwine, a Flash game in Ruffle, a ROM in EmulatorJS, someone
   else's one-file web game in a frame of its own. */
import { lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hub, packageFile } from '../api/hub';
import './runner.css';

const Minesweeper = lazy(() => import('./Minesweeper'));
const DosGame = lazy(() => import('./DosGame'));
const FlashGame = lazy(() => import('./FlashGame'));
const RomGame = lazy(() => import('./RomGame'));
const WinGame = lazy(() => import('./WinGame'));
const HtmlGame = lazy(() => import('./HtmlGame'));
/** the engines a ROM is played with (EmulatorJS) */
export const ROM_ENGINES = new Set(['GBA', 'GB', 'GBC', 'SNES', 'NES', 'NDS']);

const conf = (c?: string | null): Record<string, string> => { try { return c ? JSON.parse(c) : {}; } catch { return {}; } };

export default function GameRunner({ pkg, onClose, scale }: { pkg: string; onClose?: () => void; scale?: number }) {
  const q = useQuery({ queryKey: ['game-package', pkg], queryFn: () => hub.gamePackage(pkg), staleTime: 10 * 60_000 });
  const p = q.data;
  if (q.isLoading) return <div className="gr-wait">…</div>;
  if (!p) return <div className="gr-err">Không tìm thấy game này.</div>;
  const c = conf(p.config);
  return (
    <Suspense fallback={<div className="gr-wait">…</div>}>
      {p.engine === 'WEB' && c.replica === 'minesweeper' && <Minesweeper onClose={onClose} />}
      {p.engine === 'DOS' && <DosGame pkg={p.key} scale={scale} />}
      {p.engine === 'WIN' && <WinGame pkg={p.key} conf={c} />}
      {ROM_ENGINES.has(p.engine) && <RomGame pkg={p.key} core={c.core} save={p.hasSave} />}
      {p.engine === 'HTML' && <HtmlGame pkg={p.key} title={p.title || p.gameTitle} hosts={c.hosts} />}
      {p.engine === 'FLASH' && <FlashGame url={packageFile(p.key)} width={Number(c.width) || 640} height={Number(c.height) || 480} />}
    </Suspense>
  );
}
