import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, IsOptional, IsEnum, IsMongoId } from 'class-validator';
import { CreateInfluencerServiceDto } from './create-influencer-service.dto';
import { ServiceType } from '../schemas/influencer-service.schema';

export class CreateCollaborationServiceDto extends CreateInfluencerServiceDto {
  @ApiProperty({
    description: 'Type of service',
    enum: ServiceType,
    example: ServiceType.COLLABORATION,
  })
  @IsEnum(ServiceType)
  declare type: ServiceType.COLLABORATION;
}
