import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../user/schemas/user.schema';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, required: true, ref: 'InfluencerService' })
  serviceId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  influencerIds: Types.ObjectId[];

  @Prop({ required: true })
  bookingDate: Date;

  @Prop()
  startTime?: string;

  @Prop()
  endTime?: string;

  @Prop({ required: true, min: 0 })
  price: number;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItem], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;

  @Prop()
  paymentId?: string;

  @Prop()
  paymentDate?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order); 