import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsProcessor } from './notifications.processor';
import { EmailService } from './email.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'notifications',
    }),
  ],
  providers: [NotificationsService, NotificationsProcessor, EmailService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
