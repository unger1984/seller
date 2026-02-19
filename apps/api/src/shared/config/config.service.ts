/** Сервис конфигурации — типизированный доступ к Config */
/** Сервис конфигурации — типизированный доступ к Config */
import { Injectable } from '@nestjs/common';
import type { Config } from './config.types.js';
import { readConfig } from './config.factory.js';

@Injectable()
export class ConfigService {
  private readonly _cfg: Config;

  constructor() {
    this._cfg = readConfig();
  }

  /** Типизированная конфигурация */
  get cfg(): Config {
    return this._cfg;
  }

  /** Окружение (development, production, test) */
  get env(): string {
    return this._cfg.env;
  }
}
