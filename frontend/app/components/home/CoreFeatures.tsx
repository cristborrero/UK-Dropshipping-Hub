import { Container, FadeIn } from '../ui/FadeIn';
import { ChevronRight, Box, Layers, MousePointerClick, Webhook } from 'lucide-react';
import { Link } from 'react-router';

const capabilities = [
  {
    icon: Box,
    title: 'Smart Inventory',
    description: 'Set allocation rules and live stock buffers that prevent overselling. When a supplier updates stock, all storefronts update instantly.',
  },
  {
    icon: Webhook,
    title: 'API-First Architecture',
    description: 'Connect your ERP, WMS, or accounting software directly. Or use our ready-made Shopify and WooCommerce plugins — live in minutes.',
  },
  {
    icon: Layers,
    title: 'Multi-Seller Distribution',
    description: 'A single supplier catalogue distributed simultaneously across hundreds of seller storefronts, each with its own pricing rules.',
  },
  {
    icon: MousePointerClick,
    title: 'Automated Payouts',
    description: 'Revenue reconciles automatically. Stripe splits funds to every connected account on the schedule you define — daily, weekly, or monthly.',
  },
];

export function CoreFeatures() {
  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Content Left */}
          <FadeIn direction="right" delay={0.1}>
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-gray-900 mb-6 leading-tight">
                Powerful automation, <br className="hidden md:block" />
                <span className="text-violet-500">zero complexity</span>
              </h2>
              
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold tracking-wide">No code.</span>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold tracking-wide">No complexity.</span>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-sm font-bold tracking-wide">Just results.</span>
              </div>
              
              <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                Configure routing rules, set commission splits, and manage inventory thresholds through a visual interface — no developers needed. Built for UK supplier operations from day one.
              </p>
              
              <Link
                to="/register"
                className="inline-flex items-center justify-center bg-[#1a1a1c] text-white hover:bg-white hover:text-[#1a1a1c] hover:shadow-[0_0_0_1px_#1a1a1c_inset] font-medium px-8 py-3.5 rounded-full transition-all duration-300 ease-in-out shadow-sm group"
              >
                <div className="relative flex items-center">
                  <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">Get started free</span>
                  <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                </div>
              </Link>
            </div>
          </FadeIn>

          {/* Grid Right */}
          <FadeIn direction="left" delay={0.2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {capabilities.map((cap, index) => (
                <div key={index} className="bg-[#F8F9FB] rounded-[2rem] p-8 border border-gray-100 hover:border-indigo-500/30 transition-colors group">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <cap.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{cap.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
          
        </div>
      </Container>
    </section>
  );
}
