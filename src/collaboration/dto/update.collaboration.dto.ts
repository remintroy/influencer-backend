import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCollaborationDto {
  @ApiPropertyOptional({
    description: 'List of user IDs involved in the collaboration',
    type: [String],
    example: ['60f7b2e1c1234a1234567890', '60f7b2e1c1234a1234567891'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  users?: string[];

  @ApiPropertyOptional({
    description: 'URL of the collaboration image',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Title of the collaboration',
    example: 'UI/UX Design Sprint',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Optional description about the collaboration',
    example: 'A design-focused collaboration for the new mobile app interface.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
