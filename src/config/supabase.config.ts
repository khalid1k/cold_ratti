import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseConfig {
  public readonly client: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.client = createClient(
      this.configService.get<string>('SUPABASE_URL') as string,
      this.configService.get<string>('SUPABASE_KEY') as string,
    );
  }

  getOtpRedirectUrl(): string {
    return this.configService.get<string>('OTP_REDIRECT_URL') as string;
  }
}