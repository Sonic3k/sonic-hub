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
  // (A picture comes as the body itself and is read by the one handler that takes pictures, which first sees that it
  // is one and how long it is: no parser here reads megabytes of anything else.)
  // any page may call: nothing here goes by a cookie or by who is asking
  app.enableCors({ origin: config.corsOrigins, methods: ['GET', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type'], exposedHeaders: ['X-Now', 'Retry-After'], maxAge: 86400 });
  // A saved game is never served from a cache: what a browser reads is what was last written. (The two files for the
  // browser say for themselves how long they may be kept.) Every answer also says what time it is here (X-Now, in
  // ms), so two devices with different clocks can still tell which of them played last.
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
  const { b2, prefix, publicBaseUrl } = config.media;
  new Logger('game-api').log(`listening on :${config.port}; callers are told apart by ${config.addressHeader ?? 'the address they connect from'}; a cast's pictures ${b2 ? `are kept in ${b2.bucket}/${prefix} and read at ${publicBaseUrl}` : 'cannot be kept: no B2_KEY_ID and B2_APP_KEY'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
