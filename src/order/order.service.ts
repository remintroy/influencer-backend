import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus, PaymentStatus } from './schemas/order.schema';
import { CartService } from '../cart/cart.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole } from '../user/schemas/user.schema';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private readonly cartService: CartService,
    private readonly influencerServiceService: InfluencerServiceService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async createOrder(userId: string): Promise<Order> {
    // Get user's cart
    const cart = await this.cartService.getCart(userId);

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate all items are not disabled
    const disabledItems = cart.items.filter((item) => item.disabled);
    if (disabledItems.length > 0) {
      throw new BadRequestException('Cannot create order with disabled items');
    }

    // Validate services and get latest user IDs
    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        // Get latest service data
        const service = await this.influencerServiceService.getInfluencerServiceByServiceId(item.serviceId.toString());
        if (!service) {
          throw new BadRequestException(`Service ${item.serviceId} not found`);
        }

        // Validate all users exist
        if (!service.users || service.users.length === 0) {
          throw new BadRequestException(`No users found for service ${item.serviceId}`);
        }

        // Check availability for all users if service requires time slot
        if (service.requireTimeSlot) {
          const availabilityChecks = await Promise.all(
            service.users.map(userId =>
              this.availabilityService.checkInfluencerAvailability(
                userId.toString(),
                item.bookingDate,
                item.startTime!,
                item.endTime!,
              )
            )
          );

          if (availabilityChecks.some(check => !check.isAvailable)) {
            throw new BadRequestException(`Time slot not available for one or more influencers in service ${item.serviceId}`);
          }
        }

        return {
          serviceId: item.serviceId,
          influencerIds: service.users.map(id => new Types.ObjectId(id)),
          bookingDate: item.bookingDate,
          startTime: item.startTime,
          endTime: item.endTime,
          price: item.price,
        };
      })
    );

    // Create order
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(userId),
      items: validatedItems,
      totalAmount: cart.items.reduce((sum, item) => sum + item.price, 0),
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    // Clear the entire cart after order creation
    await this.cartService.clearCart(userId);

    return order;
  }

  async getOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId: new Types.ObjectId(userId) });
  }

  async getInfluencerOrders(influencerId: string): Promise<Order[]> {
    return this.orderModel.find({
      'items.influencerIds': new Types.ObjectId(influencerId),
    });
  }

  async updateOrderStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order?.userId?.toString() !== userId?.toString() && userRole != UserRole.ADMIN) {
      throw new ForbiddenException("You don't have permission to update this order");
    }

    // Validate status transition
    this.validateStatusTransition(order.status, updateOrderStatusDto.status, userRole);

    // Validate rejection reason
    if (updateOrderStatusDto.status === OrderStatus.REJECTED && !updateOrderStatusDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting an order');
    }

    // Update order status
    const update: any = {
      status: updateOrderStatusDto.status,
    };

    if (updateOrderStatusDto.status === OrderStatus.REJECTED) {
      update.rejectedBy = new Types.ObjectId(userId);
      update.rejectionReason = updateOrderStatusDto.rejectionReason;
    } else if (updateOrderStatusDto.status === OrderStatus.APPROVED) {
      update.approvedBy = new Types.ObjectId(userId);
    }

    const orderUpdated = await this.orderModel.findByIdAndUpdate(orderId, update, { new: true });
    if (!orderUpdated) throw new BadRequestException('No order found');
    return orderUpdated;
  }

  async processPayment(orderId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(userId, orderId);

    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException('Order must be approved before payment');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    // TODO: Integrate with actual payment gateway
    // For now, just simulate successful payment
    const paymentResult = {
      success: true,
      paymentId: 'MOCK_PAYMENT_' + Date.now(),
    };

    if (!paymentResult.success) {
      throw new BadRequestException('Payment failed');
    }

    const orderUpdated = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        paymentId: paymentResult.paymentId,
        paymentDate: new Date(),
      },
      { new: true },
    );

    if (!orderUpdated) throw new BadRequestException('No order found');
    return orderUpdated;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus, userRole: UserRole): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.APPROVED, OrderStatus.REJECTED],
      [OrderStatus.APPROVED]: [OrderStatus.PAID, OrderStatus.REJECTED],
      [OrderStatus.PAID]: [OrderStatus.IN_PROGRESS],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED],
      [OrderStatus.REJECTED]: [],
      [OrderStatus.COMPLETED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    // Validate user role permissions
    if (userRole === UserRole.USER) {
      if (newStatus !== OrderStatus.PAID) {
        throw new BadRequestException('Users can only update order status to PAID');
      }
    } else if (userRole === UserRole.INFLUENCER) {
      if (![OrderStatus.APPROVED, OrderStatus.REJECTED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(newStatus)) {
        throw new BadRequestException('Influencers can only approve, reject, or update progress of orders');
      }
    }
  }
}
