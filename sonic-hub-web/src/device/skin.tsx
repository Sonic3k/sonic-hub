/* The real look of each system, from the files he gathered (kept on the server as asset folders, /api/desk/assets):
   its sounds, cursors and icons, the bitmaps its theme was drawn with, its boot, welcome and lock screens, the icons of
   the programs and apps by the year they had them. A system reads its own folder and borrows what it shared with
   another — Vista's icons and cursors are 7's, so are 8.1's; 10 has 7's cursors, 11 has 10's icons. Until the files
   have come (or where one is missing) the drawn look stays. */
import { createContext, useCallback, useContext, useMemo, type CSSProperties } from 'react';
import type { DeskDevice } from './api';
import { play, useAssets } from './assets';

export const ICON_FOLDER: Record<string, string | null> = { w98: null, xp: 'xp', vista: 'w7', w7: 'w7', w81: 'w7', w10: 'w10', w11: 'w10' };
const CURSOR_FOLDER: Record<string, string> = { w98: 'w98', xp: 'xp', vista: 'w7', w7: 'w7', w81: 'w7', w10: 'w7', w11: 'w11' };

/* hot spots of the cursors (read from their .cur files when the folders were built) */
const HOT: Record<string, Record<string, [number, number]>> = {
  w98: { arrow: [2, 4], beam: [15, 15], busy: [16, 16], appstart: [2, 4], move: [16, 16], ns: [16, 16], ew: [15, 16], nwse: [16, 16], nesw: [15, 16], no: [16, 15], help: [2, 4] },
  xp: { arrow: [2, 4], beam: [15, 15], busy: [16, 16], appstart: [2, 4], move: [16, 16], ns: [16, 16], ew: [15, 16], nwse: [16, 16], nesw: [15, 16], no: [16, 15], help: [2, 4] },
  w7: { arrow: [0, 0], busy: [16, 16], appstart: [1, 8], hand: [4, 0], move: [11, 11], ns: [4, 11], ew: [11, 4], nwse: [8, 8], nesw: [8, 8], no: [8, 8], help: [0, 0] },
  w11: { arrow: [0, 0], busy: [16, 16], appstart: [0, 8], hand: [6, 0], move: [11, 11], ns: [4, 11], ew: [11, 4], nwse: [8, 8], nesw: [8, 8], no: [8, 8], help: [0, 0] },
};
const KEYWORD: Record<string, string> = { arrow: 'default', hand: 'pointer', beam: 'text', busy: 'wait', appstart: 'progress', move: 'move',
  ns: 'ns-resize', ew: 'ew-resize', nwse: 'nwse-resize', nesw: 'nesw-resize', no: 'not-allowed', help: 'help' };

/* the parts of Luna (XP's blue theme) the stylesheet draws with, each a state of its bitmap (luna/<part>-<state>.png) */
const LUNA: string[] = [
  ...['framecaption', 'framemaximized', 'frameleft', 'frameright', 'framebottom'].flatMap(p => [`${p}-0`, `${p}-1`]),
  ...['captionbutton', 'closebutton', 'minimizeglyph', 'maximizeglyph', 'restoreglyph', 'closeglyph'].flatMap(p => [0, 1, 2, 4].map(s => `${p}-${s}`)),
  'startbutton-0', 'startbutton-1', 'startbutton-2', 'taskbarbackground', 'taskbartray',
  ...[0, 1, 2, 4, 5].map(s => `taskbandbutton-${s}`), 'taskbandbuttonnoedge-1', 'taskbandbuttonnoedge-2',
  'startuserpanel', 'usertilebackground', 'startpanelmfubackground', 'startpanelplacesbackground', 'startpanellogoffbackground',
  'startpanellogoffbuttons', 'startpanellogoffbuttonshot', 'startpanelmoreprogarrow', 'startpanelmoreprogarrowhot', 'startpanelmoreprogbackground',
  'startprogramsseparator', 'startplacesseparator', 'startgroupbackground', 'startgrouptoolbarbutton-1',
  ...[0, 1, 2, 3].flatMap(s => [`scrollshaftvertical-${s}`, `scrollshafthorizontal-${s}`, `scrollthumbvertical-${s}`, `scrollthumbhorizontal-${s}`,
    `scrollthumbgrippervertical-${s}`, `scrollthumbgripperhorizontal-${s}`]),
  ...Array.from({ length: 16 }, (_, s) => [`scrollarrows-${s}`, `scrollarrowglyphs-${s}`]).flat(), 'button-0', 'button-1', 'button-2', 'button-4',
];

const url = (u?: string) => (u ? `url("${u}")` : undefined);

/** A system's look: its folders, the stylesheet's variables (cursors, theme parts), its sounds. */
export function useSkin(skin: string) {
  const own = useAssets(skin);
  const cur = useAssets(CURSOR_FOLDER[skin] ?? skin);
  const w7 = useAssets('w7');
  const w11 = useAssets('w11');
  const style = useMemo(() => {
    const s: Record<string, string> = {};
    const hot = HOT[CURSOR_FOLDER[skin]] ?? {};
    for (const [k, kw] of Object.entries(KEYWORD)) {
      const u = cur.a(`cursor/${k}.png`);
      if (u && hot[k]) s[`--c-${k}`] = `url("${u}") ${hot[k][0]} ${hot[k][1]}, ${kw}`;
    }
    if (skin === 'xp') for (const p of LUNA) { const u = own.a(`luna/${p}.png`); if (u) s[`--l-${p}`] = url(u)!; }
    if (skin === 'xp') { const f = own.a('icon/windows-logo-32.png'); if (f) s['--xp-flag'] = url(f)!; }
    if (skin === 'vista' || skin === 'w7') { const o = w7.a('start/orb-96.png'), o2 = w7.a('start/orb-144.png'); if (o) s['--orb'] = url(o)!; if (o2) s['--orb2'] = url(o2)!; }
    if (skin === 'w81') { const f = w7.a('start/flat-6801.png'); if (f) s['--flat'] = url(f)!; }
    if (skin === 'w10' || skin === 'w11') { const f = w11.a('logo/logo.svg'); if (f) s['--logo11'] = url(f)!; }
    return s as CSSProperties;
  }, [skin, own, cur, w7, w11]);
  const real = skin === 'xp' ? !!own.a('luna/framecaption-0.png') : own.ready && !!own.map && Object.keys(own.map).length > 0;
  const sound = useCallback((name: string, volume = 0.7) => play(own.a(`sound/${name}.wav`), volume), [own]);
  return { own, style, real, sound };
}

/** The click of a page or folder opening — Start Navigation, in Windows Explorer and Internet Explorer up to 7 — or
 *  nothing on the systems that had none. */
export function useNavClick(skin: string, enabled = true) {
  const { sound } = useSkin(skin);
  const on = enabled && (skin === 'w98' || skin === 'xp' || skin === 'vista' || skin === 'w7');
  return useCallback(() => { if (on) sound('click', 0.45); }, [on, sound]);
}

/* ── icons ──────────────────────────────────────────────────────────────── */

/** What a desktop item is drawn with on the machine of T: the system, the year, the programs' versions. */
export interface IconCtx { skin: string; year: number; ver: Record<string, string> }
export const IconContext = createContext<IconCtx | null>(null);
export const useIconCtx = () => useContext(IconContext);

/* the system's own icons, by what a glyph names (icon/<base>-<size>.png in the system's icon folder) */
const SYSTEM_ICONS: Record<string, Record<string, string>> = {
  xp: { computer: 'my-computer', documents: 'my-documents', 'user-folder': 'my-documents', recycle: 'recycle-bin-empty', network: 'my-network-places',
    control: 'control-panel', settings: 'control-panel', folder: 'folder-closed', 'folder-pictures': 'my-pictures', 'folder-music': 'my-music',
    text: 'file-txt', image: 'file-image', film: 'file-video', music: 'file-audio', wave: 'file-audio', help: 'help', app: 'file-application-exe',
    search: 'search', printer: 'printer', user: 'user' },
  w7: { computer: 'computer', documents: 'documents', 'user-folder': 'user-folder', recycle: 'recycle-bin-empty', network: 'network',
    control: 'control-panel', folder: 'folder-closed', 'folder-pictures': 'pictures', 'folder-music': 'music', text: 'file-txt', image: 'file-image',
    film: 'file-video', music: 'file-audio', wave: 'file-audio', help: 'help-question', app: 'application-window', user: 'user', archive: 'zip-folder' },
  w10: { computer: 'this-pc', documents: 'documents', 'user-folder': 'user-folder', recycle: 'recycle-bin-empty', network: 'network',
    control: 'control-panel', folder: 'folder-closed', 'folder-pictures': 'pictures', 'folder-music': 'music', text: 'file-txt', image: 'file-image',
    film: 'file-video', music: 'file-audio', wave: 'file-audio', help: 'help', app: 'application-window', user: 'user', archive: 'zip-folder' },
};

const FILE_RE = /\.[a-z0-9]{2,4}$/i;

/** A program's or an app's own icon as it was in that year, by what the item is called and what it is. */
function programIcon(glyph: string, label: string, c: IconCtx): [string, string] | null {
  const y = c.year, l = label.toLowerCase();
  const isFile = FILE_RE.test(label);
  if (glyph === 'globe-blue' && !isFile) return c.skin === 'w98' || c.skin === 'xp' ? ['programs', 'ie6'] : ['programs', 'ie8'];
  if (glyph === 'globe-orange') return ['programs', 'firefox-3'];
  if (glyph === 'globe-multi') return ['programs', y < 2014 ? 'chrome-2011' : y < 2022 ? 'chrome-2014' : 'chrome-2022'];
  if (glyph === 'globe-teal') return y < 2020 ? ['programs', 'edge-2015'] : null;
  if (glyph === 'doc-blue') return ['programs', y < 2008 ? 'word-2003' : 'word-2007'];
  if (glyph === 'sheet-green') return y >= 2007 ? ['programs', 'excel-2007'] : null;
  if (glyph === 'archive' && /\.rar$|winrar/.test(l)) return ['programs', 'winrar'];
  if (/utorrent/.test(l)) return ['programs', 'utorrent'];
  if (/^(windows|file) explorer$/.test(l) && ICON_FOLDER[c.skin]) return [ICON_FOLDER[c.skin]!, ICON_FOLDER[c.skin] === 'w10' ? 'icon/file-explorer' : ICON_FOLDER[c.skin] === 'w7' ? 'icon/libraries' : 'icon/folder-open'];
  if (/kmplayer/.test(l)) return ['programs', 'kmplayer'];
  if (/windows media player/.test(l)) return ['programs', 'wmp'];
  if (/eclipse/.test(l)) return ['programs', 'eclipse'];
  if (/visual studio/.test(l)) return ['programs', 'visual-studio'];
  if (/dreamweaver/.test(l)) return ['programs', /macromedia/.test(l) || y < 2008 ? 'dreamweaver-8' : 'dreamweaver-cs3'];
  if (/dev-?c\+\+/.test(l)) return ['programs', 'dev-cpp'];
  if (/avira/.test(l)) return ['programs', 'avira'];
  if (glyph === 'phone-bubble' || /^skype/.test(l)) return ['social', y < 2017 ? 'skype-2012' : 'skype-2019'];
  if (/zalo/.test(l)) return ['social', y < 2019 ? 'zalo-old' : 'zalo-2019'];
  if (/^messenger/.test(l)) return ['social', y < 2013 ? 'messenger-2011' : y < 2018 ? 'messenger-2013' : y < 2020 ? 'messenger-2018' : 'messenger-2020'];
  if (glyph === 'fb') return ['social', y < 2019 ? 'fb-2013' : y < 2021 ? 'fb-2019' : y < 2023 ? 'fb-2021' : 'fb-2023'];
  return null;
}

/** The asset an item is drawn with on that machine (folder, icon base name), or null to draw it. */
export function iconOf(glyph: string | null | undefined, label: string | undefined, c: IconCtx | null): [string, string] | null {
  if (!c || !glyph) return null;
  const prog = programIcon(glyph, label ?? '', c);
  if (prog) return prog;
  const folder = ICON_FOLDER[c.skin];
  const base = folder ? SYSTEM_ICONS[folder]?.[glyph] : undefined;
  return folder && base ? [folder, `icon/${base}`] : null;
}

const SIZES = [16, 32, 48, 96];

/** The icon file for a size drawn (and the one twice as big, for sharp scaled screens), among those a folder has. */
export function iconFiles(map: Record<string, unknown> | undefined, base: string, size: number) {
  if (!map) return null;
  const have = SIZES.filter(s => `${base}-${s}.png` in map);
  if (!have.length) return null;
  const one = have.find(s => s >= size) ?? have[have.length - 1];
  const two = have.find(s => s >= size * 2);
  return { one: `${base}-${one}.png`, two: two && two !== one ? `${base}-${two}.png` : null };
}

/* ── screens ────────────────────────────────────────────────────────────── */

/** The default pictures of the systems, standing for the drawn ones the machines were given (builtin → folder, file). */
export const WALLPAPER_ASSET: Record<string, [string, string]> = {
  'win81-teal': ['w81', 'wallpaper/default.jpg'],
  'win10-light': ['w10', 'wallpaper/hero.jpg'],
  'win10-lake': ['w10', 'lock/default.jpg'],
  'win11-bloom': ['w11', 'wallpaper/bloom-light.jpg'],
  'win81-lock': ['w81', 'lock/default.jpg'],
  'win11-lock': ['w11', 'lock/default.jpg'],
};

/** The maker of a machine, whose mark it showed when switched on (machines/oem/<maker>.svg). */
export function makerOf(d: Pick<DeskDevice, 'key' | 'name' | 'model'>): string | null {
  const s = `${d.name} ${d.model ?? ''}`.toLowerCase();
  if (/zephyrus|\brog\b/.test(s) || d.key === 'pc-now') return 'rog';
  if (/fujitsu/.test(s)) return 'fujitsu';
  if (/\bhp\b|pavilion/.test(s)) return 'hp';
  if (/asus/.test(s)) return 'asus';
  return null;
}

/** The phone a device was, for its pictures and sounds (phones/<model>/…). */
export function phoneModel(d: Pick<DeskDevice, 'key' | 'name'>): string | null {
  const s = `${d.key} ${d.name}`.toLowerCase();
  if (/nokia/.test(s)) return 'nokia';
  if (/iphone ?13|iphone13/.test(s)) return 'iphone-13';
  if (/iphone ?11|iphone11/.test(s)) return 'iphone-11';
  if (/iphone ?6|iphone6/.test(s)) return 'iphone-6s';
  return null;
}
