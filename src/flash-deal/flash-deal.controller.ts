import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FlashDealService } from './flash-deal.service';
import { CreateFlashDealDto } from './dto/create-flash-deal.dto';
import { UpdateFlashDealDto } from './dto/update-flash-deal.dto';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

@ApiTags('Flash Deals')
@ApiBearerAuth('access-token')
@Controller('flash-deal')
export class FlashDealController {
  constructor(private readonly flashDealService: FlashDealService) {}

  @Post('/')
  @ApiOperation({
    summary: 'Create a new flash deal',
    description: 'Create a new flash deal for an influencer service. Only admins can create flash deals.',
  })
  @Roles(UserRole.ADMIN)
  async createFlashDeal(@Req() req: Request, @Body() data: CreateFlashDealDto) {
    return this.flashDealService.createFlashDeal(req?.user?.userId as string, data);
  }

  @Get('/')
  @ApiOperation({
    summary: 'Get all flash deals',
    description: 'Retrieve a paginated list of all active flash deals',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async getAllFlashDeals(@Query() query: { page?: number; limit?: number }, @Req() req: Request) {
    const isSudo = req.user?.role == UserRole.ADMIN;
    return this.flashDealService.getAllFlashDeals(query, { sudo: isSudo });
  }

  @Get('/:flashDealId')
  @ApiOperation({
    summary: 'Get flash deal by ID',
    description: 'Retrieve a specific flash deal by its ID',
  })
  @ApiParam({ name: 'flashDealId', description: 'ID of the flash deal to retrieve' })
  async getFlashDealById(@Param('flashDealId') flashDealId: string, @Req() req: Request) {
    const isSudo = req.user?.role == UserRole.ADMIN;
    return this.flashDealService.getFlashDealById(flashDealId, { sudo: isSudo });
  }

  @Put('/:flashDealId')
  @ApiOperation({
    summary: 'Update a flash deal',
    description: 'Update an existing flash deal. Only the creator can update their flash deals.',
  })
  @ApiParam({ name: 'flashDealId', description: 'ID of the flash deal to update' })
  @Roles(UserRole.ADMIN, UserRole.INFLUENCER)
  async updateFlashDeal(@Param('flashDealId') flashDealId: string, @Body() data: UpdateFlashDealDto, @Req() req: Request) {
    const isSudo = req.user?.role == UserRole.ADMIN;
    return this.flashDealService.updateFlashDeal(flashDealId, data, {
      currentUserId: req?.user?.userId!,
      currentUserRole: req?.user?.role as UserRole,
      sudo: isSudo,
    });
  }

  @Delete('/:flashDealId')
  @ApiOperation({
    summary: 'Delete a flash deal',
    description: 'Delete a flash deal. Only the creator can delete their flash deals.',
  })
  @ApiParam({ name: 'flashDealId', description: 'ID of the flash deal to delete' })
  @Roles(UserRole.ADMIN, UserRole.INFLUENCER)
  async deleteFlashDeal(@Param('flashDealId') flashDealId: string, @Req() req: Request) {
    return this.flashDealService.deleteFlashDeal(flashDealId, {
      currentUserId: req?.user?.userId!,
      currentUserRole: req?.user?.role as UserRole,
    });
  }

  @Post('/:flashDealId/purchase')
  @ApiOperation({
    summary: 'Purchase a flash deal',
    description: 'Purchase a flash deal. Users can only purchase each flash deal once.',
  })
  @ApiParam({ name: 'flashDealId', description: 'ID of the flash deal to purchase' })
  async purchaseFlashDeal(@Param('flashDealId') flashDealId: string, @Req() req: Request) {
    return this.flashDealService.purchaseFlashDeal(flashDealId, req?.user?.userId as string);
  }
}
