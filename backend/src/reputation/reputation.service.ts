import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReputationLevel } from '@prisma/client';

// ─── Configurable constants ───────────────────────────────
const MIN_ORDERS_THRESHOLD = 3; // minimum orders to produce a score
const DEFAULT_WINDOW_DAYS = 90;

// Weights must sum to 1
const WEIGHTS = {
  otd: 0.4,
  fillRate: 0.2,
  cancelRate: 0.2, // inverted: (100 - cancelRate)
  returnRate: 0.2, // inverted: (100 - returnRate)
};

// ─── KPI calculation helpers (pure, testable) ─────────────

export function calculateOtd(delivered: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((delivered / total) * 10000) / 100;
}

export function calculateFillRate(notCancelled: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((notCancelled / total) * 10000) / 100;
}

export function calculateCancelRate(cancelled: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 10000) / 100;
}

export function calculateReturnRate(returned: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((returned / total) * 10000) / 100;
}

export function calculateReputationScore(
  otd: number,
  fillRate: number,
  cancelRate: number,
  returnRate: number,
): number {
  const raw =
    WEIGHTS.otd * otd +
    WEIGHTS.fillRate * fillRate +
    WEIGHTS.cancelRate * (100 - cancelRate) +
    WEIGHTS.returnRate * (100 - returnRate);

  return Math.round(raw * 100) / 100;
}

export function assignLevel(
  score: number,
  ordersTotal: number,
): ReputationLevel {
  if (ordersTotal < MIN_ORDERS_THRESHOLD) return ReputationLevel.STANDARD;
  if (score >= 90) return ReputationLevel.PREMIUM;
  if (score >= 75) return ReputationLevel.VERIFIED;
  return ReputationLevel.STANDARD;
}

// ─── Service ──────────────────────────────────────────────

@Injectable()
export class ReputationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute and persist a KPI snapshot for a specific supplier over the last
   * `windowDays` days. Returns the created snapshot.
   */
  async computeAndSave(supplierId: string, windowDays = DEFAULT_WINDOW_DAYS) {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - windowDays);

    // ── Raw order counts ────────────────────────────────────
    const orders = await this.prisma.order.findMany({
      where: {
        supplierId,
        createdAt: { gte: windowStart, lte: windowEnd },
      },
      include: { returns: true },
    });

    const ordersTotal = orders.length;

    // Delivered within SLA → we use DELIVERED status as proxy for on-time
    const deliveredCount = orders.filter(
      (o) =>
        o.status === 'DELIVERED' ||
        o.status === 'RETURN_REQUESTED' ||
        o.status === 'RETURN_APPROVED' ||
        o.status === 'RETURN_REJECTED',
    ).length;

    const cancelledCount = orders.filter(
      (o) => o.status === 'CANCELLED',
    ).length;

    // Orders ending in a return
    const returnedCount = orders.filter(
      (o) =>
        o.status === 'RETURN_APPROVED' ||
        o.status === 'RETURN_REQUESTED' ||
        o.status === 'RETURN_REJECTED',
    ).length;

    // Not cancelled = shipped + delivered + returns
    const notCancelledCount = ordersTotal - cancelledCount;

    // ── KPIs ────────────────────────────────────────────────
    const otd = calculateOtd(deliveredCount, ordersTotal);
    const fillRate = calculateFillRate(notCancelledCount, ordersTotal);
    const cancelRate = calculateCancelRate(cancelledCount, ordersTotal);
    const returnRate = calculateReturnRate(returnedCount, ordersTotal);

    // ── Inventory score ─────────────────────────────────────
    // Count inventory updates in window (proxy: products modified in window)
    const inventoryUpdates = await this.prisma.inventory.count({
      where: {
        product: { supplierId },
        updatedAt: { gte: windowStart, lte: windowEnd },
      },
    });
    // Simple normalised 0-100: cap at 30 updates = 100%
    const inventoryScore = Math.min(
      100,
      Math.round((inventoryUpdates / 30) * 100),
    );

    // ── Composite score & level ──────────────────────────────
    const reputationScore = calculateReputationScore(
      otd,
      fillRate,
      cancelRate,
      returnRate,
    );
    const level = assignLevel(reputationScore, ordersTotal);

    // ── Upsert: one snapshot per supplier per windowEnd day ──
    const snapshot = await this.prisma.providerKpiSnapshot.create({
      data: {
        supplierId,
        windowStart,
        windowEnd,
        ordersTotal,
        otdPercentage: otd,
        fillRatePercentage: fillRate,
        cancelRatePercentage: cancelRate,
        returnRatePercentage: returnRate,
        inventoryScore,
        reputationScore,
        level,
      },
    });

    return snapshot;
  }

  /**
   * Get the most recent snapshot for a supplier.
   */
  async getLatestSnapshot(supplierId: string) {
    return this.prisma.providerKpiSnapshot.findFirst({
      where: { supplierId },
      orderBy: { windowEnd: 'desc' },
    });
  }

  /**
   * Get all historical snapshots for a supplier (newest first).
   */
  async getHistory(supplierId: string, limit = 12) {
    return this.prisma.providerKpiSnapshot.findMany({
      where: { supplierId },
      orderBy: { windowEnd: 'desc' },
      take: limit,
    });
  }

  /**
   * Run the nightly job: compute snapshots for all ACTIVE suppliers.
   */
  async runDailyJob(): Promise<{ processed: number }> {
    const suppliers = await this.prisma.supplier.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    for (const { id } of suppliers) {
      await this.computeAndSave(id);
    }

    return { processed: suppliers.length };
  }
}
