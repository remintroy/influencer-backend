import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Body,
  Req,
  ForbiddenException,
  NotFoundException,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './schemas/user.schema';
import { AuthService } from 'src/auth/auth.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInfluencerServiceDto } from './dto/create-influencer-service.dto';
import { UpdateInfluencerServiceDto } from './dto/update-influencer-service.dto';
import mongoose, { Types } from 'mongoose';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/role.decorator';

@ApiTags('User management')
@ApiBearerAuth('access-token')
@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post('/')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @Roles(UserRole.ADMIN)
  async createUser(@Body() reqData: CreateUserDto) {
    // Implement user creation logic
    const existingUser = await this.usersService.getUserByEmailOrPhoneSudo(reqData.email || reqData.phoneNumber || '');

    if (existingUser) {
      throw new ForbiddenException('Email or phone already exists');
    }

    const password = await this.authService.createPasswordHash(reqData.password);
    const user = await this.usersService.createUserSudo({ ...reqData, role: UserRole.USER, password });
    return user;
  }

  @Post('/influencer')
  @ApiOperation({ summary: 'Create a new Influencer (Admin only)' })
  @Roles(UserRole.ADMIN)
  async createInfluencer(@Body() reqData: CreateInfluencerDto) {
    // Implement influencer creation logic

    const dataToSave = {
      ...reqData,
      role: UserRole.INFLUENCER,
      category: reqData?.category as unknown as mongoose.Types.ObjectId[],
    };

    if (reqData?.password) dataToSave.password = await this.authService.createPasswordHash(reqData.password);

    const user = await this.usersService.createUserSudo(dataToSave);

    delete user.password;
    delete user.meta;

    return user;
  }

  @Roles(UserRole.ADMIN)
  @Get('/list-users')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getAllUsers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return await this.usersService.getAllUsersSudo({ page, limit, role: UserRole.USER });
  }

  // @Roles(UserRole.ADMIN)
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('/list-influencers')
  async getAllInfluencers(@Query('page') page?: number, @Query('limit') limit?: number) {
    return await this.usersService.getAllUsersSudo({ page, limit, role: UserRole.INFLUENCER });
  }

  @ApiOperation({ summary: 'Search influencers' })
  @Get('influencer-search')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchInfluencers(
    @Query('search') search: string,
    @Query('category') category: string,
    @Query('platform') platform: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.usersService.getInfluencerSearchPaginated(search, { category, platform, page, limit });
  }

  // Services
  @Post('/influencer/service')
  @ApiOperation({ summary: 'Create a new influencer service' })
  async createInfluencerService(@Req() req: Request, @Body() data: CreateInfluencerServiceDto) {
    if (req?.user?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({
        error: 'Only influencer can create a service',
        message: 'Action denied',
      });
    }

    const influencerId = req?.user?.userId as string;
    return this.usersService.createInfluencerService(influencerId, {
      ...data,
      influencerId: new Types.ObjectId(influencerId),
    });
  }

  @Put('/influencer/service/:serviceId')
  @ApiOperation({ summary: 'Update an influencer service' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  async updateInfluencerService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateInfluencerServiceDto,
    @Req() req: Request,
  ) {
    if (req?.user?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({
        error: 'Only influencer can update a service',
        message: 'Action denied',
      });
    }

    return this.usersService.updateInfluencerService(serviceId, data, { influencerId: req?.user?.userId as string });
  }

  @ApiOperation({ summary: 'Delete a influencer service' })
  @Delete('/influencer/service/:serviceId')
  async deleteInfluencerService(@Param('serviceId') serviceId: string, @Req() req: Request) {
    if (req?.user?.role != UserRole.INFLUENCER) {
      throw new ForbiddenException({
        error: 'Only influencer can delete a service',
        message: 'Action denied',
      });
    }

    return this.usersService.deleteInfluencerServiceById(serviceId, req?.user?.userId as string);
  }

  @ApiOperation({ summary: 'Get a influencer service' })
  @Get('/influencer/service/:serviceId')
  async getInfluencerService(@Param('serviceId') serviceId: string) {
    return this.usersService.getInfluencerServiceByServiceId(serviceId);
  }

  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('/influencer/:influencerId/service')
  async getInfluencerServiceByInfluencerId(
    @Param('influencerId') influencerId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return await this.usersService.getInfluencerServicesByInfluencerId(influencerId, { page, limit });
  }

  // Wild card routes

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getUserById(@Param('userId') userId: string, @Req() req: Request) {
    const data = await this.usersService[UserRole.ADMIN == req.user?.role ? 'getUserByIdPreviewSudo' : 'getUserById'](userId);
    if (!data) throw new NotFoundException('User not found');
    return data;
  }

  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Put(':userId')
  async updateUser(@Param('userId') userId: string, @Req() req: Request, @Body() reqData: UpdateUserDto) {
    if (!reqData) throw new BadRequestException('Nothing to update');
    if (req.user?.role == UserRole.USER && req.user?.userId != userId) {
      throw new ForbiddenException('Unauthorized to update this user');
    }
    return this.usersService.updateUser(userId, { ...reqData, category: reqData?.category as unknown as Types.ObjectId[] });
  }

  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Delete(':userId')
  async deleteUser(@Param('userId') userId: string, @Req() req: Request) {
    if (req.user?.userId != userId && req.user?.role != UserRole.ADMIN) {
      throw new ForbiddenException('Unauthorized to delete this user');
    }
    const user = await this.usersService.deleteUserSudo(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
