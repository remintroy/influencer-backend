import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceStatus } from '../schemas/influencer-service.schema';

export class UpdateInfluencerServiceStatusDto {
  @ApiProperty({
    description: 'Status to set for the service',
    enum: ServiceStatus,
    default: ServiceStatus.REJECTED,
    example: ServiceStatus.APPROVED,
  })
  @IsEnum(ServiceStatus)
  status: ServiceStatus;

  @ApiPropertyOptional({
    description: 'Reason for rejection (if status is rejected)',
    example: 'Insufficient details provided.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
