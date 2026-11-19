import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { pathToFileURL } from 'node:url';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { loadAppConfig, type AppConfig } from './config.js';
import { createDb, openPool, runMigrations } from './db/db.js';

export async function createApp(config: AppConfig): Promise<NestExpressApplication> {
  const pool = await openPool(config.database);
  await runMigrations(createDb(pool));
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config, pool), {
    logger: process.env.NODE_ENV === 'test' ? ['error'] : ['log', 'warn', 'error'],
  });
  // one proxy stands in front (Railway's edge), and the address it reports is the caller's: what the limits count by
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.useBodyParser('json', { limit: config.limits.saveBytes * 2 + 4096 });
  // (A picture comes as the body itself and is read by the one handler that takes pictures, after the key has been
  // looked at: no parser here reads megabytes on behalf of a caller who has not shown it.)
  // any page may call: nothing here goes by a cookie, and what changes a cast goes by a key the page sends itself
  app.enableCors({ origin: config.corsOrigins, methods: ['GET', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'X-Admin-Key'], exposedHeaders: ['X-Now', 'Retry-After'], maxAge: 86400 });
  // A saved game is never served from a cache: what a browser reads is what was last written. (The two files for the
  // browser and a cast's pictures say for themselves how long they may be kept.) Every answer also says what time it is
  // here (X-Now, in ms), so two devices with different clocks can still tell which of them played last.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!/\/(client|cast)\.js$/.test(req.path)) res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Now', String(Date.now()));
    next();
  });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const app = await createApp(config);
  await app.listen(config.port, '0.0.0.0');
  new Logger('game-api').log(`listening on :${config.port}; callers are told apart by ${config.addressHeader ?? 'the address they connect from'}; casts ${config.adminKey ? 'can be changed with the key' : 'cannot be changed: no ADMIN_KEY'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
