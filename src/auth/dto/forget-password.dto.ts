import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgetPasswordDto {
  @ApiProperty({
    description: 'Phone number with country code',
    example: '+919999999999',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
} 