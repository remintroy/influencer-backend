import { BadRequestException, ForbiddenException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from 'src/user/schemas/user.schema';
import {
  InfluencerServiceDocument,
  InfluencerServicePaginationResponse,
  InfluencerServices,
} from './schemas/influencer-service.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class InfluencerServiceService {
  constructor(
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
    private readonly userService: UserService,
  ) {}

  async createInfluencerService(influencerId: string, data: InfluencerServices) {
    //TODO: this is a collaboration service
    throw new NotImplementedException();

    const dataFromDb = await this.userService.getInfluencerById(influencerId);
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
            { $match: { ...this.userService.defaultQuery, $expr: { $and: [{ $eq: ['$_id', '$$influencerId'] }] } } },
            { $project: this.userService.projection },
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
