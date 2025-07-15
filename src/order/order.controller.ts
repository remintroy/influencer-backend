import { Controller, Get, Post, Body, Param, Req, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrderService } from './order.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Roles } from '../common/decorators/role.decorator';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Order Management (Beta)')
@Controller('orders')
@ApiBearerAuth('access-token')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order from cart items' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @Roles(UserRole.USER)
  async createOrder(@Req() req: Request) {
    const userId = req?.user?.userId!;
    return this.orderService.createOrder(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders for the current user' })
  @ApiResponse({ status: 200, description: 'Returns all orders' })
  @Roles(UserRole.USER)
  async getUserOrders(@Req() req: Request) {
    const userId = req?.user?.userId!;
    return this.orderService.getUserOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Returns the order' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async getOrder(@Req() req: Request, @Param('id') id: string) {
    const userId = req?.user?.userId!;
    return this.orderService.getOrder(userId, id);
  }

  @Put(':orderId/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Roles(UserRole.USER, UserRole.INFLUENCER, UserRole.ADMIN)
  async updateOrderStatus(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    const userId = req?.user?.userId!;
    const userRole = req?.user?.role!;
    return this.orderService.updateOrderStatus(orderId, updateOrderStatusDto, userId, userRole);
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Process payment for an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Payment failed or invalid order status' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @Roles(UserRole.USER)
  async processPayment(@Req() req: Request, @Param('id') id: string) {
    const userId = req?.user?.userId!;
    return this.orderService.processPayment(id, userId);
  }

  @Post(':orderId/contract/sign')
  @ApiOperation({ summary: 'Sign contract for an order (user or influencer)' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Roles(UserRole.USER, UserRole.INFLUENCER)
  async signContract(@Req() req: Request, @Param('orderId') orderId: string) {
    const userId = req?.user?.userId!;
    const role = req?.user?.role!;
    return this.orderService.signContract(orderId, userId, role);
  }

  @Get(':orderId/contract/status')
  @ApiOperation({ summary: 'Get contract signature status for an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @Roles(UserRole.USER, UserRole.INFLUENCER)
  async getContractStatus(@Req() req: Request, @Param('orderId') orderId: string) {
    const userId = req?.user?.userId!;
    return this.orderService.getContractStatus(orderId, userId);
  }
}
