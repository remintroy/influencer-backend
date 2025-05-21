import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InfluencerServiceDocument = InfluencerServices & Document;

@Schema({ timestamps: true })
export class InfluencerServices {
  _id?: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  influencerId: Types.ObjectId;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  price?: number;
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
