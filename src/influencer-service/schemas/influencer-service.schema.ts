import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type InfluencerServiceDocument = InfluencerServices & Document;

export type InfluencerServicePaginationResponse = PaginationResponse<Partial<InfluencerServices>[]>;

export enum ServiceType {
  INDIVIDUAL = 'individual',
  COLLABORATION = 'collaboration'
}

@Schema({ timestamps: true })
export class InfluencerServices {
  _id?: Types.ObjectId | string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  users?: Types.ObjectId[] | string[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ required: true, enum: ServiceType, default: ServiceType.INDIVIDUAL })
  type: ServiceType;

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

  // Collaboration specific fields
  @Prop({ type: Object })
  collaborationDetails?: {
    title?: string;
    images?: string[];
    description?: string;
  };
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
