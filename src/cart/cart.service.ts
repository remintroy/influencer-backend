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

    // Validate service exists
    const service = await this.influencerServiceService.getInfluencerServiceByServiceId(addToCartDto.serviceId);
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Check availability if service requires time slot
    if (service.requireTimeSlot) {
      const { isAvailable } = await this.availabilityService.checkInfluencerAvailability(
        service.users?.[0]?.toString()!,
        addToCartDto.bookingDate,
        addToCartDto.startTime,
        addToCartDto.endTime,
      );

      if (!isAvailable) {
        throw new BadRequestException('Selected time slot is not available');
      }
    }

    // Create cart item
    const cartItem: CartItem = {
      _id: new Types.ObjectId(),
      serviceId: new Types.ObjectId(addToCartDto.serviceId),
      influencerId: new Types.ObjectId(service?.users?.[0]!),
      bookingDate: addToCartDto.bookingDate,
      startTime: addToCartDto.startTime,
      endTime: addToCartDto.endTime,
      price: addToCartDto.price,
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

    // If updating time slot, validate availability
    if (updates.bookingDate || updates.startTime || updates.endTime) {
      const service = await this.influencerServiceService.getInfluencerServiceByServiceId(item.serviceId.toString());
      if (service?.requireTimeSlot) {
        const { isAvailable } = await this.availabilityService.checkInfluencerAvailability(
          item.influencerId.toString(),
          updates.bookingDate || item.bookingDate,
          updates.startTime || item.startTime,
          updates.endTime || item.endTime,
        );

        if (!isAvailable) {
          throw new BadRequestException('Selected time slot is not available');
        }
      }
    }

    // Update item
    Object.assign(item, updates);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price, 0);

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

      if (service.requireTimeSlot) {
        const { isAvailable } = await this.availabilityService.checkInfluencerAvailability(
          item.influencerId.toString(),
          item.bookingDate,
          item.startTime,
          item.endTime,
        );

        if (!isAvailable) {
          item.disabled = true;
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await cart.save();
    }
  }
}
