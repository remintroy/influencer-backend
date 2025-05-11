import { Controller, Delete, Get, Param, Post, Put, Body, Req, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from './schemas/user.schema';
import { AuthService } from 'src/auth/auth.service';
import { CreateInfluencerDto } from './dto/create-influencer.dto';
import mongoose from 'mongoose';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
    const password = await this.authService.createPasswordHash(reqData.password);
    const user = await this.usersService.createUserSudo({
      ...reqData,
      role: UserRole.INFLUENCER,
      password,
      category: reqData?.category as unknown as mongoose.Types.ObjectId[],
    });

    delete user.password;
    delete user.meta;

    return user;
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    const userDataFromDb = await this.usersService.getUserById(userId);
    return userDataFromDb;
    // Implement user retrieval logic by ID
  }

  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @Put(':userId')
  updateUser(@Param('userId') userId: string, @Req() req: Request) {
    const dataToUpdate = req.body;
    return this.usersService.updateUser(userId, dataToUpdate);
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
