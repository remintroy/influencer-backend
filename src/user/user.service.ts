import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { isValidObjectId, Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from './schemas/user.schema';
import { InfluencerServiceDocument, InfluencerServices } from './schemas/influencer-service.schema';

export interface UserPaginationResponse {
  totalDocs: number;
  page: number;
  limit: number;
  docs: Partial<User>[];
}

export interface InfluencerServicePaginationResponse {
  totalDocs: number;
  page: number;
  limit: number;
  docs: Partial<InfluencerServices>[];
}

@Injectable()
export class UserService {
  // Exclude sensitive/internal fields from responses
  private readonly projection: { [key: string]: false | 0 | undefined } = { password: 0, deleted: 0, __v: 0 };

  // Default query to filter out disabled or soft-deleted users
  private readonly defaultQuery = { deleted: false, disabled: false };

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
  ) {}

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
      ...this.defaultQuery,
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
    if (!isValidObjectId(id)) throw new BadRequestException('Invalid influencerId');

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

  async createInfluencerService(influencerId: string, data: InfluencerServices) {
    const dataFromDb = await this.getInfluencerById(influencerId);
    if (!dataFromDb) throw new NotFoundException('User not found');
    if (dataFromDb?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({ message: 'Only influencer can create service', error: 'Access Denied' });
    }
    return await this.influencerServiceModal.create({ ...data, influencerId: new Types.ObjectId(influencerId) });
  }

  async updateInfluencerService(serviceId: string, data: Partial<InfluencerServices>, options?: { influencerId?: string }) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    if (options?.influencerId && !isValidObjectId(options?.influencerId)) throw new BadRequestException('Invalid influencerId');

    return await this.influencerServiceModal.findOneAndUpdate(
      {
        _id: new Types.ObjectId(serviceId),
        ...(options?.influencerId ? { influencerId: new Types.ObjectId(options?.influencerId) } : {}),
      },
      { $set: data },
      { new: true },
    );
  }

  async getInfluencerServiceByServiceId(serviceId: string) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    return await this.influencerServiceModal.findById(serviceId);
  }

  async getInfluencerServicesByInfluencerId(
    influencerId: string,
    params?: { page?: number; limit?: number },
  ): Promise<InfluencerServicePaginationResponse> {
    if (!isValidObjectId(influencerId)) throw new BadRequestException('Invalid influencerId');

    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));

    const data = await this.influencerServiceModal.aggregate([
      {
        $match: { influencerId: new Types.ObjectId(influencerId) },
      },
      {
        $lookup: {
          from: 'users',
          as: 'influencerData',
          let: { influencerId: '$influencerId' },
          pipeline: [
            { $match: { ...this.defaultQuery, $expr: { $and: [{ $eq: ['$_id', '$$influencerId'] }] } } },
            { $project: this.projection },
          ],
        },
      },
      {
        $set: {
          influencerData: { $arrayElemAt: ['$influencerData', 0] },
        },
      },
      {
        $match: {
          'influencerData._id': { $exists: true },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
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

    return data?.[0];
  }

  async deleteInfluencerServiceById(serviceId: string, influencerId?: string) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    if (influencerId && !isValidObjectId(influencerId)) throw new BadRequestException('Invalid influencerId');

    const deleted = await this.influencerServiceModal.deleteOne({
      _id: new Types.ObjectId(serviceId),
      ...(influencerId ? { influencerId: new Types.ObjectId(influencerId) } : {}),
    });

    return { message: 'Influencer service deleted successfully', deleted: deleted.deletedCount > 0 };
  }
}
