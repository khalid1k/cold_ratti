import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseConfig } from 'src/config/firebase.config';
import { UserService } from '../users/users.service';
import { SendGridConfig } from 'src/config/sendGrid.config';
import { OtpService } from './otp.service';
import { SuccessResponse } from 'src/common/dto/response.dto';

@Injectable()
export class AuthService {
  constructor(
    private firebaseConfig: FirebaseConfig,
    private userService: UserService,
    private sendGridConfig: SendGridConfig,
    private otpService: OtpService,
  ) {}

  async startEmailOtp(email: string) {
    if (!this.validateEmail(email)) {
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }
  
    let user = await this.userService.findByEmail(email);
    
    if (user && user.lastOtpAttempt) {
      const timeSinceLastAttempt = Date.now() - user.lastOtpAttempt.getTime();
      if (timeSinceLastAttempt < 5 * 60 * 1000 && user.otpAttempts >= 3) {
        throw new HttpException(
          'Too many OTP requests. Please wait before trying again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  
    const otp = this.otpService.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
    if (!user) {
      try {
        let firebaseId: string | undefined;
        
        try {
          const existingFirebaseUser = await this.firebaseConfig.auth.getUserByEmail(email);
          firebaseId = existingFirebaseUser.uid;
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            const firebaseUser = await this.firebaseConfig.auth.createUser({
              email,
              emailVerified: false,
              disabled: false,
            });
            firebaseId = firebaseUser.uid;
          } else {
            throw error;
          }
        }
  
        user = await this.userService.createOrUpdateUser({
          firebaseId,
          email,
          name: email.split('@')[0], 
          otpHash: otp,
          otpExpiresAt,
          otpAttempts: 1,
          lastOtpAttempt: new Date(),
        });
      } catch (error) {
        console.error('Error during user creation:', error);
        throw new HttpException(
          'Failed to start OTP process',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else {
      await this.userService.updateOtpFields(email, {
        otpHash: otp,
        otpExpiresAt,
        otpAttempts: (user.otpAttempts || 0) + 1,
        lastOtpAttempt: new Date(),
      });
    }
  
    await this.sendGridConfig.sendEmail(
      email,
      'Your OTP Code',
      `Your OTP code is: ${otp}`,
      `<p>Your OTP code is: <strong>${otp}</strong></p>`
    );
  
    return SuccessResponse.create('OTP code sent to email', { success: true });
  }

  async verifyEmailOtp(email: string, otp: string) {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.otpHash) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      throw new HttpException('OTP has expired', HttpStatus.BAD_REQUEST);
    }

    const isValid = await this.otpService.verifyOtp(otp, user.otpHash);
    if (!isValid) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    await this.userService.clearOtpFields(email);

    const firebaseToken = await this.firebaseConfig.auth.createCustomToken(user.firebaseId);

    return SuccessResponse.create('OTP verified successfully', {
      firebaseToken,
      user: this.userService.sanitizeUser(user),
    });
  }

  async resendEmailOtp(email: string) {
    const user = await this.userService.findByEmail(email);

    if (user && user.lastOtpAttempt) {
      const timeSinceLastAttempt = Date.now() - user.lastOtpAttempt.getTime();
      if (timeSinceLastAttempt < 60000) {
        throw new HttpException(
          'Please wait before requesting a new OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return this.startEmailOtp(email);
  }

  async verifyFirebaseToken(idToken: string) {
    try {
      return await this.firebaseConfig.auth.verifyIdToken(idToken);
    } catch (error) {
      throw new HttpException('Invalid Firebase token', HttpStatus.UNAUTHORIZED);
    }
  }

  async handleSocialLogin(idToken: string) {
    const firebaseUser = await this.verifyFirebaseToken(idToken);
    
    const user = await this.userService.createOrUpdateUser({
      firebaseId: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.name || firebaseUser.email?.split('@')[0],
    });

    return SuccessResponse.create('Social login successful', {
      user: this.userService.sanitizeUser(user),
    });
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}