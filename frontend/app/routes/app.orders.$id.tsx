import { useLoaderData, useActionData, useNavigation, Form, Link } from 'react-router';
import type { Route } from './+types/app.orders.$id';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import { getStatusPillClass, formatStatusText } from './app.orders._index';
import { Package, Truck, Calendar, Store, MapPin, Receipt, ArrowLeft } from 'lucide-react';

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  
  const res = await requestBackend<any>(`/orders/${params.id}`, { request });
  if (res.error) {
    throw new Response('Order not found', { status: 404 });
  }

  return { user, order: res.data! };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'accept') {
    const res = await requestBackend(`/orders/${params.id}/status`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ status: 'ACCEPTED' }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'cancel') {
    const res = await requestBackend(`/orders/${params.id}/status`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ status: 'CANCELLED' }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'ship') {
    const carrier = formData.get('carrier') as string;
    const trackingCode = formData.get('trackingCode') as string;
    if (!carrier || !trackingCode) {
      return { error: 'Carrier and tracking code are required to ship order' };
    }

    const res = await requestBackend(`/orders/${params.id}/status`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ status: 'SHIPPED', carrier, trackingCode }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'deliver') {
    const res = await requestBackend(`/orders/${params.id}/status`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'request_return') {
    const reason = formData.get('reason') as string;
    if (!reason || reason.length < 5) {
      return { error: 'Please provide a return reason of at least 5 characters' };
    }

    const res = await requestBackend(`/orders/${params.id}/returns`, {
      method: 'POST',
      request,
      body: JSON.stringify({ reason }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'approve_return') {
    const res = await requestBackend(`/orders/${params.id}/returns`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ decision: 'APPROVE' }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'reject_return') {
    const res = await requestBackend(`/orders/${params.id}/returns`, {
      method: 'PATCH',
      request,
      body: JSON.stringify({ decision: 'REJECT' }),
    });
    if (res.error) return { error: res.error.message };
  }

  if (intent === 'pay') {
    const sessionRes = await requestBackend<{ stripePaymentIntentId: string }>('/payments/checkout-session', {
      method: 'POST',
      request,
      body: JSON.stringify({ orderId: params.id }),
    });

    if (sessionRes.error) {
      return { error: sessionRes.error.message };
    }

    const stripePaymentIntentId = sessionRes.data?.stripePaymentIntentId;

    if (stripePaymentIntentId) {
      const webhookRes = await requestBackend('/webhooks/stripe', {
        method: 'POST',
        request,
        body: JSON.stringify({
          id: `evt_mock_${stripePaymentIntentId}`,
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: stripePaymentIntentId,
              latest_charge: `ch_mock_${stripePaymentIntentId.slice(3)}`,
            },
          },
        }),
      });

      if (webhookRes.error) {
        return { error: `Payment mock webhook failed: ${webhookRes.error.message}` };
      }
    }
  }

  return null;
}

export default function OrderDetails() {
  const { user, order } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <div className="text-sm text-slate-500 flex items-center gap-2">
        <Link to="/orders" className="hover:text-slate-900 transition-colors flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Orders
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">#{order.externalOrderId}</span>
      </div>

      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            Order #{order.externalOrderId}
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusPillClass(
                order.status
              )}`}
            >
              {formatStatusText(order.status)}
            </span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Internal Reference: <span className="text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{order.id}</span>
          </p>
        </div>

        {/* Dynamic status helper/actions block */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-3 text-sm text-slate-600 shadow-sm">
          <Calendar className="w-5 h-5 text-slate-400" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Placed on
            </span>
            <span className="text-slate-900 font-bold">
              {new Date(order.createdAt).toLocaleString('en-GB')}
            </span>
          </div>
        </div>
      </div>

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">
          {actionData.error}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Order Items and Tracking */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              Order Items
            </h3>
            <div className="divide-y divide-slate-100">
              {order.items.map((item: any) => (
                <div key={item.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.product?.title || 'Unknown Product'}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      SKU: <span className="text-slate-700">{item.product?.sku}</span> | Qty: <span className="text-slate-700">{item.quantity}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">£{(item.unitPrice * item.quantity).toFixed(2)}</p>
                    <p className="text-xs text-slate-500 mt-1">£{item.unitPrice.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center font-bold text-slate-900">
              <span>Total Price</span>
              <span className="text-xl">£{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping Logistics */}
          {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                Logistics & Tracking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Carrier</span>
                  <span className="text-slate-900 font-bold text-lg">{order.carrier}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tracking Number</span>
                  <span className="text-violet-600 font-mono font-bold text-lg">{order.trackingCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* Return Requests Details */}
          {order.returns && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Return Request
                </h3>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    order.returns.status === 'APPROVED'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : order.returns.status === 'REJECTED'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}
                >
                  {order.returns.status}
                </span>
              </div>
              <div className="space-y-3 pt-2">
                <span className="block text-xs font-semibold text-slate-500 uppercase">Reason</span>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium leading-relaxed">
                  {order.returns.reason}
                </p>
                <span className="block text-xs text-slate-500 font-medium">
                  Requested on {new Date(order.returns.createdAt).toLocaleString('en-GB')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Parties, Status Logs, and Actions */}
        <div className="space-y-6">
          
          {/* Parties */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 text-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <Store className="w-4 h-4 text-slate-400" />
              Parties
            </h3>
            
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase">Retailer Seller</span>
              <p className="text-slate-900 font-bold">{order.seller?.storeUrl}</p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                Platform: {order.seller?.storePlatform}
              </span>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <span className="block text-xs font-semibold text-slate-500 uppercase">Wholesale Supplier</span>
              <p className="text-slate-900 font-bold">{order.supplier?.companyName}</p>
              <p className="text-xs text-slate-600 font-medium flex gap-1.5 items-start mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                {order.supplier?.address}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">VAT: {order.supplier?.vat}</p>
            </div>
          </div>

          {/* Payment Ledger */}
          {order.transactions && order.transactions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  Payment Ledger
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                  order.transactions[0].status === 'SUCCEEDED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-violet-50 text-violet-700 border-violet-200'
                }`}>
                  {order.transactions[0].status}
                </span>
              </h3>
              <div className="space-y-3 font-mono text-xs pt-2">
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans font-medium">Gross Wholesale:</span>
                  <span className="font-semibold text-slate-900">£{order.transactions[0].grossAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-sans font-medium">Platform Fee (5%):</span>
                  <span className="text-orange-600 font-semibold">-£{order.transactions[0].platformFeeAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 pt-3 border-t border-slate-100">
                  <span className="font-sans font-bold">Supplier Net:</span>
                  <span className="font-bold text-green-600 text-sm">£{order.transactions[0].supplierNetAmount.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-4 break-all font-sans bg-slate-50 p-2 rounded border border-slate-100">
                  Stripe PI: <span className="font-mono">{order.transactions[0].stripePaymentIntentId}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Order Timeline
            </h3>
            <div className="relative pl-6 border-l border-slate-200 space-y-6 text-sm pt-2 ml-2">
              {/* Dynamic Status Log Points */}
              <div className="relative">
                <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-violet-500 ring-4 ring-violet-50" />
                <p className="font-bold text-slate-900">{formatStatusText(order.status)}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Updated: {new Date(order.updatedAt).toLocaleString('en-GB')}
                </p>
              </div>

              {order.updatedAt !== order.createdAt && (
                <div className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-slate-300 ring-4 ring-slate-50" />
                  <p className="font-medium text-slate-600">Order Placed</p>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {new Date(order.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Block */}
          {user.role === 'SUPPLIER' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200">
                Supplier Operations
              </h3>

              {order.status === 'PENDING_SUPPLIER' && (
                <div className="flex flex-col gap-3 pt-2">
                  <Form method="post">
                    <input type="hidden" name="intent" value="accept" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all cursor-pointer text-sm shadow-sm active:scale-[0.98]"
                    >
                      Accept Order
                    </button>
                  </Form>
                  <Form method="post" onSubmit={(e) => {
                    if (!confirm('Are you sure you want to cancel this order?')) e.preventDefault();
                  }}>
                    <input type="hidden" name="intent" value="cancel" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-white text-red-600 border border-red-200 font-medium py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-sm"
                    >
                      Cancel Order
                    </button>
                  </Form>
                </div>
              )}

              {order.status === 'ACCEPTED' && (
                <div className="space-y-5 pt-2">
                  <Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="ship" />
                    <div>
                      <label htmlFor="carrier" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Carrier Company
                      </label>
                      <input
                        id="carrier"
                        name="carrier"
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 transition-all shadow-sm"
                        placeholder="e.g. Royal Mail, DPD"
                      />
                    </div>
                    <div>
                      <label htmlFor="trackingCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                        Tracking Reference
                      </label>
                      <input
                        id="trackingCode"
                        name="trackingCode"
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 transition-all shadow-sm"
                        placeholder="e.g. GB123456789"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all cursor-pointer text-sm shadow-sm active:scale-[0.98]"
                    >
                      Ship Order
                    </button>
                  </Form>

                  <Form method="post" onSubmit={(e) => {
                    if (!confirm('Are you sure you want to cancel this order?')) e.preventDefault();
                  }}>
                    <input type="hidden" name="intent" value="cancel" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-white text-red-600 border border-red-200 font-medium py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-sm"
                    >
                      Cancel Order
                    </button>
                  </Form>
                </div>
              )}

              {order.status === 'SHIPPED' && (
                <Form method="post" className="pt-2">
                  <input type="hidden" name="intent" value="deliver" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-sm"
                  >
                    Mark as Delivered
                  </button>
                </Form>
              )}

              {order.status === 'RETURN_REQUESTED' && (
                <div className="flex gap-3 pt-2">
                  <Form method="post" className="flex-1">
                    <input type="hidden" name="intent" value="approve_return" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 text-white font-medium py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-sm"
                    >
                      Approve
                    </button>
                  </Form>
                  <Form method="post" className="flex-1">
                    <input type="hidden" name="intent" value="reject_return" />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-white text-red-600 border border-red-200 font-medium py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer text-sm shadow-sm"
                    >
                      Reject
                    </button>
                  </Form>
                </div>
              )}

              {['DELIVERED', 'CANCELLED', 'RETURN_APPROVED', 'RETURN_REJECTED'].includes(order.status) && (
                <p className="text-sm text-slate-500 font-medium text-center py-2">
                  No actions available for this order state.
                </p>
              )}
            </div>
          )}

          {user.role === 'SELLER' && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-200">
                Seller Operations
              </h3>

              {order.status === 'DELIVERED' && (
                <Form method="post" className="space-y-4 pt-2">
                  <input type="hidden" name="intent" value="request_return" />
                  <div>
                    <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Return Reason
                    </label>
                    <select
                      id="reason"
                      name="reason"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 transition-all shadow-sm"
                    >
                      <option value="Damaged product upon arrival">Damaged on arrival</option>
                      <option value="Defective or inoperable item">Defective / broken</option>
                      <option value="Incorrect item received">Incorrect item</option>
                      <option value="Late delivery / no longer needed">Late delivery</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all cursor-pointer text-sm shadow-sm active:scale-[0.98]"
                  >
                    Request Return
                  </button>
                </Form>
              )}

              {order.status === 'PENDING_SUPPLIER' && (
                <Form method="post" className="pt-2">
                  <input type="hidden" name="intent" value="pay" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all cursor-pointer text-sm shadow-sm active:scale-[0.98]"
                  >
                    Pay Wholesale Price
                  </button>
                </Form>
              )}

              {!['DELIVERED', 'PENDING_SUPPLIER'].includes(order.status) && (
                <p className="text-sm text-slate-500 font-medium text-center py-2">
                  {order.status === 'RETURN_REQUESTED'
                    ? 'Return request is currently under wholesaler review.'
                    : 'No operations available in this status.'}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
