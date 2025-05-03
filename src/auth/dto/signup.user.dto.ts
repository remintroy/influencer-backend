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

class MetaDto {
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  verificationCode?: string;

  @IsDateString()
  @IsOptional()
  verificationCodeExpires?: Date;

  @IsBoolean()
  @IsOptional()
  welcomeMailWithPasswordSent?: boolean;

  @IsDateString()
  @IsOptional()
  welcomeMailWithPasswordSentAt?: Date;
}

export class SignupUserDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber()
  @IsOptional()
  phoneNumber?: string;

  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ValidateNested()
  @Type(() => MetaDto)
  @IsOptional()
  meta?: MetaDto;
}
