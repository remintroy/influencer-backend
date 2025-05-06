import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountType } from '../user.schema';

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919999999999' })
  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: 'User password', example: 'securePassword123!' })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL', example: 'https://example.com/avatar.jpg' })
  @IsUrl()
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'Account Type', example: UserAccountType.INDIVIDUAL })
  @IsEnum(UserAccountType)
  accountType?: UserAccountType;
}
