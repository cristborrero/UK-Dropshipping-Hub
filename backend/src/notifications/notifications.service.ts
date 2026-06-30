import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationJob } from './notifications.processor';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  async notifyOrderStatus(
    userId: string,
    orderId: string,
    oldStatus: string,
    newStatus: string,
  ) {
    const jobData: NotificationJob = {
      userId,
      type: 'ORDER_STATUS',
      title: `Order Status Update`,
      body: `Your order status changed from "${oldStatus}" to "${newStatus}".`,
      data: { orderId, oldStatus, newStatus },
    };
    await this.notificationsQueue.add('order-status', jobData);
  }

  async notifyPayment(
    userId: string,
    intentId: string,
    amount: number,
    status: string,
  ) {
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
    const jobData: NotificationJob = {
      userId,
      type: 'PAYMENT',
      title: `Payment Processed`,
      body: `A payment of ${formatted} (Intent: ${intentId}) was marked as ${status}.`,
      data: { intentId, amount, status },
    };
    await this.notificationsQueue.add('payment-processed', jobData);
  }

  async notifyReturn(userId: string, orderId: string, returnStatus: string) {
    const jobData: NotificationJob = {
      userId,
      type: 'RETURN',
      title: `Return Request Status`,
      body: `The return request status for Order #${orderId} was updated to "${returnStatus}".`,
      data: { orderId, status: returnStatus },
    };
    await this.notificationsQueue.add('return-status', jobData);
  }

  async getUserNotifications(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { items, total, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          emailOrderStatus: true,
          emailPaymentEvents: true,
          emailReturns: true,
          inAppOrderStatus: true,
          inAppPaymentEvents: true,
          inAppReturns: true,
        },
      });
    }

    return prefs;
  }

  async updatePreferences(userId: string, data: Partial<any>) {
    // Make sure preferences exist
    await this.getPreferences(userId);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: {
        emailOrderStatus:
          data.emailOrderStatus !== undefined
            ? data.emailOrderStatus
            : undefined,
        emailPaymentEvents:
          data.emailPaymentEvents !== undefined
            ? data.emailPaymentEvents
            : undefined,
        emailReturns:
          data.emailReturns !== undefined ? data.emailReturns : undefined,
        inAppOrderStatus:
          data.inAppOrderStatus !== undefined
            ? data.inAppOrderStatus
            : undefined,
        inAppPaymentEvents:
          data.inAppPaymentEvents !== undefined
            ? data.inAppPaymentEvents
            : undefined,
        inAppReturns:
          data.inAppReturns !== undefined ? data.inAppReturns : undefined,
      },
    });
  }
}
