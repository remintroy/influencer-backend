import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const OptSchema = SchemaFactory.createForClass(Otp);

// Index for faster queries
OptSchema.index({ userId: 1 });

// Adding TTL index to the expiresAt field
OptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
