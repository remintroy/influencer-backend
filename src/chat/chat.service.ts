import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatRoom, ChatRoomDocument } from './schemas/chat-room.schema';
import { Message, MessageDocument } from './schemas/message.schema';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom.name) private chatRoomModel: Model<ChatRoomDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private readonly userService: UserService
  ) { }

  /**
   * Find or create a chat room for participants (supports direct and collaboration/group chat)
   */
  async initiateChatRoom(
    userId: string,
    dto: { participantId?: string; participants?: string[]; type?: 'direct' | 'collaboration' },
  ): Promise<ChatRoomDocument> {
    let participants: string[];
    let type = dto.type || 'direct';

    if (type === 'collaboration' && dto.participants && dto.participants.length > 0) {
      participants = Array.from(new Set([userId, ...dto.participants]));
    } else if (dto.participantId) {
      participants = Array.from(new Set([userId, dto.participantId]));
    } else {
      throw new Error('No participants specified');
    }

    // Find existing chat room with same participants and type
    let chatRoom = await this.chatRoomModel.findOne({
      participants: { $all: participants.map((id) => new Types.ObjectId(id)), $size: participants.length },
      // Optionally, you can add a 'type' field to the schema for more explicit type checking
    });
    if (!chatRoom) {
      chatRoom = await this.chatRoomModel.create({
        participants: participants.map((id) => new Types.ObjectId(id)),
        unreadCount: {},
        lastMessage: null,
        // type: type, // Uncomment if you add a type field to the schema
      });
    }
    return chatRoom;
  }

  /**
   * Get all chat rooms for a user
   */
  async getUserChats(userId: string, opts?: { userLookup?: boolean }): Promise<ChatRoomDocument[]> {
    return await this.chatRoomModel.aggregate([
      {
        $match: {
          participants: new Types.ObjectId(userId)
        }
      },
      {
        $sort: {
          updatedAt: -1
        }
      },
      ...(opts?.userLookup ? [{
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
          pipeline: [
            {
              $project: this.userService.projection
            }
          ]
        }
      }] : [])
    ])
  }

  /**
   * Helper to check if user is a participant in the chat room
   */
  async ensureParticipant(chatId: string, userId: string, opts?: { userLookup?: boolean }) {
    const [chatRoom] = await this.chatRoomModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(chatId)
        }
      },
      ...(opts?.userLookup ? [{
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participants',
          pipeline: [
            {
              $project: this.userService.projection
            }
          ]
        }
      }] : [])
    ]);

    if (!chatRoom || !chatRoom.participants.map((p: any) => String(p?._id)).includes(String(userId))) {
      throw new ForbiddenException('You are not a participant in this chat room');
    }
    return chatRoom;
  }

  /**
   * Update last message and unread count in chat room
   */
  async updateLastMessage(chatId: string, message: any, userId: string): Promise<void> {
    if (userId) await this.ensureParticipant(chatId, userId);
    await this.chatRoomModel.findByIdAndUpdate(chatId, {
      lastMessage: message,
      updatedAt: new Date(),
    });
  }

  /**
   * Reset unread count for a user in a chat room
   */
  async resetUnreadCount(chatId: string, userId: string): Promise<void> {
    await this.ensureParticipant(chatId, userId);
    await this.chatRoomModel.findByIdAndUpdate(chatId, {
      $set: { [`unreadCount.${userId}`]: 0 },
    });
  }

  /**
   * Create and persist a new message
   */
  async createMessage(data: Partial<Message>): Promise<MessageDocument> {
    await this.ensureParticipant(String(data.chatId), data?.sender! + '');
    return this.messageModel.create(data);
  }

  /**
   * Get paginated messages for a chat room
   */
  async getMessages(chatId: string, page = 1, limit = 20, userId: string): Promise<MessageDocument[]> {
    if (userId) await this.ensureParticipant(chatId, userId);
    return this.messageModel
      .find({ chatId: new Types.ObjectId(chatId) })
      .sort({ sentAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(chatId: string, userId: string, messageIds?: string[]): Promise<void> {
    await this.ensureParticipant(chatId, userId);
    const filter: any = { chatId, receiver: userId, status: { $ne: 'read' } };
    if (messageIds && messageIds.length > 0) {
      filter._id = { $in: messageIds };
    }
    await this.messageModel.updateMany(filter, { status: 'read', readAt: new Date() });
  }

  /**
   * Delete a message (only sender or admin can delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<{ success: boolean }> {
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new Error('Message not found');
    await this.ensureParticipant(String(message.chatId), userId);
    if (String(message.sender) !== String(userId)) {
      throw new ForbiddenException('Only the sender can delete this message');
    }
    await this.messageModel.deleteOne({ _id: messageId });
    return { success: true };
  }
}
