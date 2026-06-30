import { Container, FadeIn } from '../ui/FadeIn';
import { RefreshCcw, ShieldCheck, Zap, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: RefreshCcw,
    title: 'Real-time Inventory Sync',
    description: 'Stock levels update instantly across every connected seller storefront the moment a supplier makes a change. Zero lag. Zero overselling. Zero manual reconciliation.',
  },
  {
    icon: Zap,
    title: 'Automated Order Routing',
    description: 'Orders placed on seller stores are automatically routed to the right UK supplier for fulfilment — with tracking updates pushed back to the customer end-to-end.',
  },
  {
    icon: ShieldCheck,
    title: 'Stripe-Powered Split Payments',
    description: 'Revenue is held securely via Stripe Connect and split automatically between platform, supplier, and seller on every transaction. Transparent. Instant. Auditable.',
  },
  {
    icon: BarChart3,
    title: 'Unified Operations Dashboard',
    description: 'Track GMV, on-time delivery rates, return ratios, and profit margins across your entire network from a single, real-time analytics dashboard.',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-[#F8F9FB]">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <FadeIn delay={0.1}>
            <span className="text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full font-bold tracking-widest text-xs uppercase mb-6 inline-block">
              Features
            </span>
            <h2 className="text-4xl font-normal tracking-tight text-gray-900 mb-6">
              Everything your dropshipping <br className="hidden md:block" />
              <span className="text-violet-500">business needs to scale</span>
            </h2>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FadeIn key={index} delay={0.1 * (index + 2)} direction="up">
              <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all h-full relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-colors"></div>
                <div className="w-14 h-14 bg-white shadow-sm rounded-2xl flex items-center justify-center mb-6 border border-gray-100 relative z-10">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
