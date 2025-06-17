import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User, UserRole } from 'src/user/schemas/user.schema';
import { UpdateInfluencerServiceDto } from './dto/update-influencer-service.dto';
import { CreateInfluencerServiceDto } from './dto/create-influencer-service.dto';
import { InfluencerServiceService } from './influencer-service.service';
import { Roles } from 'src/common/decorators/role.decorator';
import {
  ConvertToCollaborationServiceDto,
  CreateCollaborationServiceDto,
  ManageCollaborationUsersDto,
} from './dto/collaboration-service.dto';
import { ServiceType } from './schemas/influencer-service.schema';

@ApiTags('Influencer services')
@ApiBearerAuth('access-token')
@Controller('influencer-service')
export class InfluencerServiceController {
  constructor(private readonly influencerServiceService: InfluencerServiceService) {}

  @Post('/')
  @ApiOperation({
    summary: 'Create a new influencer service',
    description: 'Create a new service for an influencer. Only influencers can create services.',
  })
  @Roles(UserRole.INFLUENCER)
  async createInfluencerService(@Req() req: Request, @Body() data: CreateInfluencerServiceDto) {
    const createdUserId = req?.user?.userId as string;
    return this.influencerServiceService.createInfluencerService(createdUserId, { ...data, type: ServiceType.INDIVIDUAL });
  }

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
  ) {
    return await this.influencerServiceService.getInfluencerServicesByInfluencerId(influencerId, { page, limit });
  }

  @Get('/collaborations')
  @ApiOperation({
    summary: 'Get all collaboration services',
    description: 'Retrieve all collaboration type services',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async getCollaborationServices(@Query('page') page: number, @Query('limit') limit: number) {
    return await this.influencerServiceService.getCollaborationServices({ page, limit });
  }

  @Post('/collaboration')
  @ApiOperation({
    summary: 'Admin only - Create a new collaboration service',
    description: 'Admin can create a collaboration service and assign multiple influencers to it',
  })
  @ApiBody({ type: CreateCollaborationServiceDto })
  @Roles(UserRole.ADMIN)
  async createCollaborationService(@Req() req: Request, @Body() createCollaborationDto: CreateCollaborationServiceDto) {
    return await this.influencerServiceService.createCollaborationService(req.user?.userId!, createCollaborationDto);
  }

  /**
   * Admin only - Convert existing service to collaboration
   * Allows admin to convert individual services to collaboration type and add users
   */
  @Put('/collaborations/:serviceId/convert')
  @ApiOperation({ summary: 'Admin only - Convert service to collaboration' })
  @Roles(UserRole.ADMIN)
  async convertToCollaborationService(
    @Req() req: Request,
    @Param('serviceId') serviceId: string,
    @Body() convertDto: ConvertToCollaborationServiceDto,
  ) {
    return await this.influencerServiceService.convertToCollaborationService(
      req.user?.userId!,
      serviceId,
      convertDto.additionalUserIds || [],
    );
  }

  /**
   * Admin only - Add users to existing collaboration service
   * Allows admin to add influencers to collaboration services
   */
  @Put('/collaborations/:serviceId/add-users')
  @ApiOperation({ summary: 'Admin only - Add users to collaboration service' })
  @Roles(UserRole.ADMIN)
  async addUsersToCollaborationService(
    @Req() req: Request,
    @Param('serviceId') serviceId: string,
    @Body() body: ManageCollaborationUsersDto,
  ) {
    return await this.influencerServiceService.addUsersToCollaborationService(req.user?.userId!, serviceId, body.userIds);
  }

  /**
   * Admin only - Remove users from collaboration service
   * Allows admin to remove influencers from collaboration services
   */
  @Put('/collaborations/:serviceId/remove-users')
  @ApiOperation({ summary: 'Admin only - Remove users from collaboration service' })
  @Roles(UserRole.ADMIN)
  async removeUsersFromCollaborationService(
    @Req() req: Request,
    @Param('serviceId') serviceId: string,
    @Body() body: ManageCollaborationUsersDto,
  ) {
    return await this.influencerServiceService.removeUsersFromCollaborationService(req.user?.userId!, serviceId, body.userIds);
  }

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

  @ApiOperation({ summary: 'Get a influencer service' })
  @Get('/:serviceId')
  async getInfluencerService(@Param('serviceId') serviceId: string) {
    return this.influencerServiceService.getInfluencerServiceByServiceId(serviceId);
  }
}
