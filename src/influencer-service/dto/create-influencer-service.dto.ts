import { IsNumber, IsOptional, IsString, IsUrl, Min, IsBoolean, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '../schemas/influencer-service.schema';

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

  @ApiProperty({
    description: 'Whether the service requires time slot booking',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  requireTimeSlot?: boolean;

  @ApiPropertyOptional({
    description: 'Price of the service',
    example: 500,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({
    description: 'Type of service',
    enum: ServiceType,
    example: ServiceType.INDIVIDUAL,
  })
  @IsEnum(ServiceType)
  type: ServiceType;

  @ApiPropertyOptional({
    description: 'List of user IDs involved in the service',
    type: [String],
    example: ['60f7b2e1c1234a1234567890', '60f7b2e1c1234a1234567891'],
  })
  @IsOptional()
  @IsArray()
  users?: string[];

  @ApiPropertyOptional({
    description: 'Collaboration details for collaboration type services',
    type: Object,
    example: {
      title: 'Joint Marketing Campaign',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      description: 'A collaborative marketing campaign'
    }
  })
  @IsOptional()
  collaborationDetails?: {
    title?: string;
    images?: string[];
    description?: string;
  };
}
