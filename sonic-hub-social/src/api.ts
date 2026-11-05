/* The Social Media portal's reads (angels-islands-api, /api/social). Every read takes the moment it looks from
   (at, Vietnam wall-clock "2012-07-16T21:30"); left out, the API reads at the newest moment there is data for.
   Times come back as UTC without a zone, like the rest of the API. */

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');

type Params = Record<string, string | number | boolean | undefined | null>;

function qs(params?: Params): string {
  if (!params) return '';
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.append(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : '';
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function get<T>(path: string, params?: Params): Promise<T> {
  const r = await fetch(`${API}/api/social${path}${qs(params)}`, { headers: { Accept: 'application/json' } });
  const text = await r.text();
  if (!r.ok) {
    let msg = `${r.status}`;
    try { msg = (JSON.parse(text) as { error?: string }).error || msg; } catch { /* not JSON */ }
    throw new ApiError(r.status, msg);
  }
  return JSON.parse(text) as T;
}

/* ── Shapes ─────────────────────────────────────────────────────────────── */

export type State = 'active' | 'locked' | 'gone' | 'unborn';
export interface Ref {
  id: string | null; key: string | null; handle: string | null; platform: string; kind: 'USER' | 'PAGE' | 'GROUP' | 'CHAT';
  state: State; name: string; avatarUrl: string | null; gender: 'MALE' | 'FEMALE' | null; verified: boolean;
}
export interface Media { id: string; key: string | null; itemId: string | null; type: string | null; url: string; posterUrl: string | null; width: number | null; height: number | null; caption: string | null }
export interface Reactions { total: number; types: string[]; who: Ref[]; mine: string | null }
export interface Comment {
  id: string; key: string; author: Ref; text: string | null; media: Media | null; postedAt: string; precision: string | null;
  editedAt: string | null; reactions: Reactions; likeCount: number; replies: Comment[]; itemId: string | null; source: string;
}
export interface Post {
  id: string; key: string; kind: string; author: Ref; wall: Ref | null; album: { id: string; key: string; title: string } | null;
  title: string | null; text: string | null; excerpt: string | null; hasBody: boolean; body: string | null; coverUrl: string | null;
  postedAt: string; precision: string | null; editedAt: string | null; audience: string | null; activity: string | null; activityIcon: string | null;
  place: { name: string; ref: Ref | null } | null; eventDate: string | null; eventPrecision: string | null;
  link: { url: string; domain: string | null; title: string | null; description: string | null; imageUrl: string | null } | null;
  shared: Post | null; tagged: Ref[]; media: Media[]; reactions: Reactions; commentCount: number; shareCount: number;
  hiddenComments: number; comments: Comment[]; pinned: boolean; source: string;
}
export interface PostPage { items: Post[]; next: string | null }
export interface Detail { id: string; kind: string; title: string | null; subtitle: string | null; body: string | null; related: Ref | null; start: string | null; end: string | null; precision: string | null; current: boolean }
export interface Profile {
  ref: Ref; coverUrl: string | null; coverFocusX: number | null; coverFocusY: number | null; avatarFullUrl: string | null;
  privacy: string | null; category: string | null; joinedAt: string | null; level: string; intro: Detail[];
  counts: { friends: number; mutual: number; photos: number; members: number; likes: number; notes: number };
  withMe: { friends: boolean; since: string | null; self: boolean }; photos: Media[]; friends: Ref[]; at: string;
}
export interface FriendRow { ref: Ref; since: string | null; mutual: boolean }
export interface AlbumRow { id: string; key: string | null; title: string; description: string | null; coverUrl: string | null; count: number; updatedAt: string | null; type: string }
export interface Photos { albums: AlbumRow[]; uploads: Media[]; tagged: Media[] }
export interface AlbumPage { album: AlbumRow; owner: Ref; media: Media[] }
export interface FriendshipPage { a: Ref; b: Ref; since: string | null; mutual: Ref[]; posts: Post[]; next: string | null }
export interface Home { me: Ref | null; groups: Ref[]; pages: Ref[]; birthdays: Ref[]; at: string }
export interface Range { from: string | null; to: string | null; latest: string | null; posts: number; threads: number }

export interface Thread { archiveId: string; title: string; group: boolean; faces: Ref[]; counterpart: Ref | null; last: { sender: string | null; fromMe: boolean; text: string; kind: string; at: string }; messageCount: number }
export interface Member { ref: Ref; sender: string; nickname: string | null; admin: boolean; me: boolean; messages: number }
export interface ThreadDetail { archiveId: string; title: string; group: boolean; counterpart: Ref | null; members: Member[]; firstAt: string | null; lastAt: string | null; messageCount: number; at: string }
export interface Attachment { id: string; messageId: string; type: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'FILE' | 'GIF' | 'STICKER' | 'LINK'; fileName: string | null; url: string | null; hasFile: boolean; contentType: string | null }
export interface Message {
  id: string; seq: number; kind: string; text: string | null; at: string | null; precision: string | null; fromMe: boolean; system: boolean;
  sender: string; from: Ref | null; nickname: string | null; attachments: Attachment[]; reactions: { emoji: string; name: string }[];
}
export interface MessagePage { items: Message[]; hasMore: boolean; oldestSeq: number | null }

/* ── Calls ──────────────────────────────────────────────────────────────── */

export const social = {
  range: () => get<Range>('/range'),
  randomMoment: () => get<{ at: string | null; from: string | null }>('/random-moment'),
  home: (at?: string) => get<Home>('/fb/home', { at }),
  feed: (at: string | undefined, before?: string | null) => get<PostPage>('/fb/feed', { at, before, size: 10 }),
  search: (q: string, at?: string) => get<Ref[]>('/fb/search', { q, at, limit: 8 }),
  profile: (ref: string, at?: string) => get<Profile>(`/fb/profiles/${encodeURIComponent(ref)}`, { at }),
  timeline: (ref: string, at: string | undefined, before?: string | null) => get<PostPage>(`/fb/profiles/${encodeURIComponent(ref)}/timeline`, { at, before, size: 10 }),
  friends: (ref: string, at?: string) => get<FriendRow[]>(`/fb/profiles/${encodeURIComponent(ref)}/friends`, { at }),
  photos: (ref: string, at?: string) => get<Photos>(`/fb/profiles/${encodeURIComponent(ref)}/photos`, { at }),
  album: (ref: string, albumId: string, at?: string) => get<AlbumPage>(`/fb/profiles/${encodeURIComponent(ref)}/albums/${encodeURIComponent(albumId)}`, { at }),
  notes: (ref: string, at: string | undefined, before?: string | null) => get<PostPage>(`/fb/profiles/${encodeURIComponent(ref)}/notes`, { at, before, size: 10 }),
  post: (id: string, at?: string) => get<Post>(`/fb/posts/${encodeURIComponent(id)}`, { at }),
  friendship: (a: string, b: string, at: string | undefined, before?: string | null) => get<FriendshipPage>('/fb/friendship', { a, b, at, before, size: 10 }),
  threads: (at?: string) => get<Thread[]>('/messenger/threads', { at }),
  thread: (id: string, at?: string) => get<ThreadDetail>(`/messenger/threads/${id}`, { at }),
  messages: (id: string, at: string | undefined, before?: number | null) => get<MessagePage>(`/messenger/threads/${id}/messages`, { at, before, size: 80 }),
};

/** The stored file of a chat attachment. */
export const attachmentUrl = (id: string) => `${API}/api/chat-attachments/${id}/content`;

/* Bunny resizes on the fly via ?width=; snapping to a few widths keeps the CDN cache small. */
const WIDTHS = [160, 320, 640, 960, 1280, 1920];
export function cdn(url: string | null | undefined, width?: number): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  if (!width) return clean;
  const w = WIDTHS.find(b => width * (window.devicePixelRatio > 1 ? 1.5 : 1) <= b) ?? 1920;
  return `${clean}?width=${w}`;
}
