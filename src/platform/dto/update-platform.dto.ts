import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformDto {
  @ApiPropertyOptional({ description: 'The name of the platform', example: 'Instagram (Meta)' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Optional description of the platform', example: 'Instagram, now owned by Meta Platforms.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the platform is active or not', example: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'URL to the platform image', example: 'https://example.com/instagram-meta-logo.png' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
} 