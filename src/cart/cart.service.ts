import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument, CartItem, TimeSlot } from './schemas/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { AvailabilityService } from '../availability/availability.service';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';

interface ServiceData {
  requiresTimeSlot: boolean;
  price: number;
  title?: string;
  description?: string;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private availabilityService: AvailabilityService,
    private influencerServiceService: InfluencerServiceService,
  ) {}

  private validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-3]0$/;
    return timeRegex.test(time);
  }

  private validateTimeSlot(startTime: string, endTime: string): boolean {
    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      return false;
    }

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes === 30;
  }

  private async validateServiceAndTimeSlot(serviceId: string, influencerId: string, timeSlot?: TimeSlot): Promise<ServiceData> {
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const serviceData: ServiceData = {
      requiresTimeSlot: service.requireTimeSlot ?? false,
      price: service.price ?? 0,
      title: service.title,
      description: service.description,
    };

    if (serviceData.requiresTimeSlot && !timeSlot) {
      throw new BadRequestException('Time slot is required for this service');
    }

    if (timeSlot) {
      if (!this.validateTimeSlot(timeSlot.startTime, timeSlot.endTime)) {
        throw new BadRequestException('Invalid time slot format. Must be 30-minute intervals');
      }

      // Check if the time slot is available
      const { isAvailable } = await this.availabilityService.checkInfluencerAvailability(
        influencerId,
        timeSlot.date,
        timeSlot.startTime,
        timeSlot.endTime,
      );

      if (!isAvailable) {
        throw new BadRequestException('Selected time slot is not available');
      }
    }

    return serviceData;
  }

  async getCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId), isActive: true });
    if (!cart) {
      return this.cartModel.create({ userId: new Types.ObjectId(userId) });
    }
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    const { serviceId, influencerId, quantity, timeSlot, price, title, description } = addToCartDto;

    // Validate service and time slot
    const serviceData = await this.validateServiceAndTimeSlot(serviceId, influencerId, timeSlot);

    // Get or create cart
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId), isActive: true });
    if (!cart) {
      cart = await this.cartModel.create({ userId: new Types.ObjectId(userId) });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.serviceId.toString() === serviceId &&
        (!item.timeSlot || !timeSlot || item.timeSlot.date.getTime() === timeSlot.date.getTime()),
    );

    if (existingItemIndex > -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      cart.items.push({
        serviceId: new Types.ObjectId(serviceId),
        influencerId: new Types.ObjectId(influencerId),
        quantity,
        requiresTimeSlot: serviceData.requiresTimeSlot,
        timeSlot: timeSlot
          ? {
              date: timeSlot.date,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
            }
          : undefined,
        price: serviceData.price,
        title: serviceData.title,
        description: serviceData.description,
      });
    }

    // Update total amount
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

    return cart.save();
  }

  async updateCartItem(userId: string, itemIndex: number, quantity: number, timeSlot?: TimeSlot): Promise<CartDocument> {
    const cart = await this.getCart(userId);
    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Cart item not found');
    }

    const item = cart.items[itemIndex];
    if (item.requiresTimeSlot && !timeSlot) {
      throw new BadRequestException('Time slot is required for this service');
    }

    if (timeSlot) {
      if (!this.validateTimeSlot(timeSlot.startTime, timeSlot.endTime)) {
        throw new BadRequestException('Invalid time slot format. Must be 30-minute intervals');
      }

      // Check if the time slot is available
      const { isAvailable } = await this.availabilityService.checkInfluencerAvailability(
        item.influencerId.toString(),
        timeSlot.date,
        timeSlot.startTime,
        timeSlot.endTime,
      );

      if (!isAvailable) {
        throw new BadRequestException('Selected time slot is not available');
      }

      item.timeSlot = {
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      };
    }

    item.quantity = quantity;
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
    return cart.save();
  }

  async removeFromCart(userId: string, itemIndex: number): Promise<CartDocument> {
    const cart = await this.getCart(userId);
    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Cart item not found');
    }

    cart.items.splice(itemIndex, 1);
    cart.totalAmount = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);
    return cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.getCart(userId);
    cart.items = [];
    cart.totalAmount = 0;
    return cart.save();
  }
}
