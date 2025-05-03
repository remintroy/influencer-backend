import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ description: 'OTP received by the user', example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
