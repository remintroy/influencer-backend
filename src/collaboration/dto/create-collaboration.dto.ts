import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollaborationDto {
  @ApiProperty({
    description: 'List of user IDs involved in the collaboration',
    type: [String],
    example: ['60f7b2e1c1234a1234567890', '60f7b2e1c1234a1234567891'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  users: string[];

  @ApiPropertyOptional({
    description: 'URL of the collaboration image',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Title of the collaboration',
    example: 'UI/UX Design Sprint',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Optional description about the collaboration',
    example: 'A design-focused collaboration for the new mobile app interface.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
