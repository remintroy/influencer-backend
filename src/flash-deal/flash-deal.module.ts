/**
 * Flash Deal Module
 *
 * This module handles all flash deal related functionality including:
 * - Creating time-limited deals for influencer services
 * - Managing flash deal lifecycle (create, update, delete)
 * - Handling flash deal purchases
 * - Tracking flash deal statistics
 *
 * Dependencies:
 * - InfluencerServiceModule: For service validation and data
 * - UserService: For user data and projections
 * - CollaborationService: For collaboration-related operations
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FlashDealController } from './flash-deal.controller';
import { FlashDealService } from './flash-deal.service';
import { FlashDeal, FlashDealSchema } from './schemas/flash-deal.schema';
import { InfluencerServiceService } from 'src/influencer-service/influencer-service.service';
import { InfluencerServices, InfluencerServicesSchema } from 'src/influencer-service/schemas/influencer-service.schema';
import { InfluencerServiceModule } from 'src/influencer-service/influencer-service.module';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/user.service';
import { CollaborationService } from 'src/collaboration/collaboration.service';
import { Collaboration, CollaborationSchema } from 'src/collaboration/schemas/collaboration.schema';

@Module({
  imports: [
    // Import InfluencerServiceModule for service validation and data
    InfluencerServiceModule,

    // Register Mongoose schemas
    MongooseModule.forFeature([
      { name: FlashDeal.name, schema: FlashDealSchema },
      { name: InfluencerServices.name, schema: InfluencerServicesSchema },
      { name: User.name, schema: UserSchema },
      { name: Collaboration.name, schema: CollaborationSchema },
    ]),
  ],
  controllers: [FlashDealController],
  providers: [FlashDealService, InfluencerServiceService, UserService, CollaborationService],
  // Export FlashDealService for use in other modules
  exports: [FlashDealService],
})
export class FlashDealModule {}
