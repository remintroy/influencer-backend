import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformDto {
  @ApiProperty({ description: 'The name of the platform', example: 'Instagram' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the platform', example: 'A popular photo and video sharing social media platform.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the platform is active or not', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'URL to the platform image', example: 'https://example.com/instagram-logo.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
} 