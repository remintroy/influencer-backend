import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsJWT } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @IsJWT()
  @ApiProperty({
    description: 'IdToken of user obtained from Google OAuth',
  })
  idToken: string;
}
