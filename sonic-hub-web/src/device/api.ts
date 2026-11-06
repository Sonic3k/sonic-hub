/* What the computer and the phone read: the machine of a moment (/api/desk), the chat apps (/api/social/messenger)
   and the library (/api/*), all at T. Times come back as UTC without a zone; "at" goes out as Vietnam wall-clock. */
import { get } from '../api/client';
import type { MediaFile, Note, Paged, Person } from '../types';
import type { MessagePage, Ref, Thread } from './fb/api';
export type { Message, MessagePage, Ref, Thread } from './fb/api';

export interface DeskDevice { key: string; kind: 'DESKTOP' | 'LAPTOP' | 'PHONE'; name: string; model?: string | null; photoUrl?: string | null;
  screenWidth?: number | null; screenHeight?: number | null; from?: string | null; to?: string | null }
export type Os = 'WIN98' | 'WINXP' | 'VISTA' | 'WIN7' | 'WIN81' | 'WIN10' | 'WIN11' | 'NOKIA_S40' | 'NOKIA_S60' | 'IOS6' | 'IOS7' | 'IOS';
export interface DeskSystem { key: string; os: Os; accent?: string | null; language?: string | null; from?: string | null; to?: string | null }
export interface Wallpaper { url?: string | null; builtin?: string | null; fit: string; color?: string | null }
export interface DeskItem { key: string; place: string; label: string; glyph?: string | null; app?: string | null; target?: string | null; sort: number }
export interface Machine { device: DeskDevice; system: DeskSystem | null; wallpaper: Wallpaper | null; lock: Wallpaper | null; items: DeskItem[];
  apps: Record<string, string>; next: DeskDevice | null }
export interface DayPhoto { id: string; url: string; width?: number | null; height?: number | null; at?: string | null; caption?: string | null }
export interface DayMemory { id: string; title?: string | null; summary?: string | null; kind?: string | null; at?: string | null; precision?: string | null;
  personId?: string | null; personName?: string | null; place?: string | null }
export interface Toast { platform: string; archiveId: string; sender: string; text?: string | null; kind?: string | null; at?: string | null; seq?: number | null }
export interface MomentData { at: string; computer: Machine | null; phone: Machine | null;
  day: { photos: DayPhoto[]; memories: DayMemory[]; toasts: Toast[] }; machines: DeskDevice[] }
export interface SceneWindow { app: 'chat' | 'forum' | 'word' | 'link' | 'photos' | 'note'; title?: string | null; platform?: string | null; archiveId?: string | null;
  seq?: number | null; threadId?: string | null; post?: number | null; noteId?: string | null; url?: string | null; mediaIds?: string[] | null; text?: string | null }
export interface Scene { episode: string; at: string; title?: string | null; summary?: string | null; windows: SceneWindow[] }
export interface Folder { id: string; name: string; count: number; folders: number; coverUrl?: string | null; firstAt?: string | null }
export interface FolderPage { id: string; name: string; path: { id: string; name: string }[]; folders: Folder[]; count: number }
export interface MemoryPage { items: DayMemory[]; page: number; totalPages: number; total: number }

/* chats: the social API's shapes (Facebook's Messenger reads), served for every app */
export interface Buddy { ref: Ref; name: string; archiveId?: string | null; status?: string | null; online: boolean; lastAt?: string | null; messages: number }
export interface BuddyList { me?: Ref | null; status?: string | null; groups: { name: string; online: number; buddies: Buddy[] }[]; at: string }

export const desk = {
  at: (at: string) => get<MomentData>('/desk/at', { at }),
  scene: (episode: string) => get<Scene>('/desk/scene', { episode }),
  folders: (at: string, parent?: string) => get<FolderPage>('/desk/folders', { at, parent }),
  memories: (at: string, q?: string, page = 0, size = 40) => get<MemoryPage>('/desk/memories', { at, q, page, size }),
  buddies: (platform: string, at: string) => get<BuddyList>('/social/messenger/buddies', { platform, at }),
  threads: (platform: string, at: string) => get<Thread[]>('/social/messenger/threads', { platform, at }),
  messages: (archiveId: string, at: string, before?: number | null, size = 60) =>
    get<MessagePage>(`/social/messenger/threads/${archiveId}/messages`, { at, before: before ?? undefined, size }),
  /** files of a folder up to a day (to = the day after, exclusive) */
  files: (collectionId: string, toDay: string, page = 0) =>
    get<Paged<MediaFile>>('/media-files/search', { collectionId, to: toDay, size: 200, page, sortBy: 'effectiveDate', sortDir: 'asc' }),
  photosOf: (personId: string, toDay: string, page = 0) =>
    get<Paged<MediaFile>>('/media-files/search', { personId, to: toDay, size: 120, page, sortBy: 'effectiveDate', sortDir: 'desc' }),
  cameraRoll: (toDay: string, page = 0) =>
    get<Paged<MediaFile>>('/media-files/search', { to: toDay, size: 90, page, sortBy: 'effectiveDate', sortDir: 'desc', type: 'IMAGE' }),
  media: (id: string) => get<MediaFile>(`/media-files/${id}`),
  persons: () => get<Person[]>('/persons'),
  notes: (page = 0) => get<Paged<Note>>('/journal/notes', { status: 'PUBLISHED', size: 100, page }),
  note: (id: string) => get<Note>(`/journal/notes/${id}`),
};
