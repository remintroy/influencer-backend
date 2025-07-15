import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contract } from './schemas/influencer-service.schema';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

@ApiTags('Contract Management (Admin)')
@ApiBearerAuth('access-token')
@Controller('admin/contracts')
export class ContractController {
  constructor(@InjectModel(Contract.name) private contractModel: Model<Contract>) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @Roles(UserRole.ADMIN)
  async createContract(@Body() body: any) {
    // body should include: title, content, createdBy, serviceId
    const contract = await this.contractModel.create({
      ...body,
      createdBy: new Types.ObjectId(body.createdBy),
      serviceId: new Types.ObjectId(body.serviceId),
    });
    return contract;
  }

  @Get()
  @ApiOperation({ summary: 'List all contracts' })
  @Roles(UserRole.ADMIN)
  async listContracts(@Query('serviceId') serviceId?: string) {
    const filter: any = {};
    if (serviceId) filter.serviceId = new Types.ObjectId(serviceId);
    return this.contractModel.find(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  @Roles(UserRole.ADMIN)
  async getContract(@Param('id') id: string) {
    return this.contractModel.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contract by ID' })
  @Roles(UserRole.ADMIN)
  async updateContract(@Param('id') id: string, @Body() body: any) {
    await this.contractModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: body });
    return this.contractModel.findById(id);
  }
} 