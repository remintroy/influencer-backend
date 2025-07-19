import { Module } from '@nestjs/common';
import { InfluencerServiceController } from './influencer-service.controller';
import { InfluencerServiceService } from './influencer-service.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { InfluencerServices, InfluencerServicesSchema } from './schemas/influencer-service.schema';

import { ContractController } from './contract.controller';
import { Contract, ContractSchema } from './schemas/contract-schema';

@Module({
  imports: [
    // Import UserModule for user-related functionality
    UserModule,

    // Register Mongoose schemas
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: InfluencerServices.name, schema: InfluencerServicesSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
  ],
  controllers: [InfluencerServiceController, ContractController],
  providers: [InfluencerServiceService, UserService],
  // Export InfluencerServiceService for use in other modules
  exports: [InfluencerServiceService],
})
export class InfluencerServiceModule {}
