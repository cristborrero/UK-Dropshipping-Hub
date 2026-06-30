import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { HandleReturnDto } from './dto/handle-return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('seller')
  @Roles(UserRole.SELLER)
  async listBySeller(@CurrentUser() user: JwtPayload) {
    return this.ordersService.listBySeller(user);
  }

  @Get('supplier')
  @Roles(UserRole.SUPPLIER)
  async listBySupplier(@CurrentUser() user: JwtPayload) {
    return this.ordersService.listBySupplier(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.ordersService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPPLIER)
  async updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      user,
      id,
      dto.status,
      dto.carrier,
      dto.trackingCode,
    );
  }

  @Post(':id/returns')
  @Roles(UserRole.SELLER)
  async requestReturn(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RequestReturnDto,
  ) {
    return this.ordersService.requestReturn(user, id, dto.reason);
  }

  @Patch(':id/returns')
  @Roles(UserRole.SUPPLIER)
  async handleReturn(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: HandleReturnDto,
  ) {
    return this.ordersService.handleReturn(user, id, dto.decision);
  }
}
