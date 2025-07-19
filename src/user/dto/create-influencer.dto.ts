import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { Type } from 'class-transformer';

class SocialMediaEntry {
  @ApiProperty({
    description: 'The platform ObjectId (reference to Platform collection).',
    example: '60f7b2e1c1234a1234567890',
    type: String,
  })
  @IsMongoId()
  platform: string;

  @ApiPropertyOptional({
    description: 'The handle or username on the platform.',
    example: '@influencer_handle',
  })
  @IsOptional()
  @IsString()
  handle?: string;

  @ApiPropertyOptional({
    description: 'Number of followers on the platform.',
    example: 10000,
  })
  @IsOptional()
  @IsNumber()
  followers?: number;

  @ApiPropertyOptional({
    description: 'URL to the social media profile.',
    example: 'https://instagram.com/influencer_handle',
  })
  @IsOptional()
  @IsString()
  url?: string;
}

export class CreateInfluencerDto extends CreateUserDto {
  @ApiPropertyOptional({
    description: 'Commercial registration ID for agency or business influencers.',
    example: 'CR123456789',
  })
  @IsOptional()
  @IsString()
  commercialRegistrationID?: string;

  @ApiPropertyOptional({
    type: [SocialMediaEntry],
    description: 'List of influencer social media profiles with platform (ObjectId), handle, follower count, and URL.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaEntry)
  socialMedia?: SocialMediaEntry[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Categories the influencer belongs to, represented by MongoDB ObjectIds.',
    example: ['609d1b2f9f1b14670c52fdef'],
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  category?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Custom tags associated with the influencer’s content or niche.',
    example: ['fitness', 'lifestyle'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Short biography or description about the influencer.',
    example: 'I’m a travel content creator and adventure vlogger.',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Geographical location of the influencer.',
    example: 'New York, USA',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Engagement rate calculated from the influencer’s content (e.g., likes, comments).',
    example: 4.3,
  })
  @IsOptional()
  @IsNumber()
  engagementRate?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'List of image URLs showcasing influencer content.',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'List of video URLs showcasing influencer content.',
    example: ['https://example.com/video1.mp4'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];
}
