import { Body, Controller, Delete, Get, Param, Post, Put, Req } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from 'src/common/decorators/role.decorator';
import { UserRole } from 'src/user/schemas/user.schema';

@ApiTags('Cart (Beta)')
@Controller('cart')
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Returns the user cart' })
  @Roles(UserRole.USER)
  async getCart(@Req() req: Request) {
    const userId = req?.user?.userId!;
    return await this.cartService.getCart(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @Roles(UserRole.USER)
  async addToCart(@Req() req: Request, @Body() addToCartDto: AddToCartDto) {
    const userId = req?.user?.userId!;
    return await this.cartService.addToCart(userId, addToCartDto);
  }

  @Put('item/:itemId')
  @ApiOperation({ summary: 'Update cart item' })
  @ApiParam({ name: 'itemId', description: 'ID of the cart item to update' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @Roles(UserRole.USER)
  async updateCartItem(@Req() req: Request, @Param('itemId') itemId: string, @Body() updates: UpdateCartItemDto) {
    const userId = req?.user?.userId!;
    const cartUpdates: any = { ...updates };

    // Convert string IDs to ObjectIds if present
    // if (updates.serviceId) {
    //   cartUpdates.serviceId = new Types.ObjectId(updates.serviceId);
    // }

    return await this.cartService.updateCartItem(userId, itemId, cartUpdates);
  }

  @Delete('item/:itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'itemId', description: 'ID of the cart item to remove' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @Roles(UserRole.USER)
  async removeFromCart(@Req() req: Request, @Param('itemId') itemId: string) {
    const userId = req?.user?.userId!;
    return await this.cartService.removeFromCart(userId, itemId);
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  @Roles(UserRole.USER)
  async clearCart(@Req() req: Request) {
    const userId = req?.user?.userId!;
    return await this.cartService.clearCart(userId);
  }
}
