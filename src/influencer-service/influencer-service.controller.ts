import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from 'src/user/schemas/user.schema';
import { UpdateInfluencerServiceDto } from './dto/update-influencer-service.dto';
import { CreateInfluencerServiceDto } from './dto/create-influencer-service.dto';
import { InfluencerServiceService } from './influencer-service.service';
import { Types } from 'mongoose';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('Influencer services')
@ApiBearerAuth('access-token')
@Controller('influencer-service')
export class InfluencerServiceController {
  constructor(private readonly influencerServiceService: InfluencerServiceService) {}

  @Post('/')
  @ApiOperation({ summary: 'Create a new influencer service' })
  @Roles(UserRole.INFLUENCER)
  async createInfluencerService(@Req() req: Request, @Body() data: CreateInfluencerServiceDto) {
    const influencerId = req?.user?.userId as string;
    return this.influencerServiceService.createInfluencerService(influencerId, {
      ...data,
      owners: [new Types.ObjectId(influencerId)],
    });
  }

  @Put('/:serviceId')
  @Roles(UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Update an influencer service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async updateInfluencerService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateInfluencerServiceDto,
    @Req() req: Request,
  ) {
    return this.influencerServiceService.updateInfluencerService(serviceId, data, { influencerId: req?.user?.userId as string });
  }

  @ApiOperation({ summary: 'Delete a influencer service' })
  @Delete('/:serviceId')
  @Roles(UserRole.INFLUENCER)
  async deleteInfluencerService(@Param('serviceId') serviceId: string, @Req() req: Request) {
    return this.influencerServiceService.deleteInfluencerServiceById(serviceId, req?.user?.userId as string);
  }

  @ApiOperation({ summary: 'Get a influencer service' })
  @Get('/:serviceId')
  async getInfluencerService(@Param('serviceId') serviceId: string) {
    return this.influencerServiceService.getInfluencerServiceByServiceId(serviceId);
  }

  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('/influencer/:influencerId')
  async getInfluencerServiceByInfluencerId(
    @Param('influencerId') influencerId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.influencerServiceService.getInfluencerServicesByInfluencerId(influencerId, { page, limit });
  }
}
