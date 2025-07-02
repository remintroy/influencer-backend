import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class ReadMessagesDto {
  @ApiProperty({ description: 'Chat room ID', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiPropertyOptional({ description: 'IDs of messages to mark as read', type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  messageIds?: string[];
} 