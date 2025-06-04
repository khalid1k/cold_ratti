import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Auth0Config {
  constructor(private configService: ConfigService) {}

  get config() {
    return {
      domain: this.configService.get<string>('AUTH0_DOMAIN'),
      clientId: this.configService.get<string>('AUTH0_CLIENT_ID'),
      clientSecret: this.configService.get<string>('AUTH0_CLIENT_SECRET'),
      audience: this.configService.get<string>('AUTH0_AUDIENCE'),
      managementClientId: this.configService.get<string>(
        'AUTH0_MANAGEMENT_CLIENT_ID',
      ),
      managementClientSecret: this.configService.get<string>(
        'AUTH0_MANAGEMENT_CLIENT_SECRET',
      ),
    };
  }
}
