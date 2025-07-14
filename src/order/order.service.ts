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

        // Validate location if required
        if (service.locationRequired && (!item.location || item.location.trim() === '')) {
          throw new BadRequestException('Location is required for this service');
        }

        // Validate deliveryDate is at least minimumDaysForCompletion from today
        const today = new Date();
        today.setHours(0,0,0,0);
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + (service.minimumDaysForCompletion || 1));
        if (!item.deliveryDate || item.deliveryDate < minDate) {
          throw new BadRequestException(`Delivery date must be at least ${service.minimumDaysForCompletion || 1} days from today.`);
        }

        return {
          serviceId: item.serviceId,
          influencerIds: service.users.map(id => new Types.ObjectId(id)),
          deliveryDate: item.deliveryDate,
          location: item.location,
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
    itemId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const item = order.items.find(item => item._id.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Order item not found');
    }

    // Validate user permissions
    if (userRole === UserRole.INFLUENCER) {
      // Check if the influencer is involved in this order item
      const isInvolvedInfluencer = item.influencerIds.some(
        id => id.toString() === userId
      );
      
      if (!isInvolvedInfluencer) {
        throw new ForbiddenException('You are not authorized to update this order item');
      }
    } else if (userRole === UserRole.USER) {
      // Users can only update their own orders
      if (order.userId.toString() !== userId) {
        throw new ForbiddenException('You can only update your own orders');
      }
    }

    // Validate status transition
    this.validateStatusTransition(item.status, updateOrderStatusDto.status, userRole);

    // Validate rejection reason
    if (updateOrderStatusDto.status === OrderStatus.REJECTED && !updateOrderStatusDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required when rejecting an order item');
    }

    // Update item status
    const update: any = {
      'items.$[item].status': updateOrderStatusDto.status,
    };

    if (updateOrderStatusDto.status === OrderStatus.REJECTED) {
      update['items.$[item].rejectedBy'] = new Types.ObjectId(userId);
      update['items.$[item].rejectionReason'] = updateOrderStatusDto.rejectionReason;
    } else if (updateOrderStatusDto.status === OrderStatus.APPROVED) {
      update['items.$[item].approvedBy'] = new Types.ObjectId(userId);
    }

    const orderUpdated = await this.orderModel.findOneAndUpdate(
      { _id: orderId },
      { $set: update },
      { 
        arrayFilters: [{ 'item._id': new Types.ObjectId(itemId) }],
        new: true 
      }
    );

    if (!orderUpdated) throw new BadRequestException('No order found');
    return orderUpdated;
  }

  async processPayment(orderId: string, userId: string): Promise<Order> {
    const order = await this.getOrder(userId, orderId);

    // Get approved items
    const approvedItems = order.items.filter(item => item.status === OrderStatus.APPROVED);
    if (approvedItems.length === 0) {
      throw new BadRequestException('No approved items to process payment');
    }

    // Calculate total for approved items
    const totalAmount = approvedItems.reduce((sum, item) => sum + item.price, 0);

    // TODO: Integrate with actual payment gateway
    // For now, just simulate successful payment
    const paymentResult = {
      success: true,
      paymentId: 'MOCK_PAYMENT_' + Date.now(),
    };

    if (!paymentResult.success) {
      throw new BadRequestException('Payment failed');
    }

    // Update order with payment info and mark approved items as paid
    const orderUpdated = await this.orderModel.findOneAndUpdate(
      { _id: orderId },
      {
        $set: {
          paymentStatus: PaymentStatus.PAID,
          paymentId: paymentResult.paymentId,
          paymentDate: new Date(),
          totalAmount: totalAmount,
          'items.$[item].isPaid': true,
          'items.$[item].status': OrderStatus.PAID
        }
      },
      {
        arrayFilters: [{ 'item.status': OrderStatus.APPROVED }],
        new: true
      }
    );

    if (!orderUpdated) throw new BadRequestException('No order found');

    // Remove rejected and pending items
    await this.orderModel.updateOne(
      { _id: orderId },
      {
        $pull: {
          items: {
            status: { $in: [OrderStatus.REJECTED, OrderStatus.PENDING] }
          }
        }
      }
    );

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
