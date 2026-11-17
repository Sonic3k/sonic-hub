import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameKey, PlayerId, PutPlayerBody, type PutPlayerInput } from './api-schemas.js';
import { addressOf, HolderGuard, HolderId, slowDown } from './common/guards.js';
import type { Limiter } from './common/limiter.js';
import { APP_CONFIG, LIMITER } from './common/tokens.js';
import { ZodPipe } from './common/zod-pipe.js';
import type { AppConfig } from './config.js';
import { DB, type Db } from './db/db.js';
import { SavesService } from './saves.service.js';

const here = dirname(fileURLToPath(import.meta.url));
/** client/sonic-save.js — from dist or dist-test/src. */
const CLIENT = readFileSync(resolve(here, here.includes('dist-test') ? '../../client/sonic-save.js' : '../client/sonic-save.js'), 'utf8');

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

/*
 *   POST   /api/codes                         a new code (nothing is asked; it is given this once)
 *   GET    /api/games/{game}/players          the players this code keeps in a game, with their saves
 *   PUT    /api/games/{game}/players/{id}     one write of a player: { base, name?, data? }
 *   DELETE /api/games/{game}/players/{id}     removes a player
 * All but the first need `Authorization: Bearer <code>`.
 */
@Controller()
export class SavesController {
  constructor(
    @Inject(SavesService) private readonly saves: SavesService,
    @Inject(LIMITER) private readonly limiter: Limiter,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Post('codes')
  @HttpCode(201)
  newCode(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const address = addressOf(req, this.config.addressHeader);
    const turn = this.limiter.take(`new ${address}`, this.config.limits.newCodesPerHour, 3600_000);
    if (!turn.ok) throw slowDown(res, turn.retryAfter, address);
    return this.saves.newHolder();
  }

  @Get('games/:game/players')
  @UseGuards(HolderGuard)
  players(@HolderId() holderId: string, @Param('game', new ZodPipe(GameKey)) game: string) {
    return this.saves.players(holderId, game);
  }

  @Put('games/:game/players/:id')
  @UseGuards(HolderGuard)
  put(
    @HolderId() holderId: string,
    @Param('game', new ZodPipe(GameKey)) game: string,
    @Param('id', new ZodPipe(PlayerId)) id: string,
    @Body(new ZodPipe(PutPlayerBody)) body: PutPlayerInput,
  ) {
    return this.saves.put(holderId, game, id, body);
  }

  @Delete('games/:game/players/:id')
  @UseGuards(HolderGuard)
  @HttpCode(204)
  remove(@HolderId() holderId: string, @Param('game', new ZodPipe(GameKey)) game: string, @Param('id', new ZodPipe(PlayerId)) id: string) {
    return this.saves.remove(holderId, game, id);
  }
}
