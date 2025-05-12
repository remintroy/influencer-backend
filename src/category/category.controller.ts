import { Controller, Get, Post, Body, Param, Delete, Query, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Create Category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List Categories' })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.categoryService.findAll({ page, limit });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get Category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Update Category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @Roles(UserRole.ADMIN, UserRole.INFLUENCER)
  @ApiOperation({ summary: 'Delete Category' })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
