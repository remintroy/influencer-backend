import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum OrderStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Schema({ timestamps: true })
export class OrderItem {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'InfluencerServices' })
  serviceId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  influencerIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Contract', required: false })
  contractId?: Types.ObjectId;

  @Prop({
    type: {
      contractId: { type: Types.ObjectId, ref: 'Contract', required: false },
      clientSigned: { type: Boolean, default: false },
      influencerSigned: { type: Boolean, default: false },
      signedAt: { type: Date },
    },
    required: false,
    default: undefined,
  })
  contractSignatures?: {
    contractId?: Types.ObjectId;
    clientSigned?: boolean;
    influencerSigned?: boolean;
    signedAt?: Date;
  };

  @Prop({ type: Date, required: true })
  deliveryDate: Date;

  @Prop({ type: String })
  location?: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  rejectedBy?: Types.ObjectId;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Boolean, default: false })
  isPaid: boolean;
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  orderGroupId: string;

  @Prop({ type: OrderItem, required: true })
  item: OrderItem;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop()
  paymentDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order); 