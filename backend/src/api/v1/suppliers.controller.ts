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

@Controller('api/v1/suppliers')
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
export class SuppliersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getSuppliers() {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        kpiSnapshots: {
          orderBy: { windowEnd: 'desc' },
          take: 1,
        },
      },
    });

    return suppliers.map((s) => {
      const latestKpi = s.kpiSnapshots?.[0];
      return {
        id: s.id,
        companyName: s.companyName,
        reputationLevel: latestKpi?.level || 'STANDARD',
        onTimeDeliveryRate: latestKpi?.otdPercentage || 100.0,
      };
    });
  }

  @Get(':id')
  async getSupplier(@Param('id') id: string) {
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
      kpi: latestKpi,
    };
  }
}
