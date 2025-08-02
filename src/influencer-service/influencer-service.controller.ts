import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from 'src/user/schemas/user.schema';
import { UpdateInfluencerServiceDto } from './dto/update-influencer-service.dto';
import { CreateInfluencerServiceDto } from './dto/create-influencer-service.dto';
import { InfluencerServiceService } from './influencer-service.service';
import { Roles } from 'src/common/decorators/role.decorator';
import { CreateCollaborationServiceDto } from './dto/collaboration-service.dto';
import { UpdateInfluencerServiceStatusDto } from './dto/update-influencer-service-status.dto';

@ApiTags('Influencer services')
@ApiBearerAuth('access-token')
@Controller('influencer-service')
export class InfluencerServiceController {
  constructor(private readonly influencerServiceService: InfluencerServiceService) {}

  // VALID
  @Post('/')
  @ApiOperation({
    summary: 'Create a new influencer service',
    description: 'Create a new service for an influencer. Only influencers can create services.',
  })
  @Roles(UserRole.INFLUENCER, UserRole.ADMIN)
  async createInfluencerService(@Req() req: Request, @Body() data: CreateInfluencerServiceDto) {
    return this.influencerServiceService.createInfluencerService(req?.user!, data);
  }

  // VALID
  @Get('/influencer/:influencerId')
  @ApiOperation({
    summary: 'Get individual services by influencer ID',
    description: 'Retrieve all individual services created by a specific influencer',
  })
  @ApiParam({ name: 'influencerId', description: 'ID of the influencer' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async getInfluencerServiceByInfluencerId(
    @Param('influencerId') influencerId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: Request,
  ) {
    return await this.influencerServiceService.getInfluencerServicesByInfluencerId(
      influencerId,
      { page, limit },
      { currentUserId: req?.user?.userId, currentUserRole: req?.user?.role },
    );
  }

  // VALID
  @Get('/collaborations')
  @ApiOperation({
    summary: 'Get all collaboration services',
    description: 'Retrieve all collaboration type services',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async getCollaborationServices(@Query('page') page: number, @Query('limit') limit: number, @Req() req: Request) {
    return await this.influencerServiceService.getCollaborationServices(
      { page, limit },
      { currentUserId: req?.user?.userId, currentUserRole: req?.user?.role },
    );
  }

  // VALID
  @Post('/collaboration')
  @ApiOperation({
    summary: 'Admin only - Create a new collaboration service',
    description: 'Admin can create a collaboration service and assign multiple influencers to it',
  })
  @ApiBody({ type: CreateCollaborationServiceDto })
  @Roles(UserRole.ADMIN)
  async createCollaborationService(@Req() req: Request, @Body() data: CreateCollaborationServiceDto) {
    return await this.influencerServiceService.createInfluencerService(req.user!, data);
  }

  // VALID
  @Post('/:serviceId/status')
  @ApiOperation({ summary: 'Admin: Approve influencer service' })
  @ApiBody({ type: UpdateInfluencerServiceStatusDto })
  @Roles(UserRole.ADMIN)
  async approveInfluencerService(
    @Req() req: Request,
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateInfluencerServiceStatusDto,
  ) {
    return this.influencerServiceService.updateInfluencerServiceStatus(req.user!, serviceId, data);
  }

  // VALID
  @Put('/:serviceId')
  @ApiOperation({
    summary: 'Update an influencer service',
    description: 'Update an existing service. Only service members can update.',
  })
  @ApiParam({ name: 'serviceId', description: 'ID of the service to update' })
  @Roles(UserRole.INFLUENCER, UserRole.ADMIN)
  async updateInfluencerService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateInfluencerServiceDto,
    @Req() req: Request,
  ) {
    return this.influencerServiceService.updateInfluencerService(serviceId, data, {
      currentUserId: req?.user?.userId!,
      currentUserRole: req?.user?.role!,
    });
  }

  // VALID
  @Delete('/:serviceId')
  @ApiOperation({
    summary: 'Delete an influencer service',
    description: 'Delete a service. Only service members can delete.',
  })
  @ApiParam({ name: 'serviceId', description: 'ID of the service to delete' })
  @Roles(UserRole.INFLUENCER, UserRole.ADMIN)
  async deleteInfluencerService(@Param('serviceId') serviceId: string, @Req() req: Request) {
    return this.influencerServiceService.deleteInfluencerServiceById(serviceId, {
      currentUserId: req?.user?.userId!,
      currentUserRole: req?.user?.role!,
    });
  }

  // VALID
  @ApiOperation({ summary: 'Get a influencer service' })
  @Get('/:serviceId')
  async getInfluencerService(@Param('serviceId') serviceId: string, @Req() req: Request) {
    return this.influencerServiceService.getInfluencerServiceByServiceId(serviceId, {
      currentUserId: req?.user?.userId,
      currentUserRole: req?.user?.role,
    });
  }
}
