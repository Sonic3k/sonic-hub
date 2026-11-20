/* Which games are picked out to stand in front of their kind. The catalogue file does not say: the game service
   (sonic-hub-game-api) keeps them, so picking a game out is a click on /admin and not a change to the repository.

   The shelf asks once as it opens. What it heard last is kept in this browser, so the next visit starts from it at
   once, and a service that does not answer changes nothing a visitor can see: every kind of game then stands as it
   was last heard, or with its newest games up front. */

import type { Picked } from './catalog';

/** where the game service is; a build can be pointed at another one (a service run locally) with VITE_GAME_API */
export const GAME_API: string = ((import.meta.env.VITE_GAME_API as string | undefined) || 'https://sonic-hub-game-api-production.up.railway.app').replace(/\/+$/, '');

const KEPT = 'sonic-hub-games.highlights';

/** what the service could not do, in words fit to show; `full` when no more games can be picked out */
export class HighlightError extends Error {
  constructor(message: string, readonly full = false) { super(message); }
}

function read(list: unknown): Picked {
  const out = new Map<string, string>();
  if (Array.isArray(list)) for (const h of list) if (h && typeof h.game === 'string' && typeof h.since === 'string') out.set(h.game, h.since);
  return out;
}

/** what was last heard, or null in a browser that has never heard */
export function keptHighlights(): Picked | null {
  try { const kept = localStorage.getItem(KEPT); return kept === null ? null : read(JSON.parse(kept)); } catch { return null; }
}
export function keepHighlights(picked: Picked): void {
  try { localStorage.setItem(KEPT, JSON.stringify([...picked].map(([game, since]) => ({ game, since })))); } catch { /* a browser that keeps nothing */ }
}
export const samePicks = (a: Picked, b: Picked) => a.size === b.size && [...a].every(([game, since]) => b.get(game) === since);

async function call(method: string, path: string, wait: number): Promise<Response> {
  const stop = new AbortController(), timer = setTimeout(() => stop.abort(), wait);
  try { return await fetch(`${GAME_API}/api${path}`, { method, signal: stop.signal, cache: 'no-store' }); }
  catch { throw new HighlightError('The game service did not answer.'); }
  finally { clearTimeout(timer); }
}

/** every game picked out, in one request whatever their number */
export async function fetchHighlights(): Promise<Picked> {
  const res = await call('GET', '/highlights', 8000);
  if (!res.ok) throw new HighlightError(`The game service answered ${res.status}.`);
  return read(((await res.json()) as { highlights?: unknown }).highlights);
}

/** Picks a game out, or drops it. Answers the moment it was picked out, or null once it is dropped. */
export async function setHighlight(game: string, on: boolean): Promise<string | null> {
  const res = await call(on ? 'PUT' : 'DELETE', `/games/${encodeURIComponent(game)}/highlight`, 10000);
  if (res.status === 409) {
    const said = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new HighlightError(said?.message ?? 'No more games can be picked out.', true);
  }
  if (!res.ok) throw new HighlightError(`The game service answered ${res.status}.`);
  return on ? ((await res.json()) as { since: string }).since : null;
}
