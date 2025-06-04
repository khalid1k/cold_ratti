import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import dataSource from './config/database.config';
import { Logger } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      isGlobal: true, // Make ConfigService available across the app
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({}),
      dataSourceFactory: async () => {
        const logger = new Logger('Database');
        try {
          if (!dataSource.isInitialized) {
            await dataSource.initialize();
            logger.log('Database connection established');
          }
          return dataSource;
        } catch (error) {
          logger.error('Database connection failed', error.stack);
          throw error;
        }
      },
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
