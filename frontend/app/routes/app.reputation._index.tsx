import { useLoaderData } from 'react-router';
import type { Route } from './+types/app.reputation._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { BarChart4, Circle, CheckCircle2, Award } from 'lucide-react';
import React from 'react';

type ReputationLevel = 'STANDARD' | 'VERIFIED' | 'PREMIUM';

interface KpiSnapshot {
  id: string;
  supplierId: string;
  windowStart: string;
  windowEnd: string;
  ordersTotal: number;
  otdPercentage: number;
  fillRatePercentage: number;
  cancelRatePercentage: number;
  returnRatePercentage: number;
  inventoryScore: number;
  reputationScore: number;
  level: ReputationLevel;
  createdAt: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);

  if (user.role !== 'SUPPLIER') {
    return { snapshot: null, history: [], role: user.role };
  }

  const [snapshotRes, historyRes] = await Promise.all([
    requestBackend<KpiSnapshot | null>(`/reputation/provider/me`, { request }),
    requestBackend<KpiSnapshot[]>(`/reputation/provider/me/history`, { request }),
  ]);

  return {
    snapshot: snapshotRes.data ?? null,
    history: historyRes.data ?? [],
    role: user.role,
  };
}

// ── Design-system aligned config ─────────────────────────────
const LEVEL_CONFIG: Record<
  ReputationLevel,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  STANDARD: {
    label: 'Standard',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    icon: <Circle className="w-4 h-4 text-gray-400" />,
  },
  VERIFIED: {
    label: 'Verified',
    color: 'text-[#7c3aed]',
    bg: 'bg-[#8b5cf6]/10',
    border: 'border-[#8b5cf6]/30',
    icon: <CheckCircle2 className="w-4 h-4 text-[#8b5cf6]" />,
  },
  PREMIUM: {
    label: 'Premium',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Award className="w-4 h-4 text-amber-600" />,
  },
};

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 90 ? '#d97706' : pct >= 75 ? '#8b5cf6' : '#9ca3af';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${pct} ${100 - pct}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[#1a1a1c]">{pct.toFixed(0)}</span>
        <span className="text-xs text-gray-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

function KpiBar({
  label,
  value,
  inverted = false,
  suffix = '%',
}: {
  label: string;
  value: number;
  inverted?: boolean;
  suffix?: string;
}) {
  const normalised = inverted ? 100 - value : value;
  const color =
    normalised >= 90
      ? 'bg-green-500'
      : normalised >= 75
      ? 'bg-[#8b5cf6]'
      : normalised >= 50
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500 font-medium">{label}</span>
        <span className="text-sm font-semibold text-[#1a1a1c]">
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${normalised}%` }}
        />
      </div>
    </div>
  );
}

export default function ReputationPage() {
  const { snapshot, history, role } = useLoaderData<typeof loader>();

  if (role !== 'SUPPLIER') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-center">
          Reputation metrics are only available to suppliers.
        </p>
      </div>
    );
  }

  const level: ReputationLevel = snapshot?.level ?? 'STANDARD';
  const cfg = LEVEL_CONFIG[level];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Reputation & Metrics</h1>
        <p className="text-gray-400 mt-1 text-sm">
          Your performance KPIs computed over the last 90 days.
        </p>
      </div>

      {!snapshot ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
            <BarChart4 className="w-6 h-6 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1c] mb-1">No data yet</h2>
          <p className="text-gray-400 text-sm max-w-sm">
            Your first KPI snapshot will appear after the nightly job runs (02:00 UTC) and you have at least 3 orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Score card */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-4">
            <ScoreGauge score={snapshot.reputationScore} />

            <div className={`px-4 py-1.5 rounded-full border ${cfg.bg} ${cfg.border} flex items-center gap-2`}>
              {cfg.icon}
              <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
            </div>

            <div className="text-center text-xs text-gray-400 space-y-0.5">
              <p>Based on <span className="text-[#1a1a1c] font-semibold">{snapshot.ordersTotal}</span> orders</p>
              <p>Window: last 90 days</p>
            </div>

            <div className="w-full border-t border-gray-100 pt-4 text-xs text-gray-400 text-center">
              Last updated:{' '}
              {new Date(snapshot.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          {/* KPI breakdown */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">KPI Breakdown</h2>

            <KpiBar label="On-Time Delivery (OTD)" value={snapshot.otdPercentage} />
            <KpiBar label="Fill Rate" value={snapshot.fillRatePercentage} />
            <KpiBar label="Cancellation Rate" value={snapshot.cancelRatePercentage} inverted />
            <KpiBar label="Return / Refund Rate" value={snapshot.returnRatePercentage} inverted />
            <KpiBar label="Inventory Feed Score" value={snapshot.inventoryScore} />

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">Score Thresholds</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(LEVEL_CONFIG) as [ReputationLevel, (typeof LEVEL_CONFIG)[ReputationLevel]][]).map(
                  ([lvl, c]) => (
                    <div
                      key={lvl}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.bg} ${c.border} border ${c.color}`}
                    >
                      {c.icon} {c.label}
                      <span className="font-normal text-gray-400 ml-1">
                        {lvl === 'PREMIUM' ? '≥ 90' : lvl === 'VERIFIED' ? '≥ 75' : '< 75'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* History table */}
          {history.length > 1 && (
            <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-[#1a1a1c]">Score History</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f5f5f7]/50 border-b border-gray-100">
                      {['Window End', 'Orders', 'OTD', 'Fill Rate', 'Cancel', 'Returns', 'Score', 'Level'].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((row) => {
                      const rc = LEVEL_CONFIG[row.level as ReputationLevel];
                      return (
                        <tr key={row.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {new Date(row.windowEnd).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-5 py-4 text-sm text-[#1a1a1c] font-semibold">{row.ordersTotal}</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{row.otdPercentage.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm text-gray-500">{row.fillRatePercentage.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm text-red-500 font-medium">{row.cancelRatePercentage.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm text-red-500 font-medium">{row.returnRatePercentage.toFixed(1)}%</td>
                          <td className="px-5 py-4 text-sm font-bold text-[#1a1a1c]">{row.reputationScore.toFixed(1)}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rc.bg} ${rc.border} border ${rc.color}`}
                            >
                              {rc.icon} {rc.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
