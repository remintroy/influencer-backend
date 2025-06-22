import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({
    description: 'Phone number with country code or Email Id of user',
  })
  @IsString()
  @IsNotEmpty()
  username: string;
}
