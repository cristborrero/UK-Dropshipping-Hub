import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { WalletOwnerType } from '@prisma/client';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMe(@CurrentUser() userPayload: unknown) {
    const user = userPayload as JwtPayload;

    let ownerId = '';
    let ownerType: WalletOwnerType;

    if (user.role === 'SELLER') {
      const seller = await this.prisma.seller.findUnique({
        where: { userId: user.sub },
      });
      if (!seller) {
        throw new NotFoundException('Seller profile not found');
      }
      ownerId = seller.id;
      ownerType = WalletOwnerType.SELLER;
    } else if (user.role === 'SUPPLIER') {
      const supplier = await this.prisma.supplier.findUnique({
        where: { userId: user.sub },
      });
      if (!supplier) {
        throw new NotFoundException('Supplier profile not found');
      }
      ownerId = supplier.id;
      ownerType = WalletOwnerType.SUPPLIER;
    } else {
      throw new NotFoundException(
        `Wallets not supported for role: ${user.role}`,
      );
    }

    const wallet = await this.walletService.getOrCreateWallet(
      ownerType,
      ownerId,
    );

    // Retrieve last 50 transactions
    const transactions = await this.prisma.transaction.findMany({
      where:
        ownerType === WalletOwnerType.SELLER
          ? { sellerId: ownerId }
          : { supplierId: ownerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: {
          select: {
            externalOrderId: true,
          },
        },
      },
    });

    // Calculate aggregated metrics
    let grossEarnings = 0;
    let platformFeesPaid = 0;
    let netAmount = 0;

    if (ownerType === WalletOwnerType.SUPPLIER) {
      grossEarnings = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.grossAmount, 0);

      platformFeesPaid = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.platformFeeAmount, 0);

      netAmount = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.supplierNetAmount, 0);
    } else {
      // For sellers, aggregate wholesale expenses
      grossEarnings = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.grossAmount, 0);

      platformFeesPaid = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.platformFeeAmount, 0);

      netAmount = transactions
        .filter((t) => t.status === 'SUCCEEDED')
        .reduce((sum, t) => sum + t.sellerNetAmount, 0);
    }

    return {
      wallet,
      transactions,
      metrics: {
        grossEarnings,
        platformFeesPaid,
        netAmount,
      },
    };
  }
}
