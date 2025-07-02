import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export type MessageType = 'text' | 'image' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'ChatRoom', required: true })
  chatId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  sender: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, enum: ['text', 'image', 'file'], default: 'text' })
  type: MessageType;

  @Prop({ type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' })
  status: MessageStatus;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop({ type: Date })
  deliveredAt?: Date;

  @Prop({ type: Date })
  readAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
