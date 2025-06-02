import { IsOptional } from 'class-validator';
export class createUserDto {
  @IsOptional()
  firebaseUid: string;
  @IsOptional()
  email: string;
  @IsOptional()
  name?: string;
  @IsOptional()
  photoUrl?: string;
}
