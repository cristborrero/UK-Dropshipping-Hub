import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute operational and financial KPIs for a given time window and persist the snapshot.
   */
  async computeAndSave(windowStart: Date, windowEnd: Date) {
    // ── 1. Financial Metrics (from Transaction records) ──────────────────────
    const transactions = await this.prisma.transaction.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
      },
    });

    // GMV = grossAmount sum of SUCCEEDED or REFUNDED transactions
    const paidTransactions = transactions.filter(
      (tx) => tx.status === 'SUCCEEDED' || tx.status === 'REFUNDED',
    );
    const gmv = paidTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);

    // Refund Amount = grossAmount sum of REFUNDED transactions
    const refundedTransactions = transactions.filter(
      (tx) => tx.status === 'REFUNDED',
    );
    const refundAmount = refundedTransactions.reduce(
      (sum, tx) => sum + tx.grossAmount,
      0,
    );

    const netSales = Math.max(0, gmv - refundAmount);
    const refundRate =
      gmv > 0 ? Math.round((refundAmount / gmv) * 10000) / 100 : 0;

    // Platform Fees = platformFeeAmount sum of SUCCEEDED transactions
    const succeededTransactions = transactions.filter(
      (tx) => tx.status === 'SUCCEEDED',
    );
    const platformFeesTotal = succeededTransactions.reduce(
      (sum, tx) => sum + tx.platformFeeAmount,
      0,
    );

    // ── 2. Order Counts & Status Distribution ──────────────────────────────
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: windowStart, lte: windowEnd },
      },
    });

    const ordersTotal = orders.length;
    const ordersByStatusPending = orders.filter(
      (o) => o.status === 'PENDING_SUPPLIER',
    ).length;
    const ordersByStatusAccepted = orders.filter(
      (o) => o.status === 'ACCEPTED',
    ).length;
    const ordersByStatusShipped = orders.filter(
      (o) => o.status === 'SHIPPED',
    ).length;
    const ordersByStatusDelivered = orders.filter(
      (o) =>
        o.status === 'DELIVERED' ||
        o.status === 'RETURN_REQUESTED' ||
        o.status === 'RETURN_APPROVED' ||
        o.status === 'RETURN_REJECTED',
    ).length;
    const ordersByStatusCancelled = orders.filter(
      (o) => o.status === 'CANCELLED',
    ).length;

    // ── 3. Active counts ──────────────────────────────────────────────────
    // Suppliers with at least one order in the window
    const activeSupplierIds = new Set(orders.map((o) => o.supplierId));
    const suppliersActiveCount = activeSupplierIds.size;

    // Sellers with at least one order in the window
    const activeSellerIds = new Set(orders.map((o) => o.sellerId));
    const sellersActiveCount = activeSellerIds.size;

    // ── 4. Persist Snapshot ────────────────────────────────────────────────
    // Round floats to 2 decimal places to ensure database precision consistency
    const snapshot = await this.prisma.platformKpiSnapshot.create({
      data: {
        windowStart,
        windowEnd,
        gmv: Math.round(gmv * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        ordersTotal,
        ordersByStatusPending,
        ordersByStatusAccepted,
        ordersByStatusShipped,
        ordersByStatusDelivered,
        ordersByStatusCancelled,
        refundRate,
        platformFeesTotal: Math.round(platformFeesTotal * 100) / 100,
        suppliersActiveCount,
        sellersActiveCount,
      },
    });

    return snapshot;
  }

  /**
   * Get the most recent platform snapshot.
   */
  async getLatestSnapshot() {
    return this.prisma.platformKpiSnapshot.findFirst({
      orderBy: { windowEnd: 'desc' },
    });
  }

  /**
   * Get historical platform snapshots (newest first).
   */
  async getHistory(limit = 12) {
    return this.prisma.platformKpiSnapshot.findMany({
      orderBy: { windowEnd: 'desc' },
      take: limit,
    });
  }

  /**
   * Query top performers based on historical/latest operational data.
   */
  async getTopPerformers() {
    // 1. Top suppliers by GMV (succeeded transactions)
    const topSuppliersGmv = await this.prisma.transaction.groupBy({
      by: ['supplierId'],
      where: { status: 'SUCCEEDED' },
      _sum: { grossAmount: true },
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: 5,
    });

    // Populate companyNames & current reputation level for top suppliers
    const suppliers = await Promise.all(
      topSuppliersGmv.map(async (item) => {
        if (!item.supplierId) return null;
        const supplierInfo = await this.prisma.supplier.findUnique({
          where: { id: item.supplierId },
          select: {
            companyName: true,
            kpiSnapshots: { orderBy: { windowEnd: 'desc' }, take: 1 },
          },
        });
        return {
          id: item.supplierId,
          companyName: supplierInfo?.companyName || 'Unknown Supplier',
          gmv: Math.round((item._sum.grossAmount || 0) * 100) / 100,
          reputationScore: supplierInfo?.kpiSnapshots[0]?.reputationScore ?? 0,
          level: supplierInfo?.kpiSnapshots[0]?.level ?? 'STANDARD',
        };
      }),
    );

    // 2. Top sellers by GMV
    const topSellersGmv = await this.prisma.transaction.groupBy({
      by: ['sellerId'],
      where: { status: 'SUCCEEDED' },
      _sum: { grossAmount: true },
      orderBy: { _sum: { grossAmount: 'desc' } },
      take: 5,
    });

    const sellers = await Promise.all(
      topSellersGmv.map(async (item) => {
        const sellerInfo = await this.prisma.seller.findUnique({
          where: { id: item.sellerId },
          select: { storeUrl: true },
        });
        return {
          id: item.sellerId,
          storeUrl: sellerInfo?.storeUrl || 'Unknown Seller',
          gmv: Math.round((item._sum.grossAmount || 0) * 100) / 100,
        };
      }),
    );

    return {
      suppliers: suppliers.filter(Boolean),
      sellers,
    };
  }

  /**
   * Run the daily job logic for yesterday's 24h window.
   */
  async runDailySnapshotJob() {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 1);
    windowStart.setHours(0, 0, 0, 0);
    windowEnd.setHours(23, 59, 59, 999);

    return this.computeAndSave(windowStart, windowEnd);
  }
}
