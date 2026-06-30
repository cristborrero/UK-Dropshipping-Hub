import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { verifyShopifySignature } from './helpers/signature-verifier';

interface ShopifyWebhookItem {
  sku: string;
  quantity: number;
  price: string;
}

interface ShopifyWebhookPayload {
  id: number;
  total_price: string;
  line_items: ShopifyWebhookItem[];
}

@Controller('webhooks/shopify')
export class ShopifyController {
  constructor(
    @InjectQueue('order-events') private readonly orderEventsQueue: Queue,
  ) {}

  @Post('orders/create')
  @HttpCode(HttpStatus.ACCEPTED) // 202
  async handleOrderCreate(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-shopify-hmac-sha256') hmac?: string,
    @Headers('x-shopify-shop-domain') shopDomain?: string,
  ) {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || 'shopify-secret-key';

    // Verify signature
    const isValid = verifyShopifySignature(req.rawBody, hmac, secret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid Shopify webhook signature');
    }

    if (!shopDomain) {
      throw new UnauthorizedException('Missing shop domain header');
    }

    const payload = req.body as ShopifyWebhookPayload;

    // Enqueue job to process in background
    await this.orderEventsQueue.add('process-shopify-webhook', {
      shopDomain: `https://${shopDomain}`,
      externalOrderId: String(payload.id),
      totalAmount: parseFloat(payload.total_price || '0'),
      items: (payload.line_items || []).map((item) => ({
        sku: item.sku,
        quantity: item.quantity,
        price: parseFloat(item.price || '0'),
      })),
    });

    return { accepted: true };
  }
}
