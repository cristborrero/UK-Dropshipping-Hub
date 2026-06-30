import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks/stripe')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly stripe: Stripe;

  constructor(private readonly paymentsService: PaymentsService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'mock');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const isDevOrTest =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_webhook_secret';

    let event: Stripe.Event;

    if (
      isDevOrTest &&
      (!signature || signature.startsWith('mock_') || signature === 'mock_sig')
    ) {
      this.logger.debug(
        'NODE_ENV is development or test. Bypassing Stripe signature check.',
      );
      // In development bypass mode, parse from body
      const payload = req.body as Record<string, unknown>;
      const payloadData = (payload.data as Record<string, unknown>) || {};
      event = {
        id: (payload.id as string) || 'evt_mock',
        type: (payload.type as string) || 'payment_intent.succeeded',
        data: {
          object: payloadData.object || payload,
        },
      } as unknown as Stripe.Event;
    } else {
      if (!signature) {
        throw new BadRequestException('Missing stripe-signature header');
      }
      if (!req.rawBody) {
        throw new BadRequestException('Missing raw request body buffer');
      }
      try {
        event = this.stripe.webhooks.constructEvent(
          req.rawBody,
          signature,
          webhookSecret,
        );
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new BadRequestException(
          `Stripe webhook signature verification failed: ${msg}`,
        );
      }
    }

    this.logger.log(`Received Stripe event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const latestCharge = paymentIntent.latest_charge;
        const stripeChargeId =
          typeof latestCharge === 'string' ? latestCharge : undefined;
        await this.paymentsService.handlePaymentSucceeded(
          paymentIntent.id,
          stripeChargeId,
        );
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : undefined;
        if (paymentIntentId) {
          await this.paymentsService.handleRefunded(paymentIntentId);
        } else {
          this.logger.warn(
            `Refund charge ${charge.id} missing payment_intent property`,
          );
        }
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
        break;
    }

    return { received: true };
  }
}
