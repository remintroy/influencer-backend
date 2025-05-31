import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { Availability, AvailabilitySchema } from './schemas/availability.schema';
import { UserService } from 'src/user/user.service';
import { CollaborationService } from 'src/collaboration/collaboration.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { Collaboration, CollaborationSchema } from 'src/collaboration/schemas/collaboration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Availability.name, schema: AvailabilitySchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Collaboration.name, schema: CollaborationSchema }]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService, UserService, CollaborationService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
