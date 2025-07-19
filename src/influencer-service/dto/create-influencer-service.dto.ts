import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateIf,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ServiceType } from '../schemas/influencer-service.schema';

class CollaborationDetailsDto {
  @ApiPropertyOptional({ description: 'Title for collaboration', example: 'Joint Campaign' })
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Images for collaboration', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Description for collaboration', example: 'A collaborative campaign' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateInfluencerServiceDto {
  @ApiProperty({ description: 'Type of service', enum: ServiceType, example: ServiceType.INDIVIDUAL })
  @IsEnum(ServiceType)
  type: ServiceType;

  @ApiProperty({ description: 'Title of the service', example: 'Instagram Marketing' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the service',
    example: 'Professional Instagram marketing services for your brand',
  })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Cover image URL for the service', example: 'https://example.com/service-cover.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ description: 'Whether the service requires a physical location', default: false, example: false })
  @IsOptional()
  @IsBoolean()
  locationRequired?: boolean;

  @ApiPropertyOptional({ description: 'Price of the service', default: 0, example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Minimum number of days required to complete the service', minimum: 1, example: 3 })
  @IsNumber()
  @Min(1)
  minimumDaysForCompletion: number;

  // Only required for collaboration services
  @ApiPropertyOptional({
    description: 'List of user IDs involved in the service (required for collaboration)',
    type: [String],
    example: ['60f7b2e1c1234a1234567890', '60f7b2e1c1234a1234567891'],
  })
  @ValidateIf((o) => o.type === ServiceType.COLLABORATION)
  @IsArray()
  @ArrayMinSize(1)
  users?: string[];

  @ApiPropertyOptional({
    description: 'Collaboration details for collaboration type services',
    type: CollaborationDetailsDto,
    example: {
      title: 'Joint Marketing Campaign',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      description: 'A collaborative marketing campaign',
    },
  })
  @ValidateIf((o) => o.type === ServiceType.COLLABORATION)
  @ValidateNested()
  @Type(() => CollaborationDetailsDto)
  collaborationDetails?: CollaborationDetailsDto;
}
