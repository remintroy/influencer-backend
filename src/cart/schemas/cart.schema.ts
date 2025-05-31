import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: false })
export class TimeSlot {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: String, required: true })
  startTime: string;

  @Prop({ type: String, required: true })
  endTime: string;
}

@Schema({ _id: false })
export class CartItem {
  @Prop({ type: Types.ObjectId, required: true })
  serviceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  influencerId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Boolean, required: true })
  requiresTimeSlot: boolean;

  @Prop({
    type: TimeSlot,
    validate: {
      validator: function(timeSlot: TimeSlot | null) {
        if (!this.requiresTimeSlot) return true;
        if (!timeSlot) return false;

        const { date, startTime, endTime } = timeSlot;
        if (!date || !startTime || !endTime) return false;

        // Validate time format (HH:mm)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-3]0$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) return false;

        // Validate 30-minute interval
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        return endMinutes - startMinutes === 30;
      },
      message: 'Time slot must be in HH:mm format with 30-minute intervals',
    },
  })
  timeSlot?: TimeSlot;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: String })
  title?: string;

  @Prop({ type: String })
  description?: string;
}

@Schema({ timestamps: true })
export class Cart {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [CartItem], default: [] })
  items: CartItem[];

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type CartDocument = Cart & Document;
export const CartSchema = SchemaFactory.createForClass(Cart);

// Indexes
CartSchema.index({ userId: 1 });
CartSchema.index({ 'items.serviceId': 1 });
CartSchema.index({ 'items.influencerId': 1 }); 