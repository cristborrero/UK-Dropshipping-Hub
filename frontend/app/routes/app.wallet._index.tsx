import { useLoaderData } from 'react-router';
import type { Route } from './+types/app.wallet._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { CreditCard, ShieldCheck, Wallet, Receipt, DollarSign, ArrowRightLeft, TrendingUp } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);

  const res = await requestBackend<{
    wallet: { balance: number; currency: string };
    transactions: Array<{
      id: string;
      stripePaymentIntentId: string;
      grossAmount: number;
      platformFeeAmount: number;
      sellerNetAmount: number;
      supplierNetAmount: number;
      currency: string;
      status: string;
      createdAt: string;
      order: { externalOrderId: string };
    }>;
    metrics: {
      grossEarnings: number;
      platformFeesPaid: number;
      netAmount: number;
    };
  }>('/wallet/me', { request });

  if (res.error) {
    throw new Response(res.error.message, { status: res.error.status });
  }

  return {
    user,
    wallet: res.data?.wallet,
    transactions: res.data?.transactions || [],
    metrics: res.data?.metrics,
  };
}

export default function WalletIndex() {
  const { user, wallet, transactions, metrics } = useLoaderData<typeof loader>();
  const isSupplier = user.role === 'SUPPLIER';

  const fmt = (amount: number, currency = 'gbp') =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">My Wallet</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Real-time balance, transactions, and commission breakdown.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold self-start">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
          FCA Compliant Ledger
        </div>
      </div>

      {/* Top grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Balance card */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[#1a1a1c] relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Wallet className="w-28 h-28 text-white" />
          </div>
          <div className="relative z-10">
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">
              {isSupplier ? 'Available Balance' : 'Account Balance'}
            </span>
            <div className="text-4xl font-bold tracking-tight mt-2 text-white">
              {wallet ? fmt(wallet.balance, wallet.currency) : '£0.00'}
            </div>
            <p className="text-xs text-white/40 mt-3 leading-relaxed">
              {isSupplier
                ? 'Net payout after platform fees, settled into your Stripe Connected Account.'
                : 'Accumulated wholesale cost and fees for fulfilled orders.'}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
            <span className="text-xs text-white/40">Account type</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/30 uppercase tracking-wider">
              {user.role} LEDGER
            </span>
          </div>
        </div>

        {/* Metrics card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-gray-200 flex flex-col justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Financial Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div className="p-4 rounded-xl bg-[#f5f5f7] border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Receipt className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gross</span>
              </div>
              <p className="text-xl font-bold text-[#1a1a1c]">
                {metrics ? fmt(metrics.grossEarnings) : '£0.00'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#f5f5f7] border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                  {isSupplier ? 'Platform Fees' : 'Fees Paid'}
                </span>
              </div>
              <p className="text-xl font-bold text-amber-600">
                {metrics ? fmt(metrics.platformFeesPaid) : '£0.00'}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[#f5f5f7] border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Net Total</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {metrics ? fmt(metrics.netAmount) : '£0.00'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2.5 bg-[#f5f5f7] p-3.5 rounded-xl items-start">
            <ShieldCheck className="w-4 h-4 text-[#8b5cf6] shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-[#1a1a1c]">UK Regulatory Notice:</strong> Funds are held by Stripe Payments UK Ltd in compliance with FCA regulations. This dashboard displays ledger events mapped from webhook data.
            </p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1a1a1c]">Transaction History</h2>
          <span className="text-xs text-gray-400">{transactions.length} records</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-[#1a1a1c] font-semibold">No transactions yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Payments will appear here once Stripe webhooks are processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f5f5f7]/50">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Payment Intent</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Order</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Gross</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-amber-500">Platform Fee</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-green-600">Net</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                    <td className="px-5 py-4 text-xs text-gray-400 font-mono truncate max-w-[160px]">
                      {tx.stripePaymentIntentId}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#8b5cf6]">
                      #{tx.order?.externalOrderId}
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#1a1a1c]">
                      {fmt(tx.grossAmount, tx.currency)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-amber-600">
                      -{fmt(tx.platformFeeAmount, tx.currency)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-green-600">
                      {fmt(isSupplier ? tx.supplierNetAmount : tx.sellerNetAmount, tx.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          tx.status === 'SUCCEEDED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : tx.status === 'REFUNDED'
                            ? 'bg-[#8b5cf6]/10 text-[#7c3aed] border-[#8b5cf6]/30'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">
                      {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
