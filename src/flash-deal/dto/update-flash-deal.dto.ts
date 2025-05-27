import { IsDate, IsMongoId, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateFlashDealDto {
  @ApiPropertyOptional({
    description: 'ID of the influencer service this flash deal is for',
    example: '60f7b2e1c1234a1234567890',
  })
  @IsOptional()
  @IsMongoId()
  serviceId?: string;

  @ApiPropertyOptional({
    description: 'Title of the flash deal',
    example: '50% Off Instagram Marketing Package',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the flash deal',
    example: 'Limited time offer on our premium Instagram marketing package',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Original price of the service',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  originalPrice?: number;

  @ApiPropertyOptional({
    description: 'Discounted price for the flash deal',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountedPrice?: number;

  @ApiPropertyOptional({
    description: 'Start date and time of the flash deal',
    example: '2024-03-20T00:00:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date and time of the flash deal',
    example: '2024-03-27T23:59:59Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Maximum quantity available for this flash deal',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxQuantity?: number;

  @ApiPropertyOptional({
    description: 'Image URL for the flash deal',
    example: 'https://example.com/flash-deal-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the flash deal is active',
    example: true,
  })
  @IsOptional()
  isActive?: boolean;
}
