import { Controller, Get, Post, Body, Param, Delete, Query, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Platforms')
@ApiBearerAuth('access-token')
@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create Platform' })
  create(@Body() dto: CreatePlatformDto) {
    return this.platformService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List Platforms' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.platformService.findAll({ page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Platform by ID' })
  findOne(@Param('id') id: string) {
    return this.platformService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update Platform' })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.platformService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete Platform' })
  remove(@Param('id') id: string) {
    return this.platformService.remove(id);
  }
}
