import { IsNumber, IsOptional, IsString, IsUrl, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInfluencerServiceDto {
    @ApiPropertyOptional({
        description: 'Title of the service',
        example: 'Instagram Marketing',
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({
        description: 'Detailed description of the service',
        example: 'Professional Instagram marketing services for your brand',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Cover image URL for the service',
        example: 'https://example.com/service-cover.jpg',
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    @ApiPropertyOptional({
        description: 'Whether the service requires time slot booking',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
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
}
