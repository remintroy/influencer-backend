import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserRole } from 'src/user/schemas/user.schema';
import {
  InfluencerServiceDocument,
  InfluencerServicePaginationResponse,
  InfluencerServices,
  ServiceType,
  Contract,
} from './schemas/influencer-service.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { PaginationResponse } from 'src/@types/pagination-response.interface';

@Injectable()
export class InfluencerServiceService {
  constructor(
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
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

    const serviceId = new Types.ObjectId();

    // Remove contract creation here, set status to pending
    const service = await this.influencerServiceModal.create({
      ...data,
      _id: serviceId,
      createdBy: new Types.ObjectId(createdBy),
      status: 'pending',
      contract: undefined,
    });
    return this.influencerServiceModal.findById(service._id);
  }

  async updateInfluencerService(
    serviceId: string,
    data: Partial<InfluencerServices>,
    options?: { currentUserId?: string; currentUserRole?: UserRole },
  ) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    // Check if user has permission to update
    if (
      !serviceData.users?.map((id) => id?.toString?.()).includes(options?.currentUserId) &&
      options?.currentUserRole != UserRole.ADMIN
    ) {
      throw new ForbiddenException("You don't have permission to update this service");
    }

    // Convert user IDs to ObjectIds if present
    if (data.users) {
      data.users = data.users.map((id) => new Types.ObjectId(id));
    }

    await this.influencerServiceModal.updateOne({ _id: new Types.ObjectId(serviceId) }, { $set: data });

    return (
      await this.influencerServiceModal.aggregate([
        { $match: { _id: new Types.ObjectId(serviceId) } },
        {
          $lookup: {
            from: 'users',
            localField: 'users',
            foreignField: '_id',
            as: 'users',
            pipeline: [{ $match: this.userService.defaultQuery }, { $project: this.userService.projection }],
          },
        },
      ])
    )?.[0];
  }

  async getInfluencerServiceByServiceId(serviceId: string, options?: { currentUserId?: string; currentUserRole?: UserRole }) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    const service = await this.influencerServiceModal.findById(serviceId).populate('contract');
    if (!service) return null;
    // Only return if approved, or if owner or admin
    if (
      service.status === 'approved' ||
      (options?.currentUserId && service.createdBy?.toString() === options.currentUserId) ||
      options?.currentUserRole === UserRole.ADMIN
    ) {
      return service;
    }
    throw new ForbiddenException('You do not have access to this service');
  }

  async getInfluencerServicesByInfluencerId(
    influencerId: string,
    params?: { page?: number; limit?: number },
    options?: { currentUserId?: string; currentUserRole?: UserRole }
  ): Promise<PaginationResponse<InfluencerServices>> {
    if (!isValidObjectId(influencerId)) throw new BadRequestException('Invalid influencerId');
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));
    // Only show approved, unless owner or admin
    let filter: any = { users: new Types.ObjectId(influencerId), type: ServiceType.INDIVIDUAL, status: 'approved' };
    if (options?.currentUserId === influencerId || options?.currentUserRole === UserRole.ADMIN) {
      delete filter.status;
    }
    const docs = await this.influencerServiceModal
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('contract');
    const totalDocs = await this.influencerServiceModal.countDocuments(filter);
    return {
      totalDocs,
      page,
      limit,
      docs,
    };
  }

  async getCollaborationServices(params?: { page?: number; limit?: number }, options?: { currentUserId?: string; currentUserRole?: UserRole }): Promise<PaginationResponse<InfluencerServices>> {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));
    // Only show approved unless admin
    let filter: any = { type: ServiceType.COLLABORATION, status: 'approved' };
    if (options?.currentUserRole === UserRole.ADMIN) {
      delete filter.status;
    }
    const docs = await this.influencerServiceModal
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('contract');
    const totalDocs = await this.influencerServiceModal.countDocuments(filter);
    return {
      totalDocs,
      page,
      limit,
      docs,
    };
  }

  /**
   * Admin method to create a collaboration service
   * Only admins can create collaboration services and assign multiple users
   */
  async createCollaborationService(adminUserId: string, data: InfluencerServices) {
    // Verify admin user
    const adminUser = await this.userService.getAdminById(adminUserId);
    if (!adminUser) throw new NotFoundException('Admin user not found');
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ message: 'Only admin can create collaboration services', error: 'Access Denied' });
    }

    // Validate all user IDs
    if (!data.users || data.users.length === 0) {
      throw new BadRequestException('At least one user must be assigned to the collaboration service');
    }

    // Verify all users exist and are influencers
    await Promise.all(
      data.users.map(async (userId) => {
        if (!isValidObjectId(userId)) throw new BadRequestException(`Invalid user ID: ${userId}`);
        const user = await this.userService.getInfluencerById(userId);
        if (!user) throw new NotFoundException(`User not found: ${userId}`);
        if (user.role !== UserRole.INFLUENCER) {
          throw new BadRequestException(`User ${userId} is not an influencer`);
        }
        return user;
      }),
    );

    // Convert user IDs to ObjectIds
    const userObjectIds = data.users.map((id: any) => new Types.ObjectId(id));

    // Create contract with hardcoded content
    const contract = await this.contractModel.create({
      title: 'Default Collaboration Service Contract',
      content: 'This is a default contract for the collaboration service. All parties must agree to the terms before proceeding.',
      createdBy: adminUserId,
    });
    const serviceData = {
      ...data,
      type: ServiceType.COLLABORATION,
      users: userObjectIds,
      createdBy: new Types.ObjectId(adminUserId),
      contract: contract._id,
    };

    const service = await this.influencerServiceModal.create(serviceData);
    return this.influencerServiceModal.findById(service._id).populate('contract');
  }

  /**
   * Admin method to convert an existing service to collaboration and add users
   */
  async convertToCollaborationService(adminUserId: string, serviceId: string, additionalUserIds: string[]) {
    // Verify admin user
    const adminUser = await this.userService.getAdminById(adminUserId);
    if (!adminUser) throw new NotFoundException('Admin user not found');
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ message: 'Only admin can convert services to collaboration', error: 'Access Denied' });
    }

    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');

    // Get existing service
    const existingService = await this.influencerServiceModal.findById(serviceId);
    if (!existingService) throw new NotFoundException('Service not found');

    // Validate additional user IDs
    if (additionalUserIds && additionalUserIds.length > 0) {
      await Promise.all(
        additionalUserIds.map(async (userId) => {
          if (!isValidObjectId(userId)) throw new BadRequestException(`Invalid user ID: ${userId}`);
          const user = await this.userService.getInfluencerById(userId);
          if (!user) throw new NotFoundException(`User not found: ${userId}`);
          if (user.role !== UserRole.INFLUENCER) {
            throw new BadRequestException(`User ${userId} is not an influencer`);
          }
        }),
      );
    }

    // Combine existing users with additional users (avoid duplicates)
    const existingUserIds = existingService.users?.map((id) => id.toString()) || [];
    const newUserIds = additionalUserIds.filter((id) => !existingUserIds.includes(id));
    const allUserIds = [...existingUserIds, ...newUserIds];

    // Convert to ObjectIds
    const userObjectIds = allUserIds.map((id) => new Types.ObjectId(id));

    // Update service to collaboration type with all users
    const responseFromDb = await this.influencerServiceModal.findOneAndUpdate(
      { _id: new Types.ObjectId(serviceId) },
      {
        $set: {
          type: ServiceType.COLLABORATION,
          users: userObjectIds,
        },
      },
      { new: true },
    );

    if (!responseFromDb) throw new BadRequestException('Noting to update');

    return responseFromDb;
  }

  /**
   * Admin method to add users to an existing collaboration service
   */
  async addUsersToCollaborationService(adminUserId: string, serviceId: string, userIds: string[]) {
    // Verify admin user
    const adminUser = await this.userService.getAdminById(adminUserId);
    if (!adminUser) throw new NotFoundException('Admin user not found');
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ message: 'Only admin can add users to collaboration services', error: 'Access Denied' });
    }

    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');

    // Get existing service
    const existingService = await this.influencerServiceModal.findById(serviceId);
    if (!existingService) throw new NotFoundException('Service not found');

    if (existingService.type !== ServiceType.COLLABORATION) {
      throw new BadRequestException('Can only add users to collaboration services');
    }

    // Validate user IDs
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('At least one user ID must be provided');
    }

    await Promise.all(
      userIds.map(async (userId) => {
        if (!isValidObjectId(userId)) throw new BadRequestException(`Invalid user ID: ${userId}`);
        const user = await this.userService.getInfluencerById(userId);
        if (!user) throw new NotFoundException(`User not found: ${userId}`);
        if (user.role !== UserRole.INFLUENCER) {
          throw new BadRequestException(`User ${userId} is not an influencer`);
        }
      }),
    );

    // Get existing user IDs and filter out duplicates
    const existingUserIds = existingService.users?.map((id) => id.toString()) || [];
    const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      throw new BadRequestException('All provided users are already part of this collaboration service');
    }

    // Add new users to the existing service
    const newUserObjectIds = newUserIds.map((id) => new Types.ObjectId(id));

    return await this.influencerServiceModal.findOneAndUpdate(
      { _id: new Types.ObjectId(serviceId) },
      {
        $addToSet: {
          users: { $each: newUserObjectIds },
        },
      },
      { new: true },
    );
  }

  /**
   * Admin method to remove users from a collaboration service
   */
  async removeUsersFromCollaborationService(adminUserId: string, serviceId: string, userIds: string[]) {
    // Verify admin user
    const adminUser = await this.userService.getAdminById(adminUserId);
    if (!adminUser) throw new NotFoundException('Admin user not found');
    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        message: 'Only admin can remove users from collaboration services',
        error: 'Access Denied',
      });
    }

    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');

    // Get existing service
    const existingService = await this.influencerServiceModal.findById(serviceId);
    if (!existingService) throw new NotFoundException('Service not found');

    if (existingService.type !== ServiceType.COLLABORATION) {
      throw new BadRequestException('Can only remove users from collaboration services');
    }

    // Validate user IDs
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('At least one user ID must be provided');
    }

    // Validate that user IDs are valid ObjectIds
    userIds.forEach((userId) => {
      if (!isValidObjectId(userId)) throw new BadRequestException(`Invalid user ID: ${userId}`);
    });

    // Check if removing users would leave the service empty
    const existingUserIds = existingService.users?.map((id) => id.toString()) || [];
    const remainingUsers = existingUserIds.filter((id) => !userIds.includes(id));

    if (remainingUsers.length === 0) {
      throw new BadRequestException('Cannot remove all users from collaboration service. At least one user must remain.');
    }

    // Remove users from the service
    const userObjectIds = userIds.map((id) => new Types.ObjectId(id));

    return await this.influencerServiceModal.findOneAndUpdate(
      { _id: new Types.ObjectId(serviceId) },
      {
        $pull: {
          users: { $in: userObjectIds },
        },
      },
      { new: true },
    );
  }

  async deleteInfluencerServiceById(serviceId: string, options: { currentUserId?: string; currentUserRole: UserRole }) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    if (options?.currentUserId && !isValidObjectId(options?.currentUserId)) throw new BadRequestException('Invalid influencerId');

    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    // Check if user has permission to delete
    if (
      !serviceData.users?.map((id) => id.toString()).includes(options?.currentUserId) &&
      options?.currentUserRole !== UserRole?.ADMIN
    ) {
      throw new ForbiddenException("You don't have permission to delete this service");
    }

    const deleted = await this.influencerServiceModal.deleteOne({ _id: new Types.ObjectId(serviceId) });

    return { message: 'Influencer service deleted successfully', deleted: deleted.deletedCount > 0 };
  }

  // Add a method for admin to approve a service and create contract
  async approveInfluencerServiceAndCreateContract(adminId: string, serviceId: string, contractData: Partial<Contract>) {
    // Check admin
    const adminUser = await this.userService.getAdminById(adminId);
    if (!adminUser || adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException({ message: 'Only admin can approve services', error: 'Access Denied' });
    }
    // Find service
    const service = await this.influencerServiceModal.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');
    if (service.status === 'approved') throw new BadRequestException('Service already approved');
    // Create contract
    const contract = await this.contractModel.create({
      ...contractData,
      createdBy: new Types.ObjectId(adminId),
      serviceId: new Types.ObjectId(serviceId),
    });
    // Update service
    service.status = 'approved';
    service.contract = contract._id;
    await service.save();
    return this.influencerServiceModal.findById(serviceId).populate('contract');
  }
}
