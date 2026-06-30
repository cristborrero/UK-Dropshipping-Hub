import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { OrderStatus, ReturnStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { JwtPayload } from '../auth/guards/jwt-auth.guard';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_SUPPLIER: ['ACCEPTED', 'CANCELLED'] as OrderStatus[],
  ACCEPTED: ['SHIPPED', 'CANCELLED'] as OrderStatus[],
  SHIPPED: ['DELIVERED'] as OrderStatus[],
  DELIVERED: ['RETURN_REQUESTED'] as OrderStatus[],
  CANCELLED: [] as OrderStatus[],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'] as OrderStatus[],
  RETURN_APPROVED: [] as OrderStatus[],
  RETURN_REJECTED: [] as OrderStatus[],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
  ) {}

  async createFromWebhook(payload: {
    externalOrderId: string;
    storeUrl: string;
    items: { sku: string; quantity: number; price: number }[];
    totalAmount: number;
  }) {
    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      // Find seller by storeUrl
      const seller = await tx.seller.findFirst({
        where: { storeUrl: payload.storeUrl },
      });
      if (!seller) {
        throw new BadRequestException(
          `Seller store not registered: ${payload.storeUrl}`,
        );
      }

      // Check idempotency: externalOrderId + sellerId
      const existing = await tx.order.findUnique({
        where: {
          externalOrderId_sellerId: {
            externalOrderId: payload.externalOrderId,
            sellerId: seller.id,
          },
        },
        include: {
          items: true,
        },
      });

      if (existing) {
        return existing;
      }

      // Resolve supplier from the first product
      const firstItem = payload.items[0];
      const firstProduct = await tx.product.findFirst({
        where: { sku: firstItem.sku, status: 'ACTIVE' },
      });
      if (!firstProduct) {
        throw new BadRequestException(
          `Active product with SKU "${firstItem.sku}" not found`,
        );
      }
      const supplierId = firstProduct.supplierId;

      const orderItemsData = [];

      for (const item of payload.items) {
        const product = await tx.product.findUnique({
          where: {
            supplierId_sku: {
              supplierId,
              sku: item.sku,
            },
          },
          include: {
            inventory: true,
          },
        });

        if (!product) {
          throw new BadRequestException(
            `Product SKU "${item.sku}" not found for this supplier`,
          );
        }

        if (!product.inventory || product.inventory.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product SKU "${item.sku}". Available: ${
              product.inventory?.stock ?? 0
            }`,
          );
        }

        // Deduct inventory stock
        await tx.inventory.update({
          where: { productId: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: item.price,
        });
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          externalOrderId: payload.externalOrderId,
          sellerId: seller.id,
          supplierId,
          status: OrderStatus.PENDING_SUPPLIER,
          totalAmount: payload.totalAmount,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });

    await this.eventsService.publishOrderCreated(order.id);
    return order;
  }

  async listBySupplier(user: JwtPayload) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.prisma.order.findMany({
      where: { supplierId: supplier.id },
      include: {
        items: {
          include: { product: true },
        },
        seller: true,
        returns: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listBySeller(user: JwtPayload) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId: user.sub },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.prisma.order.findMany({
      where: { sellerId: seller.id },
      include: {
        items: {
          include: { product: true },
        },
        supplier: true,
        returns: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: JwtPayload, id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        seller: true,
        supplier: true,
        returns: true,
        transactions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Check ownership
    if (user.role === 'SUPPLIER') {
      const supplier = await this.prisma.supplier.findUnique({
        where: { userId: user.sub },
      });
      if (!supplier || order.supplierId !== supplier.id) {
        throw new ForbiddenException('You do not own this order');
      }
    } else if (user.role === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.sub },
      });
      if (!seller || order.sellerId !== seller.id) {
        throw new ForbiddenException('You do not own this order');
      }
    }

    return order;
  }

  async updateStatus(
    user: JwtPayload,
    id: string,
    status: OrderStatus,
    carrier?: string,
    trackingCode?: string,
  ) {
    const order = await this.findOne(user, id); // ownership checks

    if (user.role !== 'SUPPLIER') {
      throw new ForbiddenException('Only suppliers can update order status');
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${status}`,
      );
    }

    // Required fields when SHIPPED
    if (status === OrderStatus.SHIPPED) {
      if (!carrier || !trackingCode) {
        throw new BadRequestException(
          'Carrier and trackingCode are required when shipping an order',
        );
      }
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status,
        ...(carrier && { carrier }),
        ...(trackingCode && { trackingCode }),
      },
    });

    await this.eventsService.publishOrderStatusChanged(
      id,
      order.status,
      status,
    );

    return updated;
  }

  async requestReturn(user: JwtPayload, orderId: string, reason: string) {
    const order = await this.findOne(user, orderId); // ownership checks

    if (user.role !== 'SELLER') {
      throw new ForbiddenException('Only sellers can request returns');
    }

    // Validate transition
    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed || !allowed.includes(OrderStatus.RETURN_REQUESTED)) {
      throw new BadRequestException(
        `Cannot request return for order in status ${order.status}. Order must be DELIVERED.`,
      );
    }

    const returnRequest = await this.prisma.$transaction(async (tx) => {
      const returnRequest = await tx.returnRequest.create({
        data: {
          orderId,
          reason,
          status: ReturnStatus.PENDING,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.RETURN_REQUESTED,
        },
      });

      return returnRequest;
    });

    await this.eventsService.publishOrderStatusChanged(
      orderId,
      order.status,
      OrderStatus.RETURN_REQUESTED,
    );

    return returnRequest;
  }

  async handleReturn(
    user: JwtPayload,
    orderId: string,
    decision: 'APPROVE' | 'REJECT',
  ) {
    const order = await this.findOne(user, orderId); // ownership checks

    if (user.role !== 'SUPPLIER') {
      throw new ForbiddenException(
        'Only suppliers can approve/reject return requests',
      );
    }

    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new BadRequestException('Order is not in RETURN_REQUESTED status');
    }

    const nextStatus =
      decision === 'APPROVE'
        ? OrderStatus.RETURN_APPROVED
        : OrderStatus.RETURN_REJECTED;

    const nextReturnStatus =
      decision === 'APPROVE' ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { orderId },
        data: {
          status: nextReturnStatus,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
        },
      });

      return updatedOrder;
    });

    await this.eventsService.publishOrderStatusChanged(
      orderId,
      order.status,
      nextStatus,
    );

    return updatedOrder;
  }
}
