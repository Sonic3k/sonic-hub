/* Having a machine's files before they are needed. While the machine shows itself and starts (the card, its maker's
   mark, the boot screen — five seconds or so), its pictures and sounds are fetched: first those of switching on and
   the welcome or lock screen, then what the desktop is drawn with (the theme's parts, the cursors, the icons of what
   is on it and in Start, Messenger's skin when it starts with the machine), and the sounds it plays. The browser
   keeps them (the CDN lets it for a month), so each screen opens whole. */
import { useQueries } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Machine } from './api';
import { assetsQuery, preloadImages, preloadSound, type AssetMap } from './assets';
import { ymFiles } from './apps/yahoo/ui';
import { CURSOR_FOLDER, ICON_FOLDER, LUNA, SYSTEM_ICONS, WALLPAPER_ASSET, iconFiles, iconOf, makerOf, phoneModel, type IconCtx } from './skin';

/* what each system shows switching on, at its welcome or lock screen and at Start (folder → files) */
const SCREENS: Record<string, Record<string, string[]>> = {
  w98: { w98: ['boot/boot.png', 'logo/flag.svg'] },
  xp: { xp: ['boot/professional.png', 'user/chess.png', 'icon/windows-logo-48.png', 'icon/windows-logo-32.png', 'logo/wordmark-white.svg',
    'icon/turn-off-computer-32.png', 'dialog/warning-32.png'] },
  vista: { vista: ['boot/boot.png'], w7: ['start/orb-96.png', 'icon/warning-32.png'] },
  w7: { w7: ['start/orb-144.png', 'login/background.jpg', 'start/orb-96.png', 'icon/warning-32.png'] },
  w81: { w81: ['logo/logo.svg', 'lock/default.jpg'], w7: ['start/flat-6801.png', 'icon/warning-32.png'] },
  w10: { w10: ['logo/wordmark.svg', 'lock/default.jpg', 'icon/warning-32.png'], w11: ['logo/logo.svg'] },
  w11: { w11: ['logo/logo.svg', 'lock/default.jpg'], w10: ['icon/warning-32.png'] },
};
/* the sounds it plays: starting, going down, a notice, a warning, the click of a page opening */
const SOUNDS: Record<string, string[]> = {
  w98: ['startup', 'shutdown', 'chord', 'click'], xp: ['startup', 'shutdown', 'balloon', 'exclamation', 'click'],
  vista: ['startup', 'shutdown', 'notify', 'exclamation', 'click'], w7: ['startup', 'shutdown', 'notify', 'exclamation', 'click'],
  w81: ['notify-messaging', 'exclamation'], w10: ['notify-messaging', 'exclamation'], w11: ['startup', 'notify-messaging', 'exclamation'],
};
/* the places Start and Explorer show besides his own items */
const PLACES = ['computer', 'documents', 'user-folder', 'folder-pictures', 'folder-music', 'folder', 'control', 'settings', 'network', 'recycle'];
const ICON_SIZES = [16, 24, 32, 48];

/** Folders' files by name, as they come (shared with every part that reads them). */
function useFolders(folders: string[]) {
  const qs = useQueries({ queries: folders.map(f => assetsQuery(f)) });
  const maps: Record<string, AssetMap | undefined> = {};
  folders.forEach((f, i) => { maps[f] = qs[i].data; });
  return { maps, ready: qs.every(q => !!q.data), key: qs.map(q => (q.data ? 1 : 0)).join('') };
}

/** The computer's files, fetched while it switches on (once each: what is already there is not asked for again). */
export function usePreloadPc(machine: Machine, skin: string, year: number) {
  const iconFolder = ICON_FOLDER[skin];
  const ver = machine.apps;
  const yahoo = !!ver.yahoo && machine.items.some(i => i.app === 'yahoo');
  const folders = [...new Set([skin, CURSOR_FOLDER[skin] ?? skin, iconFolder ?? skin, ...Object.keys(SCREENS[skin] ?? {}), 'machines', 'programs',
    'social', ...(yahoo ? ['yahoo'] : [])])];
  const { maps, key } = useFolders(folders);

  useEffect(() => {
    const at = (folder: string, name: string) => maps[folder]?.[name]?.url;
    // 1. switching on: the maker's mark (his photo of the machine or the stock one), the boot and welcome or lock screen
    const maker = makerOf(machine.device);
    preloadImages([maker ? at('machines', `oem/${maker}.svg`) : undefined, maker === 'rog' && !machine.device.photoUrl ? at('machines', 'rog/photo.jpg') : undefined]);
    for (const [folder, names] of Object.entries(SCREENS[skin] ?? {})) preloadImages(names.map(n => at(folder, n)));
    const wp = WALLPAPER_ASSET[machine.wallpaper?.builtin ?? ''];
    if (wp && !machine.wallpaper?.url) preloadImages([at(wp[0], wp[1])]);
    // 2. the desktop: the theme's parts, the cursors, the icons of what is on it and in Start
    if (skin === 'xp') preloadImages(LUNA.map(p => at('xp', `luna/${p}.png`)));
    const cur = CURSOR_FOLDER[skin] ?? skin;
    preloadImages(Object.keys(maps[cur] ?? {}).filter(n => n.startsWith('cursor/')).map(n => at(cur, n)));
    const ctx: IconCtx = { skin, year, ver };
    const icons: (string | undefined)[] = [];
    const want = (folder: string, base: string) => {
      for (const s of ICON_SIZES) { const f = iconFiles(maps[folder], base.startsWith('icon/') ? base : `icon/${base}`, s); if (f) icons.push(at(folder, f.one), f.two ? at(folder, f.two) : undefined); }
    };
    for (const it of machine.items) { const p = iconOf(it.glyph, it.label, ctx); if (p) want(p[0], p[1]); }
    if (iconFolder) {
      for (const g of PLACES) { const base = SYSTEM_ICONS[iconFolder]?.[g]; if (base) want(iconFolder, base); }
      want(iconFolder, 'shortcut-arrow-overlay');
    }
    preloadImages(icons);
    // 3. Messenger's skin, when it starts with the machine
    if (yahoo) preloadImages(ymFiles(ver.yahoo!).map(n => at('yahoo', n)));
    // 4. the sounds
    for (const s of SOUNDS[skin] ?? []) preloadSound(at(skin, `sound/${s}.wav`));
    if (yahoo) preloadSound(at('yahoo', 'sounds/message.wav'));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs again as each folder's list comes
  }, [key, machine, skin, year]);
}

/** The phone's sounds and the icons of its apps, fetched while it shows itself (its pictures are on screen already). */
export function usePreloadPhone(machine: Machine, year: number) {
  const model = phoneModel(machine.device);
  const { maps, key } = useFolders(['phones', 'social']);
  useEffect(() => {
    const at = (folder: string, name: string) => maps[folder]?.[name]?.url;
    const names = model === 'nokia' ? ['nokia/beep-once.mp3', 'nokia/sms-tone-standard.mp3'] : ['iphone/tri-tone.mp3', 'iphone/lock.mp3'];
    for (const n of names) preloadSound(at('phones', n));
    const ctx: IconCtx = { skin: model === 'nokia' ? 'nokia' : 'ios', year, ver: machine.apps };
    const icons: (string | undefined)[] = [];
    for (const it of machine.items) {
      const p = iconOf(it.glyph, it.label, ctx);
      if (!p) continue;
      const base = p[1].startsWith('icon/') ? p[1] : `icon/${p[1]}`;
      for (const s of [18, 46]) { const f = iconFiles(maps[p[0]], base, s); if (f) icons.push(at(p[0], f.one), f.two ? at(p[0], f.two) : undefined); }
    }
    preloadImages(icons);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs again as each folder's list comes
  }, [key, machine, model, year]);
}
