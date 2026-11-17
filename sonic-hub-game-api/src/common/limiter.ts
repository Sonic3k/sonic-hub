/**
 * Counts what one address has done lately, in memory: so many in a window, then no more until the window is over.
 * One instance of the service, one count. A restart forgets it, which only ever errs on the generous side.
 */
export class Limiter {
  private readonly seen = new Map<string, { count: number; until: number }>();
  private swept = 0;

  /** Counts one more for `key` and says whether it is still within `limit` for the window; `retryAfter` is in seconds. */
  take(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
    if (now - this.swept > 60_000) this.sweep(now);
    let slot = this.seen.get(key);
    if (!slot || slot.until <= now) this.seen.set(key, (slot = { count: 0, until: now + windowMs }));
    slot.count++;
    return { ok: slot.count <= limit, retryAfter: Math.max(1, Math.ceil((slot.until - now) / 1000)) };
  }

  /** How many `key` has used of its window, without counting one more. */
  used(key: string, now = Date.now()): number {
    const slot = this.seen.get(key);
    return slot && slot.until > now ? slot.count : 0;
  }

  private sweep(now: number): void {
    this.swept = now;
    for (const [key, slot] of this.seen) if (slot.until <= now) this.seen.delete(key);
  }
}
