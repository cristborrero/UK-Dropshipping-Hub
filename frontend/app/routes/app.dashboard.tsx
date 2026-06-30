import { useLoaderData, Link } from 'react-router';
import type { Route } from './+types/app.dashboard';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import {
  Package,
  Upload,
  Plus,
  ShoppingCart,
  Wallet,
  Store,
  Star,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Box,
} from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);

  const [productsRes, ordersRes, walletRes] = await Promise.all([
    user.role === 'SUPPLIER'
      ? requestBackend<any[]>('/products', { request })
      : Promise.resolve({ data: null }),
    requestBackend<any[]>(
      user.role === 'SUPPLIER' ? '/orders/supplier' : '/orders/seller',
      { request }
    ),
    requestBackend<{ wallet: { balance: number; currency: string }; metrics: any }>(
      '/wallet/me',
      { request }
    ),
  ]);

  return {
    user,
    productsCount: productsRes.data?.length ?? 0,
    orders: ordersRes.data ?? [],
    wallet: walletRes.data?.wallet ?? null,
    walletMetrics: walletRes.data?.metrics ?? null,
  };
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`relative overflow-hidden rounded-2xl border p-6 transition-all group ${
        accent
          ? 'bg-[#1a1a1c] border-[#1a1a1c] text-white'
          : 'bg-white border-gray-200 text-[#1a1a1c] hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            accent ? 'bg-[#8b5cf6]/20' : 'bg-[#f5f5f7]'
          }`}
        >
          <Icon className={`w-4 h-4 ${accent ? 'text-[#c4b5fd]' : 'text-[#8b5cf6]'}`} />
        </div>
        {href && (
          <ArrowRight
            className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
              accent ? 'text-white/60' : 'text-gray-400'
            }`}
          />
        )}
      </div>
      <p className={`text-3xl font-bold tracking-tight mb-1 ${accent ? 'text-white' : 'text-[#1a1a1c]'}`}>
        {value}
      </p>
      <p className={`text-xs font-semibold uppercase tracking-wider ${accent ? 'text-white/50' : 'text-gray-400'}`}>
        {label}
      </p>
    </div>
  );

  return href ? (
    <Link to={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function QuickAction({
  label,
  description,
  href,
  icon: Icon,
}: {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#8b5cf6]/40 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#8b5cf6]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1a1a1c]">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8b5cf6] transition-colors shrink-0" />
    </Link>
  );
}

export default function Dashboard() {
  const { user, productsCount, orders, wallet, walletMetrics } = useLoaderData<typeof loader>();

  const pendingOrders = orders.filter((o: any) => o.status === 'PENDING_SUPPLIER').length;
  const activeOrders = orders.filter((o: any) =>
    ['ACCEPTED', 'SHIPPED'].includes(o.status)
  ).length;

  const formatGBP = (n: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n / 100);

  const walletBalance = wallet ? formatGBP(wallet.balance) : '—';
  const netEarnings = walletMetrics ? formatGBP(walletMetrics.netAmount) : '—';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">
          Good to see you, {user.email.split('@')[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here's what's happening with your{' '}
          {user.role === 'SUPPLIER' ? 'supplier' : 'seller'} account.
        </p>
      </div>

      {user.role === 'SUPPLIER' ? (
        <>
          {/* Stats grid — Supplier */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Products Listed" value={productsCount} icon={Box} href="/products" />
            <StatCard label="Orders — Pending" value={pendingOrders} icon={Clock} href="/orders" accent={pendingOrders > 0} />
            <StatCard label="Orders — Active" value={activeOrders} icon={ShoppingCart} href="/orders" />
            <StatCard label="Wallet Balance" value={walletBalance} icon={Wallet} href="/wallet" />
          </div>

          {/* Net earnings banner */}
          {walletMetrics && (
            <div className="bg-[#1a1a1c] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#c4b5fd]" />
                </div>
                <div>
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Lifetime net earnings</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{netEarnings}</p>
                </div>
              </div>
              <Link
                to="/wallet"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all"
              >
                View wallet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <QuickAction
                label="Add New Product"
                description="List a new item in the catalogue"
                href="/products/new"
                icon={Plus}
              />
              <QuickAction
                label="CSV Bulk Upload"
                description="Import multiple products at once"
                href="/products/upload"
                icon={Upload}
              />
              <QuickAction
                label="View All Orders"
                description={`${orders.length} total orders`}
                href="/orders"
                icon={ShoppingCart}
              />
              <QuickAction
                label="Reputation Score"
                description="OTD, fill rate, and KPI history"
                href="/reputation"
                icon={Star}
              />
              <QuickAction
                label="My Wallet"
                description="Transactions and earnings"
                href="/wallet"
                icon={Wallet}
              />
              {user.status === 'PENDING' && (
                <QuickAction
                  label="Complete Onboarding"
                  description="Activate your supplier profile"
                  href="/onboarding"
                  icon={CheckCircle2}
                />
              )}
            </div>
          </div>

          {/* Recent orders preview */}
          {orders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Orders</h2>
                <Link to="/orders" className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] font-semibold transition-colors">
                  View all →
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {orders.slice(0, 4).map((order: any) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f5f5f7] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1c] truncate">#{order.externalOrderId}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      order.status === 'PENDING_SUPPLIER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : order.status === 'DELIVERED'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8b5cf6] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Stats grid — Seller */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Orders" value={orders.length} icon={ShoppingCart} href="/orders" />
            <StatCard label="Pending Orders" value={pendingOrders} icon={Clock} href="/orders" accent={pendingOrders > 0} />
            <StatCard label="Wallet Balance" value={walletBalance} icon={Wallet} href="/wallet" />
          </div>

          {/* Store info & Sourcing Banner Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                  <Store className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Connected Store</p>
                  <p className="text-sm font-bold text-[#1a1a1c] capitalize mt-0.5">
                    {user.seller?.storePlatform?.toLowerCase()}
                  </p>
                </div>
              </div>
              <a
                href={user.seller?.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#8b5cf6] hover:text-[#7c3aed] font-medium truncate transition-colors block mt-4"
              >
                {user.seller?.storeUrl}
              </a>
            </div>

            <div className="bg-[#1a1a1c] rounded-2xl p-6 flex flex-col justify-between text-white">
              <div>
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Source Products</p>
                <p className="text-base font-bold text-white mt-1">Explore Wholesalers Catalogue</p>
                <p className="text-xs text-white/50 mt-1">Browse active UK wholesale prices, analyze margins, and sync inventory.</p>
              </div>
              <Link
                to="/catalogue"
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all self-start mt-4"
              >
                Open Catalogue <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick actions — Seller */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <QuickAction
                label="Explore Catalogue"
                description="Browse wholesaling lists"
                href="/catalogue"
                icon={Box}
              />
              <QuickAction
                label="View Orders"
                description={`${orders.length} total orders on record`}
                href="/orders"
                icon={ShoppingCart}
              />
              <QuickAction
                label="My Wallet"
                description="Payments and transactions"
                href="/wallet"
                icon={Wallet}
              />
            </div>
          </div>

          {/* Recent orders */}
          {orders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Orders</h2>
                <Link to="/orders" className="text-xs text-[#8b5cf6] hover:text-[#7c3aed] font-semibold transition-colors">
                  View all →
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {orders.slice(0, 4).map((order: any) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#f5f5f7] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1c] truncate">#{order.externalOrderId}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-GB')}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      order.status === 'PENDING_SUPPLIER'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : order.status === 'DELIVERED'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#8b5cf6] transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
