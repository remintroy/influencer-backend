import { IsArray, IsDate, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeSlotStatus } from '../schemas/availability.schema';

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({
    description: 'Start time in 24-hour format (HH:mm)',
    example: '09:00',
  })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({
    description: 'End time in 24-hour format (HH:mm)',
    example: '09:30',
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Status of the time slot',
    enum: TimeSlotStatus,
    example: TimeSlotStatus.UNAVAILABLE,
  })
  @IsEnum(TimeSlotStatus)
  status: TimeSlotStatus;

  @ApiPropertyOptional({
    description: 'Booking ID if the slot is booked',
  })
  @IsOptional()
  @IsMongoId()
  bookingId?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Date for which availability is being updated',
    example: '2024-03-20',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  date?: Date;

  @ApiPropertyOptional({
    description: 'Array of time slots to update',
    type: [UpdateTimeSlotDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTimeSlotDto)
  timeSlots?: UpdateTimeSlotDto[];

  @ApiPropertyOptional({
    description: 'Whether the availability is active',
  })
  @IsOptional()
  isActive?: boolean;
} 