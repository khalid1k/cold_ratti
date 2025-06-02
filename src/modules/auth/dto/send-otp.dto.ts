import { ApiProperty } from '@nestjs/swagger';

export class SendLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;
}
