import { IsArray, IsOptional, IsString, Matches, ValidateNested, ArrayMinSize, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeSlotToDeleteDto {
  @ApiProperty({
    description: 'Start time in HH:mm format',
    example: '09:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format (e.g., 09:00, 14:30)',
  })
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:mm format',
    example: '10:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format (e.g., 09:00, 14:30)',
  })
  endTime: string;
}

export class DeleteTimeSlotsDto {
  @ApiPropertyOptional({
    description: 'Array of time slots to delete',
    type: [TimeSlotToDeleteDto],
    example: [
      { startTime: '09:00', endTime: '10:00' },
      { startTime: '14:00', endTime: '15:30' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotToDeleteDto)
  timeSlots?: TimeSlotToDeleteDto[];

  @ApiPropertyOptional({
    description: 'Delete all time slots for the date',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  deleteAll?: boolean = false;

  @ApiPropertyOptional({
    description: 'Allow partial deletion of time slots',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowPartial?: boolean = true;

  @ApiPropertyOptional({
    description: 'Remove availability record if no slots remain',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  removeEmpty?: boolean = false;
}

// Response DTO
export class DeleteTimeSlotsResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Descriptive message about the operation',
    example: 'Deleted 2 slot(s), modified 1 slot(s)',
  })
  message: string;

  @ApiProperty({
    description: 'Number of slots deleted',
    example: 2,
  })
  deletedCount: number;

  @ApiProperty({
    description: 'Number of slots modified/split',
    example: 1,
  })
  modifiedCount: number;

  @ApiProperty({
    description: 'Whether the entire availability record was removed',
    example: false,
  })
  availabilityRemoved: boolean;
}
