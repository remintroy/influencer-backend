import { Body, Controller, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';
import { InfluencerServiceService } from './influencer-service.service';
import { CreateContractDto } from './dto/contract.dto';
import { Request } from 'express';
import { Contract } from './schemas/contract-schema';

@ApiTags('Contract Management (Admin)')
@ApiBearerAuth('access-token')
@Controller('admin/contracts')
export class ContractController {
  constructor(
    @InjectModel(Contract.name) private contractModel: Model<Contract>,
    private readonly influencerServiceService: InfluencerServiceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @Roles(UserRole.ADMIN)
  async createContract(@Body() body: CreateContractDto, @Req() req: Request) {
    // body should include: title, content, serviceId
    // Instead of just creating contract, approve the service and attach contract
    const { serviceId, ...contractData } = body;
    // req.user.userId is the admin
    // TODO: Create Contract - - - 
    // return this.approveServiceAndAttachContract(req.user?.userId!, serviceId, contractData);
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
