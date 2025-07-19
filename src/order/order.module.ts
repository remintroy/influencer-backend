import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order, OrderSchema } from './schemas/order.schema'; 
import { ScheduleModule } from '@nestjs/schedule';
import { CartModule } from '../cart/cart.module';
import { InfluencerServiceModule } from '../influencer-service/influencer-service.module';
import { AvailabilityModule } from '../availability/availability.module';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { Contract, ContractSchema } from 'src/influencer-service/schemas/contract-schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    CartModule,
    InfluencerServiceModule,
    AvailabilityModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
