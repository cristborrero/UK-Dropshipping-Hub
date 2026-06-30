import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendOrderStatusEmail(
    email: string,
    orderId: string,
    oldStatus: string,
    newStatus: string,
  ) {
    this.logger.log(
      `[MOCK EMAIL DISPATCH] To: ${email} | Subject: Order #${orderId} Status Updated | Body: Your order status changed from "${oldStatus}" to "${newStatus}".`,
    );
    return { success: true };
  }

  async sendPaymentEmail(
    email: string,
    intentId: string,
    amount: number,
    status: string,
  ) {
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount / 100);
    this.logger.log(
      `[MOCK EMAIL DISPATCH] To: ${email} | Subject: Payment processed (${status}) | Body: A payment of ${formatted} (Intent: ${intentId}) was marked as ${status}.`,
    );
    return { success: true };
  }

  async sendReturnEmail(email: string, orderId: string, returnStatus: string) {
    this.logger.log(
      `[MOCK EMAIL DISPATCH] To: ${email} | Subject: Return Request #${orderId} | Body: The return request status was updated to "${returnStatus}".`,
    );
    return { success: true };
  }
}
