import { Outlet, Link, useLoaderData, Form, NavLink, useLocation } from 'react-router';
import type { Route } from './+types/app';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  UserCheck,
  Star,
  BarChart3,
  LogOut,
  ShieldAlert,
  Package2,
  ChevronRight,
  Bell,
} from 'lucide-react';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  let unreadCount = 0;
  try {
    const res = await requestBackend<{ unreadCount: number }>('/notifications?pageSize=1', { request });
    if (res.data) {
      unreadCount = res.data.unreadCount;
    }
  } catch (e) {
    // Ignore
  }
  return { user, unreadCount };
}

// Map routes to human-readable breadcrumb labels
const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/wallet': 'Wallet',
  '/products': 'Products',
  '/products/new': 'New Product',
  '/products/upload': 'CSV Upload',
  '/onboarding': 'Onboarding Profile',
  '/reputation': 'Reputation',
  '/analytics': 'Analytics',
  '/catalogue': 'Sourcing Catalogue',
  '/notifications': 'Notifications',
};

function useBreadcrumb() {
  const location = useLocation();
  // Match exact first, then prefix
  if (location.pathname.startsWith('/catalogue/')) {
    return 'Product Detail';
  }
  const label = BREADCRUMB_MAP[location.pathname]
    ?? Object.entries(BREADCRUMB_MAP).find(([k]) => location.pathname.startsWith(k))?.[1]
    ?? 'Dashboard';
  return label;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? 'bg-[#8b5cf6]/15 text-[#c4b5fd] border-l-2 border-[#8b5cf6] pl-[10px]'
      : 'text-white/55 hover:text-white/90 hover:bg-white/5'
  }`;

export default function AppLayout() {
  const { user, unreadCount } = useLoaderData<typeof loader>();
  const breadcrumb = useBreadcrumb();
  const isPendingSupplier = user.role === 'SUPPLIER' && user.status === 'PENDING';

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1a1a1c] flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-[#1a1a1c] bg-grid-dark flex flex-col justify-between shrink-0 relative overflow-hidden">
        {/* Subtle violet glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[120px] bg-[#8b5cf6]/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 p-5 flex flex-col h-full">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-lg bg-[#8b5cf6] flex items-center justify-center shadow-md">
              <Package2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              Dropship Hub
            </span>
          </Link>

          {/* User badge */}
          <div className="mb-5 px-3 py-3 rounded-xl bg-white/5 border border-white/8">
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Logged in as</p>
            <p className="text-xs font-semibold truncate mt-1 text-white/80">{user.email}</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8b5cf6]/20 text-[#c4b5fd] border border-[#8b5cf6]/30 uppercase tracking-wider">
              {user.role}
            </span>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5 flex-1">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3 mb-2">Navigation</p>

            <NavLink to="/dashboard" end className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Dashboard
            </NavLink>

            <NavLink to="/orders" className={navLinkClass}>
              <ShoppingCart className="w-4 h-4 shrink-0" />
              Orders
            </NavLink>

            <NavLink to="/wallet" className={navLinkClass}>
              <Wallet className="w-4 h-4 shrink-0" />
              Wallet
            </NavLink>

            <NavLink to="/notifications" className={navLinkClass}>
              <Bell className="w-4 h-4 shrink-0" />
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[#8b5cf6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                  {unreadCount}
                </span>
              )}
            </NavLink>

            {user.role === 'SELLER' && (
              <NavLink to="/catalogue" className={navLinkClass}>
                <Package className="w-4 h-4 shrink-0" />
                Sourcing Catalogue
              </NavLink>
            )}

            {user.role === 'SUPPLIER' && (
              <>
                <div className="pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3">Supplier</p>
                </div>
                <NavLink to="/products" className={navLinkClass}>
                  <Package className="w-4 h-4 shrink-0" />
                  My Products
                </NavLink>
                <NavLink to="/onboarding" className={navLinkClass}>
                  <UserCheck className="w-4 h-4 shrink-0" />
                  Onboarding Profile
                </NavLink>
                <NavLink to="/reputation" className={navLinkClass}>
                  <Star className="w-4 h-4 shrink-0" />
                  Reputation
                </NavLink>
              </>
            )}

            {user.role === 'ADMIN' && (
              <>
                <div className="pt-3 pb-1">
                  <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3">Admin</p>
                </div>
                <NavLink to="/analytics" className={navLinkClass}>
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  Analytics
                </NavLink>
              </>
            )}
          </nav>

          {/* Logout */}
          <div className="mt-4 pt-4 border-t border-white/8">
            <Form method="post" action="/login?index">
              <input type="hidden" name="intent" value="logout" />
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Log Out
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Pending supplier banner */}
        {isPendingSupplier && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between text-amber-800">
            <div className="flex items-center gap-3 text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Action required:</strong> Complete your onboarding profile to start listing products.
              </span>
            </div>
            <Link
              to="/onboarding"
              className="text-xs bg-amber-600 text-white font-bold px-4 py-1.5 rounded-full hover:bg-amber-700 transition-colors shrink-0"
            >
              Complete Now
            </Link>
          </div>
        )}

        {/* Top bar with breadcrumb */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-2 text-sm text-gray-400">
          <Link to="/dashboard" className="hover:text-[#1a1a1c] transition-colors">
            Dropship Hub
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#1a1a1c] font-medium">{breadcrumb}</span>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
