import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'One-time password (OTP) sent to user',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({
    description: 'Device information',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @ApiPropertyOptional({
    description: 'IP address of the user',
    example: '192.168.1.1',
  })
  @IsString()
  @IsOptional()
  ipAddress?: string;
}
