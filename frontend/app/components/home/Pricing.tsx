import { Container, FadeIn } from '../ui/FadeIn';
import { ChevronRight, Check } from 'lucide-react';
import { Link } from 'react-router';
import { useState } from 'react';

const plans = [
  {
    name: "Starter",
    description: "Perfect for emerging suppliers testing the dropshipping model.",
    monthlyPrice: "0",
    yearlyPrice: "0",
    features: [
      "Up to 5 connected sellers",
      "500 orders per month",
      "Standard email support",
      "Shopify integration",
      "7-day payout schedule"
    ],
    highlight: false,
    cta: "Register for free",
    link: "/register"
  },
  {
    name: "Pro",
    description: "For established B2B businesses scaling their seller network.",
    monthlyPrice: "99",
    yearlyPrice: "79",
    features: [
      "Up to 50 connected sellers",
      "5,000 orders per month",
      "Priority 24/7 support",
      "All platform integrations",
      "Custom payout schedules",
      "Advanced analytics"
    ],
    highlight: true,
    cta: "Register now",
    link: "/register"
  },
  {
    name: "Business",
    description: "Enterprise grade infrastructure for high-volume operators.",
    monthlyPrice: "299",
    yearlyPrice: "249",
    features: [
      "Unlimited connected sellers",
      "Unlimited orders",
      "Dedicated account manager",
      "Custom API integration",
      "White-label options",
      "SLA guarantee"
    ],
    highlight: false,
    cta: "Contact us",
    link: "/contact"
  }
];

export function Pricing() {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section className="py-24 bg-[#F8F9FB]">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <FadeIn delay={0.1}>
            <span className="text-indigo-600 font-bold tracking-widest text-sm uppercase mb-4 block">
              Pricing
            </span>
            <h2 className="text-4xl font-normal tracking-tight text-gray-900 mb-6">
              Simple, transparent <span className="text-violet-500">pricing</span>
            </h2>
            <p className="text-lg text-gray-500 mb-10">
              No hidden fees. No surprise charges. Just straight-forward pricing that scales with your business.
            </p>
            
            {/* Toggle */}
            <div className="inline-flex items-center gap-4 bg-white p-2 rounded-full border border-gray-200 shadow-sm">
              <button 
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${!isYearly ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${isYearly ? 'bg-black text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Yearly
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${isYearly ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>Save 20%</span>
              </button>
            </div>
          </FadeIn>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <FadeIn key={index} delay={0.1 * (index + 2)} direction="up">
              <div className={`relative bg-white rounded-[2rem] p-10 h-full flex flex-col ${plan.highlight ? 'border border-indigo-200 shadow-[0_8px_30px_rgb(0,0,0,0.08)]' : 'border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}>
                {plan.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm">
                    Most Popular
                  </div>
                )}
                
                <h3 className="text-2xl font-medium text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-8 h-10">{plan.description}</p>
                
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-5xl font-medium text-gray-900">
                    £{isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-500 font-medium">/mo</span>
                </div>
                
                <Link
                  to={plan.link}
                  className={`w-full py-3.5 px-6 rounded-full font-medium transition-all duration-300 ease-in-out flex items-center justify-center group ${
                    plan.highlight
                      ? 'bg-[#1a1a1c] text-white hover:bg-white hover:text-[#1a1a1c] hover:shadow-[0_0_0_1px_#1a1a1c_inset]'
                      : 'bg-white text-gray-900 border border-gray-200 hover:bg-[#1a1a1c] hover:text-white hover:border-[#1a1a1c]'
                  }`}
                >
                  <div className="relative flex items-center">
                    <span className="transition-transform duration-300 ease-in-out group-hover:-translate-x-2.5">{plan.cta}</span>
                    <ChevronRight className="absolute -right-4 opacity-0 -translate-x-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0 w-4 h-4" />
                  </div>
                </Link>
                
                <ul className="space-y-4 mt-auto">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-indigo-600" />
                      </div>
                      <span className="text-gray-600 text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
