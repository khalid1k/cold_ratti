import { ApiProperty } from '@nestjs/swagger';

export type AuthProvider = 'supabase' | 'firebase';

export class CreateUserDto {
  @ApiProperty({
    description: 'The authentication provider used',
    enum: ['supabase', 'firebase'],
  })
  authProvider: AuthProvider;

  @ApiProperty({
    description: 'Unique identifier from the auth provider',
  })
  providerId: string;

  @ApiProperty({
    description: 'User email address',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'User full name',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'URL to user profile picture',
    required: false,
  })
  picture?: string;
}