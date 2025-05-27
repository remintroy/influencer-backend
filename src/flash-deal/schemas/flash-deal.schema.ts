import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type FlashDealDocument = FlashDeal & Document;
export type FlashDealPaginationResponse = PaginationResponse<Partial<FlashDeal>[]>;

@Schema({ timestamps: true })
export class FlashDeal {
  _id?: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'InfluencerServices' })
  serviceId: Types.ObjectId | string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  originalPrice: number;

  @Prop({ required: true })
  discountedPrice: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  totalSold: number;

  @Prop({ default: 0 })
  maxQuantity: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  buyers: Types.ObjectId[] | string[];

  @Prop()
  imageUrl?: string;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const FlashDealSchema = SchemaFactory.createForClass(FlashDeal);
