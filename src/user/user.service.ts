import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './user.schema';

@Injectable()
export class UserService {
  private readonly projection = { password: 0, meta: 0 };

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  private toUserSafe(user: UserDocument | null): Partial<User> | null {
    if (!user) return null;
    const { password, __v, ...rest } = user?.toObject?.() || user;
    return rest;
  }

  async getUserByEmailOrPhoneSudo(
    username: string,
    options?: { email?: string; phoneNumber?: string },
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        $or: [{ email: options?.email || username }, { phoneNumber: options?.phoneNumber || username }],
      })
      .lean();
  }

  async getUserByEmailOrPhone(
    username: string,
    options?: { email?: string; phoneNumber?: string },
  ): Promise<Partial<User> | null> {
    const user = await this.userModel.findOne(
      {
        $or: [{ email: options?.email || username }, { phoneNumber: options?.phoneNumber || username }],
        role: { $ne: UserRole.ADMIN },
        disabled: false,
        deleted: false,
      },
      this.projection,
    );
    return this.toUserSafe(user);
  }

  async createUserSudo(data: User): Promise<UserDocument> {
    return (await this.userModel.create(data)).toJSON();
  }

  async updateUserSudo(id: string, data: Partial<User>): Promise<UserDocument | null> {
    delete data._id;
    return this.userModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  async updateUser(id: string, data: Partial<User>): Promise<Partial<User> | null> {
    delete data._id;
    delete data.role;

    const user = await this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), role: UserRole.USER, disabled: false, deleted: false },
      { $set: data },
      { new: true, projection: this.projection },
    );
    return this.toUserSafe(user);
  }

  async deleteUserSudo(id: string): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), role: { $ne: UserRole.ADMIN }, deleted: { $ne: true } },
      { $set: { deleted: true } },
      { new: true, projection: this.projection },
    );
  }

  async getUserByIdSudo(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: new Types.ObjectId(id), role: { $ne: UserRole.ADMIN } }).lean();
  }

  async getUserById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel.findOne(
      { _id: new Types.ObjectId(id), role: UserRole.USER, disabled: false, deleted: false },
      this.projection,
    );
    return this.toUserSafe(user);
  }

  async getInfluencerById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id), role: UserRole.INFLUENCER, disabled: false, deleted: false }, this.projection)
      .lean();
    return this.toUserSafe(user);
  }

  async getAdminById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel.findOne(
      { _id: new Types.ObjectId(id), role: UserRole.ADMIN, disabled: false, deleted: false },
      this.projection,
    );
    return this.toUserSafe(user);
  }
}
