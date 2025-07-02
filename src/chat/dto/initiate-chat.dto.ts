import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, ArrayMinSize } from 'class-validator';

export class InitiateChatDto {
  @ApiPropertyOptional({ description: 'Collaboration ID (if this is a collaboration chat)', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsOptional()
  collaborationId?: string;

  @ApiProperty({ description: 'Array of participant user IDs. If collaborationId is provided, this will be ignored and fetched from the collaboration service.', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  participants: string[];
}
