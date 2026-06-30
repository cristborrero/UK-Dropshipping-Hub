import { useLoaderData, Link } from 'react-router';
import type { Route } from './+types/app.orders._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { FileText, ArrowRight } from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  const path = user.role === 'SUPPLIER' ? '/orders/supplier' : '/orders/seller';
  const res = await requestBackend<any[]>(path, { request });
  return { user, orders: res.data || [] };
}

export function getStatusPillClass(status: string): string {
  switch (status) {
    case 'PENDING_SUPPLIER':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'ACCEPTED':
      return 'bg-brand-accent/10 text-[#7c3aed] border-brand-accent/30';
    case 'SHIPPED':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'DELIVERED':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-600 border-red-200';
    case 'RETURN_REQUESTED':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'RETURN_APPROVED':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'RETURN_REJECTED':
      return 'bg-gray-50 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function formatStatusText(status: string): string {
  return status.replace(/_/g, ' ');
}

export default function OrdersIndex() {
  const { user, orders } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark">Orders</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {user.role === 'SUPPLIER'
            ? 'Track incoming seller purchase orders and manage fulfilment.'
            : 'Monitor store orders routed to wholesalers and request returns.'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#f5f5f7] flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-brand-dark font-semibold">No orders registered yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Orders will appear once webhook integrations are triggered.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-[#f5f5f7]/50">
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">External ID</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    {user.role === 'SUPPLIER' ? 'Seller Store' : 'Supplier'}
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Items</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Total</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => {
                  const partyName =
                    user.role === 'SUPPLIER'
                      ? order.seller?.storeUrl || 'Retailer Store'
                      : order.supplier?.companyName || 'Wholesaler';
                  const dateStr = new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={order.id} className="hover:bg-[#f5f5f7]/50 transition-colors group">
                      <td className="px-5 py-4 text-sm font-bold text-brand-accent">
                        #{order.externalOrderId}
                      </td>
                      <td className="px-5 py-4 text-sm text-brand-dark font-semibold truncate max-w-[160px]">
                        {partyName}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">{dateStr}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {order.items?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0} items
                      </td>
                      <td className="px-5 py-4 text-sm text-brand-dark font-semibold">
                        £{order.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusPillClass(order.status)}`}
                        >
                          {formatStatusText(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-brand-dark text-white font-semibold px-3 py-1.5 rounded-full hover:bg-[#2a2a2e] transition-all"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
