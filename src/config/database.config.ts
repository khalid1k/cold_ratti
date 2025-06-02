import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as path from 'path';

// Temporary dotenv config to read NODE_ENV before ConfigService is ready
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Factory function that uses ConfigService
export const dataSourceOptions = (
  configService: ConfigService,
): DataSourceOptions => ({
  type: 'mysql',
  host: configService.get<string>('DB_HOST'),
  port: configService.get<number>('DB_PORT', 3306), // default 3306 if not set
  username: configService.get<string>('DB_USERNAME'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_DATABASE_NAME'),
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
  logging: configService.get<boolean>('DB_LOGGING', false),
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsRun: configService.get<boolean>('DB_RUN_MIGRATIONS', false),
});

// Instantiate DataSource (will be initialized in AppModule)
const configService = new ConfigService();
const dataSource = new DataSource(dataSourceOptions(configService));
export default dataSource;
