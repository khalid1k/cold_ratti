import { Injectable } from '@nestjs/common';
import * as otpGenerator from 'otp-generator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  generateOtp(): string {
    return otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
  }

  async hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }

  async verifyOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
  }
}