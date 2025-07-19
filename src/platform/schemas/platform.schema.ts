import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type PlatformDocument = Platform & Document;
export type PlatformPaginationResponse = PaginationResponse<Partial<Platform>[]>;

@Schema({ timestamps: true })
export class Platform {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ default: true })
  isActive?: boolean;

  @Prop()
  imageUrl?: string;
}

export const PlatformSchema = SchemaFactory.createForClass(Platform);
