import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UserRole } from '../user/schemas/user.schema';
import { Roles } from 'src/common/decorators/role.decorator';
import { Request } from 'express';

@ApiTags('Cart')
@Controller('cart')
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Returns the user cart' })
  async getCart(@Req() req: Request) {
    return this.cartService.getCart(req?.user?.userId as string);
  }

  @Post()
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or time slot not available' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  async addToCart(@Req() req: Request, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(req?.user?.userId as string, addToCartDto);
  }

  @Patch(':itemIndex')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Update cart item' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or time slot not available' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateCartItem(
    @Req() req: Request,
    @Param('itemIndex') itemIndex: number,
    @Body() updateData: { quantity: number; timeSlot?: { date: Date; startTime: string; endTime: string } },
  ) {
    return this.cartService.updateCartItem(req?.user?.userId as string, itemIndex, updateData.quantity, updateData.timeSlot);
  }

  @Delete(':itemIndex')
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(@Req() req: Request, @Param('itemIndex') itemIndex: number) {
    return this.cartService.removeFromCart(req?.user?.userId as string, itemIndex);
  }

  @Delete()
  @Roles(UserRole.USER)
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@Req() req: Request) {
    return this.cartService.clearCart(req?.user?.userId as string);
  }
}
