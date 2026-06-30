import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeyGuard } from './api-key.guard';
import { ApiThrottlerGuard } from './api-throttler.guard';
import { ProductsController } from './v1/products.controller';
import { SuppliersController } from './v1/suppliers.controller';
import { OrdersController } from './v1/orders.controller';
import { ReputationController } from './v1/reputation.controller';
import { AnalyticsController } from './v1/analytics.controller';

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyGuard, ApiThrottlerGuard],
  controllers: [
    ProductsController,
    SuppliersController,
    OrdersController,
    ReputationController,
    AnalyticsController,
  ],
  exports: [ApiKeyGuard, ApiThrottlerGuard],
})
export class ApiModule {}
