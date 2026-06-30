import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsService } from './events.service';
import { EventsProcessor } from './events.processor';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'order-events',
    }),
    forwardRef(() => OrdersModule),
    NotificationsModule,
  ],
  providers: [EventsService, EventsProcessor],
  exports: [EventsService],
})
export class EventsModule {}
