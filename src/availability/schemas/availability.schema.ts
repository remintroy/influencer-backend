import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TimeSlotStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  BOOKED = 'booked',
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  status: TimeSlotStatus;
  bookingId?: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Availability {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({
    type: [
      {
        startTime: { type: Date, required: true },
        endTime: { type: Date, required: true },
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
    validate: {
      validator: function (slots: TimeSlot[]) {
        // Check for overlapping slots
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const slot1 = slots[i];
            const slot2 = slots[j];

            // Check if slots overlap
            if (
              (slot1.startTime <= slot2.startTime && slot1.endTime > slot2.startTime) ||
              (slot2.startTime <= slot1.startTime && slot2.endTime > slot1.startTime)
            ) {
              return false;
            }
          }
        }

        return true;
      },
      message: 'Time slots must not overlap',
    },
  })
  timeSlots: TimeSlot[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type AvailabilityDocument = Availability & Document;
export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Index for efficient querying
AvailabilitySchema.index({ userId: 1 });
AvailabilitySchema.index({ 'timeSlots.status': 1 });
