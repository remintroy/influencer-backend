/**
 * Flash Deal Module
 *
 * This module manages flash deals functionality including:
 * - Creating and managing flash deals
 * - Handling flash deal updates and deletions
 * - Managing flash deal visibility and availability
 * - Tracking flash deal statistics and performance
 *
 * Dependencies:
 * - UserModule: For user data and authentication
 * - InfluencerServiceModule: For service-related operations
 */
import { Module } from '@nestjs/common';
import { FlashDealController } from './flash-deal.controller';
import { FlashDealService } from './flash-deal.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { InfluencerServiceModule } from 'src/influencer-service/influencer-service.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { FlashDeal, FlashDealSchema } from './schemas/flash-deal.schema';
import { InfluencerServiceService } from 'src/influencer-service/influencer-service.service';
import { InfluencerServices, InfluencerServicesSchema } from 'src/influencer-service/schemas/influencer-service.schema';

@Module({
  imports: [
    UserModule,
    InfluencerServiceModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: FlashDeal.name, schema: FlashDealSchema },
      { name: InfluencerServices.name, schema: InfluencerServicesSchema },
    ]),
  ],
  controllers: [FlashDealController],
  providers: [FlashDealService, InfluencerServiceService, UserService],
  exports: [FlashDealService],
})
export class FlashDealModule {}
