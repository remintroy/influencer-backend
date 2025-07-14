import { Controller, Post, Delete, Get, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { FavoriteResponseDto } from './dto/favorite-response.dto';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({
    summary: 'Add influencer to favorites',
    description: 'Add an influencer to user favorites. Only authenticated users can add favorites.',
  })
  @ApiResponse({
    status: 201,
    description: 'Influencer added to favorites successfully',
    type: FavoriteResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Influencer is already in favorites',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid influencer ID format',
  })
  @Roles(UserRole.USER, UserRole.ADMIN)
  async addToFavorites(@Req() req: Request, @Body() createFavoriteDto: CreateFavoriteDto) {
    const userId = req.user?.userId as string;
    return await this.favoritesService.addToFavorites(userId, createFavoriteDto);
  }

  @Delete(':influencerId')
  @ApiOperation({
    summary: 'Remove influencer from favorites',
    description: 'Remove an influencer from user favorites.',
  })
  @ApiParam({
    name: 'influencerId',
    description: 'ID of the influencer to remove from favorites',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Influencer removed from favorites successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Influencer removed from favorites successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Favorite not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid influencer ID format',
  })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async removeFromFavorites(@Req() req: Request, @Param('influencerId') influencerId: string) {
    const userId = req.user?.userId as string;
    return await this.favoritesService.removeFromFavorites(userId, influencerId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user favorites',
    description: 'Get all favorites for the authenticated user with pagination.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'User favorites retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              influencerId: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              influencer: { type: 'object' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async getUserFavorites(@Req() req: Request, @Query() paginationQuery: PaginationQueryDto) {
    const userId = req.user?.userId as string;
    return await this.favoritesService.getUserFavorites(userId, paginationQuery);
  }

  @Get('check/:influencerId')
  @ApiOperation({
    summary: 'Check if influencer is in favorites',
    description: 'Check if a specific influencer is in the user favorites.',
  })
  @ApiParam({
    name: 'influencerId',
    description: 'ID of the influencer to check',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Check result',
    schema: {
      type: 'object',
      properties: {
        isFavorite: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async checkIfFavorite(@Req() req: Request, @Param('influencerId') influencerId: string) {
    const userId = req.user?.userId as string;
    const isFavorite = await this.favoritesService.isInfluencerInFavorites(userId, influencerId);
    return { isFavorite };
  }

  //   @Get('count')
  //   @ApiOperation({
  //     summary: 'Get user favorites count',
  //     description: 'Get the total number of favorites for the authenticated user.',
  //   })
  //   @ApiResponse({
  //     status: 200,
  //     description: 'Favorites count retrieved successfully',
  //     schema: {
  //       type: 'object',
  //       properties: {
  //         count: {
  //           type: 'number',
  //           example: 5,
  //         },
  //       },
  //     },
  //   })
  //   @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  //   async getFavoriteCount(@Req() req: Request) {
  //     const userId = req.user?.userId as string;
  //     const count = await this.favoritesService.getUserFavoriteCount(userId);
  //     return { count };
  //   }

  @Delete()
  @ApiOperation({
    summary: 'Clear all favorites',
    description: 'Remove all services from user favorites.',
  })
  @ApiResponse({
    status: 200,
    description: 'All favorites cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'All favorites cleared successfully',
        },
      },
    },
  })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async clearAllFavorites(@Req() req: Request) {
    const userId = req.user?.userId as string;
    return await this.favoritesService.clearAllFavorites(userId);
  }
}
