import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MetaDto {
  @ApiPropertyOptional({ description: 'Whether the user is verified' })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({ description: 'OTP or verification code' })
  @IsString()
  @IsOptional()
  verificationCode?: string;

  @ApiPropertyOptional({ description: 'Expiration date for the verification code', type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  verificationCodeExpires?: Date;

  @ApiPropertyOptional({ description: 'Whether welcome email with password was sent' })
  @IsBoolean()
  @IsOptional()
  welcomeMailWithPasswordSent?: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when welcome mail was sent', type: String, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  welcomeMailWithPasswordSentAt?: Date;
}

export class SignupUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919999999999' })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'User password', example: 'securePassword123!' })
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL', example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({ type: MetaDto, description: 'Meta information like OTP, email status' })
  @ValidateNested()
  @Type(() => MetaDto)
  @IsOptional()
  meta?: MetaDto;
}
