import { Inject, Injectable, Module, type DynamicModule, type OnApplicationShutdown } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type pg from 'pg';
import { AddressGuard } from './common/guards.js';
import { Limiter } from './common/limiter.js';
import { APP_CONFIG, LIMITER } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { CastService } from './cast.service.js';
import { AdminController, CastClientController, CastController, ClientController, HealthController, SavesController } from './controllers.js';
import { createDb, DB, PG_POOL } from './db/db.js';
import { SavesService } from './saves.service.js';

@Injectable()
export class PoolLifecycle implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Module({})
export class AppModule {
  static forRoot(config: AppConfig, pool: pg.Pool): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController, ClientController, CastClientController, SavesController, CastController, AdminController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: PG_POOL, useValue: pool },
        { provide: DB, useValue: createDb(pool) },
        { provide: LIMITER, useValue: new Limiter() },
        { provide: APP_GUARD, useClass: AddressGuard },
        PoolLifecycle,
        SavesService,
        CastService,
      ],
    };
  }
}
