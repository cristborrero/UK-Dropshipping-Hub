import { useLoaderData, Form } from 'react-router';
import type { Route } from './+types/app.analytics._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { TrendingUp, CreditCard, Briefcase, Users, BarChart4 } from 'lucide-react';

interface PlatformKpi {
  id: string;
  windowStart: string;
  windowEnd: string;
  gmv: number;
  netSales: number;
  ordersTotal: number;
  ordersByStatusPending: number;
  ordersByStatusAccepted: number;
  ordersByStatusShipped: number;
  ordersByStatusDelivered: number;
  ordersByStatusCancelled: number;
  refundRate: number;
  platformFeesTotal: number;
  suppliersActiveCount: number;
  sellersActiveCount: number;
  createdAt: string;
}

interface PerformerSupplier {
  id: string;
  companyName: string;
  gmv: number;
  reputationScore: number;
  level: 'STANDARD' | 'VERIFIED' | 'PREMIUM';
}

interface PerformerSeller {
  id: string;
  storeUrl: string;
  gmv: number;
}

interface TopPerformers {
  suppliers: PerformerSupplier[];
  sellers: PerformerSeller[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);

  if (user.role !== 'ADMIN') {
    throw new Response('Forbidden', { status: 403 });
  }

  const [currentRes, historyRes, performersRes] = await Promise.all([
    requestBackend<PlatformKpi | null>('/analytics/platform/current', { request }),
    requestBackend<PlatformKpi[]>('/analytics/platform/history', { request }),
    requestBackend<TopPerformers>('/analytics/platform/top-performers', { request }),
  ]);

  return {
    current: currentRes.data ?? null,
    history: historyRes.data ?? [],
    performers: performersRes.data ?? { suppliers: [], sellers: [] },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth(request);
  if (user.role !== 'ADMIN') {
    throw new Response('Forbidden', { status: 403 });
  }

  const res = await requestBackend('/analytics/run-job', {
    method: 'POST',
    request,
  });

  if (res.error) {
    return { error: res.error.message };
  }

  return { success: true };
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { text: string; positive: boolean };
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 transition-all hover:shadow-sm group">
      <div className="flex justify-between items-start">
        <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center group-hover:bg-[#8b5cf6]/10 transition-colors">
          <Icon className="w-4 h-4 text-[#8b5cf6] transition-colors" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-[#1a1a1c] tracking-tight">{value}</h3>
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                trend.positive
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {trend.text}
            </span>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-gray-500">{label}</span>
        <span className="text-[#1a1a1c]">{count} <span className="text-gray-400">({percentage.toFixed(0)}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { current, history, performers } = useLoaderData<typeof loader>();

  if (!current) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Operator Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">Global vision and operational KPIs.</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
            <BarChart4 className="w-6 h-6 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1c] mb-1">No data yet</h2>
          <p className="text-gray-400 text-sm max-w-sm">
            The operational KPI calculator hasn't run yet. Click "Run Snapshot" to initialize metrics.
          </p>
          <Form method="post" className="mt-5">
            <button
              type="submit"
              className="bg-[#1a1a1c] text-white font-medium px-6 py-2.5 rounded-full hover:bg-[#2a2a2e] transition-all text-sm shadow-sm"
            >
              Run Snapshot
            </button>
          </Form>
        </div>
      </div>
    );
  }

  const fmt = (val: number) =>
    `£${val.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Operator Dashboard</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Operational control center showing GMV, Net Sales, and platform health (Last 30 Days).
          </p>
        </div>
        <div className="text-xs text-gray-500 font-semibold bg-white border border-gray-200 px-4 py-2.5 rounded-full self-start shadow-sm">
          Window: {new Date(current.windowStart).toLocaleDateString('en-GB')} – {new Date(current.windowEnd).toLocaleDateString('en-GB')}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Gross Value (GMV)"
          value={fmt(current.gmv)}
          subtitle="Total volume processed"
          icon={TrendingUp}
          trend={{ text: `${current.ordersTotal} orders`, positive: true }}
        />
        <KpiCard
          title="Net Sales"
          value={fmt(current.netSales)}
          subtitle="GMV minus refunds"
          icon={CreditCard}
          trend={{ text: `£${(current.gmv - current.netSales).toFixed(2)} refunded`, positive: false }}
        />
        <KpiCard
          title="Platform Fees"
          value={fmt(current.platformFeesTotal)}
          subtitle="Operator revenue (5%)"
          icon={Briefcase}
          trend={{ text: `${(current.refundRate).toFixed(1)}% refund rate`, positive: current.refundRate < 5 }}
        />
        <KpiCard
          title="Active Base"
          value={`${current.sellersActiveCount + current.suppliersActiveCount}`}
          subtitle={`${current.sellersActiveCount} sellers / ${current.suppliersActiveCount} suppliers`}
          icon={Users}
          trend={{ text: "Active this window", positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Status Breakdown */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Order Fulfilment</h2>
          </div>
          <div className="space-y-4">
            <StatBar label="Pending Supplier" count={current.ordersByStatusPending} total={current.ordersTotal} color="bg-amber-500" />
            <StatBar label="Accepted" count={current.ordersByStatusAccepted} total={current.ordersTotal} color="bg-[#8b5cf6]" />
            <StatBar label="Shipped" count={current.ordersByStatusShipped} total={current.ordersTotal} color="bg-blue-500" />
            <StatBar label="Delivered" count={current.ordersByStatusDelivered} total={current.ordersTotal} color="bg-green-500" />
            <StatBar label="Cancelled" count={current.ordersByStatusCancelled} total={current.ordersTotal} color="bg-red-500" />
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4 flex justify-between items-center text-xs text-gray-400">
            <span>Total Orders</span>
            <span className="font-bold text-[#1a1a1c] text-sm">{current.ordersTotal}</span>
          </div>
        </div>

        {/* CSS Chart Section */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Financial Trends</h2>
          </div>

          {history.length <= 1 ? (
            <div className="h-44 flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-[#f5f5f7]">
              <span className="text-xs text-gray-400">Historical trends will render when snapshots populate.</span>
            </div>
          ) : (
            <div className="flex items-end justify-between h-44 px-4 border-b border-gray-100 pb-2">
              {history.map((snapshot) => {
                const maxVal = Math.max(...history.map((h) => h.gmv), 1);
                const gmvHeight = (snapshot.gmv / maxVal) * 100;
                const netHeight = (snapshot.netSales / maxVal) * 100;

                return (
                  <div key={snapshot.id} className="flex flex-col items-center gap-2 group relative">
                    <div className="flex items-end gap-1 h-28">
                      <div
                        className="w-3 bg-[#8b5cf6] rounded-t transition-all hover:opacity-80"
                        style={{ height: `${gmvHeight}%` }}
                      />
                      <div
                        className="w-3 bg-green-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${netHeight}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold font-mono">
                      {new Date(snapshot.windowEnd).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' })}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-[#1a1a1c] rounded-lg p-2.5 shadow-lg z-20 w-32">
                      <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">Metrics</span>
                      <span className="text-[10px] text-white mt-1 font-semibold">GMV: {fmt(snapshot.gmv)}</span>
                      <span className="text-[10px] text-green-400 font-semibold">Net: {fmt(snapshot.netSales)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-4 mt-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#8b5cf6] rounded" />
              <span className="text-gray-500">GMV</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-green-50 rounded" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-gray-500">Net Sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Suppliers */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Suppliers</h2>

          {performers.suppliers.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No supplier performance data yet.</p>
          ) : (
            <div className="space-y-3">
              {performers.suppliers.map((supplier, idx) => {
                const isPremium = supplier.level === 'PREMIUM';
                const isVerified = supplier.level === 'VERIFIED';
                return (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#f5f5f7] border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-xs font-bold w-4">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-bold text-[#1a1a1c]">{supplier.companyName}</p>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                            isPremium
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isVerified
                              ? 'bg-[#8b5cf6]/10 text-[#7c3aed] border-[#8b5cf6]/20'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {supplier.level} • {supplier.reputationScore.toFixed(0)} pts
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#1a1a1c]">{fmt(supplier.gmv)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Sellers */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Sellers</h2>

          {performers.sellers.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">No seller performance data yet.</p>
          ) : (
            <div className="space-y-3">
              {performers.sellers.map((seller, idx) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#f5f5f7] border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs font-bold w-4">#{idx + 1}</span>
                    <div>
                      <p className="text-sm font-bold text-[#1a1a1c] truncate max-w-[200px]">{seller.storeUrl}</p>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1 block">
                        Active Seller
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#1a1a1c]">{fmt(seller.gmv)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
