import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop()
  revokedAt?: Date;

  @Prop()
  deviceInfo?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index for faster queries
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ userId: 1 });

// Adding TTL index to the expiresAt field
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
