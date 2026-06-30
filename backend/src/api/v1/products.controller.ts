import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiKeyGuard } from '../api-key.guard';
import { ApiThrottlerGuard } from '../api-throttler.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('api/v1/products')
@UseGuards(ApiKeyGuard, ApiThrottlerGuard)
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getProducts(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPriceStr?: string,
    @Query('maxPrice') maxPriceStr?: string,
    @Query('supplierId') supplierId?: string,
    @Query('inStockOnly') inStockOnlyStr?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 20;
    const minPrice = minPriceStr ? parseFloat(minPriceStr) : undefined;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : undefined;
    const inStockOnly = inStockOnlyStr === 'true';

    const where: any = {
      status: 'ACTIVE',
    };

    if (category) {
      where.category = category;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.wholesalePrice = {};
      if (minPrice !== undefined) where.wholesalePrice.gte = minPrice;
      if (maxPrice !== undefined) where.wholesalePrice.lte = maxPrice;
    }

    if (inStockOnly) {
      where.inventory = {
        stock: {
          gt: 0,
        },
      };
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          inventory: {
            select: { stock: true, slaDays: true },
          },
          supplier: {
            select: { id: true, companyName: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      include: {
        inventory: {
          select: { stock: true, slaDays: true },
        },
        supplier: {
          select: { id: true, companyName: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
