import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as admin from 'firebase-admin';
import { UsersService } from '../users/users.service';
import { createUserDto } from '../users/dto/createUser.dto';
import { OtpData } from 'src/types/otpData';
@Injectable()
export class AuthService {
  constructor(
    private firebaseService: FirebaseService,
    private usersService: UsersService,
  ) {}

  async sendOtp(email: string): Promise<void> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    // Store in Firestore
    await admin.firestore().collection('otps').doc(email).set({
      otp,
      expiresAt,
      attempts: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
        // Check if user exists or create new one
        let user: admin.auth.UserRecord;
        try {
          user = await admin.auth().getUserByEmail(email);
        } catch (error) {
          // User doesn't exist - create disabled user
          user = await admin.auth().createUser({
            email,
            emailVerified: false,
            disabled: true, // Keep disabled until OTP verification
          });
        }
    
        // Now send the email with OTP
        // const actionCodeSettings = {
        //   url: `http://localhost:3000/verify-otp?email=${encodeURIComponent(email)}`,
        //   handleCodeInApp: false,
        // };

        const actionCodeSettings = {
            url: `https://cold-plunge-c7a58.firebaseapp.com/verify-email?email=${encodeURIComponent(email)}&otp=${otp}`,
            handleCodeInApp: true
          };
    
        await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
        console.log(`OTP for ${email}: ${otp}`); // For development
      } catch (error) {
        console.error('Failed to send OTP email:', error);
        throw new Error('Failed to send OTP');
      }
  }

  async verifyOtp(
    email: string,
    userEnteredOtp: string,
  ): Promise<{ uid: string; email: string }> {
    const otpRef = admin.firestore().collection('otps').doc(email);

    return await admin.firestore().runTransaction(async (transaction) => {
      const otpDoc = await transaction.get(otpRef);

      // Check if OTP exists
      if (!otpDoc.exists) {
        throw new Error('OTP not found or expired');
      }

      const { otp, expiresAt, attempts } = otpDoc.data() as OtpData;

      // Check expiration
      if (new Date() > expiresAt.toDate()) {
        await transaction.delete(otpRef);
        throw new Error('OTP expired');
      }

      // Check attempt limits
      if (attempts >= 3) {
        await transaction.delete(otpRef);
        throw new Error('Too many attempts. Please request a new OTP.');
      }

      // Verify OTP
      if (otp !== userEnteredOtp) {
        await transaction.update(otpRef, {
          attempts: admin.firestore.FieldValue.increment(1),
        });
        throw new Error('Invalid OTP');
      }

      // OTP is valid - proceed with authentication

      // Clean up OTP
      await transaction.delete(otpRef);

      // Get or create Firebase user
      let user: admin.auth.UserRecord;
      try {
        user = await admin.auth().getUserByEmail(email);
        // Update to enable and verify
        await admin.auth().updateUser(user.uid, {
          emailVerified: true,
          disabled: false,
        });
      } catch (error) {
        throw new Error('User not found. Please request OTP again.');
      }

      // Store user in your database
      const userDto: createUserDto = {
        firebaseUid: user.uid,
        email: user.email || email,
        name: user.displayName,
        photoUrl: user.photoURL,
      };
      await this.usersService.createOrUpdateUser(userDto);

      return {
        uid: user.uid,
        email: user.email || email,
      };
    });
  }

  async verifyGoogleToken(
    idToken: string,
  ): Promise<{ uid: string; email: string; name?: string; picture?: string }> {
    const decodedToken = await this.firebaseService
      .getAuth()
      .verifyIdToken(idToken);
      if (!decodedToken.email) {
        throw new Error('Google token does not contain email');
      }
    const userDto: createUserDto = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      photoUrl: decodedToken.picture,
    };
    await this.usersService.createOrUpdateUser(userDto);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };
  }
}
