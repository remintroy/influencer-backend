import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ description: 'Title of the contract' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Content/body of the contract' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Service ID to attach this contract to' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;
} 