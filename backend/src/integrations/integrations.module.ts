import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ShopifyController } from './shopify.controller';
import { WooController } from './woo.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'order-events',
    }),
  ],
  controllers: [ShopifyController, WooController],
})
export class IntegrationsModule {}
