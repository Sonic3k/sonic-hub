/* The programs of the computer and what opens them: a desktop icon, a Start entry, a bookmark, a memory's windows. */
import type { DeskItem, Os, Scene } from '../api';
import { Explorer, type Loc } from '../apps/Explorer';
import { Browser } from '../apps/Browser';
import { YahooIm, YahooList, YahooTitle } from '../apps/Yahoo';
import { Messages } from '../apps/Messages';
import { Memories, Notepad, PhotoViewer, Word } from '../apps/Viewers';
import { MessageBox } from '../apps/MessageBox';
import { FacebookSite } from '../fb/Site';
import { lazy, Suspense } from 'react';
const GameRunner = lazy(() => import('../../games/Runner'));
const GameCardView = lazy(() => import('../../games/GameCardView'));
const EmulatorApp = lazy(() => import('../../games/EmulatorApp'));
/** the emulators of his machines, by the name the desk gives them */
const EMU_NAME: Record<string, string> = { vba: 'VisualBoyAdvance', snes9x: 'Snes9x', nogba: 'No$GBA', virtuanes: 'VirtuaNES', desmume: 'DeSmuME' };
const EMU_SIZE: Record<string, [number, number]> = { vba: [520, 400], snes9x: [560, 470], nogba: [420, 640], virtuanes: [540, 500], desmume: [420, 640] };
import { useWm, type AppDef, type WinSpec } from './wm';
import { browserGlyph, viewerName } from './desk';
export { browserGlyph, browserName, osName, viewerName } from './desk';

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const num = (v: unknown) => (typeof v === 'number' ? v : null);

export const APPS: Record<string, AppDef> = {
  explorer: { title: a => str(a.name) ?? 'Pictures', glyph: 'folder', w: 800, h: 540, render: w => <Explorer start={w.arg as Loc} /> },
  viewer: { title: () => 'Photos', glyph: 'image', w: 860, h: 620,
    render: w => <PhotoViewer set={str(w.arg.set)} index={num(w.arg.index) ?? 0} mediaIds={w.arg.mediaIds as string[] | undefined} /> },
  word: { title: () => 'Document1 - Microsoft Word', glyph: 'doc-blue', w: 840, h: 640, render: w => <Word noteId={str(w.arg.noteId)} /> },
  notepad: { title: () => 'Untitled - Notepad', glyph: 'notepad', w: 560, h: 420, render: w => <Notepad text={str(w.arg.text)} /> },
  sticky: { title: () => 'Ký ức', glyph: 'sticky', w: 300, h: 280, render: w => <Notepad text={str(w.arg.text)} sticky /> },
  memories: { title: () => 'Ký ức', glyph: 'sticky', w: 640, h: 580, render: () => <Memories /> },
  browser: { title: () => 'Internet', glyph: 'globe-blue', w: 1040, h: 700, render: w => <Browser url={str(w.arg.url)} /> },
  messenger: { title: () => 'Messenger', glyph: 'chat-blue', w: 940, h: 640,
    render: w => <FacebookSite path={str(w.arg.thread) ? `/messenger/${str(w.arg.thread)}` : '/messenger'} /> },
  yahoo: { title: () => 'Yahoo! Messenger', glyph: 'im-smile', w: 300, h: 760, render: () => <YahooList />, Title: YahooTitle },
  im: { title: a => `${str(a.name) ?? ''} - Instant Message`, glyph: 'im-smile', w: 560, h: 500,
    render: w => <YahooIm archiveId={str(w.arg.archiveId) ?? ''} name={str(w.arg.name) ?? ''} seq={num(w.arg.seq)} /> },
  messages: { title: a => (a.platform === 'ZALO' ? 'Zalo' : 'Messages'), glyph: 'sms', w: 860, h: 580,
    render: w => <Messages platform={str(w.arg.platform) ?? 'SMS'} archiveId={str(w.arg.archiveId)} seq={num(w.arg.seq)} /> },
  box: { title: () => 'Problem with Shortcut', glyph: 'help', w: 420, h: 170, render: w => <MessageBox text={str(w.arg.text) ?? ''} /> },
  /* a game of his: the package it plays (a DOS game, a Flash game, a game remade for the web) */
  game: { title: a => str(a.title) ?? 'Game', glyph: 'game', w: 680, h: 470,
    render: w => <GameWindow pkg={str(w.arg.pkg) ?? ''} /> },
  /* a game of the shelf, as the hub keeps it: when he played it, his pictures of it */
  /* an emulator (VisualBoyAdvance, Snes9x, No$GBA, VirtuaNES) with the games he had in it */
  emulator: { title: a => EMU_NAME[str(a.emu) ?? ''] ?? 'Emulator', glyph: 'game', w: 520, h: 400,
    render: w => <Suspense fallback={null}><EmulatorApp emu={str(w.arg.emu) ?? ''} pkg={str(w.arg.pkg)} /></Suspense> },
  gamecard: { title: a => str(a.title) ?? 'Game', glyph: 'game', w: 560, h: 520,
    render: w => <Suspense fallback={null}><GameCardView gameKey={str(w.arg.key) ?? ''} /></Suspense> },
};

function GameWindow({ pkg }: { pkg: string }) {
  const { scale } = useWm();
  return <Suspense fallback={null}><div className="dv-game"><GameRunner pkg={pkg} scale={scale} /></div></Suspense>;
}

/** the size a game's window opens at: its board or screen, and the frame around it (a Windows game: its window
 *  without Wine's title bar, as /games/win.html shows it, at the screen size it runs at) */
const GAME_SIZE: Record<string, [number, number]> = {
  minesweeper: [168, 262], 'chiec-non': [420, 344], 'dao-vang': [570, 444], bloxorz: [570, 344], 'doodle-god': [660, 524], 'doodle-devil': [660, 524],
  chips: [532, 416], jezzball: [516, 386], tetravex: [343, 257], tripeaks: [652, 385], taipei: [589, 370], klotski: [612, 468], rodent: [296, 376], maxwell: [532, 386], gofigure: [465, 266], dots: [660, 506], fences: [287, 293], 'pipe-dream': [597, 452], skifree: [612, 618], golf: [660, 506], cruel: [660, 506], 'chess-win': [660, 506], noughts: [612, 468], amnesia: [654, 500], blackjack: [590, 476], codebreaker: [380, 356], fujigolf: [660, 506], hangman: [660, 506], jacks: [660, 506], lifegen: [380, 425], pegged: [312, 318], rattler: [279, 375], sticks: [612, 468], tictactics: [236, 352], wordzap: [660, 506], dxball2: [660, 524], s3k: [340, 304], lines98: [430, 525], pikachu: [788, 614], pinball: [620, 480],
};
/** the window of an emulator, at one of its games when pkg is given (?open=rom:<key>) */
export const emuSpec = (emu: string, pkg?: string, label?: string): WinSpec => {
  const [w, h] = EMU_SIZE[emu] ?? [520, 400];
  return { app: 'emulator', arg: pkg ? { emu, pkg } : { emu }, title: label ?? EMU_NAME[emu] ?? 'Emulator', glyph: 'game', w, h };
};
/** the window of a game package (on a desktop icon, a Start entry, or ?open=game:<key>) */
export const gameSpec = (pkg: string, label?: string, glyph?: string | null): WinSpec => {
  const [w, h] = GAME_SIZE[pkg] ?? [680, 470];
  return { app: 'game', arg: { pkg }, title: label ?? 'Game', glyph: glyph ?? 'game', w, h };
};

/** how wide his buddy list was in each Messenger (his screenshots of 2007, 2010, 2011 and 2013) */
const YM_WIDTH: Record<string, number> = { YM8: 262, YM9: 250, YM10: 304, YM11: 352 };

const box = (label: string): WinSpec => ({ app: 'box', arg: { text: `'${label}' is no longer on this computer.` }, title: label, w: 420, h: 170 });

/** What an icon opens; 'time' = the clock's time machine (Control Panel, a clock, a calendar). */
export function specOf(it: Pick<DeskItem, 'app' | 'target' | 'label' | 'glyph'>, os: Os, ver: Record<string, string>): WinSpec | 'time' {
  const label = it.label;
  switch (it.app) {
    case 'computer': return { app: 'explorer', arg: { view: 'computer' } };
    case 'documents': return { app: 'explorer', arg: { view: 'documents' } };
    case 'pictures': case 'explorer': return { app: 'explorer', arg: { view: 'folder' } };
    case 'folder': return it.target ? { app: 'explorer', arg: { view: 'folder', id: it.target, name: label } } : box(label);
    case 'angels': return { app: 'explorer', arg: { view: 'angels' } };
    case 'recycle': return { app: 'explorer', arg: { view: 'recycle' } };
    case 'browser': return { app: 'browser', arg: it.target ? { url: it.target } : {}, glyph: browserGlyph(ver.browser) };
    case 'facebook': return { app: 'browser', arg: { url: 'facebook.com/' }, glyph: browserGlyph(ver.browser) };
    case 'forum': return { app: 'browser', arg: { url: `forum/${it.target ?? ''}` }, glyph: browserGlyph(ver.browser) };
    case 'blog': return { app: 'browser', arg: { url: 'blog' }, glyph: browserGlyph(ver.browser) };
    case 'link': return it.target ? { app: 'browser', arg: { url: it.target }, glyph: browserGlyph(ver.browser) } : box(label);
    case 'messenger': return { app: 'messenger', arg: {} };
    case 'yahoo': return { app: 'yahoo', arg: {}, dock: 'right', w: YM_WIDTH[ver.yahoo ?? ''] ?? 340 };
    case 'messages': return { app: 'messages', arg: { platform: 'SMS' }, title: label, glyph: it.glyph ?? 'sms' };
    case 'zalo': return { app: 'messages', arg: { platform: 'ZALO' }, title: 'Zalo', glyph: 'chat-blue' };
    case 'word': return { app: 'word', arg: it.target ? { noteId: it.target } : {} };
    case 'notepad': return { app: 'notepad', arg: { file: label }, title: `${/\.txt$/i.test(label) ? label.replace(/\.txt$/i, '') : 'Untitled'} - Notepad` };
    case 'memories': return { app: 'memories', arg: {} };
    case 'photos': return { app: 'viewer', arg: { set: 'day' }, title: viewerName(os) };
    case 'game': return it.target ? gameSpec(it.target, label, it.glyph) : box(label);
    case 'emulator': return it.target ? emuSpec(it.target, undefined, label) : box(label);
    case 'gamecard': return it.target ? { app: 'gamecard', arg: { key: it.target }, title: label, glyph: it.glyph ?? 'game' } : box(label);
    case 'control': case 'settings': case 'clock': case 'calendar': return 'time';
    default: return box(label);
  }
}

/** The windows a memory opens with: where it was said (a chat at its line, a forum post, his writing, a link), its
 *  photos, and the memory itself on a note. Facebook chats open in Messenger once there was the app, else on the site. */
export function sceneSpecs(sc: Scene, ctx: { messengerApp: boolean; os: Os; ver: Record<string, string> }): WinSpec[] {
  const out: WinSpec[] = [];
  const g = browserGlyph(ctx.ver.browser);
  for (const w of sc.windows) {
    switch (w.app) {
      case 'chat':
        if (!w.archiveId) break;
        if (w.platform === 'YAHOO') out.push({ app: 'im', arg: { archiveId: w.archiveId, name: (w.title ?? '').replace(/^Yahoo\s*·\s*/i, ''), seq: w.seq ?? null } });
        else if (w.platform === 'FACEBOOK') out.push(ctx.messengerApp ? { app: 'messenger', arg: { thread: w.archiveId } }
          : { app: 'browser', arg: { url: `facebook.com/messages/${w.archiveId}` }, glyph: g });
        else out.push({ app: 'messages', arg: { platform: w.platform ?? 'SMS', archiveId: w.archiveId, seq: w.seq ?? null },
          title: w.platform === 'ZALO' ? 'Zalo' : 'Messages', glyph: w.platform === 'ZALO' ? 'chat-blue' : 'sms' });
        break;
      case 'forum':
        if (w.threadId) out.push({ app: 'browser', arg: { url: `forum/t/${w.threadId}${w.post != null ? `#${w.post}` : ''}` }, glyph: g });
        break;
      case 'word': if (w.noteId) out.push({ app: 'word', arg: { noteId: w.noteId } }); break;
      case 'link': if (w.url) out.push({ app: 'browser', arg: { url: w.url }, glyph: g }); break;
      case 'photos': if (w.mediaIds?.length) out.push({ app: 'viewer', arg: { mediaIds: w.mediaIds }, title: viewerName(ctx.os) }); break;
      case 'note': out.push({ app: 'sticky', arg: { text: [w.title, w.text].filter(Boolean).join('\n\n') }, dock: 'right', w: 300, h: 280 }); break;
    }
  }
  return out;
}
