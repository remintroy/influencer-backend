import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Availability, AvailabilitySchema } from './schemas/availability.schema';
import { InfluencerServiceService } from 'src/influencer-service/influencer-service.service';
import { InfluencerServices, InfluencerServicesSchema } from 'src/influencer-service/schemas/influencer-service.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: InfluencerServices.name, schema: InfluencerServicesSchema },
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, UserService, InfluencerServiceService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
