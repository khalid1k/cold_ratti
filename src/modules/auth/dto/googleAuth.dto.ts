import { ApiProperty } from '@nestjs/swagger';

export class GoogleAuthDto {
  @ApiProperty({ example: 'your-google-id-token' })
  idToken: string;
}
