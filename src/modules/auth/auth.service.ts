import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Auth0Config } from './auth0.config';
import { UserService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private auth0Config: Auth0Config,
    private userService: UserService,
  ) {}

  async startPasswordless(email: string) {
    try {
      const lastHourAttempts = await this.countRecentAttempts(email, 60);
      if (lastHourAttempts > 5) {
        throw new HttpException(
          'Too many OTP requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      const response = await axios.post(
        `https://${this.auth0Config.config.domain}/passwordless/start`,
        {
          client_id: this.auth0Config.config.clientId,
          client_secret: this.auth0Config.config.clientSecret,
          connection: 'email',
          email: email,
          send: 'code',
          authParams: {
            scope: 'openid profile email',
            audience: this.auth0Config.config.audience,
          },
        },
      );
      return { success: true, message: 'OTP sent to email' };
    } catch (error) {
      throw new HttpException(
        error.response?.data?.message || 'Failed to send OTP',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async verifyPasswordless(email: string, code: string) {
    try {
      const tokenResponse = await axios.post(
        `https://${this.auth0Config.config.domain}/oauth/token`,
        {
          grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
          client_id: this.auth0Config.config.clientId,
          client_secret: this.auth0Config.config.clientSecret,
          username: email,
          otp: code,
          realm: 'email',
          audience: this.auth0Config.config.audience,
          scope: 'openid profile email',
        },
      );

      const userInfo = await this.getAuth0UserInfo(
        tokenResponse.data.access_token,
      );
      const user = await this.createOrUpdateUser(userInfo);

      return {
        accessToken: this.generateJWT(user),
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new HttpException(
        error.response?.data?.error_description || 'Invalid OTP',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async resendPasswordlessOTP(email: string) {
    try {
      const managementToken = await this.getManagementToken();

      const logs = await axios.get(
        `https://${this.auth0Config.config.domain}/api/v2/logs`,
        {
          params: {
            q: encodeURIComponent(`type:fp AND user_email:"${email}"`),
            per_page: 1,
            sort: 'date:-1',
          },
          headers: {
            Authorization: `Bearer ${managementToken}`,
          },
        },
      );

      const lastAttempt = logs.data[0];
      if (
        lastAttempt &&
        Date.now() - new Date(lastAttempt.date).getTime() < 300000
      ) {
        throw new HttpException(
          'Please wait before requesting a new OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return this.startPasswordless(email);
    } catch (error) {
      console.log('resend otp error is ', error);
      throw new HttpException(
        error.response?.data?.message || 'Failed to resend OTP',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async countRecentAttempts(email: string, minutes: number) {
    const managementToken = await this.getManagementToken();

    try {
      const response = await axios.get(
        `https://${this.auth0Config.config.domain}/api/v2/logs`,
        {
          params: {
            q: encodeURIComponent(`type:fp AND user_email:"${email}"`),
            per_page: 10,
            sort: 'date:-1',
          },
          headers: {
            Authorization: `Bearer ${managementToken}`,
          },
        },
      );

      const timeThreshold = Date.now() - minutes * 60 * 1000;
      return response.data.filter(
        (log) => new Date(log.date).getTime() > timeThreshold,
      ).length;
    } catch (error) {
      console.error('Error counting attempts:', error);
      return 0; 
    }
  }

  private async getManagementToken(): Promise<string> {
    try {
      const response = await axios.post(
        `https://${this.auth0Config.config.domain}/oauth/token`,
        {
          client_id: this.auth0Config.config.clientId,
          client_secret: this.auth0Config.config.clientSecret,
          audience: `https://${this.auth0Config.config.domain}/api/v2/`,
          grant_type: 'client_credentials',
        },
        {
          headers: {
            'content-type': 'application/json',
          },
        },
      );
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get management token:', error.response?.data);
      throw new Error('Failed to obtain management API token');
    }
  }

  async handleAuth0Callback(profile: any) {
    if (!profile?.auth0Id) {
      throw new Error('Invalid user profile');
    }

    const user = await this.createOrUpdateUser({
      auth0Id: profile.auth0Id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    console.log("callback function is called and userdata is ", user)

    return {
      accessToken: this.generateJWT(user),
      user: this.sanitizeUser(user),
    };
  }

  // private async createOrUpdateUser(auth0User: {
  //   auth0Id: string;
  //   email?: string;
  //   name?: string;
  //   picture?: string;
  // }): Promise<User> {
  //   let user = await this.userRepository.findOne({
  //     where: { auth0Id: auth0User.auth0Id },
  //   });

  //   if (!user) {
  //     user = this.userRepository.create({
  //       auth0Id: auth0User.auth0Id,
  //       email: auth0User.email,
  //       name: auth0User.name,
  //       picture: auth0User.picture,
  //     });
  //   } else {
  //     if (auth0User.email) user.email = auth0User.email;
  //     if (auth0User.name) user.name = auth0User.name;
  //     if (auth0User.picture) user.picture = auth0User.picture;
  //   }

  //   return this.userRepository.save(user);
  // }

  private async createOrUpdateUser(auth0User: {
    auth0Id: string;
    email?: string;
    name?: string;
    picture?: string;
  }): Promise<User> {
    return this.userService.createOrUpdateFromAuth0(auth0User);
  }

  private async getAuth0UserInfo(accessToken: string) {
    const response = await axios.get(
      `https://${this.auth0Config.config.domain}/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return response.data;
  }

  private generateJWT(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      name: user.name,
    });
  }

  private sanitizeUser(user: User) {
    return this.userService.sanitizeUser(user);
  }
}
