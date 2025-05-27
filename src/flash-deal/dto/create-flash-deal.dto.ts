import { IsDate, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateFlashDealDto {
  @ApiProperty({
    description: 'ID of the influencer service this flash deal is for',
    example: '60f7b2e1c1234a1234567890',
  })
  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({
    description: 'Title of the flash deal',
    example: '50% Off Instagram Marketing Package',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the flash deal',
    example: 'Limited time offer on our premium Instagram marketing package',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Original price of the service',
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  originalPrice: number;

  @ApiProperty({
    description: 'Discounted price for the flash deal',
    example: 500,
  })
  @IsNumber()
  @Min(0)
  discountedPrice: number;

  @ApiProperty({
    description: 'Start date and time of the flash deal',
    example: '2024-03-20T00:00:00Z',
  })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({
    description: 'End date and time of the flash deal',
    example: '2024-03-27T23:59:59Z',
  })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({
    description: 'Maximum quantity available for this flash deal',
    example: 50,
  })
  @IsNumber()
  @Min(0)
  maxQuantity: number;

  @ApiPropertyOptional({
    description: 'Image URL for the flash deal',
    example: 'https://example.com/flash-deal-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
} 