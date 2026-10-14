import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { pathToFileURL } from 'node:url';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { loadAppConfig, type AppConfig } from './config.js';
import { createDb, createPool, runMigrations } from './db/db.js';

export async function createApp(config: AppConfig): Promise<NestExpressApplication> {
  const pool = createPool(config.databaseUrl, config.databaseSsl);
  await runMigrations(createDb(pool));
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config, pool), {
    logger: process.env.NODE_ENV === 'test' ? ['error'] : ['log', 'warn', 'error'],
  });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigins });
  if (config.media.serveLocalDir) app.useStaticAssets(config.media.serveLocalDir, { prefix: '/media/' });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const config = loadAppConfig();
  const app = await createApp(config);
  await app.listen(config.port, '0.0.0.0');
  new Logger('learn-api').log(`listening on :${config.port}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
