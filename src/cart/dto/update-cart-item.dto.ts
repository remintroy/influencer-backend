import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiPropertyOptional({ description: 'Date for the booking', example: '2024-03-20' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  bookingDate?: Date;

  @ApiPropertyOptional({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time in HH:mm format', example: '09:30' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Price of the service' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
