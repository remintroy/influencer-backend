import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

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

  @Prop({ type: String })
  userSignatureImage?: string;

  @Prop({ type: String })
  influencerSignatureImage?: string;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
