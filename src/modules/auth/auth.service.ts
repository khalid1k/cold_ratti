import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FirebaseConfig } from 'src/config/firebase.config';
import { UserService } from '../users/users.service';
import { SendGridConfig } from 'src/config/sendGrid.config';
import { OtpService } from './otp.service';
import { User } from '../users/entities/user.entity';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private firebaseConfig: FirebaseConfig,
    private userService: UserService,
    private sendGridConfig: SendGridConfig,
    private otpService: OtpService,
  ) {}

  // async startEmailOtp(email: string) {
  //   const user = await this.userService.findByEmail(email);
    
  //   // Rate limiting check
  //   if (user && user.lastOtpAttempt) {
  //     const timeSinceLastAttempt = Date.now() - user.lastOtpAttempt.getTime();
  //     if (timeSinceLastAttempt < 5 * 60 * 1000 && user.otpAttempts >= 3) {
  //       throw new HttpException(
  //         'Too many OTP requests. Please wait before trying again.',
  //         HttpStatus.TOO_MANY_REQUESTS,
  //       );
  //     }
  //   }

  //   const otp = this.otpService.generateOtp();
  //   const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  //   await this.userService.updateOtpFields(email, {
  //     otpHash: otp, // Will be hashed automatically
  //     otpExpiresAt,
  //     otpAttempts: (user?.otpAttempts || 0) + 1,
  //     lastOtpAttempt: new Date(),
  //   });

  //   // Send OTP via email
  //   await this.sendGridConfig.sendEmail(
  //     email,
  //     'Your OTP Code',
  //     `Your OTP code is: ${otp}`,
  //     `<p>Your OTP code is: <strong>${otp}</strong></p>`
  //   );

  //   return { success: true, message: 'OTP code sent to email' };
  // }

  async startEmailOtp(email: string) {
    // Validate email format
    if (!this.validateEmail(email)) {
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }
  
    let user = await this.userService.findByEmail(email);
    
    // Rate limiting check
    if (user && user.lastOtpAttempt) {
      const timeSinceLastAttempt = Date.now() - user.lastOtpAttempt.getTime();
      if (timeSinceLastAttempt < 5 * 60 * 1000 && user.otpAttempts >= 3) {
        throw new HttpException(
          'Too many OTP requests. Please wait before trying again.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  
    // Generate OTP
    const otp = this.otpService.generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
    // Create user if doesn't exist
    if (!user) {
      try {
        let firebaseId: string | undefined;
        
        // Check if user exists in Firebase
        try {
          const existingFirebaseUser = await this.firebaseConfig.auth.getUserByEmail(email);
          firebaseId = existingFirebaseUser.uid;
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            // User doesn't exist in Firebase, create new one
            const firebaseUser = await this.firebaseConfig.auth.createUser({
              email,
              emailVerified: false,
              disabled: false,
            });
            firebaseId = firebaseUser.uid;
          } else {
            throw error; // Re-throw other Firebase errors
          }
        }
  
        // Create local database user
        user = await this.userService.createOrUpdateUser({
          firebaseId,
          email,
          name: email.split('@')[0], // Default name from email
          otpHash: otp, // Will be hashed
          otpExpiresAt,
          otpAttempts: 1,
          lastOtpAttempt: new Date(),
        });
        console.log("new user created data is ", user)
      } catch (error) {
        console.error('Error during user creation:', error);
        throw new HttpException(
          'Failed to start OTP process',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } else {
      // Update existing user with new OTP
     const res= await this.userService.updateOtpFields(email, {
        otpHash: otp,
        otpExpiresAt,
        otpAttempts: (user.otpAttempts || 0) + 1,
        lastOtpAttempt: new Date(),
      });
      console.log("updated user result is ", res)
    }
  
    // Send OTP via email
    await this.sendGridConfig.sendEmail(
      email,
      'Your OTP Code',
      `Your OTP code is: ${otp}`,
      `<p>Your OTP code is: <strong>${otp}</strong></p>`
    );
  
    return { success: true, message: 'OTP code sent to email' ,otp};
  }

  async verifyEmailOtp(email: string, otp: string) {
    const user = await this.userService.findByEmail(email);
    console.log("user data is ", user)
    if (!user || !user.otpHash) {
      console.log("user not find")
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      throw new HttpException('OTP has expired', HttpStatus.BAD_REQUEST);
    }

    const isValid = await this.otpService.verifyOtp(otp, user.otpHash);
    if (!isValid) {
      console.log('otp is invalid')
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }

    // Clear OTP fields
    await this.userService.clearOtpFields(email);

    // Rest of the verification logic remains the same...
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

    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: User) {
    return {
      accessToken: this.generateJWT(user),
      user: this.userService.sanitizeUser(user),
    };
  }

  private generateJWT(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
  }

  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}