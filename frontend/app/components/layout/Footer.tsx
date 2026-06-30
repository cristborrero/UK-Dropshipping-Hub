import { Link } from 'react-router';
import { Package, Globe, Mail } from 'lucide-react';
import { Container } from '../ui/FadeIn';

// Inline SVG icons for brands not available in this version of lucide-react
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-gray-800 pt-20 pb-10">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-16">
          {/* Brand column */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="bg-white text-black p-1.5 rounded-full">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">UK Dropshipping Hub</span>
            </Link>
            <p className="text-gray-400 text-sm max-w-sm leading-relaxed mb-6">
              The UK's B2B dropshipping platform. Connect verified UK suppliers with Shopify and WooCommerce sellers — with automated fulfilment, real-time stock sync, and transparent Stripe payouts.
            </p>
            <p className="text-xs text-gray-600 mb-6">Registered in England & Wales</p>
            <div className="flex gap-4">
              <a href="#" aria-label="Website" className="text-gray-500 hover:text-white transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" aria-label="Twitter / X" className="text-gray-500 hover:text-white transition-colors"><XIcon className="w-5 h-5" /></a>
              <a href="#" aria-label="LinkedIn" className="text-gray-500 hover:text-white transition-colors"><LinkedInIcon className="w-5 h-5" /></a>
              <a href="mailto:hello@ukdropshippinghub.co.uk" aria-label="Email us" className="text-gray-500 hover:text-white transition-colors"><Mail className="w-5 h-5" /></a>
            </div>
          </div>
          
          {/* Platform */}
          <div>
            <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-4">
              <li><Link to="/#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link></li>
              <li><Link to="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/#integrations" className="text-sm text-gray-400 hover:text-white transition-colors">Integrations</Link></li>
              <li><Link to="/register" className="text-sm text-gray-400 hover:text-white transition-colors">Register</Link></li>
              <li><Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log In</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-4">
              <li><Link to="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/suppliers" className="text-sm text-gray-400 hover:text-white transition-colors">For Suppliers</Link></li>
              <li><Link to="/sellers" className="text-sm text-gray-400 hover:text-white transition-colors">For Sellers</Link></li>
              <li><Link to="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</Link></li>
              <li><a href="mailto:hello@ukdropshippinghub.co.uk" className="text-sm text-gray-400 hover:text-white transition-colors">hello@ukdropshippinghub.co.uk</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-6 text-sm uppercase tracking-wider">Legal</h3>
            <ul className="space-y-4">
              <li><Link to="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cookies" className="text-sm text-gray-400 hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link to="/security" className="text-sm text-gray-400 hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} UK Dropshipping Hub Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              All systems operational
            </div>
            <span className="text-sm text-gray-600">🇬🇧 United Kingdom</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}


