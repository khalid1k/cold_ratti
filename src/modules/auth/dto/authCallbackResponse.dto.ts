import { ApiProperty } from '@nestjs/swagger';

export class AuthCallbackResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  user: {
    auth0Id: string;
    email: string;
    name: string;
  };
}
