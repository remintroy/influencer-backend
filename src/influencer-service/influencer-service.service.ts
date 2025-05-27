import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from 'src/user/schemas/user.schema';
import {
  InfluencerServiceDocument,
  InfluencerServicePaginationResponse,
  InfluencerServices,
} from './schemas/influencer-service.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { CollaborationService } from 'src/collaboration/collaboration.service';

@Injectable()
export class InfluencerServiceService {
  constructor(
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
    private readonly userService: UserService,
    private readonly collaborationService: CollaborationService,
  ) {}

  async createInfluencerService(createdBy: string, data: InfluencerServices) {
    const dataFromDb = await this.userService.getInfluencerById(createdBy);

    if (data.collaborationId) data.collaborationId = new Types.ObjectId(data.collaborationId);
    if (!data.userId && !data.collaborationId) data.userId = new Types.ObjectId(createdBy);

    if (!dataFromDb) throw new NotFoundException('User not found');
    if (dataFromDb?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({ message: 'Only influencer can create service', error: 'Access Denied' });
    }

    return await this.influencerServiceModal.create({ ...data, createdBy: new Types.ObjectId(createdBy) });
  }

  async updateInfluencerService(serviceId: string, data: Partial<InfluencerServices>, options?: { currentUser?: string }) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    if (serviceData?.createdBy + '' != options?.currentUser + '' && !serviceData?.collaborationId) {
      throw new ForbiddenException("You don't have permisson to update this service");
    }

    if (serviceData.collaborationId) {
      const data = await this.collaborationService.getCollaborationById(serviceData?.collaborationId as string);
      if (!data?.users?.map((e: any) => e + '')?.includes(options?.currentUser + '')) {
        throw new ForbiddenException("You don't have permisson to update this service");
      }
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
        $match: { userId: new Types.ObjectId(influencerId) },
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

  async getInfluencerServicesByCollaborationId(
    collaborationId: string,
    params?: { page?: number; limit?: number },
  ): Promise<InfluencerServicePaginationResponse> {
    if (!isValidObjectId(collaborationId)) throw new BadRequestException('Invalid collaborationId');

    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));

    const data = await this.influencerServiceModal.aggregate([
      {
        $match: { collaborationId: new Types.ObjectId(collaborationId) },
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

    if (serviceData?.createdBy + '' != currentUserId + '' && !serviceData?.collaborationId) {
      throw new ForbiddenException("You don't have permisson to update this service");
    }

    if (serviceData.collaborationId) {
      const data = await this.collaborationService.getCollaborationById(serviceData?.collaborationId as string);
      if (!data?.users?.map((e: any) => e + '')?.includes(currentUserId + '')) {
        throw new ForbiddenException("You don't have permisson to update this service");
      }
    }

    const deleted = await this.influencerServiceModal.deleteOne({ _id: new Types.ObjectId(serviceId) });

    return { message: 'Influencer service deleted successfully', deleted: deleted.deletedCount > 0 };
  }
}
