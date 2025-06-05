export class CreateUserDto {
  firebaseId: string;
  email?: string;
  name?: string;
  picture?: string;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts?: number;
  lastOtpAttempt?: Date;
}