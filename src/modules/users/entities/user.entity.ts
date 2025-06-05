import { CustomBaseEntity } from 'src/models/customeBase.entity';
import { Entity, Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Entity()
export class User extends CustomBaseEntity {
  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Index()
  @Column({ unique: true })
  firebaseId: string;

  // OTP fields (hashed)
  @Column({ nullable: true })
  otpHash: string;

  @Column({ type: 'timestamp', nullable: true })
  otpExpiresAt: Date;

  @Column({ default: 0 })
  otpAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lastOtpAttempt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashOtp() {
    if (this.otpHash) {
      this.otpHash = await bcrypt.hash(this.otpHash, 10);
    }
  }

  // async compareOtp(otp: string): Promise<boolean> {
  //   return bcrypt.compare(otp, this.otpHash || '');
  // }
}