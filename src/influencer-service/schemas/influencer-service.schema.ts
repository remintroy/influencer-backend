import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type InfluencerServiceDocument = InfluencerServices & Document;

export type InfluencerServicePaginationResponse = PaginationResponse<Partial<InfluencerServices>[]>;

export enum ServiceType {
  INDIVIDUAL = 'individual',
  COLLABORATION = 'collaboration',
}

export enum ServiceStatus {
  PENDING = 'pending',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

@Schema({ timestamps: true })
export class InfluencerServices {
  _id?: Types.ObjectId | string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  users?: Types.ObjectId[] | string[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId; // Influecner id

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  serviceAdminId: Types.ObjectId;

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

  @Prop({ default: false, type: Boolean })
  locationRequired?: boolean;

  // @Prop({ default: 0, type: Number })
  // duration?: number;

  // Collaboration specific fields
  @Prop({ type: Object })
  collaborationDetails?: {
    title?: string;
    images?: string[];
    description?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Contract' })
  contract?: Types.ObjectId | string;

  @Prop({ required: true, enum: ServiceStatus, default: ServiceStatus.PENDING })
  status: ServiceStatus;

  @Prop({ type: String })
  rejectReason?: string;
}

export const InfluencerServicesSchema = SchemaFactory.createForClass(InfluencerServices);
