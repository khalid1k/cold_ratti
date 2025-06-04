import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-auth0';
import { Auth0Config } from '../auth0.config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  constructor(auth0Config: Auth0Config, private configService: ConfigService) {
    super({
      domain: auth0Config.config.domain,
      clientID: auth0Config.config.clientId,
      clientSecret: auth0Config.config.clientSecret,
      callbackURL: configService.get('CALLBACK_URL'),
      scope: 'openid profile email',
      audience: auth0Config.config.audience,
      state: false,
    });
    console.log('Using callback URL:', configService.get('CALLBACK_URL'));
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ) {
    const user = {
      auth0Id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName,
      picture: profile.photos?.[0]?.value,
      accessToken,
    };
    console.log("auth0 strategy user is ", user),
    done(null, user);
  }
}
