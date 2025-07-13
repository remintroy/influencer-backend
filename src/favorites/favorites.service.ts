import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Favorite, FavoriteDocument } from './schemas/favorite.schema';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class FavoritesService {
  constructor(@InjectModel(Favorite.name) private favoriteModel: Model<FavoriteDocument>) {}

  /**
   * Add a service to user's favorites
   */
  async addToFavorites(userId: string, createFavoriteDto: CreateFavoriteDto): Promise<Favorite> {
    const { serviceId } = createFavoriteDto;

    // Validate serviceId format
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    // Check if favorite already exists
    const existingFavorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      serviceId: new Types.ObjectId(serviceId),
    });

    if (existingFavorite) {
      if (existingFavorite.isActive) {
        throw new ConflictException('Service is already in favorites');
      } else {
        // Reactivate the favorite
        existingFavorite.isActive = true;
        return (await existingFavorite.save()).toJSON();
      }
    }

    // Create new favorite
    const favorite = new this.favoriteModel({
      userId: new Types.ObjectId(userId),
      serviceId: new Types.ObjectId(serviceId),
      isActive: true,
    });

    return (await favorite.save()).toJSON();
  }

  /**
   * Remove a service from user's favorites (soft delete)
   */
  async removeFromFavorites(userId: string, serviceId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(serviceId)) {
      throw new BadRequestException('Invalid service ID format');
    }

    const favorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      serviceId: new Types.ObjectId(serviceId),
      isActive: true,
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    favorite.isActive = false;
    await favorite.save();

    return { message: 'Service removed from favorites successfully' };
  }

  /**
   * Get user's favorites with pagination and service details
   */
  async getUserFavorites(userId: string, paginationQuery: PaginationQueryDto) {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const favorites = await this.favoriteModel
      .find({
        userId: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate({
        path: 'serviceId',
        model: 'InfluencerServices',
        select: 'title description imageUrl price type duration requireTimeSlot collaborationDetails',
        populate: {
          path: 'createdBy',
          model: 'User',
          select: 'name profileImage role',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.favoriteModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: favorites,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Check if a service is in user's favorites
   */
  async isServiceInFavorites(userId: string, serviceId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(serviceId)) {
      return false;
    }

    const favorite = await this.favoriteModel.findOne({
      userId: new Types.ObjectId(userId),
      serviceId: new Types.ObjectId(serviceId),
      isActive: true,
    });

    return !!favorite;
  }

  /**
   * Get favorite by ID (for internal use)
   */
  async getFavoriteById(favoriteId: string): Promise<Favorite> {
    if (!Types.ObjectId.isValid(favoriteId)) {
      throw new BadRequestException('Invalid favorite ID format');
    }

    const favorite = await this.favoriteModel.findById(favoriteId);
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    return favorite;
  }

  /**
   * Get user's favorite count
   */
//   async getUserFavoriteCount(userId: string): Promise<number> {
//     return await this.favoriteModel.countDocuments({
//       userId: new Types.ObjectId(userId),
//       isActive: true,
//     });
//   }

  /**
   * Clear all user's favorites (soft delete)
   */
  async clearAllFavorites(userId: string): Promise<{ message: string }> {
    await this.favoriteModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isActive: true,
      },
      {
        isActive: false,
      },
    );

    return { message: 'All favorites cleared successfully' };
  }
}
