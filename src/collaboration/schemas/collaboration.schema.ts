import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type CollaborationDocument = Collaboration & Document;
export type CollaborationPaginationResponse = PaginationResponse<Partial<Collaboration>[]>;

@Schema({ timestamps: true })
export class Collaboration {
  _id?: Types.ObjectId | string;

  @Prop({
    required: true,
    default: [],
    type: Types.ObjectId,
    ref: 'User',
  })
  users: Types.ObjectId[] | string[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId | string;

  @Prop()
  imageUrl?: string;

  @Prop({})
  title?: string;

  @Prop({})
  description?: string;
}

export const CollaborationSchema = SchemaFactory.createForClass(Collaboration);
