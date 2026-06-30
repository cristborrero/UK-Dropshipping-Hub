import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { EventsModule } from './events/events.module';
import { WalletModule } from './wallet/wallet.module';
import { PaymentsModule } from './payments/payments.module';
import { ReputationModule } from './reputation/reputation.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CatalogueModule } from './catalogue/catalogue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SuppliersModule,
    CatalogModule,
    OrdersModule,
    IntegrationsModule,
    EventsModule,
    WalletModule,
    PaymentsModule,
    ReputationModule,
    AnalyticsModule,
    CatalogueModule,
    NotificationsModule,
    ApiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
