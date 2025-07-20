import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { jsPDF } from 'jspdf';
import sizeOf from 'image-size';
import { Order, OrderStatus } from './schemas/order.schema';
import { CartService } from '../cart/cart.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole } from '../user/schemas/user.schema';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';
import { AvailabilityService } from '../availability/availability.service';
import { Payment, PaymentStatus } from './schemas/payment.schema';
import { Cron } from '@nestjs/schedule';
import axios from 'axios';
import { Contract } from 'src/influencer-service/schemas/contract-schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Service } from 'src/common/s3/s3.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private readonly cartService: CartService,
    private readonly influencerServiceService: InfluencerServiceService,
    private readonly s3Service: S3Service,
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
      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(cartItem.serviceId.toString(), {
        currentUserId: userId,
      });
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
          influencerIds: service.users.map((user: any) => new Types.ObjectId(user?._id || user)),
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

  // Add this function to map DB status to user-facing status
  private mapOrderStatusForUser(order: Order, userId: string, userRole: UserRole): string {
    const status = order.item.status;
    // Influencer team lead (serviceAdminId) logic can be added here if needed
    switch (status) {
      case OrderStatus.PENDING:
        if (!order.item.contractSignatures?.influencerSigned) {
          return userRole === UserRole.INFLUENCER ? 'Awaiting Your Approval' : 'Awaiting Influencer Approval';
        }
        if (!order.item.contractSignatures.clientSigned) {
          return userRole === UserRole.INFLUENCER ? 'Awaiting Customer Approval' : 'Awaiting Your Approval';
        }
        return 'Awaiting to be approved';

      case OrderStatus.APPROVED:
        return 'Awaiting Payment';
        break;
      case OrderStatus.REJECTED:
        if (order.item.rejectedBy?.toString() === userId) {
          return 'Rejected by You';
        } else if (userRole === UserRole.INFLUENCER) {
          return 'Rejected by Customer';
        } else if (userRole === UserRole.USER) {
          return 'Rejected by Influencer';
        }
        break;
      case OrderStatus.PAID:
        return 'Awaiting For Your Script';
      case OrderStatus.IN_PROGRESS:
        return 'Script to be Approved';
      case OrderStatus.COMPLETED:
        return 'Ready to Published';
      case OrderStatus.CANCELLED:
        return 'Cancelled';
      default:
        return status;
    }
    // Default fallback
    return status;
  }

  async getOrder(userId: string, orderId: string): Promise<any> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .populate({ path: 'item.serviceId', populate: { path: 'contract' } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Add clientStatus to response
    const userRole = order.userId.toString() === userId ? UserRole.USER : UserRole.INFLUENCER;
    const orderStatus = this.mapOrderStatusForUser(order, userId, userRole);
    return { ...order.toObject(), orderStatus };
  }

  async getUserOrders(userId: string): Promise<any[]> {
    const orders = await this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({ path: 'item.serviceId', populate: { path: 'contract' } });
    return orders.map((order) => {
      const userRole = order.userId.toString() === userId ? UserRole.USER : UserRole.INFLUENCER;
      const orderStatus = this.mapOrderStatusForUser(order, userId, userRole);
      return { ...order.toObject(), orderStatus };
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
      orderStatus: PaymentStatus.PAID,
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

  addImageToDoc = async (doc: jsPDF, { boxX, boxY, boxWidth, boxHeight, imageUrl }) => {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const base64 = buffer.toString('base64');
    const dimensions = sizeOf(buffer);

    //
    const widthRatio = boxWidth / dimensions.width;
    const heightRatio = boxHeight / dimensions.height;
    const scale = Math.min(widthRatio, heightRatio, 1); // Don't upscale

    //
    const width = dimensions.width * scale;
    const height = dimensions.height * scale;

    //
    const x = boxX + (boxWidth - width) / 2;
    const y = boxY + (boxHeight - height) / 2;

    // Adding image to DOC
    doc.addImage('data:image/png;base64,' + base64, 'PNG', x, y, width, height);
  };

  async signContract(orderId: string, userId: string, role: UserRole, signatureImage?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const item = order.item;
    if (!item) throw new NotFoundException('Order item not found');

    if (!signatureImage) throw new BadRequestException('Signature is required');

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
      if (item.contractSignatures.clientSigned) throw new BadRequestException('Already signed');
      item.contractSignatures.clientSigned = true;
      item.contractSignatures.clientSignatureImage = signatureImage;
    }
    if (role === UserRole.INFLUENCER) {
      if (item.contractSignatures.influencerSigned) throw new BadRequestException('Already signed');
      item.contractSignatures.influencerSigned = true;
      item.contractSignatures.influencerSignatureImage = signatureImage;
    }
    if (item.contractSignatures.clientSigned && item.contractSignatures.influencerSigned) {
      item.contractSignatures.signedAt = new Date();
      item.status = OrderStatus.APPROVED;

      // TODO: GENERATE SAND SAVE PDF OF SING
      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(order.item.serviceId + '');
      const contract: Contract = service.contract as unknown as Contract;
      const doc = new jsPDF();

      // TItle
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('Contract for service', 10, 20);

      // Contact content
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text(contract.content, 10, 30, { maxWidth: 190 });

      // Influencer Sing
      if (!item.contractSignatures.influencerSignatureImage) throw new BadRequestException('Influencer signature is required');
      doc.text('Influencer signature', 10, 255);
      await this.addImageToDoc(doc, {
        boxX: 15,
        boxY: 255,
        boxWidth: 30,
        boxHeight: 30,
        imageUrl: item.contractSignatures.influencerSignatureImage,
      });

      // Client Sing
      if (!item.contractSignatures.clientSignatureImage) throw new BadRequestException('Client signature is required');
      doc.text('Client signature', 160, 255);
      await this.addImageToDoc(doc, {
        boxX: 165,
        boxY: 255,
        boxWidth: 30,
        boxHeight: 30,
        imageUrl: item.contractSignatures.influencerSignatureImage,
      });

      const folderPath = path.join(process.cwd(), 'tmp');
      const docId = Date.now();
      const filePath = path.join(folderPath, `${docId}.pdf`);

      try {
        await fs.mkdir(folderPath);
      } catch (error) {
        if (error.code != 'EEXIST') {
          console.log(error, 'ERROR while creating temp directory for pdf');
          throw new InternalServerErrorException('Error creating pdf');
        }
      }

      // Save file to temp folder
      doc.save(filePath);

      // Read the file as a buffer
      const fileBuffer = await fs.readFile(filePath);
      const s3UploadResult = await this.s3Service.uploadFile({
        buffer: fileBuffer,
        fileName: `${docId}.pdf`,
        fileType: 'application/pdf',
      });

      item.contractSignatures.contractPdfUrl = s3UploadResult.url;

      // Delete file from temp folder after upload
      fs.unlink(filePath).catch(console.log);
    }

    await order.save();
    return {
      clientSigned: item.contractSignatures.clientSigned || false,
      influencerSigned: item.contractSignatures.influencerSigned || false,
      signedAt: item.contractSignatures.signedAt,
      orderStatus: this.mapOrderStatusForUser(order, userId, role),
      pdfUrl: item.contractSignatures.contractPdfUrl,
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

  // Auto-cancel orders not signed in time
  async autoCancelUnsignedOrders(): Promise<number> {
    // Find all PENDING orders
    const pendingOrders = await this.orderModel.find({ 'item.status': OrderStatus.PENDING });
    let cancelledCount = 0;
    for (const order of pendingOrders) {
      const item = order.item;
      // If already signed by both, skip
      if (item.contractSignatures?.clientSigned && item.contractSignatures?.influencerSigned) continue;
      // Calculate deadline: max(2 days, half the order duration)
      let createdAt: Date;
      if ((order as any).createdAt) {
        createdAt = (order as any).createdAt;
      } else if (order._id && typeof order._id === 'object' && typeof (order._id as any).getTimestamp === 'function') {
        createdAt = (order._id as any).getTimestamp();
      } else {
        createdAt = new Date(); // fallback to now if not available
      }
      const deliveryDate = item.deliveryDate;
      const now = new Date();
      let minWindow = 2 * 24 * 60 * 60 * 1000; // 2 days in ms
      let halfDuration = deliveryDate && createdAt ? Math.floor((deliveryDate.getTime() - createdAt.getTime()) / 2) : 0;
      let deadline = new Date(createdAt.getTime() + Math.min(minWindow, halfDuration));
      if (now > deadline) {
        item.status = OrderStatus.CANCELLED;
        item.rejectionReason = 'Order auto-cancelled due to timeout (not signed in time)';
        await order.save();
        cancelledCount++;
      }
    }
    return cancelledCount;
  }

  // Cron job to auto-cancel unsigned orders at 12 AM every day
  @Cron('0 0 * * *')
  async handleAutoCancelUnsignedOrdersCron() {
    const cancelled = await this.autoCancelUnsignedOrders();
    if (cancelled > 0) {
      console.log(`[OrderService] Auto-cancelled ${cancelled} unsigned orders at 12 AM`);
    }
  }

  // Get all orders pending influencer approval for a given influencer
  async getPendingOrdersForInfluencer(influencerId: string): Promise<any[]> {
    const orders = await this.orderModel
      .find({
        'item.status': OrderStatus.PENDING,
        'item.influencerIds': new Types.ObjectId(influencerId),
        $or: [
          { 'item.contractSignatures.influencerSigned': { $ne: true } },
          { 'item.contractSignatures.influencerSigned': { $exists: false } },
        ],
      })
      .populate({ path: 'item.serviceId', populate: { path: 'contract' } });
    return orders.map((order) => {
      const orderStatus = this.mapOrderStatusForUser(order, influencerId, UserRole.INFLUENCER);
      return { ...order.toObject(), orderStatus };
    });
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
