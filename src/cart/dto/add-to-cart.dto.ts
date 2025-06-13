import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsMongoId, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({ description: 'ID of the service to add to cart' })
  @IsMongoId()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Date for the booking', example: '2024-03-20' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  bookingDate: Date;

  @ApiProperty({ description: 'Start time in HH:mm format', example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm format', example: '09:30' })
  @IsString()
  @IsNotEmpty()
  endTime: string;
}
