import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { verifyWooSignature } from './helpers/signature-verifier';

interface WooWebhookItem {
  sku: string;
  quantity: number;
  price: string;
}

interface WooWebhookPayload {
  id: number;
  total: string;
  store_url?: string;
  line_items: WooWebhookItem[];
}

@Controller('webhooks/woo')
export class WooController {
  constructor(
    @InjectQueue('order-events') private readonly orderEventsQueue: Queue,
  ) {}

  @Post('orders/create')
  @HttpCode(HttpStatus.ACCEPTED) // 202
  async handleOrderCreate(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-wc-webhook-signature') signature?: string,
    @Headers('x-woo-store-url') storeUrlHeader?: string,
    @Query('storeUrl') storeUrlQuery?: string,
  ) {
    const secret = process.env.WOO_WEBHOOK_SECRET || 'woo-secret-key';

    // Verify signature
    const isValid = verifyWooSignature(req.rawBody, signature, secret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid WooCommerce webhook signature');
    }

    const payload = req.body as WooWebhookPayload;
    const storeUrl = storeUrlHeader || storeUrlQuery || payload.store_url;

    if (!storeUrl) {
      throw new UnauthorizedException('Missing WooCommerce store url');
    }

    // Enqueue job to process in background
    await this.orderEventsQueue.add('process-woo-webhook', {
      shopDomain: storeUrl,
      externalOrderId: String(payload.id),
      totalAmount: parseFloat(payload.total || '0'),
      items: (payload.line_items || []).map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price || '0'),
      })),
    });

    return { accepted: true };
  }
}
