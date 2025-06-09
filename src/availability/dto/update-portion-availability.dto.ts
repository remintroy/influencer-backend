import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { TimeSlotStatus } from '../schemas/availability.schema';

export class UpdateTimeSlotPortionDto {
  @ApiProperty({
    description: 'Target start time in HH:mm format',
    example: '11:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 09:30)',
  })
  targetStartTime: string;

  @ApiProperty({
    description: 'Target end time in HH:mm format',
    example: '12:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 10:30)',
  })
  targetEndTime: string;

  @ApiProperty({
    description: 'New status for the time slot',
    example: 'BOOKED',
    enum: TimeSlotStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeSlotStatus)
  status?: TimeSlotStatus;

  @ApiProperty({
    description: 'Booking ID if the slot is being booked',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  bookingId?: string;
}
