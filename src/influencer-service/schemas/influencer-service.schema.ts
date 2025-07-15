import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type InfluencerServiceDocument = InfluencerServices & Document;

export type InfluencerServicePaginationResponse = PaginationResponse<Partial<InfluencerServices>[]>;

export enum ServiceType {
  INDIVIDUAL = 'individual',
  COLLABORATION = 'collaboration',
}

@Schema({ timestamps: true })
export class Contract {
  _id?: Types.ObjectId | string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'InfluencerServices', required: true })
  serviceId: Types.ObjectId;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);

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

  @Prop({ required: true, type: Number, min: 1 })
  minimumDaysForCompletion: number;

  // @Prop({ default: false, type: Boolean })
  // requireTimeSlot?: boolean;

  @Prop({ default: false, type: Boolean })
  locationRequired?: boolean;

  @Prop({ default: 0, type: Number })
  duration?: number;

  // Collaboration specific fields
  @Prop({ type: Object })
  collaborationDetails?: {
    title?: string;
    images?: string[];
    description?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contract?: Types.ObjectId | string;
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
