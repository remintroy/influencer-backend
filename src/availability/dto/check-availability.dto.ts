import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, Matches } from 'class-validator';

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Date to check availability for',
    example: '2024-03-20',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Start time in HH:mm format (24-hour)',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-3]0$/, {
    message: 'Start time must be in HH:mm format with 30-minute intervals',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format (24-hour)',
    example: '17:00',
  })
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-3]0$/, {
    message: 'End time must be in HH:mm format with 30-minute intervals',
  })
  endTime: string;
} 