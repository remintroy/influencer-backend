import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email or phone number of the user',
  })
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: 'strongPassword123',
    description: 'Password of the user',
  })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}
