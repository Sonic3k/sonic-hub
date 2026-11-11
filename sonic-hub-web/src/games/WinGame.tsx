/* A Windows game (Windows 3.1 or 9x): Boxedwine — Wine and an x86 machine in WebAssembly — in its own page
   (/games/win.html) in a frame, with the game's folder from the private bucket. Several games of one folder share one
   zip (config "zip": the package that holds it); config "exe" is the program, "dir" its folder in the zip, "arg" what
   it is started with (word by word). */
import { apiUrl } from '../api/client';
import { packageFile } from '../api/hub';

export default function WinGame({ pkg, conf }: { pkg: string; conf: Record<string, string> }) {
  const q = new URLSearchParams({ rt: apiUrl('/game-runtime/'), zip: packageFile(conf.zip || pkg), dir: conf.dir || '', exe: conf.exe || '' });
  if (conf.res) q.set('res', conf.res);
  if (conf.bpp) q.set('bpp', conf.bpp);
  if (conf.win) q.set('win', conf.win);
  for (const word of (conf.arg || '').split(' ').filter(Boolean)) q.append('arg', word);
  return <iframe className="gr-win" title={pkg} src={`/games/win.html?${q}`} allow="autoplay; fullscreen; gamepad"
    onLoad={e => e.currentTarget.focus()} />;
}
