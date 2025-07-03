import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatRoomDocument = ChatRoom & Document;

export enum ChatRoomType {
  INDIVIDUAL = 'individual',
  COLLABORATION = 'collaboration',
}


@Schema({ timestamps: true })
export class ChatRoom {
  @Prop({ type: [Types.ObjectId], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Object, default: {} })
  unreadCount: Record<string, number>; // userId -> count

  @Prop({ type: Object, default: null })
  lastMessage: any; // Will be populated with the latest message

  @Prop({ type: String, enum: ChatRoomType, default: ChatRoomType.INDIVIDUAL })
  roomType: ChatRoomType;
}

export const ChatRoomSchema = SchemaFactory.createForClass(ChatRoom);
