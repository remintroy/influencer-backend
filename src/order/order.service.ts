import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderStatus } from './schemas/order.schema';
import { CartService } from '../cart/cart.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole } from '../user/schemas/user.schema';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';
import { AvailabilityService } from '../availability/availability.service';
import { Payment, PaymentStatus } from './schemas/payment.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly cartService: CartService,
    private readonly influencerServiceService: InfluencerServiceService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async createOrder(userId: string): Promise<Order[]> {
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

    // Generate a common orderGroupId for this checkout
    const orderGroupId = new Types.ObjectId().toHexString();

    // For each cart item, create a separate order
    const createdOrders: Order[] = [];
    for (const cartItem of cart.items) {
      // Get latest service data
      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(cartItem.serviceId.toString());
      if (!service) {
        throw new BadRequestException(`Service ${cartItem.serviceId} not found`);
      }

      // Validate all users exist
      if (!service.users || service.users.length === 0) {
        throw new BadRequestException(`No users found for service ${cartItem.serviceId}`);
      }

      // Validate location if required
      if (service.locationRequired && (!cartItem.location || cartItem.location.trim() === '')) {
        throw new BadRequestException('Location is required for this service');
      }

      // Validate deliveryDate is at least minimumDaysForCompletion from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() + (service.minimumDaysForCompletion || 1));
      if (!cartItem.deliveryDate || cartItem.deliveryDate < minDate) {
        throw new BadRequestException(`Delivery date must be at least ${service.minimumDaysForCompletion || 1} days from today.`);
      }

      // Create order for this service
      const order = await this.orderModel.create({
        userId: new Types.ObjectId(userId),
        orderGroupId,
        item: {
          serviceId: cartItem.serviceId,
          influencerIds: service.users.map((user) => new Types.ObjectId(user?._id || user)),
          deliveryDate: cartItem.deliveryDate,
          location: cartItem.location,
          price: cartItem.price,
        },
        totalAmount: cartItem.price,
      });
      createdOrders.push(order);
    }

    // Clear the entire cart after order creation
    await this.cartService.clearCart(userId);

    return createdOrders;
  }

  async getOrder(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .populate({ path: 'item.serviceId', populate: { path: 'contract' } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'item.serviceId', populate: { path: 'contract' } });
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
    const item = order.item;
    if (!item) {
      throw new NotFoundException('Order item not found');
    }
    // Validate user permissions
    if (userRole === UserRole.INFLUENCER) {
      const isInvolvedInfluencer = item.influencerIds.some((id) => id.toString() === userId);
      if (!isInvolvedInfluencer) {
        throw new ForbiddenException('You are not authorized to update this order item');
      }
    } else if (userRole === UserRole.USER) {
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
    if (updateOrderStatusDto.status === OrderStatus.REJECTED) {
      item.status = updateOrderStatusDto.status;
      item.rejectedBy = new Types.ObjectId(userId);
      item.rejectionReason = updateOrderStatusDto.rejectionReason;
    } else if (updateOrderStatusDto.status === OrderStatus.APPROVED) {
      item.status = updateOrderStatusDto.status;
      item.approvedBy = new Types.ObjectId(userId);
    } else {
      item.status = updateOrderStatusDto.status;
    }
    await order.save();
    return order;
  }

  async processPayment(orderId: string, userId: string): Promise<Order | null> {
    const order = await this.getOrder(userId, orderId);
    const item = order.item;
    if (!item) {
      throw new BadRequestException('Order item not found');
    }
    // Only require both signatures before payment
    if (!item.contractSignatures?.clientSigned || !item.contractSignatures?.influencerSigned) {
      throw new BadRequestException('Both client and influencer must sign the contract before payment.');
    }
    if (!item.deliveryDate || item.deliveryDate < new Date()) {
      throw new BadRequestException('Delivery date is invalid or in the past.');
    }
    // Find all orders in the same group
    const ordersInGroup = await this.orderModel.find({ orderGroupId: order.orderGroupId });
    const totalAmount = ordersInGroup.reduce((sum, o) => sum + (o.item?.price || 0), 0);
    // Create payment document
    const payment = await this.paymentModel.create({
      orderGroupId: order.orderGroupId,
      userId: order.userId,
      amount: totalAmount,
      status: PaymentStatus.PAID,
      orders: ordersInGroup.map((o) => o._id),
      paymentGatewayId: 'MOCK_PAYMENT_' + Date.now(),
    });
    // Link payment to all orders in the group
    await this.orderModel.updateMany(
      { orderGroupId: order.orderGroupId },
      {
        $set: {
          paymentId: payment._id,
          paymentDate: new Date(),
          totalAmount: totalAmount,
          'item.isPaid': true,
          'item.status': OrderStatus.PAID,
        },
      },
    );
    // Return the updated order
    return this.orderModel.findById(orderId);
  }

  async signContract(orderId: string, userId: string, role: UserRole) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const item = order.item;
    if (!item) throw new NotFoundException('Order item not found');

    // Permission check
    if (role === UserRole.USER && order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only sign your own order contract');
    }
    if (role === UserRole.INFLUENCER && !item.influencerIds.some((id) => id.toString() === userId)) {
      throw new ForbiddenException('You are not authorized to sign this contract');
    }

    // Update contract signatures
    if (!item.contractSignatures) {
      item.contractSignatures = {};
    }
    if (role === UserRole.USER) {
      item.contractSignatures.clientSigned = true;
    }
    if (role === UserRole.INFLUENCER) {
      item.contractSignatures.influencerSigned = true;
    }
    if (item.contractSignatures.clientSigned && item.contractSignatures.influencerSigned) {
      item.contractSignatures.signedAt = new Date();
    }
    await order.save();
    return {
      clientSigned: item.contractSignatures.clientSigned || false,
      influencerSigned: item.contractSignatures.influencerSigned || false,
      signedAt: item.contractSignatures.signedAt,
    };
  }

  async getContractStatus(orderId: string, userId: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const item = order.item;
    if (!item) throw new NotFoundException('Order item not found');
    // Permission check
    if (order.userId.toString() !== userId && !item.influencerIds.some((id) => id.toString() === userId)) {
      throw new ForbiddenException('You are not authorized to view this contract status');
    }
    return {
      clientSigned: item.contractSignatures?.clientSigned || false,
      influencerSigned: item.contractSignatures?.influencerSigned || false,
      signedAt: item.contractSignatures?.signedAt,
    };
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus, userRole: UserRole): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.REJECTED],
      [OrderStatus.APPROVED]: [],
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
      if (![OrderStatus.REJECTED, OrderStatus.IN_PROGRESS, OrderStatus.COMPLETED].includes(newStatus)) {
        throw new BadRequestException('Influencers can only reject or update progress of orders');
      }
    }
  }
}
