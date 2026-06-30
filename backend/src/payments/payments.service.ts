import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { Transaction, WalletOwnerType } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock');
  }

  /**
   * Calculates the platform fee and net splits
   */
  calculateFees(grossAmount: number, platformFeePercent = 5.0) {
    const platformFeeAmount =
      Math.round(grossAmount * (platformFeePercent / 100) * 100) / 100;
    const supplierNetAmount =
      Math.round((grossAmount - platformFeeAmount) * 100) / 100;
    return {
      platformFeeAmount,
      supplierNetAmount,
      sellerNetAmount: grossAmount, // Seller pays the gross amount
    };
  }

  /**
   * Creates a PaymentIntent on Stripe and registers a PENDING Transaction locally
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, sellerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { seller: true, supplier: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    if (order.sellerId !== sellerId) {
      throw new BadRequestException('You do not own this order');
    }

    if (order.status !== 'PENDING_SUPPLIER') {
      throw new BadRequestException(
        `Order cannot be paid in current status: ${order.status}`,
      );
    }

    // Platform fee configuration
    const platformFeePercent = 5.0; // 5% fee
    const { platformFeeAmount, supplierNetAmount, sellerNetAmount } =
      this.calculateFees(order.totalAmount, platformFeePercent);

    // Create Stripe PaymentIntent with Destination Charges and Metadata
    const amountInCents = Math.round(order.totalAmount * 100);
    const feeInCents = Math.round(platformFeeAmount * 100);
    // Mock Stripe Connect Connected Account ID for the Supplier
    const destinationAccount =
      'acct_mock_' + order.supplierId.replace(/-/g, '').slice(0, 8);

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'gbp',
        payment_method_types: ['card'],
        application_fee_amount: feeInCents,
        transfer_data: {
          destination: destinationAccount,
        },
        metadata: {
          orderId: order.id,
          sellerId: order.sellerId,
          supplierId: order.supplierId,
          platformFeePercent: String(platformFeePercent),
        },
      });
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Stripe error: ${msg}`);
    }

    // Save pending transaction details locally
    await this.prisma.transaction.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: paymentIntent.id,
        sellerId: order.sellerId,
        supplierId: order.supplierId,
        grossAmount: order.totalAmount,
        platformFeeAmount,
        sellerNetAmount,
        supplierNetAmount,
        currency: 'gbp',
        status: 'PENDING',
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      stripePaymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Completes the payment transaction (called on Stripe webhook succeeded event)
   */
  async handlePaymentSucceeded(
    stripePaymentIntentId: string,
    stripeChargeId?: string,
  ): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId },
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction with PaymentIntent ${stripePaymentIntentId} not found in database.`,
      );
      return null;
    }

    if (transaction.status === 'SUCCEEDED') {
      // Idempotency: return existing succeeded transaction
      return transaction;
    }

    // Run database updates in transaction block
    return this.prisma.$transaction(async (tx) => {
      // Update local transaction record
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCEEDED',
          stripeChargeId,
        },
      });

      // Update Order Status to ACCEPTED
      await tx.order.update({
        where: { id: transaction.orderId },
        data: { status: 'ACCEPTED' },
      });

      // Credit Supplier wallet (receives net earnings)
      await this.walletService.applyCredit(
        WalletOwnerType.SUPPLIER,
        transaction.supplierId!,
        transaction.supplierNetAmount,
      );

      // Debit Seller wallet (expenses ledger)
      await this.walletService.applyDebit(
        WalletOwnerType.SELLER,
        transaction.sellerId,
        transaction.sellerNetAmount,
      );

      this.logger.log(
        `Transaction ${updatedTx.id} succeeded. Balances updated.`,
      );

      // Async notification dispatch
      (async () => {
        try {
          const seller = await this.prisma.seller.findUnique({
            where: { id: transaction.sellerId },
            select: { userId: true },
          });
          if (seller) {
            await this.notificationsService.notifyPayment(
              seller.userId,
              transaction.stripePaymentIntentId,
              Math.round(transaction.grossAmount * 100),
              'SUCCEEDED',
            );
          }

          if (transaction.supplierId) {
            const supplier = await this.prisma.supplier.findUnique({
              where: { id: transaction.supplierId },
              select: { userId: true },
            });
            if (supplier) {
              await this.notificationsService.notifyPayment(
                supplier.userId,
                transaction.stripePaymentIntentId,
                Math.round(transaction.grossAmount * 100),
                'SUCCEEDED',
              );
            }
          }
        } catch (err: any) {
          this.logger.error(
            `Error sending payment success notifications: ${err.message}`,
          );
        }
      })();

      return updatedTx;
    });
  }

  /**
   * Reverses the payment transaction (called on Stripe webhook refund event)
   */
  async handleRefunded(
    stripePaymentIntentId: string,
  ): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId },
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction with PaymentIntent ${stripePaymentIntentId} not found in database.`,
      );
      return null;
    }

    if (transaction.status !== 'SUCCEEDED') {
      this.logger.warn(
        `Transaction ${transaction.id} cannot be refunded because its status is: ${transaction.status}`,
      );
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      // Update local transaction record
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'REFUNDED' },
      });

      // Update Order Status to CANCELLED
      await tx.order.update({
        where: { id: transaction.orderId },
        data: { status: 'CANCELLED' },
      });

      // Debit Supplier wallet (subtract refunded net earnings)
      await this.walletService.applyDebit(
        WalletOwnerType.SUPPLIER,
        transaction.supplierId!,
        transaction.supplierNetAmount,
      );

      // Credit Seller wallet (refunded expense)
      await this.walletService.applyCredit(
        WalletOwnerType.SELLER,
        transaction.sellerId,
        transaction.sellerNetAmount,
      );

      this.logger.log(`Transaction ${updatedTx.id} refunded successfully.`);

      // Async notification dispatch
      (async () => {
        try {
          const seller = await this.prisma.seller.findUnique({
            where: { id: transaction.sellerId },
            select: { userId: true },
          });
          if (seller) {
            await this.notificationsService.notifyPayment(
              seller.userId,
              transaction.stripePaymentIntentId,
              Math.round(transaction.grossAmount * 100),
              'REFUNDED',
            );
          }

          if (transaction.supplierId) {
            const supplier = await this.prisma.supplier.findUnique({
              where: { id: transaction.supplierId },
              select: { userId: true },
            });
            if (supplier) {
              await this.notificationsService.notifyPayment(
                supplier.userId,
                transaction.stripePaymentIntentId,
                Math.round(transaction.grossAmount * 100),
                'REFUNDED',
              );
            }
          }
        } catch (err: any) {
          this.logger.error(
            `Error sending payment refund notifications: ${err.message}`,
          );
        }
      })();

      return updatedTx;
    });
  }
}
