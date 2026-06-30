import { useLoaderData, Form, useNavigation } from 'react-router';
import type { Route } from './+types/app.notifications._index';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import {
  Bell,
  Check,
  CheckCheck,
  Mail,
  Smartphone,
  Settings,
  AlertCircle,
  FileText,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);

  // Get notifications
  const notificationsRes = await requestBackend<{
    items: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      isRead: boolean;
      createdAt: string;
    }>;
    unreadCount: number;
    total: number;
  }>('/notifications?pageSize=50', { request });

  // Get preferences
  const preferencesRes = await requestBackend<{
    emailOrderStatus: boolean;
    emailPaymentEvents: boolean;
    emailReturns: boolean;
    inAppOrderStatus: boolean;
    inAppPaymentEvents: boolean;
    inAppReturns: boolean;
  }>('/notifications/preferences', { request });

  return {
    user,
    notifications: notificationsRes.data?.items || [],
    unreadCount: notificationsRes.data?.unreadCount || 0,
    preferences: preferencesRes.data || {
      emailOrderStatus: true,
      emailPaymentEvents: true,
      emailReturns: true,
      inAppOrderStatus: true,
      inAppPaymentEvents: true,
      inAppReturns: true,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'mark-read') {
    const id = formData.get('notificationId') as string;
    await requestBackend(`/notifications/${id}/read`, {
      method: 'PATCH',
      request,
    });
  } else if (intent === 'mark-all-read') {
    await requestBackend('/notifications/read-all', {
      method: 'PATCH',
      request,
    });
  } else if (intent === 'update-preferences') {
    const body = {
      emailOrderStatus: formData.get('emailOrderStatus') === 'true',
      inAppOrderStatus: formData.get('inAppOrderStatus') === 'true',
      emailPaymentEvents: formData.get('emailPaymentEvents') === 'true',
      inAppPaymentEvents: formData.get('inAppPaymentEvents') === 'true',
      emailReturns: formData.get('emailReturns') === 'true',
      inAppReturns: formData.get('inAppReturns') === 'true',
    };
    await requestBackend('/notifications/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      request,
    });
  }

  return { success: true };
}

export default function NotificationsIndex() {
  const { notifications, unreadCount, preferences } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== 'idle';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1c]">Notification Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your email preferences and view recent system activity logs.
          </p>
        </div>
        {unreadCount > 0 && (
          <Form method="post">
            <input type="hidden" name="intent" value="mark-all-read" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] active:bg-[#6d28d9] disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          </Form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Notification Logs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-sm font-semibold text-[#1a1a1c] flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#8b5cf6]" />
                Recent Alerts ({notifications.length})
              </h2>
              {unreadCount > 0 && (
                <span className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-semibold text-[#1a1a1c]">No notifications found.</p>
                  <p className="text-xs text-gray-400 mt-1">Alerts about orders and payments will show up here.</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  let Icon = AlertCircle;
                  let iconColor = 'text-amber-500 bg-amber-50';

                  if (notif.type === 'ORDER_STATUS') {
                    Icon = FileText;
                    iconColor = 'text-blue-500 bg-blue-50';
                  } else if (notif.type === 'PAYMENT') {
                    Icon = CreditCard;
                    iconColor = 'text-[#10b981] bg-emerald-50';
                  }

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 flex items-start gap-4 transition-colors ${
                        notif.isRead ? 'hover:bg-[#f5f5f7]/50' : 'bg-violet-50/20 hover:bg-violet-50/40'
                      }`}
                    >
                      <div className={`p-2 rounded-xl shrink-0 ${iconColor} border border-current/10`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h3 className={`text-sm font-semibold truncate ${notif.isRead ? 'text-gray-500' : 'text-[#1a1a1c]'}`}>
                            {notif.title}
                          </h3>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {new Date(notif.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {notif.body}
                        </p>
                      </div>

                      {!notif.isRead && (
                        <Form method="post" className="shrink-0 self-center">
                          <input type="hidden" name="intent" value="mark-read" />
                          <input type="hidden" name="notificationId" value={notif.id} />
                          <button
                            type="submit"
                            title="Mark as read"
                            disabled={isSubmitting}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-[#1a1a1c] hover:bg-gray-100 transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </Form>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Preference Settings */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-white">
              <h2 className="text-sm font-semibold text-[#1a1a1c] flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[#8b5cf6]" />
                Dispatch Channels
              </h2>
            </div>

            <Form method="post" className="p-5 space-y-6">
              <input type="hidden" name="intent" value="update-preferences" />

              {/* Order Status updates */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Order Status</h3>
                
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">Email Alerts</p>
                      <p className="text-[10px] text-gray-400">When status moves (shipped, return, etc.)</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="emailOrderStatus"
                    value="true"
                    defaultChecked={preferences.emailOrderStatus}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="emailOrderStatus" value="false" />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">In-App Badges</p>
                      <p className="text-[10px] text-gray-400">Real-time counts on lateral menu</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="inAppOrderStatus"
                    value="true"
                    defaultChecked={preferences.inAppOrderStatus}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="inAppOrderStatus" value="false" />
                </div>
              </div>

              {/* Payments & Ledger updates */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Payments & Ledger</h3>
                
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">Email Confirmations</p>
                      <p className="text-[10px] text-gray-400">Receipts and disbursement splits</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="emailPaymentEvents"
                    value="true"
                    defaultChecked={preferences.emailPaymentEvents}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="emailPaymentEvents" value="false" />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">In-App Alerts</p>
                      <p className="text-[10px] text-gray-400">Log records for invoices and payments</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="inAppPaymentEvents"
                    value="true"
                    defaultChecked={preferences.inAppPaymentEvents}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="inAppPaymentEvents" value="false" />
                </div>
              </div>

              {/* Return events */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider">Returns</h3>
                
                <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">Email Alerts</p>
                      <p className="text-[10px] text-gray-400">When returns requested or decisions made</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="emailReturns"
                    value="true"
                    defaultChecked={preferences.emailReturns}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="emailReturns" value="false" />
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1c]">In-App Badges</p>
                      <p className="text-[10px] text-gray-400">Logs for return progress status</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    name="inAppReturns"
                    value="true"
                    defaultChecked={preferences.inAppReturns}
                    className="w-4 h-4 accent-[#8b5cf6]"
                  />
                  <input type="hidden" name="inAppReturns" value="false" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#f5f5f7] hover:bg-gray-100 text-[#1a1a1c] text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer border border-gray-200/50 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                  <Check className="w-4 h-4 text-gray-400" />
                )}
                Save Preferences
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
