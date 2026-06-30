import { Link } from 'react-router';
import { ChevronRight, ChevronsRight } from 'lucide-react';

export function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-6xl z-50 px-4">
      <div className="bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-full px-2 py-2 pr-2 pl-4 transition-all duration-300">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-brand-dark text-white p-2 rounded-full group-hover:scale-105 transition-transform">
              <ChevronsRight className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-brand-dark">
              UK Dropshipping <span className="text-gray-400">Hub</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-8 ml-auto mr-8">
            <a href="#features" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">Features</a>
            <a href="#benefits" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">Suppliers</a>
            <a href="#integrations" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">Integrations</a>
            <a href="#pricing" className="text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="bg-brand-dark text-white hover:bg-brand-accent font-medium text-[15px] px-7 py-2.5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center group"
              >
                <div className="relative flex items-center">
                  <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Dashboard</span>
                  <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                </div>
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden md:flex text-gray-600 hover:text-gray-900 font-medium text-[15px] px-5 py-2.5 rounded-full transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="bg-brand-accent text-white hover:bg-brand-dark font-medium text-[15px] px-7 py-2.5 rounded-full transition-all duration-300 ease-in-out flex items-center justify-center group"
                >
                  <div className="relative flex items-center">
                    <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Register</span>
                    <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
