import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthService } from 'src/auth/auth.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ReadMessagesDto } from './dto/read-messages.dto';
import { InitiateChatDto } from './dto/initiate-chat.dto';
import { Types } from 'mongoose';

// For Redis scaling, use the following adapter:
// import { IoAdapter } from '@nestjs/platform-socket.io';
// import { RedisIoAdapter } from '@nestjs/redis';
// In main.ts: app.useWebSocketAdapter(new RedisIoAdapter(app));

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private logger: Logger = new Logger('ChatGateway');
  private server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) { }

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server initialized');
  }

  async handleConnection(client: Socket) {
    // JWT auth from handshake
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = await this.authService.verifyJwtAccessToken(token);
      if (!payload?.userId) throw new UnauthorizedException('Invalid token');
      client.data.user = payload;
      this.logger.log(`Client connected: ${payload?.userId}`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.data?.user?._id}`);
  }

  @SubscribeMessage('initate-chat')
  async initiateChat(@MessageBody() data: InitiateChatDto, @ConnectedSocket() client: Socket) {
    const chatRoom = await this.chatService.initiateChatRoom(client.data.user?.userId!, data);
    client.emit('chat-initiated', chatRoom);
    return chatRoom;
  }

  @SubscribeMessage('join-chat')
  async handleJoinChat(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    const chatRoom = await this.chatService.ensureParticipant(data.chatId, client.data.user?.userId!, { userLookup: true });
    client.join(data.chatId);
    this.logger.log(`User ${client.data.user?.userId} joined chat ${data.chatId}`);
    client.emit("join-chat", chatRoom)
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(@MessageBody() dto: SendMessageDto, @ConnectedSocket() client: Socket) {
    const senderId = client.data.user?.userId;
    const message = await this.chatService.createMessage({
      ...dto,
      sender: new Types.ObjectId(senderId),
      chatId: new Types.ObjectId(dto.chatId),
      status: 'sent',
      sentAt: new Date(),
    });
    await this.chatService.updateLastMessage(dto.chatId, message, senderId);
    this.server.to(dto.chatId).emit('new-message', message);
    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('typing', { userId: client.data.user?.userId });
  }

  @SubscribeMessage('stop-typing')
  handleStopTyping(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    client.to(data.chatId).emit('stopTyping', { userId: client.data.user?.userId });
  }

  @SubscribeMessage('read-messages')
  async handleReadMessages(@MessageBody() dto: ReadMessagesDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.userId;
    await this.chatService.markMessagesRead(dto.chatId, userId, dto.messageIds);
    await this.chatService.resetUnreadCount(dto.chatId, userId);
    this.server.to(dto.chatId).emit('messages-read', { userId, chatId: dto.chatId });
  }

  @SubscribeMessage('my-chats')
  async handleMyChats(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.userId;
    const chats = await this.chatService.getUserChats(userId, { userLookup: true });
    client.emit('my-chats', chats);
    return chats;
  }

  @SubscribeMessage('list-messages')
  async handleListMessages(
    @MessageBody() data: { chatId: string; page?: number; limit?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user?.userId;
    const messages = await this.chatService.getMessages(data.chatId, data.page || 1, data.limit || 20, userId);
    client.emit('list-messages', messages);
    return messages;
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(@MessageBody() dto: ReadMessagesDto, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.userId;
    await this.chatService.markMessagesRead(dto.chatId, userId, dto.messageIds);
    await this.chatService.resetUnreadCount(dto.chatId, userId);
    this.server.to(dto.chatId).emit('messagesRead', { userId, chatId: dto.chatId });
    return { success: true };
  }

  @SubscribeMessage('delete-message')
  async handleDeleteMessage(@MessageBody() data: { messageId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.user?.userId;
    const result = await this.chatService.deleteMessage(data.messageId, userId);
    client.emit('deleted-message', { ...result, messageId: data.messageId });
    return result;
  }
}
