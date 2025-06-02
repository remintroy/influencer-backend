import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from 'src/user/schemas/user.schema';
import {
  InfluencerServiceDocument,
  InfluencerServicePaginationResponse,
  InfluencerServices,
  ServiceType,
} from './schemas/influencer-service.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class InfluencerServiceService {
  constructor(
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
    private readonly userService: UserService,
  ) {}

  async createInfluencerService(createdBy: string, data: InfluencerServices) {
    const dataFromDb = await this.userService.getInfluencerById(createdBy);

    if (!dataFromDb) throw new NotFoundException('User not found');
    if (dataFromDb?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({ message: 'Only influencer can create service', error: 'Access Denied' });
    }

    // Convert user IDs to ObjectIds
    if (data.users) {
      data.users = data.users.map((id) => new Types.ObjectId(id));
    }

    // Add creator to users array if not present
    if (!data.users) {
      data.users = [new Types.ObjectId(createdBy)];
    } else if (!data.users.some((id) => id.toString() === createdBy)) {
      data.users.push(new Types.ObjectId(createdBy));
    }

    return await this.influencerServiceModal.create({ ...data, createdBy: new Types.ObjectId(createdBy) });
  }

  async updateInfluencerService(serviceId: string, data: Partial<InfluencerServices>, options?: { currentUser?: string }) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    // Check if user has permission to update
    if (!serviceData.users?.map((id) => id.toString()).includes(options?.currentUser)) {
      throw new ForbiddenException("You don't have permission to update this service");
    }

    // Convert user IDs to ObjectIds if present
    if (data.users) {
      data.users = data.users.map((id) => new Types.ObjectId(id));
    }

    return await this.influencerServiceModal.findOneAndUpdate(
      { _id: new Types.ObjectId(serviceId) },
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
        $match: {
          users: new Types.ObjectId(influencerId),
          type: ServiceType.INDIVIDUAL,
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

  async getCollaborationServices(params?: { page?: number; limit?: number }): Promise<InfluencerServicePaginationResponse> {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));

    const data = await this.influencerServiceModal.aggregate([
      {
        $match: { type: ServiceType.COLLABORATION },
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

  async deleteInfluencerServiceById(serviceId: string, currentUserId?: string) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    if (currentUserId && !isValidObjectId(currentUserId)) throw new BadRequestException('Invalid influencerId');

    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    // Check if user has permission to delete
    if (!serviceData.users?.map((id) => id.toString()).includes(currentUserId)) {
      throw new ForbiddenException("You don't have permission to delete this service");
    }

    const deleted = await this.influencerServiceModal.deleteOne({ _id: new Types.ObjectId(serviceId) });

    return { message: 'Influencer service deleted successfully', deleted: deleted.deletedCount > 0 };
  }
}
