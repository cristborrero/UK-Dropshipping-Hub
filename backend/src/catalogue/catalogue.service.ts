import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationLevel } from '@prisma/client';

export interface CatalogueFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  supplierId?: string;
  reputationLevel?: ReputationLevel;
  inStockOnly?: boolean;
  sortBy?: 'reputation' | 'price' | 'createdAt';
}

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogueForSeller(sellerUserId: string, filters: CatalogueFilters) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const {
      category,
      minPrice,
      maxPrice,
      supplierId,
      reputationLevel,
      inStockOnly,
      sortBy = 'reputation',
    } = filters;

    // Build Prisma query
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        category: category || undefined,
        wholesalePrice: {
          gte: minPrice !== undefined ? minPrice : undefined,
          lte: maxPrice !== undefined ? maxPrice : undefined,
        },
        supplierId: supplierId || undefined,
        inventory: inStockOnly ? { stock: { gt: 0 } } : undefined,
      },
      include: {
        inventory: true,
        supplier: {
          include: {
            kpiSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        imports: {
          where: { sellerId: seller.id },
          take: 1,
        },
      },
    });

    // Map and attach KPI summaries
    let mapped = products.map((p) => {
      const latestKpi = p.supplier.kpiSnapshots[0] || null;
      return {
        id: p.id,
        sku: p.sku,
        title: p.title,
        description: p.description,
        category: p.category,
        wholesalePrice: p.wholesalePrice,
        createdAt: p.createdAt,
        stock: p.inventory?.stock ?? 0,
        slaDays: p.inventory?.slaDays ?? 2,
        supplier: {
          id: p.supplier.id,
          companyName: p.supplier.companyName,
          shippingSla: p.supplier.shippingSla ?? 2,
          reputationScore: latestKpi ? latestKpi.reputationScore : 50.0,
          level: latestKpi ? latestKpi.level : ReputationLevel.STANDARD,
          otdPercentage: latestKpi ? latestKpi.otdPercentage : 100.0,
          fillRatePercentage: latestKpi ? latestKpi.fillRatePercentage : 100.0,
          cancelRatePercentage: latestKpi
            ? latestKpi.cancelRatePercentage
            : 0.0,
          returnRatePercentage: latestKpi
            ? latestKpi.returnRatePercentage
            : 0.0,
        },
        importedStatus: p.imports[0]?.status || null,
      };
    });

    // Filter by reputationLevel in-memory
    if (reputationLevel) {
      mapped = mapped.filter((p) => p.supplier.level === reputationLevel);
    }

    // Sort in-memory
    if (sortBy === 'reputation') {
      mapped.sort(
        (a, b) => b.supplier.reputationScore - a.supplier.reputationScore,
      );
    } else if (sortBy === 'price') {
      mapped.sort((a, b) => a.wholesalePrice - b.wholesalePrice);
    } else if (sortBy === 'createdAt') {
      mapped.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return mapped;
  }

  async getProductDetailForSeller(productId: string, sellerUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const p = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
      include: {
        inventory: true,
        supplier: {
          include: {
            kpiSnapshots: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        imports: {
          where: { sellerId: seller.id },
          take: 1,
        },
      },
    });

    if (!p) {
      throw new NotFoundException('Product not found or inactive');
    }

    const latestKpi = p.supplier.kpiSnapshots[0] || null;

    // Derived fields
    const suggestedRetailPrice = parseFloat(
      (p.wholesalePrice * 1.8).toFixed(2),
    );
    const estimatedShippingWindow = `${p.inventory?.slaDays ?? p.supplier.shippingSla ?? 2} days`;

    return {
      id: p.id,
      sku: p.sku,
      title: p.title,
      description: p.description,
      category: p.category,
      wholesalePrice: p.wholesalePrice,
      suggestedRetailPrice,
      estimatedShippingWindow,
      stock: p.inventory?.stock ?? 0,
      createdAt: p.createdAt,
      supplier: {
        id: p.supplier.id,
        companyName: p.supplier.companyName,
        reputationScore: latestKpi ? latestKpi.reputationScore : 50.0,
        level: latestKpi ? latestKpi.level : ReputationLevel.STANDARD,
        otdPercentage: latestKpi ? latestKpi.otdPercentage : 100.0,
        fillRatePercentage: latestKpi ? latestKpi.fillRatePercentage : 100.0,
        cancelRatePercentage: latestKpi ? latestKpi.cancelRatePercentage : 0.0,
        returnRatePercentage: latestKpi ? latestKpi.returnRatePercentage : 0.0,
      },
      importedStatus: p.imports[0]?.status || null,
      importedPlatform: p.imports[0]?.platform || null,
    };
  }

  async createSellerImport(
    sellerUserId: string,
    productId: string,
    platform: string,
  ) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE' },
    });
    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    // Upsert or create import record
    const existing = await this.prisma.sellerProductImport.findFirst({
      where: {
        sellerId: seller.id,
        productId: product.id,
      },
    });

    if (existing) {
      return this.prisma.sellerProductImport.update({
        where: { id: existing.id },
        data: {
          platform,
          status: 'PENDING',
        },
      });
    }

    return this.prisma.sellerProductImport.create({
      data: {
        sellerId: seller.id,
        productId: product.id,
        platform,
        status: 'PENDING',
      },
    });
  }

  async listImportsForSeller(sellerUserId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { userId: sellerUserId },
    });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }

    return this.prisma.sellerProductImport.findMany({
      where: { sellerId: seller.id },
      include: {
        product: true,
      },
    });
  }
}
