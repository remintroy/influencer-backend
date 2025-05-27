import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CreateInfluencerServiceDto {
  @ApiProperty({
    description: 'Title of the service',
    example: 'Instagram Marketing',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the service',
    example: 'Professional Instagram marketing services for your brand',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Cover image URL for the service',
    example: 'https://example.com/service-cover.jpg',
  })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Price of the service',
    example: 500,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({
    description: 'Collaboration Id for creating service inside collaboration',
  })
  @IsOptional()
  collaborationId?: string;
}
