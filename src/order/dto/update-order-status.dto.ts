import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, description: 'New status for the order' })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({ description: 'Reason for rejection (required if status is REJECTED)' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
} 