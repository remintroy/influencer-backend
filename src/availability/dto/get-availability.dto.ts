// src/availability/dto/get-availability.dto.ts
import { IsOptional, IsDateString, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeSlotStatus } from '../schemas/availability.schema';
import { Transform } from 'class-transformer';

export class GetAvailabilityQueryDto {
  @ApiPropertyOptional({ description: 'Start date for filtering (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by time slot status',
    enum: TimeSlotStatus,
  })
  @IsOptional()
  @IsEnum(TimeSlotStatus)
  status?: TimeSlotStatus;

  @ApiPropertyOptional({ description: 'Include inactive availability records' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeInactive?: boolean = false;

  @ApiPropertyOptional({ description: 'Page number for pagination' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

export class GetServiceAvailabilityQueryDto extends GetAvailabilityQueryDto {
  @ApiPropertyOptional({ description: 'Specific date to fetch availability (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

// Response DTOs
export class TimeSlotResponseDto {
  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty({ enum: TimeSlotStatus })
  status: TimeSlotStatus;

  @ApiProperty({ required: false })
  bookingId?: string;
}

export class AvailabilityResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  influencerId: string;

  @ApiProperty()
  date: string;

  @ApiProperty({ type: [TimeSlotResponseDto] })
  timeSlots: TimeSlotResponseDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ServiceAvailabilityResponseDto {
  @ApiProperty()
  serviceId: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty()
  serviceType: string;

  @ApiProperty()
  requireTimeSlot: boolean;

  @ApiProperty({ type: [AvailabilityResponseDto] })
  availability: AvailabilityResponseDto[];

  @ApiProperty()
  totalAvailableDays: number;

  @ApiProperty()
  totalAvailableSlots: number;
}

export class PaginatedAvailabilityResponseDto {
  @ApiProperty({ type: [AvailabilityResponseDto] })
  docs: AvailabilityResponseDto[];

  @ApiProperty()
  totalDocs: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}
