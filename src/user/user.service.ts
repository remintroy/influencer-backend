import { Injectable } from '@nestjs/common';
import { User, UserDocument } from './user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async getUserByEmailOrPhone(username: string): Promise<UserDocument | null> {
    return (await this.userModel.findOne({ $or: [{ email: username }, { phoneNumber: username }] }))?.toJSON?.() || null;
  }

  async createUser(data: User): Promise<UserDocument> {
    const response = (await this.userModel.create(data))?.toJSON?.() || null;
    delete response?.password;
    return response;
  }

  async updateUser(id: string, data: Partial<User>): Promise<UserDocument | null> {
    delete data?._id;
    delete data?.role;
    const response = (await this.userModel.findByIdAndUpdate(id, { $set: data }, { new: true }))?.toJSON() || null;
    delete response?.password;
    return response;
  }

  async getUserById(id: string): Promise<UserDocument | null> {
    return (await this.userModel.findById(id))?.toJSON?.() || null;
  }
}
