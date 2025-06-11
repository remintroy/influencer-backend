import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CartItemStatus {
  PENDING = 'PENDING',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
}

@Schema()
export class TimeSlot {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;
}

@Schema({ _id: true, timestamps: true })
export class CartItem {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'InfluencerServices' })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  influencerId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  bookingDate: Date;

  @Prop({ type: String })
  startTime?: string;

  @Prop({ type: String })
  endTime?: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: Boolean, default: false })
  disabled: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop({ type: Number, default: 0 })
  totalAmount: number;
}

export type CartDocument = Cart & Document;

export const CartSchema = SchemaFactory.createForClass(Cart);

// Indexes
CartSchema.index({ userId: 1 });
CartSchema.index({ 'items.serviceId': 1 });
CartSchema.index({ 'items.influencerId': 1 });
