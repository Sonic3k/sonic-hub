import { Inject, Injectable } from '@nestjs/common';
import type { AppConfig } from '../config.js';
import type { DayClock } from './time.js';
import { ASSET_SCHEME } from './assets.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Turns stored media keys and asset:// references into public URLs. */
@Injectable()
export class MediaUrls {
  private readonly base: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.base = config.media.publicBaseUrl;
  }

  url(key: string | null | undefined): string | null {
    return key ? `${this.base}/${key}` : null;
  }

  text(value: string | null | undefined): string | null {
    return value == null ? null : value.split(ASSET_SCHEME).join(`${this.base}/`);
  }
}

export function clockOf(config: AppConfig): DayClock {
  return { timezone: config.timezone, rolloverHour: config.dayRolloverHour };
}
