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

  @ApiPropertyOptional({
    description: 'Collaboration details for collaboration type services',
    type: Object,
    example: {
      title: 'Joint Marketing Campaign',
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      description: 'A collaborative marketing campaign',
    },
  })
  @IsOptional()
  collaborationDetails?: {
    title?: string;
    images?: string[];
    description?: string;
  };

  @ApiProperty({
    description: 'Array of user IDs to add to or remove from the collaboration',
    example: ['60d0fe4f5311236168a109cd', '60d0fe4f5311236168a109ce'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user ID must be provided' })
  @IsString({ each: true })
  @IsMongoId()
  users: string[];
}

export class ConvertToCollaborationServiceDto {
  @ApiProperty({
    description: 'Array of additional influencer user IDs to add to the collaboration',
    example: ['60d0fe4f5311236168a109cd', '60d0fe4f5311236168a109ce'],
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalUserIds?: string[];
}

export class ManageCollaborationUsersDto {
  @ApiProperty({
    description: 'Array of user IDs to add to or remove from the collaboration',
    example: ['60d0fe4f5311236168a109cd', '60d0fe4f5311236168a109ce'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one user ID must be provided' })
  @IsString({ each: true })
  userIds: string[];
}
