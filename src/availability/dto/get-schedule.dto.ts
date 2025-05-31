import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class GetScheduleDto {
  @ApiProperty({
    description: 'Start date of the schedule range',
    example: '2024-03-20',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date of the schedule range',
    example: '2024-03-27',
  })
  @IsDateString()
  endDate: string;
} 