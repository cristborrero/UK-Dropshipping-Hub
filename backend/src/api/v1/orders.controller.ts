import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-key.guard';
import { ApiThrottlerGuard } from '../api-throttler.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/orders')
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getOrders() {
    const orders = await this.prisma.order.findMany({
      select: {
        id: true,
        externalOrderId: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        sellerId: true,
        supplierId: true,
        seller: {
          select: { storeUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return orders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt,
      sellerId: o.sellerId,
      supplierId: o.supplierId,
      storeUrl: o.seller.storeUrl,
    }));
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        seller: {
          select: { storeUrl: true },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            product: { select: { title: true, sku: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      externalOrderId: order.externalOrderId,
      storeUrl: order.seller.storeUrl,
      status: order.status,
      totalAmount: order.totalAmount,
      carrier: order.carrier,
      trackingCode: order.trackingCode,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        sku: item.product.sku,
        title: item.product.title,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    };
  }
}
