export class UpdateOtpDto {
    otpHash: string;
    otpExpiresAt: Date;
    otpAttempts: number;
    lastOtpAttempt: Date;
  }