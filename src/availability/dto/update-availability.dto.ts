import { IsArray, IsBoolean, IsDate, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeSlotStatus } from '../schemas/availability.schema';
import { Type } from 'class-transformer';

export class UpdateTimeSlotDto {
  @ApiPropertyOptional({
    description: 'Start time of the slot',
    example: '2024-03-20T10:00:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiPropertyOptional({
    description: 'End time of the slot',
    example: '2024-03-20T10:30:00Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiPropertyOptional({
    description: 'Status of the time slot',
    enum: TimeSlotStatus,
    example: TimeSlotStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(TimeSlotStatus)
  status?: TimeSlotStatus;

  @ApiPropertyOptional({
    description: 'ID of the booking associated with this slot',
    example: '60f7b2e1c1234a1234567890',
  })
  @IsOptional()
  @IsMongoId()
  bookingId?: string;
}

export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    description: 'List of time slots',
    type: [UpdateTimeSlotDto],
  })
  @IsOptional()
  @IsArray()
  @Type(() => UpdateTimeSlotDto)
  timeSlots?: UpdateTimeSlotDto[];

  @ApiPropertyOptional({
    description: 'Whether the availability is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 