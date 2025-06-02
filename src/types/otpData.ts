export type OtpData = {
    otp: string;
    expiresAt: FirebaseFirestore.Timestamp;
    attempts: number;
    createdAt?: FirebaseFirestore.Timestamp;
  }