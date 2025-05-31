import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
import { AvailabilityModule } from '../availability/availability.module';
import { InfluencerServiceModule } from '../influencer-service/influencer-service.module';
import { CollaborationModule } from '../collaboration/collaboration.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
    AvailabilityModule,
    InfluencerServiceModule,
    CollaborationModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
