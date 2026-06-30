import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, WalletModule, NotificationsModule],
  controllers: [PaymentsController, WebhooksController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
