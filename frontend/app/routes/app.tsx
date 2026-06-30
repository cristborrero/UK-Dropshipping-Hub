import { Outlet, Link, useLoaderData, Form, NavLink, useLocation } from 'react-router';
import type { Route } from './+types/app';
import { requireAuth } from '../lib/auth.server';
import { requestBackend } from '../lib/api.server';
import React, { useState, useEffect } from 'react';
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
  Menu,
  X,
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
      ? 'bg-brand-accent/15 text-violet-200 border-l-2 border-brand-accent pl-[10px]'
      : 'text-white/55 hover:text-white/90 hover:bg-white/5'
  }`;

export default function AppLayout() {
  const { user, unreadCount } = useLoaderData<typeof loader>();
  const breadcrumb = useBreadcrumb();
  const location = useLocation();
  const isPendingSupplier = user.role === 'SUPPLIER' && user.status === 'PENDING';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navigationItems = (
    <>
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
          <span className="bg-brand-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm">
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
    </>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-brand-dark flex flex-col md:flex-row font-sans relative">
      {/* Mobile Sticky Top Header */}
      <header className="flex md:hidden items-center justify-between bg-brand-dark text-white px-5 py-3 sticky top-0 z-40 border-b border-white/5 shadow-md">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-accent flex items-center justify-center shadow-md">
            <Package2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white uppercase">
            Dropship Hub
          </span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-8.5 h-8.5 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center text-white"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay & Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {/* Mobile Drawer Box */}
        <aside
          className={`fixed inset-y-0 left-0 w-64 bg-brand-dark bg-grid-dark flex flex-col justify-between p-5 transform transition-transform duration-300 ease-in-out z-50 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle violet glow top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[120px] bg-brand-accent/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              {/* Header Logo */}
              <div className="flex items-center justify-between mb-6">
                <Link to="/dashboard" className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-brand-accent flex items-center justify-center shadow-md">
                    <Package2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-bold tracking-tight text-white uppercase">
                    Dropship Hub
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Identity Box */}
              <div className="mb-5 px-3 py-3 rounded-xl bg-white/5 border border-white/8">
                <p className="text-[9px] text-white/40 uppercase tracking-wider font-semibold">Logged in as</p>
                <p className="text-xs font-semibold truncate mt-1 text-white/80">{user.email}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-accent/20 text-[#c4b5fd] border border-brand-accent/30 uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              {/* Drawer Links */}
              <nav className="space-y-0.5">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-wider px-3 mb-2">Navigation</p>
                {navigationItems}
              </nav>
            </div>

            {/* Drawer Logout */}
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
      </div>

      {/* Desktop Sidebar (hidden on mobile viewport) */}
      <aside className="hidden md:flex w-60 bg-brand-dark bg-grid-dark flex-col justify-between shrink-0 relative overflow-hidden border-r border-white/5">
        {/* Subtle violet glow top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[120px] bg-brand-accent/10 blur-[60px] rounded-full pointer-events-none" />

        <div className="relative z-10 p-5 flex flex-col h-full justify-between">
          <div>
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2.5 mb-7">
              <div className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center shadow-md">
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
              <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-accent/20 text-[#c4b5fd] border border-brand-accent/30 uppercase tracking-wider">
                {user.role}
              </span>
            </div>

            {/* Navigation */}
            <nav className="space-y-0.5">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider px-3 mb-2">Navigation</p>
              {navigationItems}
            </nav>
          </div>

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
          <Link to="/dashboard" className="hover:text-brand-dark transition-colors">
            Dropship Hub
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-brand-dark font-medium">{breadcrumb}</span>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
