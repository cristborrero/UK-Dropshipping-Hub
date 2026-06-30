import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(
    @InjectQueue('order-events') private readonly orderEventsQueue: Queue,
  ) {}

  async publishOrderCreated(orderId: string) {
    await this.orderEventsQueue.add('order-created', { orderId });
  }

  async publishOrderStatusChanged(
    orderId: string,
    oldStatus: OrderStatus,
    newStatus: OrderStatus,
  ) {
    await this.orderEventsQueue.add('order-status-changed', {
      orderId,
      oldStatus,
      newStatus,
    });
  }
}
