/* The code a visitor's players are kept under by the saves service (sonic-hub-game-api). The shelf keeps no players
   itself. It carries the code from one game's site to the next, so a game opened from here finds the visitor's
   players without the code being typed again:
     arriving   a game links back here with …#code=K7QM-2XPD-9RBT: it is kept if this browser has none, and wiped
                off the address either way
     leaving    the Play link of a game that keeps its players with the service (`saves` in catalog.json) takes it
                along. No other link does: a code opens everything kept under it.
   The key is the one the service's own browser client uses, so a game living on this site would hold the same code. */
const KEY = 'sonic-hub.code';
const SIGNS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** a code however it was typed, as it is shown (XXXX-XXXX-XXXX); null if it cannot be one */
export function tidyCode(typed: string): string | null {
  const bare = typed.toUpperCase().replace(/[\s-]+/g, '');
  if (bare.length !== 12 || [...bare].some(c => !SIGNS.includes(c))) return null;
  return `${bare.slice(0, 4)}-${bare.slice(4, 8)}-${bare.slice(8)}`;
}

/** The part of an address after #, taken apart: whether a code was handed over in it, the code if it can be one,
 *  and what is left of that part without it. */
export function splitHash(hash: string): { had: boolean; code: string | null; rest: string } {
  let had = false, code: string | null = null;
  const rest = hash.replace(/^#/, '').split('&').filter(part => {
    if (!part.startsWith('code=')) return part !== '';
    had = true;
    try { code = tidyCode(decodeURIComponent(part.slice(5))); } catch { code = null; }
    return false;
  });
  return { had, code, rest: rest.length ? '#' + rest.join('&') : '' };
}

export function heldCode(): string | null {
  try { return tidyCode(localStorage.getItem(KEY) ?? ''); } catch { return null; }
}

/** When the page starts, and whenever the part of the address after # changes. */
export function takeCodeFromAddress(): void {
  const { had, code, rest } = splitHash(location.hash);
  if (!had) return;
  try { history.replaceState(history.state, '', location.pathname + location.search + rest); } catch { /* the address stays as it is */ }
  if (code && !heldCode()) try { localStorage.setItem(KEY, code); } catch { /* a browser that keeps nothing */ }
}

/** `url` with the code attached, when there is one to take along and the address is a whole one on the web */
export function withCode(url: string, code: string | null = heldCode()): string {
  if (!code || !/^https:\/\//i.test(url)) return url;
  return url + (url.includes('#') ? '&' : '#') + 'code=' + encodeURIComponent(code);
}
