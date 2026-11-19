import { Body, Controller, Delete, Get, Header, HttpCode, HttpException, Inject, Param, Put, Req } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameKey, MemberKey, PlayerId, PutMemberBody, PutPlayerBody, type PutMemberInput, type PutPlayerInput } from './api-schemas.js';
import { CastService } from './cast.service.js';
import { APP_CONFIG } from './common/tokens.js';
import { ZodPipe } from './common/zod-pipe.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { SavesService } from './saves.service.js';

const here = dirname(fileURLToPath(import.meta.url));
/** A file of client/ — from dist or dist-test/src. */
const client = (name: string) => readFileSync(resolve(here, here.includes('dist-test') ? '../../client' : '../client', name), 'utf8');
const CLIENT = client('sonic-save.js'), CAST_CLIENT = client('sonic-cast.js');

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async health() {
    await this.db.execute(sql`select 1`);
    return { ok: true };
  }
}

/** The browser side of this service, for a game to copy or to load: the file every game talks to it through. */
@Controller('client.js')
export class ClientController {
  @Get()
  @Header('Content-Type', 'text/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  client(): string {
    return CLIENT;
  }
}

/** The browser side of a game's cast (client/sonic-cast.js): names and pictures, and the address of a picture at the width that fits. */
@Controller('cast.js')
export class CastClientController {
  @Get()
  @Header('Content-Type', 'text/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=300')
  client(): string {
    return CAST_CLIENT;
  }
}

/*
 *   GET    /api/games/{game}/players          the players of a game, with their saves
 *   PUT    /api/games/{game}/players/{id}     one write of a player: { base, name?, data?, at? }
 *   DELETE /api/games/{game}/players/{id}     removes a player
 * Nobody signs in: a game's players are the game's own, the same list for whoever opens it.
 */
@Controller()
export class SavesController {
  constructor(@Inject(SavesService) private readonly saves: SavesService) {}

  @Get('games/:game/players')
  players(@Param('game', new ZodPipe(GameKey)) game: string) {
    return this.saves.players(game);
  }

  @Put('games/:game/players/:id')
  put(@Param('game', new ZodPipe(GameKey)) game: string, @Param('id', new ZodPipe(PlayerId)) id: string, @Body(new ZodPipe(PutPlayerBody)) body: PutPlayerInput) {
    return this.saves.put(game, id, body);
  }

  @Delete('games/:game/players/:id')
  @HttpCode(204)
  remove(@Param('game', new ZodPipe(GameKey)) game: string, @Param('id', new ZodPipe(PlayerId)) id: string) {
    return this.saves.remove(game, id);
  }
}

/**
 * The picture a request carries as its body, whole. What does not call itself a picture is not read at all, and one
 * longer than `most` bytes is turned away as soon as that is known, without being kept.
 */
function pictureSent(req: Request, most: number): Promise<Buffer> {
  const notOne = () => new HttpException({ error: 'not_a_picture', message: 'Send the picture itself as the body, with its kind as the Content-Type: image/jpeg, image/png or image/webp.' }, 415);
  const tooBig = () => new HttpException({ error: 'too_big', message: `A picture is at most ${most} bytes.` }, 413);
  if (!/^image\/(jpeg|png|webp)\s*(;|$)/i.test(String(req.headers['content-type'] ?? ''))) return Promise.reject(notOne());
  if (Number(req.headers['content-length']) > most) return Promise.reject(tooBig());
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = [];
    let size = 0, settled = false;
    const settle = (how: () => void) => { if (!settled) { settled = true; how(); } };
    req.on('data', (part: Buffer) => {
      if (settled) return;   // already turned away: the rest runs off unkept
      size += part.length;
      if (size > most) settle(() => { parts.length = 0; reject(tooBig()); });
      else parts.push(part);
    });
    req.on('end', () => settle(() => (size ? resolve(Buffer.concat(parts)) : reject(notOne()))));
    const broken = () => settle(() => reject(new HttpException({ error: 'invalid', message: 'The picture did not arrive whole.' }, 400)));
    req.on('error', broken);
    req.on('close', broken);
  });
}

/*
 *   GET    /api/games/{game}/cast                    who in the game's cast has a name or a picture from here
 *   PUT    /api/games/{game}/cast/{member}           { name }: the name she is to go by; null for the game's own
 *   PUT    /api/games/{game}/cast/{member}/photo     the picture itself as the body: a JPEG, PNG or WebP file
 *   DELETE /api/games/{game}/cast/{member}/photo     takes her picture away
 * Nobody signs in, as with a game's players. A picture is not read from here: the cast gives its address at the CDN.
 */
@Controller()
export class CastController {
  constructor(
    @Inject(CastService) private readonly castOf: CastService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get('games/:game/cast')
  cast(@Param('game', new ZodPipe(GameKey)) game: string) {
    return this.castOf.cast(game);
  }

  @Put('games/:game/cast/:member')
  rename(@Param('game', new ZodPipe(GameKey)) game: string, @Param('member', new ZodPipe(MemberKey)) member: string, @Body(new ZodPipe(PutMemberBody)) body: PutMemberInput) {
    return this.castOf.rename(game, member, body.name);
  }

  /** The body is the file itself. It is read here, no further than a picture may be long, and only where there is somewhere to keep it. */
  @Put('games/:game/cast/:member/photo')
  async putPhoto(@Param('game', new ZodPipe(GameKey)) game: string, @Param('member', new ZodPipe(MemberKey)) member: string, @Req() req: Request) {
    this.castOf.needsStorage();
    return this.castOf.putPhoto(game, member, await pictureSent(req, this.config.limits.photoBytes));
  }

  @Delete('games/:game/cast/:member/photo')
  removePhoto(@Param('game', new ZodPipe(GameKey)) game: string, @Param('member', new ZodPipe(MemberKey)) member: string) {
    return this.castOf.removePhoto(game, member);
  }
}
