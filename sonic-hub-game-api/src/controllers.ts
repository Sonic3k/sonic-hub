import { Body, Controller, Delete, Get, Header, HttpCode, Inject, Param, Put } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameKey, PlayerId, PutPlayerBody, type PutPlayerInput } from './api-schemas.js';
import { ZodPipe } from './common/zod-pipe.js';
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
