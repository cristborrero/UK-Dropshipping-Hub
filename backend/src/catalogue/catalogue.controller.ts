import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseBoolPipe,
  ParseFloatPipe,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, ReputationLevel } from '@prisma/client';
import { CatalogueService } from './catalogue.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, Roles } from '../auth/decorators';

@Controller('catalogue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get()
  async getCatalogue(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('minPrice') minPriceStr?: string,
    @Query('maxPrice') maxPriceStr?: string,
    @Query('supplierId') supplierId?: string,
    @Query('reputationLevel') reputationLevel?: ReputationLevel,
    @Query('inStockOnly') inStockOnlyStr?: string,
    @Query('sortBy') sortBy?: 'reputation' | 'price' | 'createdAt',
  ) {
    const minPrice = minPriceStr ? parseFloat(minPriceStr) : undefined;
    const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : undefined;
    const inStockOnly = inStockOnlyStr === 'true';

    // Basic range validation
    if (minPrice !== undefined && isNaN(minPrice)) {
      throw new BadRequestException('Invalid minPrice value');
    }
    if (maxPrice !== undefined && isNaN(maxPrice)) {
      throw new BadRequestException('Invalid maxPrice value');
    }

    return this.catalogueService.getCatalogueForSeller(user.sub, {
      category,
      minPrice,
      maxPrice,
      supplierId,
      reputationLevel,
      inStockOnly,
      sortBy,
    });
  }

  @Get(':id')
  async getProductDetail(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.catalogueService.getProductDetailForSeller(id, user.sub);
  }

  @Post(':id/import')
  async importProduct(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('platform') platform: string,
  ) {
    if (!platform || !['SHOPIFY', 'WOOCOMMERCE', 'OTHER'].includes(platform)) {
      throw new BadRequestException('Invalid platform specified');
    }
    const record = await this.catalogueService.createSellerImport(
      user.sub,
      id,
      platform,
    );
    return { success: true, import: record };
  }
}
