import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { FirebaseConfig } from 'src/config/firebase.config';
import { SendGridConfig } from 'src/config/sendGrid.config';
import { OtpService } from './otp.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
  ],
  providers: [AuthService, FirebaseConfig, SendGridConfig, OtpService],
  controllers: [AuthController],
})
export class AuthModule {}
