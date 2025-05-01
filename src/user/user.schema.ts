import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  INFLUENCER = 'influencer',
}

export enum UserAccountType {
  INDIVIDUAL = 'individual',
  AGENCY = 'agency',
}

export enum InfluencerPlatforms {
  Instagram = 'Instagram',
  YouTube = 'YouTube',
  TikTok = 'TikTok',
  Twitter = 'Twitter',
  Facebook = 'Facebook',
  LinkedIn = 'LinkedIn',
  Other = 'Other',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phoneNumber?: string;

  @Prop({ minlength: 6 })
  password?: string;

  @Prop()
  name?: string;

  @Prop()
  profilePicture?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop()
  verificationCode?: string;

  @Prop()
  verificationCodeExpires?: Date;

  @Prop({ enum: UserAccountType, default: UserAccountType.INDIVIDUAL })
  accountType?: UserAccountType;

  @Prop()
  commercialRegistrationID?: string;

  // Influencer-specific fields
  @Prop({
    type: [
      {
        platform: { type: String, enum: InfluencerPlatforms },
        handle: String,
        followers: Number,
        url: String,
      },
    ],
    default: [],
  })
  socialMedia?: {
    platform: string;
    handle?: string;
    followers?: number;
    url?: string;
  }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  category?: Types.ObjectId[];

  @Prop([String])
  tags?: string[];

  @Prop()
  bio?: string;

  @Prop()
  location?: string;

  @Prop()
  engagementRate?: number;

  @Prop()
  profileImage?: string;

  @Prop({ default: false })
  welcomeMailWithPasswordSent?: boolean;

  @Prop()
  welcomeMailWithPasswordSentAt?: Date;

  @Prop([String])
  images?: string[];

  @Prop([String])
  videos?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
