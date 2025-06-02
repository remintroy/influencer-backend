import { IsArray, IsBoolean, IsDate, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeSlotStatus } from '../schemas/availability.schema';
import { Type } from 'class-transformer';

export class TimeSlotDto {
  @ApiProperty({
    description: 'Start time of the slot',
    example: '2024-03-20T10:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({
    description: 'End time of the slot',
    example: '2024-03-20T10:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  endTime: Date;

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

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'List of time slots',
    type: [TimeSlotDto],
  })
  @IsArray()
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];

  @ApiPropertyOptional({
    description: 'Whether the availability is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
} 