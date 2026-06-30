import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-key.guard';
import { ApiThrottlerGuard } from '../api-throttler.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/reputation')
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
export class ReputationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('suppliers/:id')
  async getSupplierReputation(@Param('id') id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        kpiSnapshots: {
          orderBy: { windowEnd: 'desc' },
          take: 1,
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const latestKpi = supplier.kpiSnapshots?.[0] || null;

    return {
      id: supplier.id,
      companyName: supplier.companyName,
      reputationLevel: latestKpi?.level || 'STANDARD',
      onTimeDeliveryRate: latestKpi?.otdPercentage || 100.0,
      reputationScore: latestKpi?.reputationScore || 0,
      fillRatePercentage: latestKpi?.fillRatePercentage || 100.0,
    };
  }
}
