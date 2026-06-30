import { describe, it, expect } from 'vitest';

// Pure KPI helper logic extracted from service for testing
function computeFinancialKpis(
  transactions: Array<{
    status: string;
    grossAmount: number;
    platformFeeAmount: number;
  }>,
) {
  const paidTransactions = transactions.filter(
    (tx) => tx.status === 'SUCCEEDED' || tx.status === 'REFUNDED',
  );
  const gmv = paidTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);

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

  const succeededTransactions = transactions.filter(
    (tx) => tx.status === 'SUCCEEDED',
  );
  const platformFeesTotal = succeededTransactions.reduce(
    (sum, tx) => sum + tx.platformFeeAmount,
    0,
  );

  return {
    gmv: Math.round(gmv * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    refundRate: Math.round(refundRate * 100) / 100,
    platformFeesTotal: Math.round(platformFeesTotal * 100) / 100,
  };
}

describe('Platform Analytics Pure Calculations (Unit)', () => {
  it('computes metrics correctly for a mix of transactions', () => {
    const txs = [
      { status: 'SUCCEEDED', grossAmount: 100, platformFeeAmount: 5 },
      { status: 'SUCCEEDED', grossAmount: 200, platformFeeAmount: 10 },
      { status: 'REFUNDED', grossAmount: 50, platformFeeAmount: 2.5 },
      { status: 'FAILED', grossAmount: 80, platformFeeAmount: 4 },
      { status: 'PENDING', grossAmount: 120, platformFeeAmount: 6 },
    ];

    const res = computeFinancialKpis(txs);

    // GMV = 100 + 200 + 50 (succeeded + refunded) = 350
    expect(res.gmv).toBe(350);

    // Net Sales = GMV - Refunded (350 - 50) = 300
    expect(res.netSales).toBe(300);

    // Refund Rate = (50 / 350) * 100 = 14.2857% -> 14.29%
    expect(res.refundRate).toBe(14.29);

    // Platform Fees Total = sum of succeeded fees (5 + 10) = 15
    expect(res.platformFeesTotal).toBe(15);
  });

  it('handles division by zero when GMV is 0', () => {
    const txs = [
      { status: 'FAILED', grossAmount: 100, platformFeeAmount: 5 },
      { status: 'PENDING', grossAmount: 50, platformFeeAmount: 2.5 },
    ];

    const res = computeFinancialKpis(txs);

    expect(res.gmv).toBe(0);
    expect(res.netSales).toBe(0);
    expect(res.refundRate).toBe(0);
    expect(res.platformFeesTotal).toBe(0);
  });

  it('handles empty transaction list', () => {
    const res = computeFinancialKpis([]);

    expect(res.gmv).toBe(0);
    expect(res.netSales).toBe(0);
    expect(res.refundRate).toBe(0);
    expect(res.platformFeesTotal).toBe(0);
  });
});
