import { Inject, Injectable, Logger, Module, type DynamicModule, type OnApplicationShutdown } from '@nestjs/common';
import { Cron, ScheduleModule } from '@nestjs/schedule';
import type pg from 'pg';
import { CatalogService } from './catalog/catalog.service.js';
import { StatsService } from './catalog/stats.service.js';
import { APP_CONFIG, MediaUrls } from './common/tokens.js';
import type { AppConfig } from './config.js';
import { CatalogController, HealthController, StudyController } from './controllers.js';
import { createDb, DB, PG_POOL } from './db/db.js';
import { AnswerService } from './study/answer.service.js';
import { StudyService } from './study/study.service.js';

const rolloverHour = Number(process.env.DAY_ROLLOVER_HOUR ?? 4);
const timeZone = process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

/** Builds the global Daily an hour after the learning day starts, so it is ready before the first look. */
@Injectable()
export class DailyCron {
  private readonly logger = new Logger('DailyCron');

  constructor(@Inject(StudyService) private readonly study: StudyService) {}

  @Cron(`0 ${(rolloverHour + 1) % 24} * * *`, { name: 'daily', timeZone })
  async build(): Promise<void> {
    try {
      const id = await this.study.prepareDaily();
      if (id) this.logger.log(`daily session ${id} ready`);
    } catch (e) {
      this.logger.error(e);
    }
  }
}

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
      imports: config.cronEnabled ? [ScheduleModule.forRoot()] : [],
      controllers: [HealthController, CatalogController, StudyController],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: PG_POOL, useValue: pool },
        { provide: DB, useValue: createDb(pool) },
        PoolLifecycle,
        MediaUrls,
        StudyService,
        AnswerService,
        CatalogService,
        StatsService,
        ...(config.cronEnabled ? [DailyCron] : []),
      ],
    };
  }
}
