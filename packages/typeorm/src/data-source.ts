/** DataSource для CLI миграций и приложений */
import { DataSource } from 'typeorm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createDataSource(options?: {
  databaseUrl?: string;
}): DataSource {
  const url =
    options?.databaseUrl ??
    process.env.DATABASE_URL ??
    'postgresql://seller:seller@localhost:5432/seller';
  return new DataSource({
    type: 'postgres',
    url,
    entities: [join(__dirname, 'entities', '*.entity.js')],
    migrations: [join(__dirname, 'migrations', '*.js')],
    synchronize: false,
  });
}

const defaultDataSource = createDataSource();
export default defaultDataSource;
