import { type CanActivate, createParamDecorator, type ExecutionContext, HttpException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { SavesService } from '../saves.service.js';
import type { Limiter } from './limiter.js';
import { APP_CONFIG, LIMITER } from './tokens.js';

const HOUR = 3600_000;

/** The caller's address as the proxy in front reports it (main.ts trusts exactly one proxy). */
export const addressOf = (req: Request): string => req.ip ?? 'unknown';

/** Told to wait: 429 with the seconds to wait in the body and in Retry-After. */
export function slowDown(res: Response, retryAfter: number): HttpException {
  res.setHeader('Retry-After', String(retryAfter));
  return new HttpException({ error: 'slow_down', message: `Too much from this address. Try again in ${retryAfter} seconds.`, retryAfter }, 429);
}

type WithHolder = Request & { holderId?: string };

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
    const turn = this.limiter.take(`all ${addressOf(req)}`, this.config.limits.requestsPerMinute, 60_000);
    if (!turn.ok) throw slowDown(http.getResponse<Response>(), turn.retryAfter);
    return true;
  }
}

/**
 * Requests about players: `Authorization: Bearer <code>` names the holder. A code that is not known is refused, and
 * an address that keeps sending such codes is told to wait, so codes cannot be tried one after another.
 */
@Injectable()
export class HolderGuard implements CanActivate {
  constructor(
    @Inject(SavesService) private readonly saves: SavesService,
    @Inject(LIMITER) private readonly limiter: Limiter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<WithHolder>();
    const wrong = `wrong ${addressOf(req)}`;
    if (this.limiter.used(wrong) >= this.config.limits.wrongCodesPerHour) throw slowDown(http.getResponse<Response>(), this.limiter.take(wrong, 0, HOUR).retryAfter);
    const given = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
    const holderId = given ? await this.saves.holderOf(given[1]!) : null;
    if (!holderId) {
      this.limiter.take(wrong, this.config.limits.wrongCodesPerHour, HOUR);
      throw new UnauthorizedException({ error: 'unknown_code', message: given ? 'That code is not known here.' : 'A code is needed: Authorization: Bearer <code>.' });
    }
    req.holderId = holderId;
    return true;
  }
}

/** The holder the request's code belongs to (set by HolderGuard). */
export const HolderId = createParamDecorator((_: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest<WithHolder>().holderId!);
