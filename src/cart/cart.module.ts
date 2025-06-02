import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
import { UserModule } from 'src/user/user.module';
import { InfluencerServiceModule } from 'src/influencer-service/influencer-service.module';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { AvailabilityService } from 'src/availability/availability.service';
import { Availability, AvailabilitySchema } from 'src/availability/schemas/availability.schema';
import { InfluencerServiceService } from 'src/influencer-service/influencer-service.service';
import { InfluencerServices, InfluencerServicesSchema } from 'src/influencer-service/schemas/influencer-service.schema';
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    UserModule,
    InfluencerServiceModule,
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: User.name, schema: UserSchema },
      { name: Availability.name, schema: AvailabilitySchema },
      { name: InfluencerServices.name, schema: InfluencerServicesSchema },
    ]),
  ],
  controllers: [CartController],
  providers: [CartService, AvailabilityService, InfluencerServiceService, UserService],
  exports: [CartService],
})
export class CartModule {}
