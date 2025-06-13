import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { InfluencerPlatforms } from '../schemas/user.schema';

class SocialMediaEntry {
  @ApiPropertyOptional({
    enum: InfluencerPlatforms,
    description: 'The social media platform (e.g., Instagram, YouTube, TikTok).',
    example: InfluencerPlatforms.Instagram,
  })
  @IsEnum(InfluencerPlatforms)
  platform: InfluencerPlatforms;

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

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number with country code', example: '+919999999999' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL', example: 'https://example.com/avatar.jpg' })
  @IsUrl()
  @IsOptional()
  profileImage?: string;

  @ApiPropertyOptional({ description: 'Array of category IDs', type: [String] })
  @IsArray()
  @IsOptional()
  category?: Types.ObjectId[];

  @ApiPropertyOptional({ description: 'Gender', example: 'male' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Commercial Registration ID', example: 'CR123456' })
  @IsString()
  @IsOptional()
  commercialRegistrationID?: string;

  // Influencer specific fields
  @ApiPropertyOptional({
    type: [SocialMediaEntry],
    description: 'List of influencer social media profiles with platform, handle, follower count, and URL.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaEntry)
  socialMedia?: SocialMediaEntry[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Custom tags associated with the influencer content or niche',
    example: ['fitness', 'lifestyle'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Geographical location of the influencer',
    example: 'New York, USA',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Engagement rate calculated from the influencer content',
    example: 4.3,
  })
  @IsOptional()
  @IsNumber()
  engagementRate?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'List of image URLs showcasing influencer content',
    example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'List of video URLs showcasing influencer content',
    example: ['https://example.com/video1.mp4'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @ApiPropertyOptional({
    description: 'Bio or description about the influencer',
    example: 'Fashion and lifestyle influencer',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    description: 'To disable user',
    example: 'true',
  })
  disabled?: boolean;
}
