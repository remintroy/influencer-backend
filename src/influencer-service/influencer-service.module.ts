import { Module } from '@nestjs/common';
import { InfluencerServiceController } from './influencer-service.controller';
import { InfluencerServiceService } from './influencer-service.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { InfluencerServices, InfluencerServicesSchema } from './schemas/influencer-service.schema';
import { Collaboration, CollaborationSchema } from 'src/collaboration/schemas/collaboration.schema';
import { CollaborationService } from 'src/collaboration/collaboration.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: InfluencerServices.name, schema: InfluencerServicesSchema }]),
    MongooseModule.forFeature([{ name: Collaboration.name, schema: CollaborationSchema }]),
  ],
  controllers: [InfluencerServiceController],
  providers: [InfluencerServiceService, UserService, CollaborationService],
})
export class InfluencerServiceModule {}
