import { Body, Controller, Get, Post, Query, Param, Req, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { InitiateChatDto } from './dto/initiate-chat.dto';
import { ReadMessagesDto } from './dto/read-messages.dto';
import { Request } from 'express';

@ApiTags('Chat (Beta)')
@ApiBearerAuth('access-token')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate or find a chat room' })
  @ApiBody({ type: InitiateChatDto })
  async initiateChat(@Req() req: Request, @Body() dto: InitiateChatDto) {
    return this.chatService.initiateChatRoom(req.user?.userId!, dto);
  }

  @Get('my-chats')
  @ApiOperation({ summary: 'Get all chat rooms for current user' })
  async getMyChats(@Req() req: Request) {
    return this.chatService.getUserChats(req.user?.userId!);
  }

  @Get(':chatId/messages')
  @ApiOperation({ summary: 'Get paginated messages for a chat room' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(@Req() req: Request, @Param('chatId') chatId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.chatService.getMessages(chatId, Number(page), Number(limit), req.user?.userId!);
  }

  @Post(':chatId/mark-read')
  @ApiOperation({ summary: 'Mark messages as read in a chat' })
  @ApiBody({ type: ReadMessagesDto })
  async markRead(@Req() req: Request, @Param('chatId') chatId: string, @Body() dto: ReadMessagesDto) {
    await this.chatService.markMessagesRead(chatId, req.user?.userId!, dto.messageIds);
    await this.chatService.resetUnreadCount(chatId, req.user?.userId!);
    return { success: true };
  }

  @Delete(':chatId/messages/:messageId')
  async deleteMessage(@Req() req: Request, @Param('chatId') chatId: string, @Param('messageId') messageId: string) {
    return this.chatService.deleteMessage(messageId, req.user?.userId!);
  }
}
