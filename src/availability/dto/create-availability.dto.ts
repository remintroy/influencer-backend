import { IsArray, IsDate, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TimeSlotStatus } from '../schemas/availability.schema';

export class TimeSlotDto {
  @ApiProperty({
    description: 'Start time in 24-hour format (HH:mm)',
    example: '09:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in 24-hour format (HH:mm)',
    example: '09:30',
  })
  @IsString()
  endTime: string;

  @ApiProperty({
    description: 'Status of the time slot',
    enum: TimeSlotStatus,
    example: TimeSlotStatus.AVAILABLE,
    default: TimeSlotStatus.AVAILABLE,
  })
  @IsEnum(TimeSlotStatus)
  status: TimeSlotStatus;
}

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Date for which availability is being set',
    example: '2025-07-10',
  })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiProperty({
    description: 'Array of time slots for the day',
    type: [TimeSlotDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  timeSlots: TimeSlotDto[];
}
