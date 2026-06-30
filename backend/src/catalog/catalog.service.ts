import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserStatus, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CsvParserService } from './csv-parser.service';
import { JwtPayload } from '../auth/guards/jwt-auth.guard';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csvParserService: CsvParserService,
  ) {}

  private async getActiveSupplier(userId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    if (supplier.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Supplier onboarding is incomplete or account is not active',
      );
    }

    return supplier;
  }

  async create(user: JwtPayload, dto: CreateProductDto) {
    const supplier = await this.getActiveSupplier(user.sub);

    // Check SKU uniqueness for this supplier
    const existing = await this.prisma.product.findUnique({
      where: {
        supplierId_sku: {
          supplierId: supplier.id,
          sku: dto.sku,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Product with SKU "${dto.sku}" already exists for this supplier`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          supplierId: supplier.id,
          sku: dto.sku,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          wholesalePrice: dto.wholesalePrice,
          status: ProductStatus.ACTIVE,
        },
      });

      await tx.inventory.create({
        data: {
          productId: product.id,
          stock: dto.stock,
          slaDays: dto.slaDays,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: { inventory: true },
      });
    });
  }

  async findAll(user: JwtPayload) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    return this.prisma.product.findMany({
      where: {
        supplierId: supplier.id,
        status: ProductStatus.ACTIVE,
      },
      include: { inventory: true },
    });
  }

  async findOne(user: JwtPayload, id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { userId: user.sub },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier profile not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.supplierId !== supplier.id) {
      throw new ForbiddenException('You do not own this product');
    }

    return product;
  }

  async update(user: JwtPayload, id: string, dto: UpdateProductDto) {
    await this.findOne(user, id); // validates existence and ownership

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          wholesalePrice: dto.wholesalePrice,
        },
      });

      if (dto.stock !== undefined || dto.slaDays !== undefined) {
        await tx.inventory.update({
          where: { productId: id },
          data: {
            stock: dto.stock,
            slaDays: dto.slaDays,
          },
        });
      }

      return tx.product.findUnique({
        where: { id },
        include: { inventory: true },
      });
    });
  }

  async deactivate(user: JwtPayload, id: string) {
    await this.findOne(user, id); // validates existence and ownership

    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
      include: { inventory: true },
    });
  }

  async uploadCsv(user: JwtPayload, buffer: Buffer) {
    const supplier = await this.getActiveSupplier(user.sub);
    const parsed = this.csvParserService.parseProductsCsv(buffer);

    const created: string[] = [];
    const errors = [...parsed.errors];

    for (let i = 0; i < parsed.valid.length; i++) {
      const row = parsed.valid[i];
      // Note: we can't easily map exact line number of a valid row since the parser doesn't return index,
      // but we can estimate it or just describe it by SKU.
      try {
        const existing = await this.prisma.product.findUnique({
          where: {
            supplierId_sku: {
              supplierId: supplier.id,
              sku: row.sku,
            },
          },
        });

        if (existing) {
          errors.push({
            row: i + 1, // index-based tracking relative to valid rows
            reason: `SKU "${row.sku}" already exists for this supplier`,
          });
          continue;
        }

        await this.prisma.$transaction(async (tx) => {
          const product = await tx.product.create({
            data: {
              supplierId: supplier.id,
              sku: row.sku,
              title: row.title,
              description: row.description,
              category: row.category,
              wholesalePrice: row.wholesalePrice,
              status: ProductStatus.ACTIVE,
            },
          });

          await tx.inventory.create({
            data: {
              productId: product.id,
              stock: row.stock,
              slaDays: row.slaDays,
            },
          });
        });

        created.push(row.sku);
      } catch (err: any) {
        errors.push({
          row: i + 1,
          reason: `Database error: ${err.message}`,
        });
      }
    }

    return {
      createdCount: created.length,
      errorCount: errors.length,
      errors: errors.map((e) => `Row ${e.row}: ${e.reason}`),
    };
  }
}
