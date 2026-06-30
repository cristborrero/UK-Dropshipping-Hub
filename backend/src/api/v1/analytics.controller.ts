import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiKeyGuard } from '../api-key.guard';
import { ApiThrottlerGuard } from '../api-throttler.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/analytics')
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
export class AnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('platform/current')
  async getPlatformAnalytics() {
    const snapshot = await this.prisma.platformKpiSnapshot.findFirst({
      orderBy: { windowEnd: 'desc' },
    });

    if (!snapshot) {
      throw new NotFoundException('No analytics snapshot available');
    }

    return {
      windowStart: snapshot.windowStart,
      windowEnd: snapshot.windowEnd,
      gmv: snapshot.gmv,
      netSales: snapshot.netSales,
      ordersTotal: snapshot.ordersTotal,
      refundRate: snapshot.refundRate,
      platformFeesTotal: snapshot.platformFeesTotal,
    };
  }
}
