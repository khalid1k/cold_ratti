import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseConfig } from 'src/config/supabase.config';
import { FirebaseConfig } from 'src/config/firebase.config';
import { UserService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private supabaseConfig: SupabaseConfig,
    private firebaseConfig: FirebaseConfig,
    private userService: UserService,
  ) {}

  // ====================
  // Email OTP (Supabase)
  // ====================
  // async startEmailOtp(email: string) {
  //   // Rate limiting check
  //   const { data: recentAttempts } = await this.supabaseConfig.client
  //     .from('otp_attempts')
  //     .select('*')
  //     .eq('email', email)
  //     .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  //   if (recentAttempts && recentAttempts.length >= 3) {
  //     throw new HttpException(
  //       'Too many OTP requests. Please wait before trying again.',
  //       HttpStatus.TOO_MANY_REQUESTS,
  //     );
  //   }

  //   const { error } = await this.supabaseConfig.client.auth.signInWithOtp({
  //     email,
  //     options: {
  //       emailRedirectTo: this.supabaseConfig.getOtpRedirectUrl(),
  //     },
  //   });

  //   if (error) {
  //     throw new HttpException(
  //       error.message || 'Failed to send OTP',
  //       HttpStatus.BAD_REQUEST,
  //     );
  //   }

  //   await this.supabaseConfig.client
  //     .from('otp_attempts')
  //     .insert([{ email, created_at: new Date().toISOString() }]);

  //   return { success: true, message: 'OTP sent to email' };
  // }

  async startEmailOtp(email: string) {
    // Rate limiting check (keep your existing code)
    const { data: recentAttempts } = await this.supabaseConfig.client
      .from('otp_attempts')
      .select('*')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
  
    if (recentAttempts && recentAttempts.length >= 3) {
      throw new HttpException(
        'Too many OTP requests. Please wait before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  
    // Modified part - use shouldCreateUser and channel options
    const { error } = await this.supabaseConfig.client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Explicitly allow user creation
      },
    });
  
    if (error) {
      throw new HttpException(
        error.message || 'Failed to send OTP',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    await this.supabaseConfig.client
      .from('otp_attempts')
      .insert([{ email, created_at: new Date().toISOString() }]);
  
    return { success: true, message: 'OTP code sent to email' };
  }

  async verifyEmailOtp(email: string, token: string) {
    const { data, error } = await this.supabaseConfig.client.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error || !data?.user) {
      throw new HttpException(
        error?.message || 'Invalid OTP',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userService.createOrUpdateUser({
      authProvider: 'supabase',
      providerId: data.user.id,
      email: data.user.email,
    });

    return this.generateAuthResponse(user);
  }

  async resendEmailOtp(email: string) {
    const { data: lastAttempt } = await this.supabaseConfig.client
      .from('otp_attempts')
      .select('created_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastAttempt && lastAttempt.length > 0 && Date.now() - new Date(lastAttempt[0].created_at).getTime() < 60000) {
      throw new HttpException(
        'Please wait before requesting a new OTP',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.startEmailOtp(email);
  }

  // ====================
  // Social Auth (Firebase)
  // ====================
  async verifyFirebaseToken(idToken: string) {
    try {
      return await this.firebaseConfig.auth.verifyIdToken(idToken);
    } catch (error) {
      throw new HttpException(
        'Invalid Firebase token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async handleSocialLogin(idToken: string) {
    const firebaseUser = await this.verifyFirebaseToken(idToken);
    
    const user = await this.userService.createOrUpdateUser({
      authProvider: 'firebase',
      providerId: firebaseUser.uid,
      email: firebaseUser.email,
      name: firebaseUser.name || firebaseUser.email?.split('@')[0],
    });

    return this.generateAuthResponse(user);
  }

  // ====================
  // Common Methods
  // ====================
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
}