/* An emulator of his machines (VisualBoyAdvance, Snes9x, No$GBA, VirtuaNES): the games he had in it, his save beside
   each, and the game itself once picked. */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { hub } from '../api/hub';
import GameRunner from './Runner';
import type { GamePackage } from '../types';

export const EMULATORS: Record<string, string> = { vba: 'VisualBoyAdvance', snes9x: 'Snes9x', nogba: 'No$GBA', virtuanes: 'VirtuaNES', desmume: 'DeSmuME' };
export const emuOf = (p: Pick<GamePackage, 'config'>): string | null => { try { return p.config ? JSON.parse(p.config).emu ?? null : null; } catch { return null; } };
const day = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export default function EmulatorApp({ emu, pkg: start }: { emu: string; pkg?: string }) {
  const q = useQuery({ queryKey: ['game-packages'], queryFn: hub.gamePackages, staleTime: 10 * 60_000 });
  const [pkg, setPkg] = useState<string | undefined>(start);
  const [menu, setMenu] = useState(false);
  const list = (q.data ?? []).filter(p => emuOf(p) === emu).sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  return (
    <div className="dv-emu">
      <div className="dv-emu-menu">
        <span className={menu ? 'on' : ''} onClick={() => setMenu(m => !m)}>File
          {menu && <div className="dv-emu-drop" onClick={e => e.stopPropagation()}>
            {list.map(p => <div key={p.key} onClick={() => { setPkg(p.key); setMenu(false); }}>{p.title}</div>)}
            {pkg && <><hr /><div onClick={() => { setPkg(undefined); setMenu(false); }}>Close ROM</div></>}
          </div>}
        </span>
        <span>Options</span><span>Help</span>
      </div>
      <div className="dv-emu-body">
        {pkg ? <GameRunner key={pkg} pkg={pkg} />
          : <div className="dv-emu-list">
            {q.isLoading && <p>…</p>}
            {list.map(p => <button key={p.key} type="button" onDoubleClick={() => setPkg(p.key)} onClick={() => setPkg(p.key)}>
              <b>{p.title}</b><small>{p.hasSave ? `Save · ${day(p.saveAt)}` : p.fileName}</small></button>)}
          </div>}
      </div>
    </div>
  );
}
