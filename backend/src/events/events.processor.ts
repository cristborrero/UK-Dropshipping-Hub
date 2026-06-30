import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus } from '@prisma/client';

interface OrderJobItem {
  sku: string;
  quantity: number;
  price: number;
}

interface OrderJobData {
  orderId?: string;
  oldStatus?: string;
  newStatus?: string;
  shopDomain?: string;
  externalOrderId?: string;
  totalAmount?: number;
  items?: OrderJobItem[];
}

@Processor('order-events')
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<OrderJobData, any, string>): Promise<any> {
    const { name, data } = job;

    this.logger.log(`Processing job "${name}" (ID: ${job.id})`);

    switch (name) {
      case 'process-shopify-webhook':
      case 'process-woo-webhook':
        try {
          const shopDomain = data.shopDomain || '';
          const externalOrderId = data.externalOrderId || '';
          const items = data.items || [];
          const totalAmount = data.totalAmount || 0;

          this.logger.log(
            `Asynchronously processing store order creation for shop: ${shopDomain}, External ID: ${externalOrderId}`,
          );
          const order = await this.ordersService.createFromWebhook({
            externalOrderId,
            storeUrl: shopDomain,
            items,
            totalAmount,
          });
          this.logger.log(
            `Store order processed successfully. Internal Order ID: ${order.id}`,
          );
          return { success: true, orderId: order.id };
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error processing webhook store order: ${errMsg}`);
          throw err;
        }

      case 'order-created':
        try {
          const orderId = data.orderId || '';
          this.logger.log(
            `Event: order-created logged for Order ID: ${orderId}`,
          );

          const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
              supplier: { select: { userId: true } },
            },
          });

          if (order && order.supplier) {
            await this.notificationsService.notifyOrderStatus(
              order.supplier.userId,
              order.id,
              'NONE',
              order.status,
            );
          }
        } catch (err: any) {
          this.logger.error(
            `Error processing order-created notification: ${err.message}`,
          );
        }
        break;

      case 'order-status-changed':
        try {
          const orderId = data.orderId || '';
          const oldStatus = (data.oldStatus || '') as OrderStatus;
          const newStatus = (data.newStatus || '') as OrderStatus;

          this.logger.log(
            `Event: order-status-changed from ${oldStatus} to ${newStatus} for Order ID: ${orderId}`,
          );

          const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
              seller: { select: { userId: true } },
              supplier: { select: { userId: true } },
            },
          });

          if (order) {
            if (newStatus === OrderStatus.RETURN_REQUESTED) {
              // Notify Supplier about return request
              await this.notificationsService.notifyReturn(
                order.supplier.userId,
                order.id,
                'RETURN_REQUESTED',
              );
            } else if (
              newStatus === OrderStatus.RETURN_APPROVED ||
              newStatus === OrderStatus.RETURN_REJECTED
            ) {
              // Notify Seller about return decision
              await this.notificationsService.notifyReturn(
                order.seller.userId,
                order.id,
                newStatus,
              );
            } else {
              // Standard status transitions: notify Seller
              await this.notificationsService.notifyOrderStatus(
                order.seller.userId,
                order.id,
                oldStatus,
                newStatus,
              );
            }
          }
        } catch (err: any) {
          this.logger.error(
            `Error processing order-status-changed notification: ${err.message}`,
          );
        }
        break;

      default:
        this.logger.warn(`Unhandled job/event name: ${name}`);
        break;
    }

    return { processed: true };
  }
}
