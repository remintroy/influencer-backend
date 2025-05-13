import { IsEmail, IsEnum, IsMobilePhone, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountType } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919999999999' })
  @IsMobilePhone()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'User password', example: 'securePassword123!' })
  @MinLength(6, { message: 'Password must be at least 8 characters long' })
  @IsOptional()
  password: string;

  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL', example: 'https://example.com/avatar.jpg' })
  @IsUrl()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Account Type', example: UserAccountType.INDIVIDUAL })
  @IsEnum(UserAccountType)
  @IsOptional()
  accountType?: UserAccountType;

  @ApiPropertyOptional({ description: 'Gender of user', example: 'male' })
  @IsString()
  @IsOptional()
  gender?: string;
}
