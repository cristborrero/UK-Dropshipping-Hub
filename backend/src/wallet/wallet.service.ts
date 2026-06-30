import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletOwnerType, Wallet } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves a wallet for a given owner. Creates one lazily if it does not exist.
   */
  async getOrCreateWallet(
    ownerType: WalletOwnerType,
    ownerId: string,
  ): Promise<Wallet> {
    // Verify that the owner actually exists in the database
    if (ownerType === WalletOwnerType.SELLER) {
      const seller = await this.prisma.seller.findUnique({
        where: { id: ownerId },
      });
      if (!seller) {
        throw new NotFoundException(`Seller with ID ${ownerId} not found`);
      }
    } else {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: ownerId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${ownerId} not found`);
      }
    }

    let wallet = await this.prisma.wallet.findFirst({
      where:
        ownerType === WalletOwnerType.SELLER
          ? { sellerId: ownerId }
          : { supplierId: ownerId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          ownerType,
          sellerId: ownerType === WalletOwnerType.SELLER ? ownerId : null,
          supplierId: ownerType === WalletOwnerType.SUPPLIER ? ownerId : null,
          balance: 0.0,
          currency: 'gbp',
        },
      });
    }

    return wallet;
  }

  /**
   * Applies a credit to a wallet (usually for a supplier receiving wholesale payout)
   */
  async applyCredit(
    ownerType: WalletOwnerType,
    ownerId: string,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(ownerType, ownerId);
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Applies a debit to a wallet (usually for a seller spending, or a supplier refunding)
   */
  async applyDebit(
    ownerType: WalletOwnerType,
    ownerId: string,
    amount: number,
  ): Promise<Wallet> {
    const wallet = await this.getOrCreateWallet(ownerType, ownerId);
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });
  }
}
