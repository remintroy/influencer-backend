import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

export type FavoriteDocument = Favorite & Document;

export type FavoritePaginationResponse = PaginationResponse<Partial<Favorite>[]>;

@Schema({ timestamps: true })
export class Favorite {
  _id?: Types.ObjectId | string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  influencerId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// Create compound index to ensure a user can only favorite an influencer once
FavoriteSchema.index({ userId: 1, influencerId: 1 }, { unique: true }); 