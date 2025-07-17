import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument, CartItem } from './schemas/cart.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { InfluencerServiceService } from '../influencer-service/influencer-service.service';
import { AvailabilityService } from '../availability/availability.service';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly influencerServiceService: InfluencerServiceService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  async getOrCreateCart(userId: string): Promise<CartDocument> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (cart) {
      // Check and update disabled status of items
      await this.checkAndUpdateDisabledItems(cart);
      return cart;
    }

    return await this.cartModel.create({
      userId: new Types.ObjectId(userId),
      items: [],
      totalAmount: 0,
    });
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Get service and validate
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(addToCartDto.serviceId, { currentUserId: userId });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate users exist in service
    if (!service.users || service.users.length === 0) {
      throw new BadRequestException('No users found for this service');
    }

    // Set service and locationRequired on DTO for validation
    // addToCartDto.service = service;
    // addToCartDto.locationRequired = !!service.locationRequired;

    // Validate location if required
    if (service.locationRequired && (!addToCartDto.location || addToCartDto.location.trim() === '')) {
      throw new BadRequestException('Location is required for this service');
    }

    // Validate deliveryDate is at least minimumDaysForCompletion from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + (service.minimumDaysForCompletion || 1));
    if (!addToCartDto.deliveryDate || addToCartDto.deliveryDate < minDate) {
      throw new BadRequestException(`Delivery date must be at least ${service.minimumDaysForCompletion || 1} days from today.`);
    }

    // Create cart item with all users from service
    const cartItem: CartItem = {
      _id: new Types.ObjectId(),
      serviceId: new Types.ObjectId(addToCartDto.serviceId),
      influencerIds: service.users.map((user) => new Types.ObjectId(user?._id || user)),
      deliveryDate: addToCartDto.deliveryDate,
      location: addToCartDto.location,
      price: service?.price! || 0,
      disabled: false,
    };

    // Add item to cart and update total
    cart.items.push(cartItem);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price, 0);

    return await cart.save();
  }

  async removeFromCart(userId: string, itemId: string): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);

    if (!Types.ObjectId.isValid(itemId)) {
      throw new BadRequestException('Invalid item ID');
    }

    const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Cart item not found');
    }

    // Remove item and update total
    cart.items.splice(itemIndex, 1);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price, 0);

    return await cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    cart.totalAmount = 0;
    return await cart.save();
  }

  async getCart(userId: string): Promise<CartDocument> {
    return await this.getOrCreateCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, updates: Partial<CartItem>): Promise<CartDocument> {
    const cart = await this.getOrCreateCart(userId);

    if (!Types.ObjectId.isValid(itemId)) {
      throw new BadRequestException('Invalid item ID');
    }

    const item = cart.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Get latest service data
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(item.serviceId.toString(), { currentUserId: userId });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Validate users exist in service
    if (!service.users || service.users.length === 0) {
      throw new BadRequestException('No users found for this service');
    }

    // Update item with latest user IDs from service
    delete updates?._id;

    for (const key in updates) {
      if (updates[key]) item[key] = updates[key];
    }

    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item?.price || 0), 0);

    return await cart.save();
  }

  private async checkAndUpdateDisabledItems(cart: CartDocument): Promise<void> {
    let hasChanges = false;

    for (const item of cart.items) {
      if (item.disabled) continue; // Skip already disabled items

      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(item.serviceId.toString());
      if (!service) {
        item.disabled = true;
        hasChanges = true;
        continue;
      }

      // Validate users exist in service
      if (!service.users || service.users.length === 0) {
        item.disabled = true;
        hasChanges = true;
        continue;
      }

      // Update influencer IDs with latest from service
      item.influencerIds = service.users.map((user) => new Types.ObjectId(user?._id || user));

      // if (service.requireTimeSlot) {
      //   // Check availability for all users
      //   const availabilityChecks = await Promise.all(
      //     service.users.map((userId) =>
      //       this.availabilityService.checkInfluencerAvailability(
      //         userId.toString(),
      //         item.bookingDate,
      //         item.startTime!,
      //         item.endTime!,
      //       ),
      //     ),
      //   );

      //   if (availabilityChecks.some((check) => !check.isAvailable)) {
      //     item.disabled = true;
      //     hasChanges = true;
      //   }
      // }
    }

    if (hasChanges) {
      await cart.save();
    }
  }
}
