/** Типы конфигурации приложения */

export interface ConfigServer {
  port: number;
  corsOrigins: string[];
  frontendUrl: string;
}

export interface ConfigDb {
  databaseUrl: string;
}

export interface ConfigRedis {
  url: string;
}

export interface ConfigJwt {
  secret: string;
}

export interface ConfigCredentials {
  encryptionKey: string;
}

export interface ConfigSmtp {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  dryRun: boolean;
}

export abstract class Config {
  abstract get env(): string;
  abstract get server(): ConfigServer;
  abstract get db(): ConfigDb;
  abstract get redis(): ConfigRedis;
  abstract get jwt(): ConfigJwt;
  abstract get credentials(): ConfigCredentials;
  abstract get smtp(): ConfigSmtp;
}
