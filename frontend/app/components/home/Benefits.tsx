import { Container, FadeIn } from '../ui/FadeIn';
// @ts-ignore
import benefitsImage from '/Users/cristianborrero/.gemini/antigravity-ide/brain/86648927-17f8-445d-9333-1feeeeb6b2ea/benefits_illustration_1782758222896.png';
import { CheckCircle2 } from 'lucide-react';

const benefits = [
  "Save up to 15 hours per week on manual order processing",
  "Reduce fulfilment errors with automated supplier routing",
  "Grow your seller network without adding headcount",
  "Access UK-verified suppliers with real performance metrics",
  "Get paid faster with Stripe-powered automatic split payouts"
];

export function Benefits() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Content */}
          <FadeIn direction="right" delay={0.1} className="flex flex-col justify-center">
            
            <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-gray-900 mb-6 leading-tight">
              Grow your network, <br className="hidden md:block" />
              <span className="text-violet-500">not your overhead</span>
            </h2>
            
            <p className="text-lg text-gray-500 mb-8 leading-relaxed">
              Stop wasting time on manual admin. Our platform handles order routing, inventory sync, and payment reconciliation automatically — so you and your team can focus on finding great UK suppliers and scaling your catalogue.
            </p>
            
            <ul className="space-y-4 mb-12">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-indigo-500 shrink-0" />
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </li>
              ))}
            </ul>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-100">
              <div>
                <p className="text-5xl font-medium text-gray-900 mb-2">15h+</p>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Saved per week</p>
              </div>
              <div>
                <p className="text-5xl font-medium text-gray-900 mb-2">99.8%</p>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Order Accuracy</p>
              </div>
            </div>

          </FadeIn>

          {/* Image */}
          <FadeIn direction="left" delay={0.2}>
            <div className="relative rounded-[2rem] overflow-hidden bg-[#F8F9FB] aspect-square p-8 flex items-center justify-center">
              <img 
                src="/assets/asset 17.png" 
                alt="Logistics Optimization" 
                className="w-full h-full object-contain mix-blend-multiply opacity-90"
              />
              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
