import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';

export interface UserPaginationResponse {
  totalDocs: number;
  page: number;
  limit: number;
  docs: Partial<User>[];
}

@Injectable()
export class UserService {
  // Exclude sensitive/internal fields from responses
  private readonly projection = { password: 0, deleted: 0, __v: 0 };

  // Default query to filter out disabled or soft-deleted users
  private readonly defaultQuery = { deleted: false, disabled: false };

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  // Helper to strip out sensitive fields and return safe user object
  private toUserSafe(user: any): Partial<User> | null {
    if (!user) return null;
    const { password, __v, ...rest } = user?.toJSON?.() || user;
    return rest;
  }

  // Validates MongoDB ObjectId string
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * Fetches a user by email or phone without filtering by role or deleted status.
   */
  async getUserByEmailOrPhoneSudo(
    username: string,
    options?: { email?: string; phoneNumber?: string },
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ $or: [{ email: options?.email || username }, { phoneNumber: options?.phoneNumber || username }] })
      .lean();
  }

  /**
   * Fetches a non-admin active user by email or phone.
   */
  async getUserByEmailOrPhone(
    username: string,
    options?: { email?: string; phoneNumber?: string },
  ): Promise<Partial<User> | null> {
    const user = await this.userModel.findOne(
      {
        $or: [{ email: options?.email || username }, { phoneNumber: options?.phoneNumber || username }],
        role: { $ne: UserRole.ADMIN },
        ...this.defaultQuery,
      },
      this.projection,
    );
    return this.toUserSafe(user);
  }

  /**
   * Fetches a paginated list of users (default role: **USER**).
   */
  async getAllUsersSudo(params: { page?: number; limit?: number; role?: UserRole }): Promise<UserPaginationResponse> {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 10));
    const role = params.role || UserRole.USER;

    const result = await this.userModel.aggregate([
      { $match: { role, deleted: false } },
      { $sort: { name: 1, createdAt: 1 } },
      { $project: this.projection },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
          ],
        },
      },
      {
        $project: {
          totalDocs: { $ifNull: [{ $arrayElemAt: ['$metadata.totalDocs', 0] }, 0] },
          page: { $literal: page },
          limit: { $literal: limit },
          docs: '$data',
        },
      },
    ]);

    return result?.[0];
  }

  /**
   * Creates a user without enforcing any filters.
   */
  async createUserSudo(data: User): Promise<UserDocument> {
    const createdUser = await this.userModel.create(data);
    const dataOut = createdUser.toJSON();
    delete dataOut.password;
    delete dataOut.meta;
    return dataOut;
  }

  /**
   * Updates a user by ID without filtering role; used in admin context.
   */
  async updateUserSudo(id: string, data: Partial<User>): Promise<UserDocument | null> {
    if (!this.isValidObjectId(id)) throw new NotFoundException('Invalid user ID');
    delete data._id;
    return this.userModel.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  /**
   * Updates a user by ID, excluding admins and disabled/deleted users.
   */
  async updateUser(id: string, data: Partial<User>): Promise<Partial<User> | null> {
    delete data._id;
    delete data.role;

    if (!this.isValidObjectId(id)) throw new NotFoundException('Invalid user ID');

    const user = await this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), role: { $ne: UserRole.ADMIN }, deleted: false },
      { $set: data },
      { new: true, projection: this.projection },
    );
    return this.toUserSafe(user);
  }

  /**
   * Soft-deletes a user (admin-safe).
   */
  async deleteUserSudo(id: string): Promise<UserDocument | null> {
    return this.userModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), role: { $ne: UserRole.ADMIN }, deleted: { $ne: true } },
      { $set: { deleted: true } },
      { new: true, projection: this.projection },
    );
  }

  /**
   * Fetches any user by ID (no filters).
   */
  async getUserByIdSudo(id: string): Promise<UserDocument | null> {
    if (!this.isValidObjectId(id)) throw new NotFoundException('Invalid user ID');
    return this.userModel
      .findOne({ _id: new Types.ObjectId(id), deleted: false })
      .populate('category')
      .lean();
  }

  /**
   * Fetches an active user with role **USER**.
   */
  async getUserById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id), role: { $ne: UserRole.ADMIN }, ...this.defaultQuery }, this.projection)
      .populate('category');

    return this.toUserSafe(user);
  }

  async getInfluencerSearchPaginated(
    search: string,
    options: { category?: string; platform?: string; page?: number; limit?: number },
  ): Promise<UserPaginationResponse> {
    const limit = options?.limit || 10;
    const page = options?.page || 1;

    let baseQuery: any = {
      role: UserRole.INFLUENCER,
    };

    if (search) {
      baseQuery = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
          { 'socialMedia.platform': { $regex: search, $options: 'i' } },
        ],
      };
    }

    const userData = await this.userModel.aggregate([
      { $match: baseQuery },
      {
        $match: {
          ...(options?.category ? { category: new Types.ObjectId(options?.category) } : {}),
          ...(options?.platform ? { 'socialMedia.platform': options?.platform } : {}),
        },
      },
      { $sort: { name: 1, createdAt: 1 } },
      { $project: this.projection },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
          ],
        },
      },
      {
        $project: {
          totalDocs: { $ifNull: [{ $arrayElemAt: ['$metadata.totalDocs', 0] }, 0] },
          page: { $literal: page },
          limit: { $literal: limit },
          docs: '$data',
        },
      },
    ]);

    return userData?.[0];
  }

  /**
   * Fetches an active user with role **USER** for Admin (no filters).
   */
  async getUserByIdPreviewSudo(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id), role: { $ne: UserRole.ADMIN }, deleted: { $ne: true } }, this.projection)
      .populate('category');

    return this.toUserSafe(user);
  }

  /**
   * Fetches an active user with role **INFLUENCER**.
   */
  async getInfluencerById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel
      .findOne({ _id: new Types.ObjectId(id), role: UserRole.INFLUENCER, ...this.defaultQuery }, this.projection)
      .lean();
    return this.toUserSafe(user);
  }

  /**
   * Fetches an active user with role **ADMIN**.
   */
  async getAdminById(id: string): Promise<Partial<User> | null> {
    const user = await this.userModel.findOne(
      { _id: new Types.ObjectId(id), role: UserRole.ADMIN, ...this.defaultQuery },
      this.projection,
    );
    return this.toUserSafe(user);
  }
}
