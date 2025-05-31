import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type InfluencerServiceDocument = InfluencerServices & Document;

export type InfluencerServicePaginationResponse = PaginationResponse<Partial<InfluencerServices>[]>;

@Schema({ timestamps: true })
export class InfluencerServices {
  _id?: Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Collaboration' })
  collaborationId?: Types.ObjectId | string;

  @Prop()
  imageUrl: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  price?: number;

  @Prop({ default: false, type: Boolean })
  requireTimeSlot?: boolean;
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
