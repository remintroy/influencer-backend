import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Collaboration, CollaborationDocument } from './schemas/collaboration.schema';
import { Model, Types } from 'mongoose';
import { UserService } from 'src/user/user.service';

@Injectable()
export class CollaborationService {
  constructor(
    @InjectModel(Collaboration.name) private readonly collaborationModel: Model<CollaborationDocument>,
    private readonly userService: UserService,
  ) {}

  // Create a new collaboration - admin only
  async createCollaboration(data: Collaboration) {
    if (!data) throw new BadRequestException('Please provide required data');
    return await this.collaborationModel.create({ ...data, users: data?.users?.map((e) => new Types.ObjectId(e)) });
  }

  // Get all collaborations
  async getAllCollaborations(props?: { page?: number; limit?: number }) {
    const page = Number(props?.page) || 1;
    const limit = Number(props?.limit) || 10;

    return (
      await this.collaborationModel.aggregate([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: 'users',
            as: 'usersData',
            let: { users: '$users' },
            pipeline: [
              { $match: { ...this.userService.defaultQuery, $expr: { $and: [{ $in: ['$_id', '$$users'] }] } } },
              { $project: this.userService.projection },
            ],
          },
        },
        {
          $match: {
            'usersData._id': { $exists: true },
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

  // Get a collaboration by id
  async getCollaborationById(id: string): Promise<Partial<Collaboration>> {
    return (
      await this.collaborationModel.aggregate([
        {
          $match: { _id: new Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: 'users',
            as: 'usersData',
            let: { users: '$users' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$users'],
                  },
                },
              },
              {
                $project: this.userService.projection,
              },
            ],
          },
        },
      ])
    )?.[0];
  }

  // Update a collaboration
  async updateCollaboration(id: string, data: Partial<Collaboration>) {
    if (data?.users) data.users = data?.users?.map((e: any) => new Types.ObjectId(e));
    return await this.collaborationModel.findByIdAndUpdate(id, data, { new: true });
  }

  // Delete a collaboration
  async deleteCollaboration(id: string) {
    return await this.collaborationModel.findByIdAndDelete(id);
  }
}
