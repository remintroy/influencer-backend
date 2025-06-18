import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ResetPasswordWithOtpDto {
  @ApiProperty({
    description: 'One-time password (OTP) sent to user',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    description: 'New password to set',
    example: 'newSecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty({
    description: 'User ID for whom the password is being reset',
    example: '60d0fe4f5311236168a109ca',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

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