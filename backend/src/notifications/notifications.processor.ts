import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

export interface NotificationJob {
  userId: string;
  type: 'ORDER_STATUS' | 'PAYMENT' | 'RETURN';
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob, any, string>): Promise<any> {
    const { name, data } = job;
    this.logger.log(`Processing notification job "${name}" (ID: ${job.id})`);

    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!user) {
      this.logger.warn(`User with ID ${data.userId} not found. Skipping.`);
      return;
    }

    // Lazy load or initialize preferences
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId: data.userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId: data.userId,
          emailOrderStatus: true,
          emailPaymentEvents: true,
          emailReturns: true,
          inAppOrderStatus: true,
          inAppPaymentEvents: true,
          inAppReturns: true,
        },
      });
    }

    let shouldInApp = false;
    let shouldEmail = false;

    if (data.type === 'ORDER_STATUS') {
      shouldInApp = prefs.inAppOrderStatus;
      shouldEmail = prefs.emailOrderStatus;
    } else if (data.type === 'PAYMENT') {
      shouldInApp = prefs.inAppPaymentEvents;
      shouldEmail = prefs.emailPaymentEvents;
    } else if (data.type === 'RETURN') {
      shouldInApp = prefs.inAppReturns;
      shouldEmail = prefs.emailReturns;
    }

    // Persist in-app notification
    if (shouldInApp) {
      await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body,
          data: data.data || {},
          isRead: false,
        },
      });
      this.logger.log(`Saved in-app notification for User: ${user.email}`);
    }

    // Send email
    if (shouldEmail) {
      if (data.type === 'ORDER_STATUS') {
        const orderId = data.data?.orderId || '';
        const oldStatus = data.data?.oldStatus || '';
        const newStatus = data.data?.newStatus || '';
        await this.emailService.sendOrderStatusEmail(
          user.email,
          orderId,
          oldStatus,
          newStatus,
        );
      } else if (data.type === 'PAYMENT') {
        const intentId = data.data?.intentId || '';
        const amount = data.data?.amount || 0;
        const status = data.data?.status || '';
        await this.emailService.sendPaymentEmail(
          user.email,
          intentId,
          amount,
          status,
        );
      } else if (data.type === 'RETURN') {
        const orderId = data.data?.orderId || '';
        const returnStatus = data.data?.status || '';
        await this.emailService.sendReturnEmail(
          user.email,
          orderId,
          returnStatus,
        );
      }
    }

    return { success: true };
  }
}
