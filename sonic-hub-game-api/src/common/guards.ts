import { type CanActivate, type ExecutionContext, HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import type { AppConfig } from '../config.js';
import type { Limiter } from './limiter.js';
import { APP_CONFIG, LIMITER } from './tokens.js';

/**
 * What a caller is counted by. An IPv4 address stands for itself. An IPv6 caller has a whole network of addresses to
 * itself (a home, a phone), so it is counted by that network, its /64: 2001:db8:1:2::/64.
 */
export function countedAs(ip: string): string {
  const plain = ip.split('%')[0]!.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(plain);
  if (mapped) return mapped[1]!;
  if (isIP(plain) !== 6) return plain;
  const [head = '', tail] = plain.split('::');
  const groups = (part: string) => (part ? part.split(':') : []);
  const width = (part: string[]) => part.reduce((n, g) => n + (g.includes('.') ? 2 : 1), 0);   // an IPv4 ending fills two groups
  const front = groups(head), back = tail === undefined ? [] : groups(tail);
  const all = [...front, ...Array<string>(tail === undefined ? 0 : Math.max(0, 8 - width(front) - width(back))).fill('0'), ...back];
  return `${all.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(':')}::/64`;
}

/**
 * Who is calling, for the limits to count by. Where the proxy in front names the caller in a header of its own
 * making (`header`: on Railway, x-real-ip), that is who; a header that holds no address is not believed. Otherwise it
 * is the address the connection came from, or the one proxy main.ts trusts in front of it.
 */
export function addressOf(req: Request, header: string | null): string {
  const said = header ? req.headers[header] : undefined;
  const named = (Array.isArray(said) ? said[0] : said)?.split(',')[0]?.trim();
  return countedAs(named && isIP(named) ? named : (req.ip ?? 'unknown'));
}

/** Told to wait: 429 with the seconds to wait in the body and in Retry-After, and the address that was counted. */
export function slowDown(res: Response, retryAfter: number, address: string): HttpException {
  res.setHeader('Retry-After', String(retryAfter));
  return new HttpException({ error: 'slow_down', message: `Too much from this address (${address}). Try again in ${retryAfter} seconds.`, retryAfter, address }, 429);
}

/** Every request: so many a minute from one address. */
@Injectable()
export class AddressGuard implements CanActivate {
  constructor(
    @Inject(LIMITER) private readonly limiter: Limiter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const address = addressOf(req, this.config.addressHeader);
    const turn = this.limiter.take(`all ${address}`, this.config.limits.requestsPerMinute, 60_000);
    if (!turn.ok) throw slowDown(http.getResponse<Response>(), turn.retryAfter, address);
    return true;
  }
}

/** Wrong keys one address may send before it is told to wait, and for how long they are held against it. */
const GUESSES = 10, GUESS_WINDOW_MS = 600_000;
/** Whether two texts are the same, in a time that does not tell how much of one was right. */
const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

/**
 * What changes a game's cast: the request has to carry the key (X-Admin-Key: what ADMIN_KEY is set to). Where the
 * service has no key, nobody gets in. An address that has sent ten wrong keys is told to wait ten minutes, and waits
 * even with the right one, so that the waiting does not say which guess was right.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(LIMITER) private readonly limiter: Limiter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const key = this.config.adminKey;
    if (!key) throw new HttpException({ error: 'no_admin', message: 'Nothing can be changed here: the service has no ADMIN_KEY set.' }, 503);
    const address = addressOf(req, this.config.addressHeader), guesses = `key ${address}`;
    if (this.limiter.used(guesses) >= GUESSES) throw slowDown(http.getResponse<Response>(), this.limiter.take(guesses, GUESSES, GUESS_WINDOW_MS).retryAfter, address);
    const said = req.headers['x-admin-key'];
    if (typeof said === 'string' && same(said, key)) return true;
    if (typeof said === 'string' && said) this.limiter.take(guesses, GUESSES, GUESS_WINDOW_MS);   // a request with no key at all is not a guess
    throw new UnauthorizedException({ error: 'not_admin', message: 'That is not the key.' });
  }
}
