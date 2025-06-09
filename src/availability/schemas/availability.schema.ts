import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TimeSlotStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  BOOKED = 'booked',
}

export interface TimeSlot {
  startTime: string; // Format: "HH:mm" (24-hour format)
  endTime: string; // Format: "HH:mm" (24-hour format)
  status: TimeSlotStatus;
  bookingId?: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Availability {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  influencerId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({
    type: [
      {
        startTime: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              const [hours, minutes] = v.split(':').map(Number);
              return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
            },
            message: 'Start time must be in HH:mm format with 30-minute intervals',
          },
        },
        endTime: {
          type: String,
          required: true,
          validate: {
            validator: function (v: string) {
              const [hours, minutes] = v.split(':').map(Number);
              return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
            },
            message: 'End time must be in HH:mm format',
          },
        },
        status: {
          type: String,
          enum: Object.values(TimeSlotStatus),
          default: TimeSlotStatus.AVAILABLE,
        },
        bookingId: {
          type: Types.ObjectId,
          ref: 'Booking',
          required: false,
        },
      },
    ],
    required: true,
  })
  timeSlots: TimeSlot[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type AvailabilityDocument = Availability & Document;
export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Index for efficient querying
AvailabilitySchema.index({ influencerId: 1, date: 1 });
AvailabilitySchema.index({ status: 1 });
