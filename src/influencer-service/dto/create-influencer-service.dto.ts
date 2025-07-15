import { IsNumber, IsOptional, IsString, IsUrl, Min, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  // @ApiProperty({
  //   description: 'Whether the service requires time slot booking',
  //   example: true,
  // })
  // @IsBoolean()
  // @IsOptional()
  // requireTimeSlot?: boolean;

  @ApiProperty({
    description: 'Whether the service requires a physical location',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  locationRequired?: boolean;

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
    description: 'Time required for the service in minutes for time slot',
    example: 30,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({
    description: 'Minimum number of days required to complete the service',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  minimumDaysForCompletion: number;

  @ApiPropertyOptional({
    description: 'Contract ID for the service',
    type: String,
  })
  @IsOptional()
  @IsString()
  contract?: string;
}
