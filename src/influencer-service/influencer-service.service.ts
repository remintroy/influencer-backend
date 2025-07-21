import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserRole } from 'src/user/schemas/user.schema';
import { InfluencerServiceDocument, InfluencerServices, ServiceStatus, ServiceType } from './schemas/influencer-service.schema';
import { isValidObjectId, Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';
import { PaginationResponse } from 'src/@types/pagination-response.interface';
import { Contract } from './schemas/contract-schema';

@Injectable()
export class InfluencerServiceService {
  constructor(
    @InjectModel(InfluencerServices.name) private readonly influencerServiceModal: Model<InfluencerServiceDocument>,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
    private readonly userService: UserService,
  ) {}

  // DTO validation requierd
  async createInfluencerService(currentUser: Partial<User>, data: Partial<InfluencerServices>) {
    if (!currentUser) throw new NotFoundException('User not found');
    if (!currentUser?.role || ![UserRole.INFLUENCER, UserRole.ADMIN].includes(currentUser?.role)) {
      throw new ForbiddenException({ message: 'Only influencer can create service', error: 'Access Denied' });
    }

    if (!data.type) throw new BadRequestException('Service type is required');
    if (!Object.values(ServiceType).includes(data.type as ServiceType)) throw new BadRequestException('Invalid service type');

    if (data.type == ServiceType.COLLABORATION && !data.collaborationDetails) {
      throw new BadRequestException('Collaboraion Details is required');
    }

    // Setting default approved status for type of service
    data.status = data.type === ServiceType.INDIVIDUAL ? ServiceStatus.APPROVED : ServiceStatus.PENDING;

    // Special Default for admin
    data.status = currentUser?.role == UserRole.ADMIN ? ServiceStatus.APPROVED : data.status;

    if (!data.users) data.users = currentUser?.role == UserRole.ADMIN ? [] : [new Types.ObjectId(currentUser?._id)];

    // Validate and transform
    let didFindCurrentUser = false;

    // Convert every items to string
    data?.users?.map((e: any) => e + '');

    // Removing duplicate ids
    data.users = [...new Set(data.users as string[])];

    for (const index in data?.users) {
      const userId = data?.users[index];

      if (!isValidObjectId(userId)) throw new BadRequestException(`Invaid userId provided`);

      if (userId == currentUser?._id + '') didFindCurrentUser = true;
      else {
        const userDataFromDb = await this.userService.getInfluencerById(userId + '');
        if (!userDataFromDb || userDataFromDb?.role != UserRole.INFLUENCER) {
          throw new BadRequestException('Invaid influencers selected');
        }
      }
    }

    if (currentUser?.role == UserRole.ADMIN && data?.users?.includes(currentUser?._id + '')) {
      throw new BadRequestException('Admin user cannot be a part of a collaboration');
    }

    // Convert back every user IDs to ObjectIds
    if (data.users) data.users = data.users.map((id: any) => new Types.ObjectId(id + ''));

    if (!didFindCurrentUser && currentUser?.role != UserRole.ADMIN) data.users.push(new Types.ObjectId(currentUser?._id));

    if (data.users?.length <= 1 && data.type == ServiceType.COLLABORATION) {
      throw new BadRequestException('Atleast add one partner for collaboration');
    }

    const serviceId = new Types.ObjectId();

    // TODO: Make sure this is updated or add might make a hardcorded id
    const contractData = await this.contractModel.findOne();

    const service = await this.influencerServiceModal.create({
      ...data,
      _id: serviceId,
      serviceAdminId: currentUser?.role == UserRole.ADMIN ? data?.users?.[0] : new Types.ObjectId(currentUser?._id),
      createdBy: new Types.ObjectId(currentUser?._id),
      contract: contractData?._id,
    });

    // ...
    return service?.toJSON();
  }

  // TODO: Add users list validation on update
  async updateInfluencerService(
    serviceId: string,
    data: Partial<InfluencerServices>,
    options?: { currentUserId?: string; currentUserRole?: UserRole },
  ) {
    if (!isValidObjectId(serviceId)) throw new BadRequestException('Invalid serviceId');
    const serviceData = await this.influencerServiceModal.findById(serviceId);

    if (!serviceData) throw new BadRequestException('Service not found');

    // Prevent updating un intented fields
    delete data._id;
    delete data.status;
    delete data.type;

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
    const service = await this.influencerServiceModal
      .findById(serviceId)
      .populate('contract')
      .populate('users', { ...this.userService.projection });
    if (!service) throw new BadRequestException('Service not found');
    // Only return if approved, or if owner or admin
    if (
      service.status === ServiceStatus.APPROVED ||
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
    options?: { currentUserId?: string; currentUserRole?: UserRole },
  ): Promise<PaginationResponse<InfluencerServices>> {
    if (!isValidObjectId(influencerId)) throw new BadRequestException('Invalid influencerId');
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));
    // Only show approved, unless owner or admin
    let filter: any = { users: new Types.ObjectId(influencerId), status: 'approved' };
    if (options?.currentUserId === influencerId || options?.currentUserRole === UserRole.ADMIN) {
      delete filter.status;
    }
    const docs = await this.influencerServiceModal
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('contract')
      .populate('users', { ...this.userService.projection });
    const totalDocs = await this.influencerServiceModal.countDocuments(filter);
    return {
      totalDocs,
      page,
      limit,
      docs,
    };
  }

  async getCollaborationServices(
    params?: { page?: number; limit?: number },
    options?: { currentUserId?: string; currentUserRole?: UserRole },
  ): Promise<PaginationResponse<InfluencerServices>> {
    const page = Math.max(1, Number(params?.page || 1));
    const limit = Math.max(1, Number(params?.limit || 10));
    // Only show approved unless admin
    let filter: any = { type: ServiceType.COLLABORATION, status: ServiceStatus.APPROVED };
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
  async updateInfluecnerServiceStatus(
    currentUser: Partial<User>,
    serviceId: string,
    { status, reason }: { status: ServiceStatus; reason?: string },
  ) {
    if (!Object.values(ServiceStatus).includes(status as ServiceStatus)) throw new BadRequestException('Invalid service status');
    if (currentUser.role !== UserRole.ADMIN) throw new UnauthorizedException("You don't have permission to access this service");
    const service = await this.influencerServiceModal.findById(serviceId);
    if (!service) throw new NotFoundException('Service not found');

    if (service.status == ServiceStatus.APPROVED) throw new BadRequestException('Service already approved');
    if (service.status == ServiceStatus.REJECTED) throw new BadRequestException('Service already rejected');

    // Update service
    service.status = status;

    if (status == ServiceStatus.REJECTED) service.rejectReason = reason;

    await service.save();
    return this.influencerServiceModal.findById(serviceId).populate('contract');
  }
}
