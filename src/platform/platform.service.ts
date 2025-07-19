import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Platform, PlatformDocument, PlatformPaginationResponse } from './schemas/platform.schema';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(Platform.name) private platformModel: Model<PlatformDocument>,
    @InjectModel(User.name) private userModel: Model<User>
  ) {}

  async create(dto: CreatePlatformDto): Promise<Platform> {
    const exists = await this.platformModel.findOne({ name: dto.name });
    if (exists) throw new ConflictException('Platform name must be unique');
    const created = new this.platformModel(dto);
    return created.save();
  }

  async findAll({ page = 1, limit = 10 }: { page?: number; limit?: number }): Promise<PlatformPaginationResponse> {
    const skip = (page - 1) * limit;
    const result = await this.platformModel.aggregate([
      { $sort: { name: 1, createdAt: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [{ $skip: skip }, { $limit: limit }],
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
    return result[0];
  }

  async findOne(id: string): Promise<Platform | null> {
    return this.platformModel.findById(id).exec();
  }

  async update(id: string, dto: UpdatePlatformDto): Promise<Platform | null> {
    if (dto.name) {
      const exists = await this.platformModel.findOne({ name: dto.name, _id: { $ne: id } });
      if (exists) throw new ConflictException('Platform name must be unique');
    }
    return this.platformModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async remove(id: string): Promise<Platform | null> {
    // Check if any influencer references this platform
    const influencer = await this.userModel.findOne({ 'socialMedia.platform': new Types.ObjectId(id) });
    if (influencer) throw new BadRequestException('Cannot delete: Platform is used by at least one influencer');
    return this.platformModel.findByIdAndDelete(id).exec();
  }
} 