import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CollaborationService } from './collaboration.service';
import { Request } from 'express';
import { CreateCollaborationDto } from './dto/create-collaboration.dto';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { UpdateCollaborationDto } from './dto/update.collaboration.dto';

@ApiTags('Collaboration')
@ApiBearerAuth('access-token')
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Post('/')
  @ApiOperation({ summary: 'Create a new collaboration', description: 'Admin only endpoint to create a new collaboration' })
  @Roles(UserRole.ADMIN)
  async createCollaboration(@Body() data: CreateCollaborationDto, @Req() req: Request) {
    return this.collaborationService.createCollaboration({ ...data, createdBy: req?.user?.userId });
  }

  @Get('/')
  @ApiOperation({ summary: 'Get all collaborations', description: 'Retrieve a paginated list of all collaborations' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  async getAllCollaborations(@Query() query: { page?: number; limit?: number }) {
    return this.collaborationService.getAllCollaborations(query);
  }

  @Get('/:collaborationId')
  @ApiOperation({ summary: 'Get collaboration by ID', description: 'Retrieve a specific collaboration by its ID' })
  @ApiParam({ name: 'collaborationId', description: 'ID of the collaboration to retrieve' })
  async getCollaborationById(@Param('collaborationId') collaborationId: string) {
    return this.collaborationService.getCollaborationById(collaborationId);
  }

  @Put('/:collaborationId')
  @ApiOperation({ summary: 'Update collaboration', description: 'Admin only endpoint to update an existing collaboration' })
  @ApiParam({ name: 'collaborationId', description: 'ID of the collaboration to update' })
  @Roles(UserRole.ADMIN)
  async updateCollaboration(@Param('collaborationId') collaborationId: string, @Body() data: UpdateCollaborationDto) {
    return this.collaborationService.updateCollaboration(collaborationId, data);
  }

  @Delete('/:collaborationId')
  @ApiOperation({ summary: 'Delete collaboration', description: 'Admin only endpoint to delete a collaboration' })
  @ApiParam({ name: 'collaborationId', description: 'ID of the collaboration to delete' })
  @Roles(UserRole.ADMIN)
  async deleteCollaboration(@Param('collaborationId') collaborationId: string) {
    return this.collaborationService.deleteCollaboration(collaborationId);
  }
}
