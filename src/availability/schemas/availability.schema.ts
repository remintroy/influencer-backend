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
              return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && minutes % 30 === 0;
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
              return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 && minutes % 30 === 0;
            },
            message: 'End time must be in HH:mm format with 30-minute intervals',
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
    validate: {
      validator: function (slots: TimeSlot[]) {
        // Validate each individual slot
        for (const slot of slots) {
          const [startHour, startMin] = slot.startTime.split(':').map(Number);
          const [endHour, endMin] = slot.endTime.split(':').map(Number);
          
          // Check if slot duration is exactly 30 minutes
          const duration = endHour * 60 + endMin - (startHour * 60 + startMin);
          if (duration !== 30) return false;

          // Check if slot times are valid
          if (startHour < 0 || startHour >= 24 || endHour < 0 || endHour >= 24) return false;
          if (startMin % 30 !== 0 || endMin % 30 !== 0) return false;
        }

        // Check for overlapping slots
        for (let i = 0; i < slots.length; i++) {
          for (let j = i + 1; j < slots.length; j++) {
            const slot1 = slots[i];
            const slot2 = slots[j];
            
            const slot1Start = slot1.startTime;
            const slot1End = slot1.endTime;
            const slot2Start = slot2.startTime;
            const slot2End = slot2.endTime;

            // Check if slots overlap
            if (
              (slot1Start <= slot2Start && slot1End > slot2Start) ||
              (slot2Start <= slot1Start && slot2End > slot1Start)
            ) {
              return false;
            }
          }
        }

        return true;
      },
      message: 'Time slots must be exactly 30 minutes long and must not overlap',
    },
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
