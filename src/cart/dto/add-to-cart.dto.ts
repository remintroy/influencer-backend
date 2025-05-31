import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @ApiProperty({ description: 'Date for the time slot', example: '2024-03-20' })
  @Type(() => Date)
  date: Date;

  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '09:30' })
  @IsString()
  endTime: string;
}

export class AddToCartDto {
  @ApiProperty({ description: 'ID of the influencer service' })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ description: 'ID of the influencer' })
  @IsMongoId()
  influencerId: string;

  @ApiProperty({ description: 'Quantity of the service', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Whether the service requires a time slot' })
  requiresTimeSlot: boolean;

  @ApiPropertyOptional({ description: 'Time slot details if required', type: TimeSlotDto })
  @ValidateIf(o => o.requiresTimeSlot === true)
  @Type(() => TimeSlotDto)
  timeSlot?: TimeSlotDto;

  @ApiProperty({ description: 'Price of the service', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Title of the service' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the service' })
  @IsOptional()
  @IsString()
  description?: string;
} 