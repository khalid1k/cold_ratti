import { ApiProperty } from '@nestjs/swagger';

export class VerifyLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({
    example: 'https://yourapp.com/complete-signin?apiKey=...&oobCode=...',
  })
  emailLink: string;
}
