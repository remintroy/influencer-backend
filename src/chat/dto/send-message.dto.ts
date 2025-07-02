import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Chat room ID', example: '60d0fe4f5311236168a109ca' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Message content', example: 'Hello!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Message type', enum: ['text', 'image', 'file'], default: 'text' })
  @IsString()
  @IsIn(['text', 'image', 'file'])
  type: 'text' | 'image' | 'file';
}
