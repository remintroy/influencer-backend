import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type CategoryDocument = Category & Document;
export type CategoryPaginationResponse = PaginationResponse<Partial<Category>[]>;

@Schema({ timestamps: true })
export class Category {
  id?: Types.ObjectId | string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  imageUrl: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
