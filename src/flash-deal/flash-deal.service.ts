import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FlashDeal, FlashDealDocument } from './schemas/flash-deal.schema';
import { CreateFlashDealDto } from './dto/create-flash-deal.dto';
import { UpdateFlashDealDto } from './dto/update-flash-deal.dto';
import { InfluencerServiceService } from 'src/influencer-service/influencer-service.service';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/schemas/user.schema';

@Injectable()
export class FlashDealService {
  constructor(
    @InjectModel(FlashDeal.name) private readonly flashDealModel: Model<FlashDealDocument>,
    private readonly influencerServiceService: InfluencerServiceService,
    private readonly userService: UserService,
  ) {}

  // admin only
  async createFlashDeal(createdBy: string, data: CreateFlashDealDto) {
    // Validate service exists
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(data.serviceId);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check if service is already part of an active flash deal
    const existingFlashDeal = await this.flashDealModel.findOne({
      serviceId: new Types.ObjectId(data.serviceId),
      isDeleted: false,
      isActive: true,
      $or: [{ startDate: { $lte: new Date(data.endDate) }, endDate: { $gte: new Date(data.startDate) } }],
    });

    if (existingFlashDeal) {
      throw new BadRequestException('This service is already part of an active flash deal');
    }

    // Validate dates
    if (new Date(data.startDate) >= new Date(data.endDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Validate prices
    if (data.discountedPrice >= data.originalPrice) {
      throw new BadRequestException('Discounted price must be less than original price');
    }

    return await this.flashDealModel.create({
      ...data,
      createdBy: new Types.ObjectId(createdBy),
      serviceId: new Types.ObjectId(data.serviceId),
    });
  }

  async getAllFlashDeals(query?: { page?: number; limit?: number }, options?: { sudo?: boolean }) {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;

    const baseMatchQuery: any = { isDeleted: { $ne: true } };

    if (!options?.sudo) baseMatchQuery['isActive'] = true;

    return (
      await this.flashDealModel.aggregate([
        { $match: baseMatchQuery },
        {
          $lookup: {
            from: 'influencerservices',
            localField: 'serviceId',
            foreignField: '_id',
            as: 'service',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'creator',
            pipeline: [{ $match: this.userService.defaultQuery }, { $project: this.userService.projection }],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'buyers',
            foreignField: '_id',
            as: 'buyersData',
            pipeline: [{ $match: this.userService.defaultQuery }, { $project: this.userService.projection }],
          },
        },
        {
          $addFields: {
            service: { $arrayElemAt: ['$service', 0] },
            creator: { $arrayElemAt: ['$creator', 0] },
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
      ])
    )?.[0];
  }

  async getFlashDealById(id: string, options?: { sudo?: boolean }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const baseMatchQuery: any = { isDeleted: { $ne: true } };

    if (!options?.sudo) baseMatchQuery['isActive'] = true;

    const flashDeal = await this.flashDealModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), ...baseMatchQuery } },
      {
        $lookup: {
          from: 'influencerservices',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'creator',
          pipeline: [{ $match: this.userService.defaultQuery }, { $project: this.userService.projection }],
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'buyers',
          foreignField: '_id',
          as: 'buyersData',
          pipeline: [{ $match: this.userService.defaultQuery }, { $project: this.userService.projection }],
        },
      },
      {
        $addFields: {
          service: { $arrayElemAt: ['$service', 0] },
          creator: { $arrayElemAt: ['$creator', 0] },
        },
      },
    ]);

    if (!flashDeal?.[0]) {
      throw new NotFoundException('Flash deal not found');
    }

    return flashDeal[0];
  }

  async updateFlashDeal(
    id: string,
    data: UpdateFlashDealDto,
    options?: { sudo?: boolean; currentUserId: string; currentUserRole: UserRole },
  ) {
    const baseMatchQuery: any = { isDeleted: { $ne: true } };

    if (!options?.sudo) baseMatchQuery['isActive'] = true;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const flashDeal = await this.flashDealModel.findOne({ _id: id, ...baseMatchQuery });
    if (!flashDeal) {
      throw new NotFoundException('Flash deal not found');
    }

    // Check if user is the creator
    if (flashDeal.createdBy.toString() !== options?.currentUserId && options?.currentUserRole !== UserRole.ADMIN) {
      throw new BadRequestException('You are not authorized to update this flash deal');
    }

    // Validate dates if provided
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ? new Date(data.startDate) : flashDeal.startDate;
      const endDate = data.endDate ? new Date(data.endDate) : flashDeal.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check if new dates are in the future
      const now = new Date();
      if (startDate < now) {
        throw new BadRequestException('Start date must be in the future');
      }
    }

    // Validate prices if provided
    if (data.discountedPrice || data.originalPrice) {
      const discountedPrice = data.discountedPrice ?? flashDeal.discountedPrice;
      const originalPrice = data.originalPrice ?? flashDeal.originalPrice;

      if (discountedPrice >= originalPrice) {
        throw new BadRequestException('Discounted price must be less than original price');
      }
    }

    // Validate quantity if provided
    if (data.maxQuantity) {
      if (data.maxQuantity <= flashDeal.totalSold) {
        throw new BadRequestException('Max quantity must be greater than total sold');
      }
    }

    // Validate service exists if serviceId is provided
    if (data.serviceId) {
      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(data.serviceId);
      if (!service) {
        throw new NotFoundException('Service not found');
      }
    }

    return await this.flashDealModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          serviceId: data.serviceId ? new Types.ObjectId(data.serviceId) : undefined,
        },
      },
      { new: true },
    );
  }

  async deleteFlashDeal(id: string, options?: { sudo?: boolean; currentUserId: string; currentUserRole: UserRole }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const flashDeal = await this.flashDealModel.findOne({ _id: id, isDeleted: false });
    if (!flashDeal) {
      throw new NotFoundException('Flash deal not found');
    }

    // Check if user is the creator
    if (flashDeal.createdBy.toString() !== options?.currentUserId! && options?.currentUserRole !== UserRole?.ADMIN) {
      throw new BadRequestException('You are not authorized to delete this flash deal');
    }

    return await this.flashDealModel.findByIdAndUpdate(id, { $set: { isDeleted: true } }, { new: true });
  }

  async purchaseFlashDeal(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid flash deal ID');
    }

    const flashDeal = await this.flashDealModel.findOne({ _id: id, isDeleted: false, isActive: true });
    if (!flashDeal) {
      throw new NotFoundException('Flash deal not found');
    }

    // Check if flash deal is within date range
    const now = new Date();
    if (now < flashDeal.startDate || now > flashDeal.endDate) {
      throw new BadRequestException('Flash deal is not available at this time');
    }

    // Check if user has already purchased
    if (flashDeal.buyers.map((e: any) => e.toString())?.includes(userId)) {
      throw new BadRequestException('You have already purchased this flash deal');
    }

    // Check if quantity is available
    if (flashDeal.totalSold >= flashDeal.maxQuantity) {
      throw new BadRequestException('Flash deal is sold out');
    }

    return await this.flashDealModel.findByIdAndUpdate(
      id,
      {
        $inc: { totalSold: 1 },
        $push: { buyers: new Types.ObjectId(userId) },
      },
      { new: true },
    );
  }
}
