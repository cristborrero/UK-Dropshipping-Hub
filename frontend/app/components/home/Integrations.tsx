import { Container, FadeIn } from '../ui/FadeIn';

export function Integrations() {
  return (
    <section className="py-24 bg-white overflow-hidden border-t border-gray-100">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-16">
          <FadeIn delay={0.1}>
            <h2 className="text-3xl font-normal tracking-tight text-gray-900 mb-6">
              Works with the tools <br className="hidden md:block" />
              <span className="text-violet-500">you already use</span>
            </h2>
            <p className="text-gray-500">
              Native integrations with Shopify, WooCommerce, Stripe, and more. Connect your entire stack in minutes, not months.
            </p>
          </FadeIn>
        </div>
      </Container>

      {/* Infinite scrolling banner */}
      <div className="relative w-full overflow-hidden flex bg-white py-8">
        {/* Left/Right Fade */}
        <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

        <div className="flex animate-[scrollX_30s_linear_infinite] whitespace-nowrap min-w-full">
          {/* Repeat logos twice for smooth infinite scrolling */}
          {[1, 2].map((group) => (
            <div key={group} className="flex items-center justify-around min-w-full shrink-0 px-8">
              {['Shopify', 'WooCommerce', 'Stripe', 'Xero', 'QuickBooks', 'Mailchimp', 'Klaviyo', 'Zendesk'].map((brand, idx) => (
                <div key={idx} className="mx-8 opacity-40 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 flex items-center justify-center">
                  <span className="text-2xl font-black tracking-tighter text-gray-900">{brand}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
