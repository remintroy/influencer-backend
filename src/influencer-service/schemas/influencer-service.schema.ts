import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InfluencerServiceDocument = InfluencerServices & Document;

export interface InfluencerServicePaginationResponse {
  totalDocs: number;
  page: number;
  limit: number;
  docs: Partial<InfluencerServices>[];
}

@Schema({ timestamps: true })
export class InfluencerServices {
  _id?: Types.ObjectId | string;

  @Prop({ required: true, type: [Types.ObjectId], ref: 'User' })
  owners: Types.ObjectId[];

  @Prop({ required: true, type: [Types.ObjectId], ref: 'User' })
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
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
