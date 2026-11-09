/* A Game Boy, SNES, NES or DS game: EmulatorJS in its own page (/games/emu.html) in a frame, with the ROM from the
   private bucket and, when he had one, his save. */
import { packageFile, packageSave } from '../api/hub';

export default function RomGame({ pkg, core, save }: { pkg: string; core?: string; save?: boolean }) {
  const q = new URLSearchParams({ core: core || 'gba', rom: packageFile(pkg), name: pkg });
  if (save) q.set('save', packageSave(pkg));
  return <iframe className="gr-rom" title={pkg} src={`/games/emu.html?${q}`} allow="autoplay; fullscreen; gamepad" />;
}
